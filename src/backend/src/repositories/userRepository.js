const { query } = require('../db');

function mapUser(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    username: row.username,
    nickname: row.nickname,
    avatar: row.avatar,
    email: row.email,
    city: row.city,
    level: row.level,
    totalDiaries: Number(row.total_diaries || 0),
    totalSpots: Number(row.total_spots || 0),
    joinDate: row.join_date,
    bio: row.bio,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findAll() {
  const { rows } = await query('SELECT * FROM users ORDER BY id');
  return rows.map(mapUser);
}

async function findById(id) {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [Number(id)]);
  return mapUser(rows[0]);
}

async function findByUsername(username) {
  const { rows } = await query('SELECT * FROM users WHERE username = $1', [username]);
  return mapUser(rows[0]);
}

async function findByEmail(email) {
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  return mapUser(rows[0]);
}

async function create(data) {
  const { rows } = await query(
    `
      INSERT INTO users (
        username, nickname, email, avatar, city, level, bio,
        total_diaries, total_spots, join_date, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `,
    [
      data.username,
      data.nickname || null,
      data.email || null,
      data.avatar || null,
      data.city || null,
      data.level || null,
      data.bio || null,
      data.totalDiaries || 0,
      data.totalSpots || 0,
      data.joinDate ? new Date(data.joinDate) : null,
    ]
  );
  return mapUser(rows[0]);
}

async function update(id, data) {
  const existing = await findById(id);
  if (!existing) return null;

  const merged = { ...existing, ...data };
  const { rows } = await query(
    `
      UPDATE users
      SET
        username = $1,
        nickname = $2,
        email = $3,
        avatar = $4,
        city = $5,
        level = $6,
        bio = $7,
        total_diaries = $8,
        total_spots = $9,
        join_date = $10,
        updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `,
    [
      merged.username,
      merged.nickname || null,
      merged.email || null,
      merged.avatar || null,
      merged.city || null,
      merged.level || null,
      merged.bio || null,
      merged.totalDiaries || 0,
      merged.totalSpots || 0,
      merged.joinDate ? new Date(merged.joinDate) : null,
      Number(id),
    ]
  );
  return mapUser(rows[0]);
}

module.exports = {
  findAll,
  findById,
  findByUsername,
  findByEmail,
  create,
  update,
};
