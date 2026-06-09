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
    videoUrl: row.video_url || null,
    tags: row.tags || [],
    rating: row.rating === null ? null : Number(row.rating),
    ratingCount: Number(row.rating_count || 0),
    visitDate: row.visit_date_text || row.visit_date,
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
    d.visit_date::text AS visit_date_text,
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
  const diaryId = await withTransaction(async (client) => {
    const inserted = await client.query(
      `
        INSERT INTO diaries (
          user_id, user_name, user_avatar, title, content, spot_id, spot_name,
          cover_image, video_url, rating, visit_date, weather, mood, likes_count, views_count,
          created_at, updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13, 0, 0,
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
        data.videoUrl || null,
        data.rating ?? 0,
        data.visitDate || null,
        data.weather || null,
        data.mood || null,
      ]
    );

    const newDiaryId = inserted.rows[0].id;
    for (const tag of data.tags || []) {
      await client.query('INSERT INTO diary_tags (diary_id, tag) VALUES ($1, $2)', [newDiaryId, tag]);
    }

    return newDiaryId;
  });

  return findById(diaryId);
}

async function update(id, data) {
  const existing = await findById(id);
  if (!existing) return null;

  await withTransaction(async (client) => {
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
        merged.visitDate || null,
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
  });

  return findById(id);
}

async function remove(id) {
  const result = await query('DELETE FROM diaries WHERE id = $1', [Number(id)]);
  return result.rowCount > 0;
}

async function like(userId, diaryId) {
  const result = await query('SELECT id FROM diaries WHERE id = $1', [Number(diaryId)]);
  if (result.rowCount === 0) return null;

  try {
    // Check if already liked
    const existing = await query(
      'SELECT 1 FROM user_likes WHERE user_id = $1 AND diary_id = $2',
      [Number(userId), Number(diaryId)]
    );

    if (existing.rowCount === 0) {
      await query(
        'INSERT INTO user_likes (user_id, diary_id) VALUES ($1, $2)',
        [Number(userId), Number(diaryId)]
      );
      await query(
        `UPDATE diaries SET likes_count = likes_count + 1, updated_at = NOW() WHERE id = $1`,
        [Number(diaryId)]
      );
    }
  } catch (e) {
    // Graceful error handling — FK violation, concurrent request race, etc.
    return findById(diaryId);
  }

  return findById(diaryId);
}

async function unlike(userId, diaryId) {
  const result = await query('SELECT id FROM diaries WHERE id = $1', [Number(diaryId)]);
  if (result.rowCount === 0) return null;

  try {
    // Check if a like record exists
    const existing = await query(
      'SELECT 1 FROM user_likes WHERE user_id = $1 AND diary_id = $2',
      [Number(userId), Number(diaryId)]
    );

    if (existing.rowCount > 0) {
      await query(
        'DELETE FROM user_likes WHERE user_id = $1 AND diary_id = $2',
        [Number(userId), Number(diaryId)]
      );
      await query(
        `UPDATE diaries SET likes_count = GREATEST(likes_count - 1, 0), updated_at = NOW() WHERE id = $1`,
        [Number(diaryId)]
      );
    }
  } catch (e) {
    // Graceful error handling — FK violation, concurrent request race, etc.
    return findById(diaryId);
  }

  return findById(diaryId);
}

async function getLikedDiaryIds(userId) {
  const { rows } = await query(
    'SELECT diary_id FROM user_likes WHERE user_id = $1',
    [Number(userId)]
  );
  return rows.map(r => Number(r.diary_id));
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

async function incrementViews(id) {
  await query(
    `UPDATE diaries SET views_count = views_count + 1, updated_at = NOW() WHERE id = $1`,
    [Number(id)]
  );
}

async function rate(userId, diaryId, score) {
  const exists = await query('SELECT id FROM diaries WHERE id = $1', [Number(diaryId)]);
  if (exists.rowCount === 0) return null;

  await query(
    `INSERT INTO diary_ratings (diary_id, user_id, score, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (diary_id, user_id) DO UPDATE SET score = $3, updated_at = NOW()`,
    [Number(diaryId), Number(userId), Number(score)]
  );

  // 重新计算平均分和评分人数，更新 diaries 表
  const agg = await query(
    `SELECT AVG(score)::numeric(3,1) AS avg_score, COUNT(*) AS cnt
     FROM diary_ratings WHERE diary_id = $1`,
    [Number(diaryId)]
  );
  const { avg_score, cnt } = agg.rows[0];
  await query(
    `UPDATE diaries SET rating = $1, rating_count = $2, updated_at = NOW() WHERE id = $3`,
    [Number(avg_score) || 0, Number(cnt) || 0, Number(diaryId)]
  );

  return findById(diaryId);
}

async function getMyRating(userId, diaryId) {
  const { rows } = await query(
    `SELECT score FROM diary_ratings WHERE diary_id = $1 AND user_id = $2`,
    [Number(diaryId), Number(userId)]
  );
  return rows[0]?.score ?? null;
}

module.exports = {
  findAll,
  findById,
  getAll,
  create,
  update,
  delete: remove,
  like,
  unlike,
  getLikedDiaryIds,
  addComment,
  incrementViews,
  rate,
  getMyRating,
};
