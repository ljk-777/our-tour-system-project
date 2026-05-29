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

module.exports = {
  create, findByUserId, findById, findByCode, remove,
  addMember, getMembers,
  upsertTrip, getTrip,
  addMessage, getMessages,
};
