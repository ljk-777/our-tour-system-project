const { query, withTransaction } = require('../db');

const GROUP_FIELDS = `id, name, code, creator_id, created_at, updated_at`;

function mapGroup(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    code: row.code,
    creatorId: Number(row.creator_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTrip(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    groupId: Number(row.group_id),
    title: row.title,
    departure: row.departure,
    destination: row.destination,
    startDate: row.start_date,
    endDate: row.end_date,
    budget: row.budget ? Number(row.budget) : null,
    notes: row.notes,
    dailyPlan: typeof row.daily_plan === 'string' ? JSON.parse(row.daily_plan) : (row.daily_plan || []),
    createdBy: row.created_by ? Number(row.created_by) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessage(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    groupId: Number(row.group_id),
    senderId: row.sender_id ? Number(row.sender_id) : null,
    senderName: row.sender_name || null,
    senderAvatar: row.sender_avatar || null,
    type: row.type,
    content: row.content,
    createdAt: row.created_at,
  };
}

function mapPreference(row) {
  if (!row) return null;
  return {
    groupId: Number(row.group_id),
    userId: Number(row.user_id),
    userName: row.nickname || row.username || null,
    userAvatar: row.avatar || null,
    budgetLevel: Number(row.budget_level || 3),
    staminaLevel: Number(row.stamina_level || 3),
    paceLevel: Number(row.pace_level || 3),
    photoLevel: Number(row.photo_level || 3),
    foodPreference: row.food_preference || '',
    dietaryRestrictions: row.dietary_restrictions || '',
    notes: row.notes || '',
    updatedAt: row.updated_at,
  };
}

function mapPoll(row) {
  if (!row) return null;
  const options = typeof row.options === 'string' ? JSON.parse(row.options) : (row.options || []);
  const votes = typeof row.votes === 'string' ? JSON.parse(row.votes) : (row.votes || []);
  const counts = options.map((_, index) => votes.filter((vote) => Number(vote.optionIndex) === index).length);
  return {
    id: Number(row.id),
    groupId: Number(row.group_id),
    title: row.title,
    options,
    status: row.status,
    createdBy: row.created_by ? Number(row.created_by) : null,
    creatorName: row.creator_name || null,
    closesAt: row.closes_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    votes,
    counts,
    totalVotes: votes.length,
  };
}

// ── Code generation ──
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode(length = 6) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

async function generateUniqueCode(maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateCode();
    const { rows } = await query('SELECT id FROM groups WHERE code = $1', [code]);
    if (rows.length === 0) return code;
  }
  throw new Error('无法生成唯一的群组码，请重试');
}

// ── Groups ──
async function create(name, creatorId) {
  const code = await generateUniqueCode();
  const { rows } = await query(
    `INSERT INTO groups (name, code, creator_id) VALUES ($1, $2, $3) RETURNING ${GROUP_FIELDS}`,
    [name, code, Number(creatorId)]
  );
  const group = mapGroup(rows[0]);
  // Auto-join creator as admin
  await query(
    'INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)',
    [group.id, Number(creatorId), 'admin']
  );
  return group;
}

async function findByUserId(userId) {
  const { rows } = await query(
    `SELECT g.${GROUP_FIELDS},
      (SELECT COUNT(*) FROM group_members WHERE group_id = g.id)::int AS member_count,
      (SELECT content FROM group_messages WHERE group_id = g.id ORDER BY created_at DESC LIMIT 1) AS last_message
     FROM groups g
     JOIN group_members gm ON gm.group_id = g.id
     WHERE gm.user_id = $1
     ORDER BY g.updated_at DESC`,
    [Number(userId)]
  );
  return rows.map(r => ({
    ...mapGroup(r),
    memberCount: Number(r.member_count),
    lastMessage: r.last_message,
  }));
}

async function findById(id) {
  const { rows } = await query(`SELECT ${GROUP_FIELDS} FROM groups WHERE id = $1`, [Number(id)]);
  return mapGroup(rows[0]);
}

async function findByCode(code) {
  const { rows } = await query(`SELECT ${GROUP_FIELDS} FROM groups WHERE code = $1`, [code]);
  return mapGroup(rows[0]);
}

async function remove(id) {
  const result = await query('DELETE FROM groups WHERE id = $1', [Number(id)]);
  return result.rowCount > 0;
}

// ── Members ──
async function getMember(groupId, userId) {
  const { rows } = await query(
    'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
    [Number(groupId), Number(userId)]
  );
  return rows[0] ? { role: rows[0].role } : null;
}

async function addMember(groupId, userId) {
  // Check if already a member
  const existing = await query(
    'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
    [Number(groupId), Number(userId)]
  );
  if (existing.rowCount > 0) return false; // already member
  await query(
    'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
    [Number(groupId), Number(userId)]
  );
  // Update group timestamp
  await query('UPDATE groups SET updated_at = NOW() WHERE id = $1', [Number(groupId)]);
  return true;
}

async function removeMember(groupId, userId) {
  const result = await query(
    'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
    [Number(groupId), Number(userId)]
  );
  await query('UPDATE groups SET updated_at = NOW() WHERE id = $1', [Number(groupId)]);
  return result.rowCount > 0;
}

async function updateMemberRole(groupId, userId, role) {
  const { rows } = await query(
    `UPDATE group_members
     SET role = $1
     WHERE group_id = $2 AND user_id = $3
     RETURNING role`,
    [role, Number(groupId), Number(userId)]
  );
  await query('UPDATE groups SET updated_at = NOW() WHERE id = $1', [Number(groupId)]);
  return rows[0] ? { role: rows[0].role } : null;
}

async function getMembers(groupId) {
  const { rows } = await query(
    `SELECT gm.role, gm.joined_at,
            u.id, u.username, u.nickname, u.avatar, u.city, u.level
     FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = $1
     ORDER BY gm.joined_at`,
    [Number(groupId)]
  );
  return rows.map(r => ({
    role: r.role,
    joinedAt: r.joined_at,
    user: { id: Number(r.id), username: r.username, nickname: r.nickname, avatar: r.avatar, city: r.city, level: r.level },
  }));
}

async function countAdmins(groupId) {
  const { rows } = await query(
    "SELECT COUNT(*)::int AS total FROM group_members WHERE group_id = $1 AND role = 'admin'",
    [Number(groupId)]
  );
  return Number(rows[0]?.total || 0);
}

// ── Trips ──
async function upsertTrip(groupId, data) {
  const existing = await query('SELECT id FROM group_trips WHERE group_id = $1', [Number(groupId)]);
  let result;
  if (existing.rows.length > 0) {
    result = await query(
      `UPDATE group_trips SET
        title = $1, departure = $2, destination = $3, start_date = $4, end_date = $5,
        budget = $6, notes = $7, daily_plan = $8, updated_at = NOW()
       WHERE group_id = $9 RETURNING *`,
      [data.title || null, data.departure || null, data.destination, data.startDate || null,
       data.endDate || null, data.budget || null, data.notes || null,
       JSON.stringify(data.dailyPlan || []), Number(groupId)]
    );
  } else {
    result = await query(
      `INSERT INTO group_trips (group_id, title, departure, destination, start_date, end_date, budget, notes, daily_plan, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [Number(groupId), data.title || null, data.departure || null, data.destination,
       data.startDate || null, data.endDate || null, data.budget || null, data.notes || null,
       JSON.stringify(data.dailyPlan || []), Number(data.createdBy)]
    );
  }
  await query('UPDATE groups SET updated_at = NOW() WHERE id = $1', [Number(groupId)]);
  return mapTrip(result.rows[0]);
}

async function getTrip(groupId) {
  const { rows } = await query('SELECT * FROM group_trips WHERE group_id = $1', [Number(groupId)]);
  return mapTrip(rows[0]);
}

// ── Preferences ──
let preferencesTableReady;

async function ensurePreferencesTable() {
  if (!preferencesTableReady) {
    preferencesTableReady = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS group_preferences (
          group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          budget_level INTEGER NOT NULL DEFAULT 3,
          stamina_level INTEGER NOT NULL DEFAULT 3,
          pace_level INTEGER NOT NULL DEFAULT 3,
          photo_level INTEGER NOT NULL DEFAULT 3,
          food_preference VARCHAR(120),
          dietary_restrictions VARCHAR(120),
          notes TEXT,
          updated_at TIMESTAMP DEFAULT NOW(),
          PRIMARY KEY (group_id, user_id)
        )
      `);
      await query('CREATE INDEX IF NOT EXISTS idx_group_preferences_group_id ON group_preferences(group_id)');
    })();
  }
  return preferencesTableReady;
}

async function upsertPreference(groupId, userId, data) {
  await ensurePreferencesTable();
  const { rows } = await query(
    `INSERT INTO group_preferences (
      group_id, user_id, budget_level, stamina_level, pace_level, photo_level,
      food_preference, dietary_restrictions, notes, updated_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
    ON CONFLICT (group_id, user_id)
    DO UPDATE SET
      budget_level = EXCLUDED.budget_level,
      stamina_level = EXCLUDED.stamina_level,
      pace_level = EXCLUDED.pace_level,
      photo_level = EXCLUDED.photo_level,
      food_preference = EXCLUDED.food_preference,
      dietary_restrictions = EXCLUDED.dietary_restrictions,
      notes = EXCLUDED.notes,
      updated_at = NOW()
    RETURNING *`,
    [
      Number(groupId),
      Number(userId),
      clampLevel(data.budgetLevel),
      clampLevel(data.staminaLevel),
      clampLevel(data.paceLevel),
      clampLevel(data.photoLevel),
      data.foodPreference || null,
      data.dietaryRestrictions || null,
      data.notes || null,
    ]
  );
  return mapPreference(rows[0]);
}

async function getPreferences(groupId) {
  await ensurePreferencesTable();
  const { rows } = await query(
    `SELECT gp.*, u.username, u.nickname, u.avatar
     FROM group_preferences gp
     JOIN users u ON u.id = gp.user_id
     WHERE gp.group_id = $1
     ORDER BY gp.updated_at DESC`,
    [Number(groupId)]
  );
  return rows.map(mapPreference);
}

function clampLevel(value) {
  const num = Number(value || 3);
  return Math.max(1, Math.min(5, Number.isFinite(num) ? num : 3));
}

// ── Messages ──
async function addMessage(groupId, senderId, type, content) {
  const { rows } = await query(
    `INSERT INTO group_messages (group_id, sender_id, type, content) VALUES ($1, $2, $3, $4) RETURNING *`,
    [Number(groupId), senderId ? Number(senderId) : null, type, content]
  );
  await query('UPDATE groups SET updated_at = NOW() WHERE id = $1', [Number(groupId)]);
  // Enrich with sender info
  const msg = mapMessage(rows[0]);
  if (senderId) {
    const user = await query('SELECT nickname, avatar FROM users WHERE id = $1', [Number(senderId)]);
    if (user.rows[0]) {
      msg.senderName = user.rows[0].nickname;
      msg.senderAvatar = user.rows[0].avatar;
    }
  }
  return msg;
}

async function getMessageById(groupId, messageId) {
  const { rows } = await query(
    `SELECT m.*, u.nickname AS sender_name, u.avatar AS sender_avatar
     FROM group_messages m
     LEFT JOIN users u ON u.id = m.sender_id
     WHERE m.group_id = $1 AND m.id = $2`,
    [Number(groupId), Number(messageId)]
  );
  return mapMessage(rows[0]);
}

async function getMessages(groupId, beforeId, limit = 50) {
  let sql;
  let params;
  if (beforeId) {
    sql = `
      SELECT m.*, u.nickname AS sender_name, u.avatar AS sender_avatar
      FROM group_messages m
      LEFT JOIN users u ON u.id = m.sender_id
      WHERE m.group_id = $1 AND m.id < $2
      ORDER BY m.created_at DESC LIMIT $3`;
    params = [Number(groupId), Number(beforeId), Number(limit)];
  } else {
    sql = `
      SELECT m.*, u.nickname AS sender_name, u.avatar AS sender_avatar
      FROM group_messages m
      LEFT JOIN users u ON u.id = m.sender_id
      WHERE m.group_id = $1
      ORDER BY m.created_at DESC LIMIT $2`;
    params = [Number(groupId), Number(limit)];
  }
  const { rows } = await query(sql, params);
  return rows.map(mapMessage).reverse();
}

// ── Polls ──
async function createPoll(groupId, userId, data) {
  const options = normalizePollOptions(data.options);
  const { rows } = await query(
    `INSERT INTO group_polls (group_id, title, options, created_by, closes_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [Number(groupId), data.title.trim(), JSON.stringify(options), Number(userId), data.closesAt || null]
  );
  await query('UPDATE groups SET updated_at = NOW() WHERE id = $1', [Number(groupId)]);
  return getPollById(groupId, rows[0].id);
}

async function getPolls(groupId) {
  const { rows } = await query(
    `SELECT p.*, u.nickname AS creator_name,
      COALESCE(
        json_agg(
          json_build_object(
            'userId', v.user_id,
            'optionIndex', v.option_index,
            'userName', COALESCE(vu.nickname, vu.username),
            'userAvatar', vu.avatar,
            'updatedAt', v.updated_at
          )
        ) FILTER (WHERE v.user_id IS NOT NULL),
        '[]'
      ) AS votes
     FROM group_polls p
     LEFT JOIN users u ON u.id = p.created_by
     LEFT JOIN group_poll_votes v ON v.poll_id = p.id
     LEFT JOIN users vu ON vu.id = v.user_id
     WHERE p.group_id = $1
     GROUP BY p.id, u.nickname
     ORDER BY p.created_at DESC`,
    [Number(groupId)]
  );
  return rows.map(mapPoll);
}

async function getPollById(groupId, pollId) {
  const polls = await getPolls(groupId);
  return polls.find((poll) => poll.id === Number(pollId)) || null;
}

async function votePoll(groupId, pollId, userId, optionIndex) {
  const poll = await getPollById(groupId, pollId);
  if (!poll) return null;
  if (poll.status !== 'open') {
    const error = new Error('投票已结束');
    error.statusCode = 400;
    throw error;
  }
  const index = Number(optionIndex);
  if (!Number.isInteger(index) || index < 0 || index >= poll.options.length) {
    const error = new Error('投票选项无效');
    error.statusCode = 400;
    throw error;
  }
  await query(
    `INSERT INTO group_poll_votes (poll_id, user_id, option_index)
     VALUES ($1, $2, $3)
     ON CONFLICT (poll_id, user_id)
     DO UPDATE SET option_index = EXCLUDED.option_index, updated_at = NOW()`,
    [Number(pollId), Number(userId), index]
  );
  await query('UPDATE group_polls SET updated_at = NOW() WHERE id = $1', [Number(pollId)]);
  await query('UPDATE groups SET updated_at = NOW() WHERE id = $1', [Number(groupId)]);
  return getPollById(groupId, pollId);
}

function normalizePollOptions(options) {
  const list = (Array.isArray(options) ? options : [])
    .map((option) => `${option || ''}`.trim())
    .filter(Boolean)
    .slice(0, 6);
  const unique = [...new Set(list)];
  if (unique.length < 2) {
    const error = new Error('投票至少需要 2 个选项');
    error.statusCode = 400;
    throw error;
  }
  return unique;
}

module.exports = {
  create, findByUserId, findById, findByCode, remove,
  addMember, getMember, removeMember, updateMemberRole, getMembers, countAdmins,
  upsertTrip, getTrip,
  upsertPreference, getPreferences,
  addMessage, getMessageById, getMessages,
  createPoll, getPolls, getPollById, votePoll,
};
