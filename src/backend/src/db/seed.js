const { withTransaction } = require('./index');
const { users } = require('../data/users');
const { spots } = require('../data/spots');
const { diaries } = require('../data/diaries');
const { edges } = require('../data/graph');

function toDate(value) {
  return value ? new Date(value) : null;
}

async function seedDatabase() {
  await withTransaction(async (client) => {
    await client.query('TRUNCATE diary_comments, diary_tags, diaries, route_edges, spot_tags, spots, users RESTART IDENTITY CASCADE');

    for (const user of users) {
      await client.query(
        `
          INSERT INTO users (
            id, username, nickname, email, avatar, city, level, bio,
            total_diaries, total_spots, join_date, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        `,
        [
          user.id,
          user.username || user.name,
          user.nickname || null,
          user.email || null,
          user.avatar || null,
          user.city || null,
          user.level || null,
          user.bio || null,
          user.totalDiaries || 0,
          user.totalSpots || 0,
          toDate(user.joinDate),
        ]
      );
    }

    for (const spot of spots) {
      await client.query(
        `
          INSERT INTO spots (
            id, name, type, city, province, lat, lng, description, rating,
            visit_time, entrance_fee, open_hours, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        `,
        [
          spot.id,
          spot.name,
          spot.type,
          spot.city || null,
          spot.province || null,
          spot.lat ?? null,
          spot.lng ?? null,
          spot.description || null,
          spot.rating ?? 0,
          spot.visitTime ?? 0,
          spot.entranceFee ?? 0,
          spot.openHours || null,
        ]
      );

      for (const tag of spot.tags || []) {
        await client.query('INSERT INTO spot_tags (spot_id, tag) VALUES ($1, $2)', [spot.id, tag]);
      }
    }

    for (const edge of edges) {
      await client.query(
        `
          INSERT INTO route_edges (from_spot_id, to_spot_id, dist, time_cost, transport)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [edge.from, edge.to, edge.dist, edge.time, edge.transport]
      );
    }

    for (const diary of diaries) {
      await client.query(
        `
          INSERT INTO diaries (
            id, user_id, user_name, user_avatar, spot_id, spot_name, title, content,
            cover_image, rating, visit_date, weather, mood, likes_count, views_count,
            created_at, updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13, $14, $15,
            $16, $16
          )
        `,
        [
          diary.id,
          diary.userId,
          diary.userName || null,
          diary.userAvatar || null,
          diary.spotId || null,
          diary.spotName || null,
          diary.title,
          diary.content,
          diary.coverImage || null,
          diary.rating ?? 0,
          toDate(diary.visitDate),
          diary.weather || null,
          diary.mood || null,
          diary.likes || 0,
          diary.views || 0,
          diary.createdAt ? new Date(diary.createdAt) : new Date(),
        ]
      );

      for (const tag of diary.tags || []) {
        await client.query('INSERT INTO diary_tags (diary_id, tag) VALUES ($1, $2)', [diary.id, tag]);
      }

      if (Array.isArray(diary.comments)) {
        for (const comment of diary.comments) {
          await client.query(
            `
              INSERT INTO diary_comments (diary_id, user_id, user_name, content, created_at)
              VALUES ($1, $2, $3, $4, $5)
            `,
            [
              diary.id,
              comment.userId || null,
              comment.userName || null,
              comment.content || '',
              comment.createdAt ? new Date(comment.createdAt) : new Date(),
            ]
          );
        }
      }
    }

    await client.query("SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1), true)");
    await client.query("SELECT setval(pg_get_serial_sequence('spots', 'id'), COALESCE((SELECT MAX(id) FROM spots), 1), true)");
    await client.query("SELECT setval(pg_get_serial_sequence('diaries', 'id'), COALESCE((SELECT MAX(id) FROM diaries), 1), true)");
  });
}

module.exports = {
  seedDatabase,
};
