const { query, withTransaction } = require('../db');

function mapDiary(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    userName: row.user_name,
    userAvatar: row.user_avatar,
    title: row.title,
    content: row.content,
    spotId: row.spot_id === null ? null : Number(row.spot_id),
    spotName: row.spot_name,
    coverImage: row.cover_image,
    tags: row.tags || [],
    rating: row.rating === null ? null : Number(row.rating),
    visitDate: row.visit_date,
    weather: row.weather,
    mood: row.mood,
    likes: Number(row.likes_count || 0),
    comments: Array.isArray(row.comments) ? row.comments : [],
    views: Number(row.views_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const baseSelect = `
  SELECT
    d.*,
    COALESCE(tags.tags, '{}'::text[]) AS tags,
    COALESCE(comments.comments, '[]'::json) AS comments
  FROM diaries d
  LEFT JOIN (
    SELECT diary_id, array_agg(tag ORDER BY tag) AS tags
    FROM diary_tags
    GROUP BY diary_id
  ) tags ON tags.diary_id = d.id
  LEFT JOIN (
    SELECT
      diary_id,
      json_agg(
        json_build_object(
          'id', id,
          'userId', user_id,
          'userName', user_name,
          'content', content,
          'createdAt', created_at
        )
        ORDER BY created_at
      ) AS comments
    FROM diary_comments
    GROUP BY diary_id
  ) comments ON comments.diary_id = d.id
`;

async function findAll({ userId, spotId, limit = 20, offset = 0 } = {}) {
  const filters = [];
  const values = [];

  if (userId) {
    values.push(Number(userId));
    filters.push(`d.user_id = $${values.length}`);
  }
  if (spotId) {
    values.push(Number(spotId));
    filters.push(`d.spot_id = $${values.length}`);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const countResult = await query(`SELECT COUNT(*)::int AS total FROM diaries d ${whereClause}`, values);

  values.push(Number(limit), Number(offset));
  const rowsResult = await query(
    `
      ${baseSelect}
      ${whereClause}
      ORDER BY d.id DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `,
    values
  );

  return {
    data: rowsResult.rows.map(mapDiary),
    total: countResult.rows[0]?.total || 0,
  };
}

async function findById(id) {
  const { rows } = await query(
    `
      ${baseSelect}
      WHERE d.id = $1
    `,
    [Number(id)]
  );
  return mapDiary(rows[0]);
}

async function getAll() {
  const { rows } = await query(
    `
      ${baseSelect}
      ORDER BY d.id DESC
    `
  );
  return rows.map(mapDiary);
}

async function create(data) {
  return withTransaction(async (client) => {
    const inserted = await client.query(
      `
        INSERT INTO diaries (
          user_id, user_name, user_avatar, title, content, spot_id, spot_name,
          cover_image, rating, visit_date, weather, mood, likes_count, views_count,
          created_at, updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, 0, 0,
          NOW(), NOW()
        )
        RETURNING id
      `,
      [
        Number(data.userId),
        data.userName || null,
        data.userAvatar || null,
        data.title,
        data.content,
        data.spotId ? Number(data.spotId) : null,
        data.spotName || null,
        data.coverImage || null,
        data.rating ?? 0,
        data.visitDate ? new Date(data.visitDate) : null,
        data.weather || null,
        data.mood || null,
      ]
    );

    const diaryId = inserted.rows[0].id;
    for (const tag of data.tags || []) {
      await client.query('INSERT INTO diary_tags (diary_id, tag) VALUES ($1, $2)', [diaryId, tag]);
    }

    return findById(diaryId);
  });
}

async function update(id, data) {
  const existing = await findById(id);
  if (!existing) return null;

  return withTransaction(async (client) => {
    const merged = { ...existing, ...data };
    await client.query(
      `
        UPDATE diaries
        SET
          user_id = $1,
          user_name = $2,
          user_avatar = $3,
          title = $4,
          content = $5,
          spot_id = $6,
          spot_name = $7,
          cover_image = $8,
          rating = $9,
          visit_date = $10,
          weather = $11,
          mood = $12,
          likes_count = $13,
          views_count = $14,
          updated_at = NOW()
        WHERE id = $15
      `,
      [
        Number(merged.userId),
        merged.userName || null,
        merged.userAvatar || null,
        merged.title,
        merged.content,
        merged.spotId ? Number(merged.spotId) : null,
        merged.spotName || null,
        merged.coverImage || null,
        merged.rating ?? 0,
        merged.visitDate ? new Date(merged.visitDate) : null,
        merged.weather || null,
        merged.mood || null,
        merged.likes ?? 0,
        merged.views ?? 0,
        Number(id),
      ]
    );

    if (data.tags) {
      await client.query('DELETE FROM diary_tags WHERE diary_id = $1', [Number(id)]);
      for (const tag of data.tags) {
        await client.query('INSERT INTO diary_tags (diary_id, tag) VALUES ($1, $2)', [Number(id), tag]);
      }
    }

    return findById(id);
  });
}

async function remove(id) {
  const result = await query('DELETE FROM diaries WHERE id = $1', [Number(id)]);
  return result.rowCount > 0;
}

async function like(id) {
  const result = await query(
    `
      UPDATE diaries
      SET likes_count = likes_count + 1, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `,
    [Number(id)]
  );
  if (result.rowCount === 0) return null;
  return findById(id);
}

async function addComment(id, comment) {
  const existing = await findById(id);
  if (!existing) return null;

  await query(
    `
      INSERT INTO diary_comments (diary_id, user_id, user_name, content, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `,
    [Number(id), comment.userId ? Number(comment.userId) : null, comment.userName || null, comment.content]
  );

  return findById(id);
}

module.exports = {
  findAll,
  findById,
  getAll,
  create,
  update,
  delete: remove,
  like,
  addComment,
};
