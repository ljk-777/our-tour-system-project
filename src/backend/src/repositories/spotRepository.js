const { query, withTransaction } = require('../db');

function mapSpot(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    type: row.type,
    city: row.city,
    province: row.province,
    lat: row.lat === null ? null : Number(row.lat),
    lng: row.lng === null ? null : Number(row.lng),
    description: row.description,
    rating: row.rating === null ? null : Number(row.rating),
    tags: row.tags || [],
    visitTime: row.visit_time === null ? null : Number(row.visit_time),
    entranceFee: row.entrance_fee === null ? null : Number(row.entrance_fee),
    openHours: row.open_hours,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const baseSelect = `
  SELECT
    s.*,
    COALESCE(array_agg(st.tag ORDER BY st.tag) FILTER (WHERE st.tag IS NOT NULL), '{}') AS tags
  FROM spots s
  LEFT JOIN spot_tags st ON st.spot_id = s.id
`;

async function findAll({ type, city, province, limit = 20, offset = 0 } = {}) {
  const filters = [];
  const values = [];

  if (type) {
    values.push(type);
    filters.push(`s.type = $${values.length}`);
  }
  if (city) {
    values.push(city);
    filters.push(`s.city = $${values.length}`);
  }
  if (province) {
    values.push(province);
    filters.push(`s.province = $${values.length}`);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const countResult = await query(`SELECT COUNT(*)::int AS total FROM spots s ${whereClause}`, values);

  values.push(Number(limit), Number(offset));
  const rowsResult = await query(
    `
      ${baseSelect}
      ${whereClause}
      GROUP BY s.id
      ORDER BY s.id
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `,
    values
  );

  return {
    data: rowsResult.rows.map(mapSpot),
    total: countResult.rows[0]?.total || 0,
  };
}

async function findById(id) {
  const { rows } = await query(
    `
      ${baseSelect}
      WHERE s.id = $1
      GROUP BY s.id
    `,
    [Number(id)]
  );
  return mapSpot(rows[0]);
}

async function findByIds(ids) {
  const { rows } = await query(
    `
      ${baseSelect}
      WHERE s.id = ANY($1::bigint[])
      GROUP BY s.id
      ORDER BY s.id
    `,
    [ids.map(Number)]
  );
  return rows.map(mapSpot);
}

async function getAll() {
  const { rows } = await query(
    `
      ${baseSelect}
      GROUP BY s.id
      ORDER BY s.id
    `
  );
  return rows.map(mapSpot);
}

async function findByType(type) {
  const { rows } = await query(
    `
      ${baseSelect}
      WHERE s.type = $1
      GROUP BY s.id
      ORDER BY s.id
    `,
    [type]
  );
  return rows.map(mapSpot);
}

async function create(data) {
  return withTransaction(async (client) => {
    const inserted = await client.query(
      `
        INSERT INTO spots (
          name, type, city, province, lat, lng, description, rating,
          visit_time, entrance_fee, open_hours, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING id
      `,
      [
        data.name,
        data.type,
        data.city || null,
        data.province || null,
        data.lat ?? null,
        data.lng ?? null,
        data.description || null,
        data.rating ?? 0,
        data.visitTime ?? 0,
        data.entranceFee ?? 0,
        data.openHours || null,
      ]
    );

    const spotId = inserted.rows[0].id;
    for (const tag of data.tags || []) {
      await client.query('INSERT INTO spot_tags (spot_id, tag) VALUES ($1, $2)', [spotId, tag]);
    }

    return findById(spotId);
  });
}

async function update(id, data) {
  const existing = await findById(id);
  if (!existing) return null;

  return withTransaction(async (client) => {
    const merged = { ...existing, ...data };

    await client.query(
      `
        UPDATE spots
        SET
          name = $1,
          type = $2,
          city = $3,
          province = $4,
          lat = $5,
          lng = $6,
          description = $7,
          rating = $8,
          visit_time = $9,
          entrance_fee = $10,
          open_hours = $11,
          updated_at = NOW()
        WHERE id = $12
      `,
      [
        merged.name,
        merged.type,
        merged.city || null,
        merged.province || null,
        merged.lat ?? null,
        merged.lng ?? null,
        merged.description || null,
        merged.rating ?? 0,
        merged.visitTime ?? 0,
        merged.entranceFee ?? 0,
        merged.openHours || null,
        Number(id),
      ]
    );

    if (data.tags) {
      await client.query('DELETE FROM spot_tags WHERE spot_id = $1', [Number(id)]);
      for (const tag of data.tags) {
        await client.query('INSERT INTO spot_tags (spot_id, tag) VALUES ($1, $2)', [Number(id), tag]);
      }
    }

    return findById(id);
  });
}

async function remove(id) {
  const result = await query('DELETE FROM spots WHERE id = $1', [Number(id)]);
  return result.rowCount > 0;
}

module.exports = {
  findAll,
  findById,
  findByIds,
  getAll,
  findByType,
  create,
  update,
  delete: remove,
};
