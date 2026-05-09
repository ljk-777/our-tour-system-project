const { query } = require('../db');

const TTL_MS = {
  tips: 24 * 60 * 60 * 1000,
  poi: 3 * 24 * 60 * 60 * 1000,
  route: 24 * 60 * 60 * 1000,
  weather: 2 * 60 * 60 * 1000,
};

function isFresh(updatedAt, ttl) {
  return Date.now() - new Date(updatedAt).getTime() < ttl;
}

async function findPoi(keyword, city = '', types = '', kind = 'poi') {
  const sql = `
    SELECT result_json, updated_at
    FROM amap_poi_cache
    WHERE keyword = $1 AND COALESCE(city, '') = $2 AND COALESCE(types, '') = $3
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  const { rows } = await query(sql, [keyword, city, `${kind}:${types}`]);
  if (rows.length === 0 || !isFresh(rows[0].updated_at, TTL_MS[kind] || TTL_MS.poi)) return null;
  return rows[0].result_json;
}

async function upsertPoi(keyword, city = '', types = '', result, kind = 'poi') {
  const sql = `
    INSERT INTO amap_poi_cache (keyword, city, types, result_json, updated_at)
    VALUES ($1, $2, $3, $4::jsonb, NOW())
  `;
  await query(sql, [keyword, city, `${kind}:${types}`, JSON.stringify(result)]);
}

async function findRoute(origin, destination, mode) {
  const sql = `
    SELECT result_json, updated_at
    FROM amap_route_cache
    WHERE origin = $1 AND destination = $2 AND mode = $3
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  const { rows } = await query(sql, [origin, destination, mode]);
  if (rows.length === 0 || !isFresh(rows[0].updated_at, TTL_MS.route)) return null;
  return rows[0].result_json;
}

async function upsertRoute(origin, destination, mode, result) {
  const sql = `
    INSERT INTO amap_route_cache (origin, destination, mode, result_json, updated_at)
    VALUES ($1, $2, $3, $4::jsonb, NOW())
  `;
  await query(sql, [origin, destination, mode, JSON.stringify(result)]);
}

async function findWeather(city) {
  const sql = `
    SELECT result_json, updated_at
    FROM amap_weather_cache
    WHERE city = $1
    LIMIT 1
  `;
  const { rows } = await query(sql, [city]);
  if (rows.length === 0 || !isFresh(rows[0].updated_at, TTL_MS.weather)) return null;
  return rows[0].result_json;
}

async function upsertWeather(city, result) {
  const sql = `
    INSERT INTO amap_weather_cache (city, result_json, updated_at)
    VALUES ($1, $2::jsonb, NOW())
    ON CONFLICT (city)
    DO UPDATE SET result_json = EXCLUDED.result_json, updated_at = NOW()
  `;
  await query(sql, [city, JSON.stringify(result)]);
}

module.exports = {
  findPoi,
  upsertPoi,
  findRoute,
  upsertRoute,
  findWeather,
  upsertWeather,
};
