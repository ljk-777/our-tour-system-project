const { query } = require('../db');

async function getAll() {
  const { rows } = await query(
    `
      SELECT
        from_spot_id AS "from",
        to_spot_id AS "to",
        dist,
        time_cost AS time,
        transport,
        congestion,
        ideal_speed_kmh AS "idealSpeedKmh"
      FROM route_edges
      ORDER BY id
    `
  );
  return rows;
}

module.exports = {
  getAll,
};
