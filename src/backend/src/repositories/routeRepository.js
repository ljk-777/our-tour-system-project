const { query } = require('../db');

async function getAll() {
  const { rows } = await query(
    `
      SELECT
        from_spot_id AS "from",
        to_spot_id AS "to",
        dist,
        time_cost AS time,
        transport
      FROM route_edges
      ORDER BY id
    `
  );
  return rows;
}

module.exports = {
  getAll,
};
