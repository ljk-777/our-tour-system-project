const { execFileSync } = require('child_process');
const { spots } = require('../src/data/spots');
const { withTransaction, pool } = require('../src/db');

const DEFAULT_SPOT_IDS = [1, 3, 4, 5, 7, 10, 11, 13, 22, 23, 35, 36];
const MAP_WIDTH = 1000;
const MAP_HEIGHT = 650;
const PADDING = 42;
const ROAD_SHAPE_SPACING_METERS = 55;

const HIGHWAY_RE = 'footway|path|pedestrian|service|residential|living_street|steps|cycleway|tertiary|secondary|primary|unclassified';
const AMENITY_RE = 'toilets|restaurant|cafe|fast_food|parking|drinking_water|clinic|hospital|bank|atm|pharmacy|library|bicycle_parking|charging_station|police|post_office';
const TOURISM_RE = 'information|attraction|museum|viewpoint|picnic_site';

function parseArgs() {
  const args = new Map();
  for (const item of process.argv.slice(2)) {
    const [key, value = 'true'] = item.replace(/^--/, '').split('=');
    args.set(key, value);
  }
  const ids = args.has('ids')
    ? args.get('ids').split(',').map(Number).filter(Boolean)
    : DEFAULT_SPOT_IDS;
  return {
    ids,
    keepExisting: args.get('keep-existing') === 'true',
    radius: Number(args.get('radius') || 1200),
  };
}

function overpassQuery(spot, radius) {
  return `
[out:json][timeout:40];
(
  way(around:${radius},${spot.lat},${spot.lng})[highway~"${HIGHWAY_RE}"];
  node(around:${radius},${spot.lat},${spot.lng})[amenity~"${AMENITY_RE}"];
  way(around:${radius},${spot.lat},${spot.lng})[amenity~"${AMENITY_RE}"];
  node(around:${radius},${spot.lat},${spot.lng})[shop];
  way(around:${radius},${spot.lat},${spot.lng})[shop];
  node(around:${radius},${spot.lat},${spot.lng})[tourism~"${TOURISM_RE}"];
  way(around:${radius},${spot.lat},${spot.lng})[tourism~"${TOURISM_RE}"];
);
out body;
>;
out skel qt;`;
}

function fetchOverpass(spot, radius) {
  const stdout = execFileSync(
    `${process.env.WINDIR || 'C:\\Windows'}\\System32\\curl.exe`,
    [
      '-L',
      '--max-time',
      '70',
      '-X',
      'POST',
      '--data-urlencode',
      `data=${overpassQuery(spot, radius)}`,
      'https://overpass-api.de/api/interpreter',
    ],
    { encoding: 'utf8', maxBuffer: 80 * 1024 * 1024 }
  );
  return JSON.parse(stdout);
}

function haversine(a, b) {
  const earth = 6371000;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  return 2 * earth * Math.asin(Math.sqrt(sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon));
}

function classifyPoi(tags = {}) {
  if (tags.amenity === 'toilets') return '洗手间';
  if (['restaurant', 'fast_food'].includes(tags.amenity)) return '饭店';
  if (tags.amenity === 'cafe') return '咖啡馆';
  if (tags.amenity === 'library') return '图书馆';
  if (tags.amenity === 'hospital' || tags.amenity === 'clinic' || tags.amenity === 'pharmacy') return '医疗点';
  if (tags.amenity === 'parking' || tags.amenity === 'bicycle_parking') return '停车点';
  if (tags.amenity === 'drinking_water') return '饮水点';
  if (tags.amenity === 'bank' || tags.amenity === 'atm') return '金融服务';
  if (tags.shop) return tags.shop === 'supermarket' || tags.shop === 'convenience' ? '超市' : '商店';
  if (tags.tourism === 'information') return '游客中心';
  if (tags.tourism === 'viewpoint') return '观景点';
  if (tags.tourism === 'museum') return '场馆';
  return '景点';
}

function transportFromTags(tags = {}) {
  if (tags.highway === 'cycleway') return 'bike';
  return 'walk';
}

function speedFromTags(tags = {}) {
  if (tags.highway === 'cycleway') return 14;
  if (tags.highway === 'steps') return 3.2;
  if (tags.highway === 'service') return 5.2;
  return 4.8;
}

function congestionFromTags(tags = {}) {
  if (tags.highway === 'pedestrian') return 0.78;
  if (tags.highway === 'steps') return 0.68;
  if (tags.highway === 'cycleway') return 0.86;
  if (tags.highway === 'service') return 0.9;
  return 0.82;
}

function centroidOfWay(way, nodeById) {
  const pts = (way.nodes || []).map((id) => nodeById.get(id)).filter(Boolean);
  if (!pts.length) return null;
  return {
    lat: pts.reduce((sum, point) => sum + point.lat, 0) / pts.length,
    lon: pts.reduce((sum, point) => sum + point.lon, 0) / pts.length,
  };
}

function largestComponent(nodeIds, rawEdges) {
  const adjacency = new Map(nodeIds.map((id) => [id, []]));
  for (const edge of rawEdges) {
    adjacency.get(edge.from)?.push(edge.to);
    adjacency.get(edge.to)?.push(edge.from);
  }

  const visited = new Set();
  let best = new Set();
  for (const id of nodeIds) {
    if (visited.has(id)) continue;
    const stack = [id];
    const component = new Set();
    visited.add(id);
    while (stack.length) {
      const current = stack.pop();
      component.add(current);
      for (const next of adjacency.get(current) || []) {
        if (!visited.has(next)) {
          visited.add(next);
          stack.push(next);
        }
      }
    }
    if (component.size > best.size) best = component;
  }
  return best;
}

function compressRoadNetwork(highwayWays, nodeById, component) {
  const degree = new Map();
  for (const way of highwayWays) {
    const ids = (way.nodes || []).filter((id) => component.has(id) && nodeById.has(id));
    for (let i = 0; i < ids.length - 1; i += 1) {
      degree.set(ids[i], (degree.get(ids[i]) || 0) + 1);
      degree.set(ids[i + 1], (degree.get(ids[i + 1]) || 0) + 1);
    }
  }

  const nodeIds = new Set();
  const edgeByKey = new Map();

  for (const way of highwayWays) {
    const ids = (way.nodes || []).filter((id) => component.has(id) && nodeById.has(id));
    if (ids.length < 2) continue;

    const keep = new Set([ids[0], ids[ids.length - 1]]);
    for (const id of ids) {
      if ((degree.get(id) || 0) !== 2) keep.add(id);
    }

    let lastKept = ids[0];
    let accum = 0;
    for (let i = 1; i < ids.length - 1; i += 1) {
      accum += haversine(nodeById.get(ids[i - 1]), nodeById.get(ids[i]));
      if (keep.has(ids[i]) || accum >= ROAD_SHAPE_SPACING_METERS) {
        keep.add(ids[i]);
        lastKept = ids[i];
        accum = 0;
      }
    }
    if (lastKept !== ids[ids.length - 1]) keep.add(ids[ids.length - 1]);

    let prev = null;
    let dist = 0;
    for (let i = 0; i < ids.length; i += 1) {
      const id = ids[i];
      if (i > 0) dist += haversine(nodeById.get(ids[i - 1]), nodeById.get(id));
      if (!keep.has(id)) continue;
      nodeIds.add(id);
      if (prev !== null && prev !== id && dist > 0) {
        nodeIds.add(prev);
        const [a, b] = [prev, id].sort((left, right) => left - right);
        const key = `${a}-${b}`;
        const edge = {
          from: prev,
          to: id,
          dist: Math.max(3, Math.round(dist)),
          tags: way.tags || {},
          wayId: way.id,
        };
        const existing = edgeByKey.get(key);
        if (!existing || edge.dist < existing.dist) edgeByKey.set(key, edge);
      }
      prev = id;
      dist = 0;
    }
  }

  return {
    nodeIds,
    edges: [...edgeByKey.values()],
  };
}

function buildGraph(spot, osm, radius) {
  const nodeById = new Map();
  const ways = [];
  const pois = [];

  for (const el of osm.elements || []) {
    if (el.type === 'node' && typeof el.lat === 'number' && typeof el.lon === 'number') {
      nodeById.set(el.id, { id: el.id, lat: el.lat, lon: el.lon, tags: el.tags || {} });
      if (el.tags && (el.tags.amenity || el.tags.shop || el.tags.tourism)) pois.push(el);
    } else if (el.type === 'way') {
      ways.push(el);
      if (el.tags && (el.tags.amenity || el.tags.shop || el.tags.tourism)) pois.push(el);
    }
  }

  const highwayWays = ways.filter((way) => way.tags?.highway && Array.isArray(way.nodes) && way.nodes.length > 1);
  const rawEdges = [];
  const roadNodeIds = new Set();
  for (const way of highwayWays) {
    for (let i = 0; i < way.nodes.length - 1; i += 1) {
      const from = way.nodes[i];
      const to = way.nodes[i + 1];
      if (!nodeById.has(from) || !nodeById.has(to)) continue;
      roadNodeIds.add(from);
      roadNodeIds.add(to);
      rawEdges.push({ from, to, tags: way.tags || {}, wayId: way.id });
    }
  }

  const component = largestComponent([...roadNodeIds], rawEdges);
  const compressedRoads = compressRoadNetwork(highwayWays, nodeById, component);
  const roadEdges = compressedRoads.edges;
  const usedRoadIds = compressedRoads.nodeIds;
  if (usedRoadIds.size < 60 || roadEdges.length < 90) {
    throw new Error(`${spot.name} road network too small at ${radius}m: ${usedRoadIds.size} nodes, ${roadEdges.length} edges`);
  }

  const roadPoints = [...usedRoadIds].map((id) => nodeById.get(id));
  const poiItems = pois
    .map((item) => {
      const point = item.type === 'node' ? nodeById.get(item.id) : centroidOfWay(item, nodeById);
      if (!point || !item.tags) return null;
      return {
        osmId: item.id,
        name: item.tags.name || item.tags['name:zh'] || item.tags['name:en'] || classifyPoi(item.tags),
        type: classifyPoi(item.tags),
        lat: point.lat,
        lon: point.lon,
        tags: item.tags,
      };
    })
    .filter(Boolean)
    .filter((poi, index, arr) => arr.findIndex((item) => item.name === poi.name && item.type === poi.type) === index)
    .sort((a, b) => haversine({ lat: spot.lat, lon: spot.lng }, a) - haversine({ lat: spot.lat, lon: spot.lng }, b))
    .slice(0, 80);

  const allGeo = [...roadPoints, ...poiItems, { lat: spot.lat, lon: spot.lng }];
  const minLat = Math.min(...allGeo.map((p) => p.lat));
  const maxLat = Math.max(...allGeo.map((p) => p.lat));
  const minLon = Math.min(...allGeo.map((p) => p.lon));
  const maxLon = Math.max(...allGeo.map((p) => p.lon));
  const project = (point) => ({
    x: Math.round(PADDING + ((point.lon - minLon) / Math.max(0.000001, maxLon - minLon)) * (MAP_WIDTH - PADDING * 2)),
    y: Math.round(PADDING + ((maxLat - point.lat) / Math.max(0.000001, maxLat - minLat)) * (MAP_HEIGHT - PADDING * 2)),
  });

  const nodes = [...usedRoadIds].map((id, index) => {
    const point = nodeById.get(id);
    return {
      id,
      name: `道路点 ${index + 1}`,
      type: '道路点',
      ...project(point),
      routingOnly: true,
      osmType: 'node',
      osmId: id,
    };
  });

  const edges = roadEdges.map((edge) => {
    const transport = transportFromTags(edge.tags);
    return {
      from: edge.from,
      to: edge.to,
      dist: edge.dist,
      transport,
      congestion: congestionFromTags(edge.tags),
      idealSpeedKmh: speedFromTags(edge.tags),
      bikeAllowed: edge.tags.highway !== 'steps',
      osmWayId: edge.wayId,
      highway: edge.tags.highway,
    };
  });

  const nearestRoadId = (point) => {
    let best = null;
    let bestDist = Infinity;
    for (const id of usedRoadIds) {
      const dist = haversine(point, nodeById.get(id));
      if (dist < bestDist) {
        bestDist = dist;
        best = id;
      }
    }
    return { id: best, dist: bestDist };
  };

  const spotNodeId = Number(`${spot.id}900001`);
  nodes.push({
    id: spotNodeId,
    name: spot.name,
    type: '景点',
    ...project({ lat: spot.lat, lon: spot.lng }),
    routingOnly: false,
    sourceSpotId: spot.id,
  });
  const spotAccess = nearestRoadId({ lat: spot.lat, lon: spot.lng });
  if (spotAccess.id) {
    edges.push({
      from: spotNodeId,
      to: spotAccess.id,
      dist: Math.max(8, Math.round(spotAccess.dist)),
      transport: 'walk',
      congestion: 0.82,
      idealSpeedKmh: 4.8,
      bikeAllowed: true,
      access: true,
    });
  }

  let poiCounter = 1;
  for (const poi of poiItems) {
    const id = Number(`${spot.id}${String(910000 + poiCounter).slice(-6)}`);
    poiCounter += 1;
    nodes.push({
      id,
      name: poi.name,
      type: poi.type,
      ...project(poi),
      routingOnly: false,
      osmType: 'poi',
      osmId: poi.osmId,
    });
    const access = nearestRoadId(poi);
    if (access.id) {
      edges.push({
        from: id,
        to: access.id,
        dist: Math.max(8, Math.round(access.dist)),
        transport: 'walk',
        congestion: 0.78,
        idealSpeedKmh: 4.5,
        bikeAllowed: true,
        access: true,
      });
    }
  }

  return {
    id: `spot-${spot.id}`,
    name: `${spot.name}真实路网图`,
    type: 'scenic',
    description: `OSM真实步行/骑行路网，半径${radius}米；道路折点参与算法，服务设施来自真实POI。`,
    size: { width: MAP_WIDTH, height: MAP_HEIGHT },
    nodes,
    edges,
  };
}

async function saveGraph(client, graph) {
  await client.query('DELETE FROM local_route_edges WHERE graph_id = $1', [graph.id]);
  await client.query('DELETE FROM local_route_nodes WHERE graph_id = $1', [graph.id]);
  await client.query('DELETE FROM local_route_graphs WHERE id = $1', [graph.id]);
  await client.query(
    `INSERT INTO local_route_graphs (id, name, type, width, height, description)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [graph.id, graph.name, graph.type, graph.size.width, graph.size.height, graph.description]
  );

  for (const node of graph.nodes) {
    const { id, name, type, x, y, ...metadata } = node;
    await client.query(
      `INSERT INTO local_route_nodes (graph_id, node_key, name, type, x, y, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [graph.id, id, name, type, x, y, metadata]
    );
  }

  for (const edge of graph.edges) {
    const { from, to, dist, transport, congestion, idealSpeedKmh, bikeAllowed = true, ...metadata } = edge;
    await client.query(
      `INSERT INTO local_route_edges (
        graph_id, from_node_key, to_node_key, dist, transport,
        congestion, ideal_speed_kmh, bike_allowed, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [graph.id, from, to, dist, transport, congestion, idealSpeedKmh, bikeAllowed, metadata]
    );
  }
}

async function main() {
  const options = parseArgs();
  const candidates = spots.filter((spot) => options.ids.includes(Number(spot.id)) && spot.lat && spot.lng);
  if (!candidates.length) throw new Error('No matching spots with coordinates.');

  const imported = [];
  const skipped = [];

  await withTransaction(async (client) => {
    if (!options.keepExisting) {
      await client.query(`DELETE FROM local_route_edges WHERE graph_id LIKE 'spot-%' OR graph_id LIKE 'osm-%'`);
      await client.query(`DELETE FROM local_route_nodes WHERE graph_id LIKE 'spot-%' OR graph_id LIKE 'osm-%'`);
      await client.query(`DELETE FROM local_route_graphs WHERE id LIKE 'spot-%' OR id LIKE 'osm-%'`);
    }

    for (const spot of candidates) {
      let graph = null;
      let lastError = null;
      for (const radius of [options.radius, 1600, 2200]) {
        try {
          const osm = fetchOverpass(spot, radius);
          graph = buildGraph(spot, osm, radius);
          break;
        } catch (error) {
          lastError = error;
        }
      }

      if (!graph) {
        skipped.push({ id: spot.id, name: spot.name, reason: lastError?.message || 'unknown' });
        continue;
      }
      await saveGraph(client, graph);
      imported.push({
        id: graph.id,
        name: graph.name,
        nodes: graph.nodes.length,
        edges: graph.edges.length,
        selectable: graph.nodes.filter((node) => !node.routingOnly).length,
      });
    }
  });

  console.log(JSON.stringify({ imported, skipped }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
