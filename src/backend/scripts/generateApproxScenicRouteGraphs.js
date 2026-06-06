const { spots } = require('../src/data/spots');
const { withTransaction, pool } = require('../src/db');

const WIDTH = 1000;
const HEIGHT = 650;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;
const BUILDING_COUNT = 28;
const SERVICE_COUNT = 66;
const ROAD_RING_POINTS = 48;
const INNER_RING_POINTS = 36;
const LAKE_RING_POINTS = 28;
const GRID_COLS = 10;
const GRID_ROWS = 7;

const BUILDING_TYPES = ['景点', '场馆', '办公楼', '活动中心', '展览馆', '观景点'];
const SERVICE_TYPES = ['商店', '饭店', '洗手间', '图书馆', '食堂', '超市', '咖啡馆', '医疗点', '游客中心', '停车点', '饮水点', '金融服务'];

const BUILDING_NAMES = {
  景点: ['主入口景观', '中心广场', '历史遗迹', '主题花园', '湖畔景观', '文化打卡点'],
  场馆: ['文化展馆', '游客展厅', '非遗展示馆', '主题体验馆'],
  办公楼: ['景区管理处', '运营办公楼', '游客服务办公区'],
  活动中心: ['游客活动中心', '研学活动中心', '公共活动广场'],
  展览馆: ['地方文化展览馆', '历史陈列馆', '自然科普馆'],
  观景点: ['东侧观景点', '西侧观景点', '湖心观景台', '山门观景台'],
};

const SERVICE_NAMES = {
  商店: ['文创商店', '纪念品商店', '便利商店', '特产商店'],
  饭店: ['游客餐厅', '特色餐馆', '风味小吃店', '简餐店'],
  洗手间: ['公共洗手间', '无障碍洗手间', '东区洗手间', '西区洗手间', '南区洗手间'],
  图书馆: ['资料阅览室', '文化阅读点', '公共阅读空间'],
  食堂: ['游客食堂', '综合食堂', '风味食堂'],
  超市: ['便民超市', '游客超市', '生活超市'],
  咖啡馆: ['湖畔咖啡', '游客咖啡馆', '书吧咖啡'],
  医疗点: ['急救点', '医疗服务站', '医务室'],
  游客中心: ['游客服务中心', '导览服务点', '票务咨询处'],
  停车点: ['游客停车点', '自行车停放点', '公共停车区'],
  饮水点: ['直饮水点', '饮水补给点', '公共饮水处'],
  金融服务: ['自助取款点', '支付服务点', '银行服务点'],
};

const EXISTING_GRAPH_IDS = new Set(['spot-1', 'spot-3', 'spot-5', 'spot-7', 'spot-13', 'spot-22', 'spot-35', 'spot-36']);

function seededRandom(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function pick(list, index) {
  return list[index % list.length];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function dist(a, b) {
  return Math.max(6, Math.round(Math.hypot(a.x - b.x, a.y - b.y)));
}

function nodeKey(spotId, localId) {
  return Number(`${spotId}${String(localId).padStart(6, '0')}`);
}

function addRoadNode(nodes, spotId, localId, x, y, name) {
  const node = {
    id: nodeKey(spotId, localId),
    name,
    type: '道路点',
    x: Math.round(x),
    y: Math.round(y),
    routingOnly: true,
  };
  nodes.push(node);
  return node;
}

function addEdge(edges, from, to, transport = 'walk', extra = {}) {
  if (!from || !to || from.id === to.id) return;
  const key = [from.id, to.id].sort((a, b) => a - b).join('-');
  if (edges.some((edge) => edge.key === key && edge.transport === transport)) return;
  edges.push({
    key,
    from: from.id,
    to: to.id,
    dist: dist(from, to),
    transport,
    congestion: transport === 'cart' ? 0.88 : transport === 'bike' ? 0.86 : 0.8,
    idealSpeedKmh: transport === 'cart' ? 15 : transport === 'bike' ? 13 : 4.8,
    bikeAllowed: transport !== 'cart',
    ...extra,
  });
}

function ringPoint(index, total, radiusX, radiusY, phase, noise, rand) {
  const angle = phase + (Math.PI * 2 * index) / total;
  const jitter = 1 + (rand() - 0.5) * noise;
  return {
    x: CENTER_X + Math.cos(angle) * radiusX * jitter,
    y: CENTER_Y + Math.sin(angle) * radiusY * jitter,
  };
}

function nearestRoad(point, roadNodes) {
  let best = roadNodes[0];
  let bestDist = Infinity;
  for (const road of roadNodes) {
    const value = Math.hypot(point.x - road.x, point.y - road.y);
    if (value < bestDist) {
      best = road;
      bestDist = value;
    }
  }
  return best;
}

function nameFor(type, index) {
  const names = BUILDING_NAMES[type] || SERVICE_NAMES[type] || [type];
  return `${pick(names, index)} ${Math.floor(index / names.length) + 1}`;
}

function addFacility(nodes, edges, roadNodes, spotId, localId, type, name, x, y, index) {
  const node = {
    id: nodeKey(spotId, localId),
    name,
    type,
    x: Math.round(clamp(x, 30, WIDTH - 30)),
    y: Math.round(clamp(y, 30, HEIGHT - 30)),
    routingOnly: false,
    syntheticFacility: true,
    generatedForCourseCheck: true,
  };
  nodes.push(node);
  addEdge(edges, node, nearestRoad(node, roadNodes), 'walk', { access: true });
  return node;
}

function buildGraph(spot) {
  const rand = seededRandom(Number(spot.id) * 991 + 17);
  const nodes = [];
  const edges = [];
  let localId = 1;

  const outer = [];
  const inner = [];
  const lake = [];

  for (let i = 0; i < ROAD_RING_POINTS; i += 1) {
    outer.push(addRoadNode(nodes, spot.id, localId++, ...Object.values(ringPoint(i, ROAD_RING_POINTS, 410, 250, 0.12, 0.16, rand)), `主环路 ${i + 1}`));
  }
  for (let i = 0; i < INNER_RING_POINTS; i += 1) {
    inner.push(addRoadNode(nodes, spot.id, localId++, ...Object.values(ringPoint(i, INNER_RING_POINTS, 250, 150, 0.34, 0.2, rand)), `游览环路 ${i + 1}`));
  }
  for (let i = 0; i < LAKE_RING_POINTS; i += 1) {
    lake.push(addRoadNode(nodes, spot.id, localId++, ...Object.values(ringPoint(i, LAKE_RING_POINTS, 145, 75, 0.8, 0.12, rand)), `湖畔步道 ${i + 1}`));
  }

  for (let i = 0; i < outer.length; i += 1) addEdge(edges, outer[i], outer[(i + 1) % outer.length], i % 5 === 0 ? 'cart' : 'walk');
  for (let i = 0; i < inner.length; i += 1) addEdge(edges, inner[i], inner[(i + 1) % inner.length], 'walk');
  for (let i = 0; i < lake.length; i += 1) addEdge(edges, lake[i], lake[(i + 1) % lake.length], 'walk', { bikeAllowed: false });

  for (let i = 0; i < 12; i += 1) {
    addEdge(edges, outer[(i * 4) % outer.length], inner[(i * 3) % inner.length], i % 3 === 0 ? 'bike' : 'walk');
    addEdge(edges, inner[(i * 3 + 1) % inner.length], lake[(i * 2) % lake.length], 'walk', { bikeAllowed: i % 4 !== 0 });
  }

  const grid = [];
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      const x = 150 + col * 78 + (rand() - 0.5) * 18;
      const y = 110 + row * 72 + (rand() - 0.5) * 18;
      grid.push(addRoadNode(nodes, spot.id, localId++, x, y, `支路节点 ${row + 1}-${col + 1}`));
    }
  }
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      const current = grid[row * GRID_COLS + col];
      if (col < GRID_COLS - 1) addEdge(edges, current, grid[row * GRID_COLS + col + 1], 'walk');
      if (row < GRID_ROWS - 1) addEdge(edges, current, grid[(row + 1) * GRID_COLS + col], col % 4 === 0 ? 'bike' : 'walk');
    }
  }

  for (let i = 0; i < grid.length; i += 6) addEdge(edges, grid[i], nearestRoad(grid[i], [...outer, ...inner]), 'walk');

  const roadNodes = nodes.filter((node) => node.routingOnly);
  const entrance = addFacility(nodes, edges, roadNodes, spot.id, localId++, '景点', spot.name, 85, CENTER_Y + 10, 0);
  entrance.sourceSpotId = spot.id;

  for (let i = 0; i < BUILDING_COUNT; i += 1) {
    const type = pick(BUILDING_TYPES, i);
    const anchor = pick([...inner, ...lake, ...grid], i * 7 + 3);
    addFacility(
      nodes,
      edges,
      roadNodes,
      spot.id,
      localId++,
      type,
      nameFor(type, i),
      anchor.x + (rand() - 0.5) * 46,
      anchor.y + (rand() - 0.5) * 46,
      i
    );
  }

  for (let i = 0; i < SERVICE_COUNT; i += 1) {
    const type = pick(SERVICE_TYPES, i);
    const anchor = pick([...outer, ...grid, ...inner], i * 9 + 5);
    addFacility(
      nodes,
      edges,
      roadNodes,
      spot.id,
      localId++,
      type,
      nameFor(type, i),
      anchor.x + (rand() - 0.5) * 50,
      anchor.y + (rand() - 0.5) * 50,
      i
    );
  }

  while (edges.length < 240) {
    const a = pick(roadNodes, Math.floor(rand() * roadNodes.length));
    const b = pick(roadNodes, Math.floor(rand() * roadNodes.length));
    if (Math.hypot(a.x - b.x, a.y - b.y) < 170) addEdge(edges, a, b, rand() > 0.82 ? 'bike' : 'walk');
  }

  return {
    id: `spot-${spot.id}`,
    name: `${spot.name}近似路网图`,
    type: 'scenic',
    description: '课程设计用近似景区路网：含主环线、游览支路、湖畔步道、建筑物与服务设施，支持最短路和多点路径计算。',
    nodes,
    edges: edges.map(({ key, ...edge }) => edge),
  };
}

async function existingGraphIds(client) {
  const { rows } = await client.query('SELECT id FROM local_route_graphs');
  return new Set(rows.map((row) => row.id));
}

async function saveGraph(client, graph) {
  await client.query(
    `INSERT INTO local_route_graphs (id, name, type, width, height, description)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [graph.id, graph.name, graph.type, WIDTH, HEIGHT, graph.description]
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
  const created = await withTransaction(async (client) => {
    const existing = await existingGraphIds(client);
    const candidates = spots
      .filter((spot) => spot.type === 'scenic')
      .filter((spot) => !existing.has(`spot-${spot.id}`) && !EXISTING_GRAPH_IDS.has(`spot-${spot.id}`))
      .slice(0, 40);

    const summaries = [];
    for (const spot of candidates) {
      const graph = buildGraph(spot);
      await saveGraph(client, graph);
      summaries.push({
        id: graph.id,
        name: graph.name,
        nodes: graph.nodes.length,
        edges: graph.edges.length,
        buildings: graph.nodes.filter((node) => BUILDING_TYPES.includes(node.type)).length,
        services: graph.nodes.filter((node) => SERVICE_TYPES.includes(node.type)).length,
        serviceTypes: new Set(graph.nodes.filter((node) => SERVICE_TYPES.includes(node.type)).map((node) => node.type)).size,
      });
    }
    return summaries;
  });

  console.log(JSON.stringify({ created: created.length, graphs: created }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
