const { withTransaction, pool } = require('../src/db');

const CAMPUS_GRAPH_IDS = ['real-bupt-shahe', 'real-bupt-xitucheng'];

async function main() {
  await withTransaction(async (client) => {
    await client.query(
      `
        DELETE FROM local_route_edges
        WHERE graph_id = ANY($1)
          AND (
            metadata->>'syntheticFacility' = 'true'
            OR from_node_key IN (
              SELECT node_key
              FROM local_route_nodes
              WHERE graph_id = ANY($1)
                AND metadata->>'syntheticFacility' = 'true'
            )
            OR to_node_key IN (
              SELECT node_key
              FROM local_route_nodes
              WHERE graph_id = ANY($1)
                AND metadata->>'syntheticFacility' = 'true'
            )
          )
      `,
      [CAMPUS_GRAPH_IDS]
    );

    await client.query(
      `
        DELETE FROM local_route_nodes
        WHERE graph_id = ANY($1)
          AND metadata->>'syntheticFacility' = 'true'
      `,
      [CAMPUS_GRAPH_IDS]
    );
  });

  const { rows } = await pool.query(
    `
      SELECT
        g.id,
        g.name,
        COUNT(DISTINCT n.id)::int AS nodes,
        COUNT(DISTINCT e.id)::int AS edges
      FROM local_route_graphs g
      LEFT JOIN local_route_nodes n ON n.graph_id = g.id
      LEFT JOIN local_route_edges e ON e.graph_id = g.id
      WHERE g.id = ANY($1)
      GROUP BY g.id, g.name
      ORDER BY g.id
    `,
    [CAMPUS_GRAPH_IDS]
  );

  console.table(rows);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
