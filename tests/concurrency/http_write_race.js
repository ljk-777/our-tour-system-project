/**
 * Concurrent write-race checks for likes and poll votes.
 *
 * Usage:
 *   node tests/concurrency/http_write_race.js
 */

const { query } = require('../../src/backend/src/db');
const groupRepo = require('../../src/backend/src/repositories/groupRepository');

const BASE_URL = process.env.API_BASE || 'http://127.0.0.1:3001';
const DIARY_ID = Number(process.env.DIARY_ID || 1);
let USERS = [];
const TARGET_USER_COUNT = Number(process.env.RACE_USERS || 5);
const SAME_USER_BURST = Number(process.env.SAME_USER_BURST || 25);
const LIKE_BURST = Number(process.env.LIKE_BURST || 8);
const POLL_BURST = Number(process.env.POLL_BURST || 6);

async function main() {
  await ensureBackendReady();
  USERS = await loadUsers(TARGET_USER_COUNT);
  console.log(`\n=== Concurrent Write Race (${BASE_URL}) ===\n`);
  console.log(`using users: ${USERS.join(', ')}`);

  await testSameUserDuplicateLike();
  await testMultiUserLikeFanIn();
  await testMultiUserUnlikeFanIn();
  await testPollVoteUpsertConsistency();
}

async function testSameUserDuplicateLike() {
  console.log('--- same user duplicate like ---');
  await query('DELETE FROM user_likes WHERE diary_id = $1', [DIARY_ID]);
  await query('UPDATE diaries SET likes_count = 0 WHERE id = $1', [DIARY_ID]);

  const userId = USERS[0];
  const results = await Promise.all(
    Array.from({ length: SAME_USER_BURST }, () => callJson('POST', `/api/diaries/${DIARY_ID}/like`, { userId }))
  );

  const final = await diaryState(DIARY_ID);
  const uniqueRows = await likeRows(DIARY_ID);
  reportRaceResult({
    label: 'same-user-like',
    ok: final.likesCount === 1 && uniqueRows === 1,
    details: {
      requests: results.length,
      responseOk: results.filter((item) => item.ok).length,
      likesCount: final.likesCount,
      likeRows: uniqueRows,
    },
  });
}

async function testMultiUserLikeFanIn() {
  console.log('--- multi user like fan-in ---');
  await query('DELETE FROM user_likes WHERE diary_id = $1', [DIARY_ID]);
  await query('UPDATE diaries SET likes_count = 0 WHERE id = $1', [DIARY_ID]);

  const tasks = USERS.flatMap((userId) =>
    Array.from({ length: LIKE_BURST }, () => callJson('POST', `/api/diaries/${DIARY_ID}/like`, { userId }))
  );
  await Promise.all(tasks);

  const final = await diaryState(DIARY_ID);
  const uniqueRows = await likeRows(DIARY_ID);
  reportRaceResult({
    label: 'multi-user-like',
    ok: final.likesCount === USERS.length && uniqueRows === USERS.length,
    details: {
      users: USERS.length,
      requests: tasks.length,
      likesCount: final.likesCount,
      likeRows: uniqueRows,
    },
  });
}

async function testMultiUserUnlikeFanIn() {
  console.log('--- multi user unlike fan-in ---');
  await query('DELETE FROM user_likes WHERE diary_id = $1', [DIARY_ID]);
  await query('UPDATE diaries SET likes_count = 0 WHERE id = $1', [DIARY_ID]);

  for (const userId of USERS) {
    await query(
      'INSERT INTO user_likes (user_id, diary_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, DIARY_ID]
    );
  }
  await query('UPDATE diaries SET likes_count = $1 WHERE id = $2', [USERS.length, DIARY_ID]);

  const tasks = USERS.flatMap((userId) =>
    Array.from({ length: LIKE_BURST }, () => callJson('POST', `/api/diaries/${DIARY_ID}/unlike`, { userId }))
  );
  await Promise.all(tasks);

  const final = await diaryState(DIARY_ID);
  const uniqueRows = await likeRows(DIARY_ID);
  reportRaceResult({
    label: 'multi-user-unlike',
    ok: final.likesCount === 0 && uniqueRows === 0,
    details: {
      users: USERS.length,
      requests: tasks.length,
      likesCount: final.likesCount,
      likeRows: uniqueRows,
    },
  });
}

async function testPollVoteUpsertConsistency() {
  console.log('--- poll vote upsert consistency ---');
  const group = await groupRepo.create(`concurrency-${Date.now()}`, USERS[0]);
  try {
    for (const userId of USERS.slice(1)) {
      await groupRepo.addMember(group.id, userId);
    }
    const poll = await groupRepo.createPoll(group.id, USERS[0], {
      title: '并发投票测试',
      options: ['方案A', '方案B', '方案C'],
    });

    const tasks = USERS.flatMap((userId, index) =>
      Array.from({ length: POLL_BURST }, (_, retry) =>
        callJson('POST', `/api/groups/${group.id}/polls/${poll.id}/vote`, {
          userId,
          body: { optionIndex: (index + retry) % 3 },
        })
      )
    );
    await Promise.all(tasks);

    const finalPoll = await groupRepo.getPollById(group.id, poll.id);
    const uniqueVoters = new Set((finalPoll?.votes || []).map((vote) => Number(vote.userId))).size;
    const countsSum = (finalPoll?.counts || []).reduce((sum, value) => sum + Number(value || 0), 0);

    reportRaceResult({
      label: 'poll-vote-upsert',
      ok: uniqueVoters === USERS.length && countsSum === USERS.length,
      details: {
        users: USERS.length,
        requests: tasks.length,
        totalVotes: finalPoll?.totalVotes || 0,
        uniqueVoters,
        counts: finalPoll?.counts || [],
      },
    });
  } finally {
    await groupRepo.remove(group.id);
  }
}

async function callJson(method, path, { userId, body } = {}) {
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': String(userId || 1),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try {
      json = await response.json();
    } catch {
      json = null;
    }
    return { ok: response.ok && json?.success !== false, status: response.status, json };
  } catch {
    return { ok: false, status: 0, json: null };
  }
}

async function diaryState(diaryId) {
  const { rows } = await query('SELECT likes_count FROM diaries WHERE id = $1', [diaryId]);
  return { likesCount: Number(rows[0]?.likes_count || 0) };
}

async function likeRows(diaryId) {
  const { rows } = await query('SELECT COUNT(*)::int AS total FROM user_likes WHERE diary_id = $1', [diaryId]);
  return Number(rows[0]?.total || 0);
}

async function ensureBackendReady() {
  const response = await fetch(`${BASE_URL}/api/health`);
  if (!response.ok) throw new Error(`Backend health check failed: ${response.status}`);
}

function reportRaceResult({ label, ok, details }) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label} ${JSON.stringify(details)}`);
  if (!ok) process.exitCode = 1;
}

async function loadUsers(count) {
  const { rows } = await query(
    'SELECT id FROM users ORDER BY id LIMIT $1',
    [Math.max(1, count)]
  );
  const ids = rows.map((row) => Number(row.id)).filter(Number.isFinite);
  if (ids.length === 0) {
    throw new Error('No users available for race test');
  }
  return ids;
}

main()
  .catch((error) => {
    console.error('\nWrite-race test failed:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    const { pool } = require('../../src/backend/src/db');
    await pool.end();
  });
