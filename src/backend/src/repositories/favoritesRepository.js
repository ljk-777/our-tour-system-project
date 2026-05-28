const { query } = require('../db');

async function addFavorite(userId, spotId) {
  await query(
    'INSERT INTO user_favorites (user_id, spot_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [Number(userId), Number(spotId)]
  );
}

async function removeFavorite(userId, spotId) {
  await query(
    'DELETE FROM user_favorites WHERE user_id = $1 AND spot_id = $2',
    [Number(userId), Number(spotId)]
  );
}

async function getUserFavoriteIds(userId) {
  const { rows } = await query(
    'SELECT spot_id FROM user_favorites WHERE user_id = $1 ORDER BY created_at DESC',
    [Number(userId)]
  );
  return rows.map(r => Number(r.spot_id));
}

async function getUserFavorites(userId) {
  const { rows } = await query(
    `SELECT s.id, s.name, s.type, s.city, s.province, s.rating,
            s.image_url, s.description, s.entrance_fee, s.open_hours,
            uf.created_at AS favorited_at
     FROM user_favorites uf
     JOIN spots s ON s.id = uf.spot_id
     WHERE uf.user_id = $1
     ORDER BY uf.created_at DESC`,
    [Number(userId)]
  );
  return rows.map(row => ({
    id:          Number(row.id),
    name:        row.name,
    type:        row.type,
    city:        row.city,
    province:    row.province,
    rating:      Number(row.rating || 0),
    imageUrl:    row.image_url,
    description: row.description,
    entranceFee: row.entrance_fee != null ? Number(row.entrance_fee) : null,
    openHours:   row.open_hours,
    favoritedAt: row.favorited_at,
  }));
}

module.exports = { addFavorite, removeFavorite, getUserFavoriteIds, getUserFavorites };
