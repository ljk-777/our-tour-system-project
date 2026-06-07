const { withTransaction, query, pool } = require('../src/db');

const BUILDING_TARGET = 24;
const SERVICE_TARGET = 60;
const SCENIC_TOILET_TARGET = 12;

const BUILDING_TYPES = [
  '景点',
  '教学楼',
  '办公楼',
  '宿舍楼',
  '场馆',
  '活动中心',
];

const SERVICE_TYPES = [
  '商店',
  '饭店',
  '洗手间',
  '图书馆',
  '食堂',
  '超市',
  '咖啡馆',
  '医疗点',
  '游客中心',
  '停车点',
  '饮水点',
  '金融服务',
];

const SCENIC_BUILDING_NAMES = {
  景点: ['主入口广场', '中心观景台', '文化展示区', '历史遗迹点', '游客打卡点', '主题展区'],
  场馆: ['游客展览馆', '文化陈列馆', '主题体验馆', '非遗展示馆'],
  办公楼: ['景区管理处', '游客服务办公区', '运营调度中心'],
  活动中心: ['游客活动中心', '研学活动中心', '公共活动广场'],
};

const CAMPUS_BUILDING_NAMES = {
  教学楼: ['第一教学楼', '第二教学楼', '实验教学楼', '综合教学楼', '智慧教学楼', '公共教学楼'],
  办公楼: ['行政办公楼', '综合办公楼', '学院办公楼', '科研办公楼'],
  宿舍楼: ['学生公寓一区', '学生公寓二区', '学生公寓三区', '研究生公寓', '留学生公寓'],
  场馆: ['体育馆', '报告厅', '学术交流中心', '大学生活动中心'],
  景点: ['校园广场', '校史景观点', '中心花园', '湖畔景观点'],
  活动中心: ['学生活动中心', '社团活动中心'],
};

const SERVICE_NAMES = {
  商店: ['文创商店', '纪念品商店', '便利商店', '生活用品店', '校园文具店'],
  饭店: ['游客餐厅', '风味餐厅', '家常菜馆', '特色小吃店', '简餐店'],
  洗手间: ['公共洗手间', '无障碍洗手间', '东区洗手间', '西区洗手间', '南区洗手间'],
  图书馆: ['公共阅读点', '图书阅览室', '资料查询室', '校园图书馆'],
  食堂: ['第一食堂', '第二食堂', '学生食堂', '综合食堂', '风味食堂'],
  超市: ['生活超市', '校园超市', '游客超市', '便民超市'],
  咖啡馆: ['咖啡休息区', '湖畔咖啡', '校园咖啡馆', '书吧咖啡'],
  医疗点: ['医务室', '急救点', '医疗服务站', '校医院'],
  游客中心: ['游客服务中心', '咨询服务台', '票务咨询处', '导览服务点'],
  停车点: ['自行车停放点', '公共停车点', '游客停车区', '校园停车点'],
  饮水点: ['直饮水点', '饮水补给点', '公共饮水处', '热水服务点'],
  金融服务: ['自助取款点', '银行服务点', '支付服务点'],
};

function hashGraphId(graphId) {
  let hash = 0;
  for (const char of graphId) hash = (hash * 31 + char.charCodeAt(0)) % 900000;
  return hash + 100000;
}

function syntheticBase(graphId) {
  return BigInt(hashGraphId(graphId)) * 1000000n;
}

function choose(list, index) {
  return list[index % list.length];
}

function pointNear(node, index, width, height) {
  const angle = (index * 137.508 * Math.PI) / 180;
  const radius = 14 + (index % 7) * 5;
  const x = Math.round(Math.max(18, Math.min(width - 18, Number(node.x) + Math.cos(angle) * radius)));
  const y = Math.round(Math.max(18, Math.min(height - 18, Number(node.y) + Math.sin(angle) * radius)));
  return { x, y };
}

function isBuildingType(type) {
  return BUILDING_TYPES.includes(type);
}

function isServiceType(type) {
  return SERVICE_TYPES.includes(type);
}

function nameFor(graph, type, index) {
  const bank = graph.type === 'campus' ? CAMPUS_BUILDING_NAMES : SCENIC_BUILDING_NAMES;
  if (bank[type]) return `${choose(bank[type], index)} ${Math.floor(index / bank[type].length) + 1}`;
  if (SERVICE_NAMES[type]) return `${choose(SERVICE_NAMES[type], index)} ${Math.floor(index / SERVICE_NAMES[type].length) + 1}`;
  return `${type} ${index + 1}`;
}

async function loadGraphs(client) {
  const { rows: graphs } = await client.query('SELECT id, name, type, width, height FROM local_route_graphs ORDER BY id');
  const { rows: nodes } = await client.query('SELECT graph_id, node_key, name, type, x, y, metadata FROM local_route_nodes ORDER BY graph_id, node_key');
  return graphs.map((graph) => ({
    ...graph,
    nodes: nodes.filter((node) => node.graph_id === graph.id),
  }));
}

async function clearSynthetic(client) {
  await client.query(`
    DELETE FROM local_route_edges
    WHERE metadata->>'syntheticFacility' = 'true'
       OR from_node_key IN (SELECT node_key FROM local_route_nodes WHERE metadata->>'syntheticFacility' = 'true')
       OR to_node_key IN (SELECT node_key FROM local_route_nodes WHERE metadata->>'syntheticFacility' = 'true')
  `);
  await client.query(`DELETE FROM local_route_nodes WHERE metadata->>'syntheticFacility' = 'true'`);
}

async function addFacility(client, graph, roadNode, nodeKey, name, type, index) {
  const { x, y } = pointNear(roadNode, index, Number(graph.width), Number(graph.height));
  await client.query(
    `INSERT INTO local_route_nodes (graph_id, node_key, name, type, x, y, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      graph.id,
      nodeKey.toString(),
      name,
      type,
      x,
      y,
      {
        syntheticFacility: true,
        routingOnly: false,
        generatedForCourseCheck: true,
      },
    ]
  );
  await client.query(
    `INSERT INTO local_route_edges (
      graph_id, from_node_key, to_node_key, dist, transport,
      congestion, ideal_speed_kmh, bike_allowed, metadata
    ) VALUES ($1, $2, $3, $4, 'walk', 0.82, 4.8, true, $5)`,
    [
      graph.id,
      nodeKey.toString(),
      roadNode.node_key,
      18 + (index % 9) * 4,
      {
        syntheticFacility: true,
        access: true,
      },
    ]
  );
}

async function augmentGraph(client, graph) {
  const existingBuildings = graph.nodes.filter((node) => isBuildingType(node.type) && node.metadata?.syntheticFacility !== true).length;
  const existingServiceNodes = graph.nodes.filter((node) => isServiceType(node.type) && node.metadata?.syntheticFacility !== true);
  const existingServices = existingServiceNodes.length;
  const existingServiceTypes = new Set(existingServiceNodes.map((node) => node.type));
  const existingToilets = graph.nodes.filter((node) => node.type === '洗手间' && node.metadata?.syntheticFacility !== true).length;
  const roadNodes = graph.nodes.filter((node) => node.metadata?.routingOnly === true);
  const anchors = roadNodes.length > 0 ? roadNodes : graph.nodes;
  if (anchors.length === 0) return { graph: graph.id, addedBuildings: 0, addedServices: 0 };

  const base = syntheticBase(graph.id);
  let offset = 1n;
  let addedBuildings = 0;
  let addedServices = 0;
  const buildingNeed = Math.max(0, BUILDING_TARGET - existingBuildings);
  const missingServiceTypes = SERVICE_TYPES.filter((type) => !existingServiceTypes.has(type));
  const toiletNeed = graph.type === 'scenic' ? Math.max(0, SCENIC_TOILET_TARGET - existingToilets) : 0;
  const serviceNeed = Math.max(0, SERVICE_TARGET - existingServices, missingServiceTypes.length + toiletNeed);

  const buildingTypes = graph.type === 'campus'
    ? ['教学楼', '办公楼', '宿舍楼', '场馆', '景点', '活动中心']
    : ['景点', '场馆', '办公楼', '活动中心'];

  for (let i = 0; i < buildingNeed; i += 1) {
    const type = choose(buildingTypes, i);
    const anchor = choose(anchors, i * 11 + 3);
    await addFacility(client, graph, anchor, base + offset, nameFor(graph, type, i), type, i);
    offset += 1n;
    addedBuildings += 1;
  }

  for (let i = 0; i < serviceNeed; i += 1) {
    const type = missingServiceTypes[i] || (i < missingServiceTypes.length + toiletNeed ? '洗手间' : choose(SERVICE_TYPES, i));
    const anchor = choose(anchors, i * 13 + 7);
    await addFacility(client, graph, anchor, base + offset, nameFor(graph, type, i), type, i + 1000);
    offset += 1n;
    addedServices += 1;
  }

  return { graph: graph.id, addedBuildings, addedServices };
}

async function main() {
  const results = await withTransaction(async (client) => {
    await clearSynthetic(client);
    const graphs = await loadGraphs(client);
    const summaries = [];
    for (const graph of graphs) {
      if (graph.type !== 'scenic') continue;
      summaries.push(await augmentGraph(client, graph));
    }
    return summaries;
  });

  const { rows } = await query(`
    SELECT
      graph_id,
      COUNT(*) FILTER (WHERE type = ANY($1))::int AS buildings,
      COUNT(*) FILTER (WHERE type = ANY($2))::int AS services,
      COUNT(DISTINCT type) FILTER (WHERE type = ANY($2))::int AS service_types
    FROM local_route_nodes
    GROUP BY graph_id
    ORDER BY graph_id
  `, [BUILDING_TYPES, SERVICE_TYPES]);

  console.log(JSON.stringify({ augmented: results, checks: rows }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
