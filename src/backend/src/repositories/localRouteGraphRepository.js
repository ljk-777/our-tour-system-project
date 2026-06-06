const { query } = require('../db');

async function getAll() {
  const [{ rows: graphRows }, { rows: nodeRows }, { rows: edgeRows }] = await Promise.all([
    query(`
      SELECT id, name, type, width, height, description
      FROM local_route_graphs
      ORDER BY
        CASE
          WHEN id ~ '^spot-[0-9]+$' THEN substring(id from 6)::int
          ELSE 2147483647
        END,
        id
    `),
    query(`
      SELECT graph_id, node_key, name, type, x, y, metadata
      FROM local_route_nodes
      ORDER BY
        CASE
          WHEN graph_id ~ '^spot-[0-9]+$' THEN substring(graph_id from 6)::int
          ELSE 2147483647
        END,
        graph_id,
        node_key
    `),
    query(`
      SELECT
        graph_id,
        from_node_key AS "from",
        to_node_key AS "to",
        dist,
        transport,
        congestion,
        ideal_speed_kmh AS "idealSpeedKmh",
        bike_allowed AS "bikeAllowed",
        metadata
      FROM local_route_edges
      ORDER BY
        CASE
          WHEN graph_id ~ '^spot-[0-9]+$' THEN substring(graph_id from 6)::int
          ELSE 2147483647
        END,
        graph_id,
        id
    `),
  ]);

  const nodesByGraph = new Map();
  for (const row of nodeRows) {
    if (!nodesByGraph.has(row.graph_id)) nodesByGraph.set(row.graph_id, []);
    nodesByGraph.get(row.graph_id).push({
      id: Number(row.node_key),
      name: row.name,
      type: row.type,
      x: Number(row.x),
      y: Number(row.y),
      ...(row.metadata || {}),
    });
  }

  const edgesByGraph = new Map();
  for (const row of edgeRows) {
    if (!edgesByGraph.has(row.graph_id)) edgesByGraph.set(row.graph_id, []);
    const edge = {
      from: Number(row.from),
      to: Number(row.to),
      dist: Number(row.dist),
      transport: row.transport,
      congestion: Number(row.congestion),
      idealSpeedKmh: Number(row.idealSpeedKmh),
    };
    if (row.bikeAllowed === false) edge.bikeAllowed = false;
    edgesByGraph.get(row.graph_id).push({ ...edge, ...(row.metadata || {}) });
  }

  return graphRows.map((graph) => ({
    id: graph.id,
    name: graph.name,
    type: graph.type,
    size: {
      width: Number(graph.width),
      height: Number(graph.height),
    },
    description: graph.description || '',
    nodes: nodesByGraph.get(graph.id) || [],
    edges: edgesByGraph.get(graph.id) || [],
  }));
}

module.exports = {
  getAll,
};
