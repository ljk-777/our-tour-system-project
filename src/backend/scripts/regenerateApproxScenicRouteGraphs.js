const { spots } = require('../src/data/spots');
const { withTransaction, pool } = require('../src/db');

const WIDTH = 1000;
const HEIGHT = 650;
const SERVICE_TYPES = ['商店', '饭店', '洗手间', '图书馆', '食堂', '超市', '咖啡馆', '医疗点', '游客中心', '停车点', '饮水点', '金融服务'];
const BUILDING_TYPES = ['景点', '场馆', '办公楼', '活动中心', '展览馆', '观景点'];

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

const BUILDING_NAMES = {
  景点: ['主景点', '核心景观', '文化遗迹', '主题景观', '打卡点'],
  场馆: ['文化展馆', '游客展厅', '主题体验馆', '非遗展示馆'],
  办公楼: ['景区管理处', '运营办公楼', '游客服务办公区'],
  活动中心: ['游客活动中心', '研学活动中心', '公共活动广场'],
  展览馆: ['历史陈列馆', '地方文化展览馆', '自然科普馆'],
  观景点: ['观景台', '湖畔观景点', '山门观景点', '高处观景点'],
};

const SPECIAL_ARCHETYPES = new Map([
  [2, 'wall'],
  [4, 'royalGarden'],
  [9, 'wall'],
  [26, 'waterTown'],
  [27, 'theme'],
  [39, 'lakeScenic'],
  [40, 'wetland'],
  [41, 'westLakeCauseway'],
  [42, 'westLakeCauseway'],
  [46, 'yValley'],
  [48, 'waterworks'],
]);

function seededRandom(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function choose(list, index) {
  return list[index % list.length];
}

function nodeKey(spotId, localId) {
  return Number(`${spotId}${String(localId).padStart(6, '0')}`);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.max(6, Math.round(Math.hypot(a.x - b.x, a.y - b.y)));
}

function nameFor(type, index) {
  const names = SERVICE_NAMES[type] || BUILDING_NAMES[type] || [type];
  return `${choose(names, index)} ${Math.floor(index / names.length) + 1}`;
}

function classifySpot(spot) {
  if (SPECIAL_ARCHETYPES.has(Number(spot.id))) return SPECIAL_ARCHETYPES.get(Number(spot.id));
  const name = spot.name || '';
  const tags = (spot.tags || []).join(' ');
  const text = `${name} ${tags}`;
  if (/迪士尼|欢乐|动物园|主题|艺术区|798|乐园/.test(text)) return 'theme';
  if (/古镇|古城|步行街|街|巷|坊|三里屯|大栅栏|南锣鼓巷|田子坊|新天地|河坊街|朱家角|七宝|陆家嘴|金融区|M50|创意园/.test(text)) return 'urban';
  if (/博物馆|大剧院|塔|宫|寺|馆|兵马俑|雍和宫|岳王庙|鸟巢|水立方|艺术宫/.test(text)) return 'landmark';
  if (/长城|山|峰|沟|峡|森林|九寨|峨眉|香山|慕田峪|八达岭/.test(text)) return 'mountain';
  if (/湖|湿地|公园|园林|园|后海|什刹海|西湖|颐和园|圆明园|北海|苏堤|断桥|千岛湖/.test(text)) return 'garden';
  return 'garden';
}

function createBuilder(spot) {
  const nodes = [];
  const edges = [];
  const rand = seededRandom(Number(spot.id) * 1009 + 29);
  let localId = 1;

  function road(x, y, name) {
    const node = {
      id: nodeKey(spot.id, localId++),
      name,
      type: '道路点',
      x: Math.round(clamp(x, 24, WIDTH - 24)),
      y: Math.round(clamp(y, 24, HEIGHT - 24)),
      routingOnly: true,
    };
    nodes.push(node);
    return node;
  }

  function facility(type, name, x, y, anchor, index) {
    const node = {
      id: nodeKey(spot.id, localId++),
      name,
      type,
      x: Math.round(clamp(x, 28, WIDTH - 28)),
      y: Math.round(clamp(y, 28, HEIGHT - 28)),
      routingOnly: false,
      syntheticFacility: true,
      generatedForCourseCheck: true,
    };
    nodes.push(node);
    connect(node, anchor || nearestRoad(node), 'walk', { access: true, index });
    return node;
  }

  function connect(from, to, transport = 'walk', extra = {}) {
    if (!from || !to || from.id === to.id) return;
    const key = [from.id, to.id].sort((a, b) => a - b).join('-');
    if (edges.some((edge) => edge.key === key && edge.transport === transport)) return;
    edges.push({
      key,
      from: from.id,
      to: to.id,
      dist: distance(from, to),
      transport,
      congestion: transport === 'cart' ? 0.88 : transport === 'bike' ? 0.86 : 0.8,
      idealSpeedKmh: transport === 'cart' ? 15 : transport === 'bike' ? 13 : 4.8,
      bikeAllowed: transport !== 'cart',
      ...extra,
    });
  }

  function roadNodes() {
    return nodes.filter((node) => node.routingOnly);
  }

  function nearestRoad(point) {
    let best = null;
    let bestDist = Infinity;
    for (const candidate of roadNodes()) {
      const d = Math.hypot(point.x - candidate.x, point.y - candidate.y);
      if (d < bestDist) {
        best = candidate;
        bestDist = d;
      }
    }
    return best;
  }

  function jitter(amount) {
    return (rand() - 0.5) * amount;
  }

  return { spot, nodes, edges, rand, road, facility, connect, nearestRoad, roadNodes, jitter };
}

function addPolyline(builder, count, pointFn, name, transport = 'walk') {
  const list = [];
  for (let i = 0; i < count; i += 1) {
    const p = pointFn(i, count);
    list.push(builder.road(p.x, p.y, `${name} ${i + 1}`));
    if (i > 0) builder.connect(list[i - 1], list[i], transport);
  }
  return list;
}

function addClosedLoop(builder, count, cx, cy, rx, ry, name, phase = 0, transport = 'walk') {
  const loop = addPolyline(builder, count, (i, total) => {
    const angle = phase + (Math.PI * 2 * i) / total;
    return {
      x: cx + Math.cos(angle) * rx + builder.jitter(18),
      y: cy + Math.sin(angle) * ry + builder.jitter(18),
    };
  }, name, transport);
  builder.connect(loop[loop.length - 1], loop[0], transport);
  return loop;
}

function buildMountainRoads(builder) {
  const ridge = addPolyline(builder, 86, (i, total) => {
    const t = i / (total - 1);
    return {
      x: 70 + t * 850,
      y: 510 - Math.sin(t * Math.PI * 1.1) * 330 + Math.sin(t * Math.PI * 7) * 34 + builder.jitter(18),
    };
  }, '主游览步道');
  const lower = addPolyline(builder, 42, (i, total) => {
    const t = i / (total - 1);
    return { x: 95 + t * 790, y: 560 - t * 130 + Math.sin(t * Math.PI * 5) * 22 + builder.jitter(14) };
  }, '山脚服务路', 'bike');
  for (let i = 8; i < ridge.length; i += 10) {
    const branch = addPolyline(builder, 8, (j) => ({
      x: ridge[i].x + j * 18 + builder.jitter(12),
      y: ridge[i].y + (i % 20 === 8 ? -1 : 1) * j * 18 + builder.jitter(12),
    }), '登山支线');
    builder.connect(ridge[i], branch[0]);
  }
  for (let i = 0; i < 9; i += 1) builder.connect(ridge[i * 9 + 3], lower[i * 4 + 2], i % 2 ? 'walk' : 'bike');
  return [...ridge, ...lower];
}

function buildGardenRoads(builder) {
  const outer = addClosedLoop(builder, 72, 500, 330, 405, 245, '外环园路', 0.1, 'bike');
  const inner = addClosedLoop(builder, 52, 500, 328, 265, 155, '内环游路', 0.35);
  const lake = addClosedLoop(builder, 40, 515, 322, 150, 76, '湖畔步道', 0.7);
  for (let i = 0; i < 14; i += 1) {
    builder.connect(outer[(i * 5) % outer.length], inner[(i * 4) % inner.length], i % 3 === 0 ? 'bike' : 'walk');
    builder.connect(inner[(i * 3 + 1) % inner.length], lake[(i * 3) % lake.length], 'walk', { bikeAllowed: false });
  }
  return [...outer, ...inner, ...lake];
}

function buildUrbanRoads(builder) {
  const grid = [];
  const rows = 9;
  const cols = 12;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      grid.push(builder.road(95 + c * 73 + builder.jitter(9), 80 + r * 61 + builder.jitter(9), `街巷节点 ${r + 1}-${c + 1}`));
    }
  }
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const current = grid[r * cols + c];
      if (c < cols - 1) builder.connect(current, grid[r * cols + c + 1], r % 4 === 0 ? 'bike' : 'walk');
      if (r < rows - 1) builder.connect(current, grid[(r + 1) * cols + c], c % 5 === 0 ? 'bike' : 'walk');
      if (r < rows - 1 && c < cols - 1 && (r + c) % 5 === 0) builder.connect(current, grid[(r + 1) * cols + c + 1]);
    }
  }
  return grid;
}

function buildThemeRoads(builder) {
  const main = addClosedLoop(builder, 70, 500, 330, 390, 235, '主游园环线', 0.2, 'cart');
  const zones = [
    addClosedLoop(builder, 26, 300, 230, 110, 70, '西区游线', 0.1),
    addClosedLoop(builder, 28, 670, 225, 130, 76, '东区游线', 0.3),
    addClosedLoop(builder, 24, 365, 455, 118, 65, '南区游线', 0.5),
    addClosedLoop(builder, 24, 680, 455, 118, 68, '演艺区游线', 0.7),
  ].flat();
  for (let i = 0; i < 16; i += 1) builder.connect(main[(i * 4) % main.length], builder.nearestRoad({ x: 240 + (i % 4) * 150, y: 210 + Math.floor(i / 4) * 80 }));
  return [...main, ...zones];
}

function buildLandmarkRoads(builder) {
  const plaza = addClosedLoop(builder, 56, 500, 330, 230, 145, '核心广场环线', 0.05);
  const outer = addClosedLoop(builder, 60, 500, 330, 395, 235, '外围通行路', 0.3, 'bike');
  for (let i = 0; i < 18; i += 1) builder.connect(plaza[(i * 3) % plaza.length], outer[(i * 3 + 2) % outer.length], i % 4 === 0 ? 'bike' : 'walk');
  for (let i = 0; i < 10; i += 1) {
    addPolyline(builder, 9, (j) => {
      const angle = (Math.PI * 2 * i) / 10;
      return {
        x: 500 + Math.cos(angle) * (70 + j * 34) + builder.jitter(8),
        y: 330 + Math.sin(angle) * (48 + j * 23) + builder.jitter(8),
      };
    }, '放射步道');
  }
  return [...plaza, ...outer];
}

function buildWallRoads(builder) {
  const wall = addPolyline(builder, 92, (i, total) => {
    const t = i / (total - 1);
    return {
      x: 60 + t * 880,
      y: 360 - Math.sin(t * Math.PI * 1.7) * 185 + Math.sin(t * Math.PI * 11) * 30 + builder.jitter(10),
    };
  }, '城墙游览线');
  const valley = addPolyline(builder, 48, (i, total) => {
    const t = i / (total - 1);
    return {
      x: 80 + t * 820,
      y: 560 - Math.sin(t * Math.PI) * 70 + builder.jitter(12),
    };
  }, '山脚服务线', 'bike');
  for (let i = 7; i < wall.length; i += 9) {
    const tower = addClosedLoop(builder, 8, wall[i].x, wall[i].y, 26, 18, '敌楼节点');
    builder.connect(wall[i], tower[0]);
  }
  for (let i = 0; i < 10; i += 1) builder.connect(wall[i * 8 + 4], valley[i * 4 + 2], i % 2 === 0 ? 'walk' : 'bike');
  return [...wall, ...valley];
}

function buildYValleyRoads(builder) {
  const trunk = addPolyline(builder, 60, (i, total) => {
    const t = i / (total - 1);
    return { x: 500 + builder.jitter(18), y: 585 - t * 300 + Math.sin(t * Math.PI * 5) * 18 };
  }, '树正沟主线', 'cart');
  const left = addPolyline(builder, 54, (i, total) => {
    const t = i / (total - 1);
    return { x: 500 - t * 350 + builder.jitter(16), y: 285 - t * 205 + Math.sin(t * Math.PI * 4) * 20 };
  }, '日则沟游线', 'cart');
  const right = addPolyline(builder, 50, (i, total) => {
    const t = i / (total - 1);
    return { x: 500 + t * 330 + builder.jitter(16), y: 285 - t * 190 + Math.sin(t * Math.PI * 4) * 18 };
  }, '则查洼沟游线', 'cart');
  builder.connect(trunk[trunk.length - 1], left[0], 'cart');
  builder.connect(trunk[trunk.length - 1], right[0], 'cart');
  for (let i = 5; i < trunk.length; i += 10) {
    const deck = addClosedLoop(builder, 10, trunk[i].x + 60, trunk[i].y, 44, 22, '湖畔栈道');
    builder.connect(trunk[i], deck[0], 'walk', { bikeAllowed: false });
  }
  for (let i = 8; i < left.length; i += 11) {
    const deck = addClosedLoop(builder, 9, left[i].x - 45, left[i].y, 36, 18, '海子观景步道');
    builder.connect(left[i], deck[0], 'walk', { bikeAllowed: false });
  }
  return [...trunk, ...left, ...right];
}

function buildWaterworksRoads(builder) {
  const riverNorth = addPolyline(builder, 56, (i, total) => {
    const t = i / (total - 1);
    return { x: 105 + t * 790, y: 210 + Math.sin(t * Math.PI * 3) * 32 + builder.jitter(8) };
  }, '内江游线');
  const riverSouth = addPolyline(builder, 54, (i, total) => {
    const t = i / (total - 1);
    return { x: 90 + t * 805, y: 415 + Math.sin(t * Math.PI * 2.5) * 30 + builder.jitter(8) };
  }, '外江游线');
  const axis = addPolyline(builder, 36, (i, total) => {
    const t = i / (total - 1);
    return { x: 270 + t * 430, y: 520 - t * 360 + Math.sin(t * Math.PI * 4) * 16 };
  }, '水利工程轴线');
  for (let i = 0; i < 10; i += 1) builder.connect(riverNorth[i * 5], riverSouth[i * 5], 'walk');
  [riverNorth[14], riverNorth[28], riverSouth[25], axis[16], axis[27]].forEach((anchor, i) => {
    const loop = addClosedLoop(builder, 12, anchor.x, anchor.y, 48, 28, ['鱼嘴节点', '飞沙堰节点', '宝瓶口节点', '安澜索桥节点', '离堆公园节点'][i]);
    builder.connect(anchor, loop[0]);
  });
  return [...riverNorth, ...riverSouth, ...axis];
}

function buildWetlandRoads(builder) {
  const fudi = addPolyline(builder, 70, (i, total) => {
    const t = i / (total - 1);
    return { x: 500 + Math.sin(t * Math.PI * 5) * 38 + builder.jitter(10), y: 55 + t * 540 };
  }, '福堤主线', 'bike');
  const waterways = [];
  for (let k = 0; k < 4; k += 1) {
    waterways.push(...addPolyline(builder, 28, (i, total) => {
      const t = i / (total - 1);
      return {
        x: 145 + t * 710,
        y: 140 + k * 105 + Math.sin(t * Math.PI * 3 + k) * 28 + builder.jitter(8),
      };
    }, '湿地横向游线'));
  }
  for (let i = 0; i < 12; i += 1) builder.connect(fudi[i * 5 + 3], builder.nearestRoad({ x: 130 + (i % 4) * 230, y: 130 + Math.floor(i / 4) * 135 }));
  return [...fudi, ...waterways];
}

function buildWaterTownRoads(builder) {
  const lanes = buildUrbanRoads(builder);
  for (let k = 0; k < 4; k += 1) {
    const canal = addPolyline(builder, 24, (i, total) => {
      const t = i / (total - 1);
      return {
        x: 120 + t * 760,
        y: 145 + k * 105 + Math.sin(t * Math.PI * 2) * 18 + builder.jitter(6),
      };
    }, '水巷沿河步道');
    for (let i = 4; i < canal.length; i += 7) builder.connect(canal[i], builder.nearestRoad(canal[i]), 'walk', { bikeAllowed: false });
  }
  return lanes;
}

function buildWestLakeCausewayRoads(builder) {
  const shore = addClosedLoop(builder, 70, 500, 330, 400, 230, '湖岸游线', 0.15, 'bike');
  const causeway = addPolyline(builder, 52, (i, total) => {
    const t = i / (total - 1);
    return { x: 425 + Math.sin(t * Math.PI * 6) * 18 + builder.jitter(7), y: 75 + t * 500 };
  }, '湖中长堤步道', 'walk');
  const bridge = addPolyline(builder, 28, (i, total) => {
    const t = i / (total - 1);
    return { x: 250 + t * 520, y: 170 + Math.sin(t * Math.PI) * 28 + builder.jitter(7) };
  }, '跨湖连接线');
  for (let i = 0; i < 10; i += 1) builder.connect(causeway[i * 5], shore[(i * 6) % shore.length], 'walk', { bikeAllowed: false });
  builder.connect(causeway[10], bridge[4]);
  builder.connect(causeway[34], bridge[21]);
  return [...shore, ...causeway, ...bridge];
}

function placeFacilities(builder, archetype) {
  const anchors = builder.roadNodes();
  const entranceAnchor = anchors.reduce((best, node) => (node.x < best.x ? node : best), anchors[0]);
  const entrance = builder.facility('景点', builder.spot.name, 82, 335, entranceAnchor, 0);
  entrance.sourceSpotId = builder.spot.id;

  const buildingPreference = archetype === 'urban'
    ? ['景点', '展览馆', '场馆', '办公楼', '活动中心', '观景点']
    : archetype === 'mountain'
      ? ['观景点', '景点', '活动中心', '场馆', '办公楼', '展览馆']
      : ['景点', '场馆', '观景点', '展览馆', '活动中心', '办公楼'];

  for (let i = 0; i < 28; i += 1) {
    const type = choose(buildingPreference, i);
    const anchor = choose(anchors, i * 11 + 5);
    builder.facility(type, nameFor(type, i), anchor.x + builder.jitter(54), anchor.y + builder.jitter(54), anchor, i);
  }

  const serviceOrder = archetype === 'mountain'
    ? ['洗手间', '饮水点', '游客中心', '医疗点', '商店', '饭店', '停车点', '咖啡馆', '超市', '金融服务', '图书馆', '食堂']
    : archetype === 'urban'
      ? ['商店', '饭店', '咖啡馆', '洗手间', '超市', '金融服务', '游客中心', '停车点', '饮水点', '医疗点', '图书馆', '食堂']
      : ['洗手间', '游客中心', '商店', '饭店', '咖啡馆', '饮水点', '医疗点', '停车点', '超市', '图书馆', '食堂', '金融服务'];

  for (let i = 0; i < 72; i += 1) {
    const type = i < serviceOrder.length ? serviceOrder[i] : choose(serviceOrder, i);
    const anchor = choose(anchors, i * 7 + (archetype === 'urban' ? 12 : 3));
    builder.facility(type, nameFor(type, i), anchor.x + builder.jitter(46), anchor.y + builder.jitter(46), anchor, i);
  }
}

function buildGraph(spot) {
  const archetype = classifySpot(spot);
  const builder = createBuilder(spot);
  if (archetype === 'wall') buildWallRoads(builder);
  else if (archetype === 'yValley') buildYValleyRoads(builder);
  else if (archetype === 'waterworks') buildWaterworksRoads(builder);
  else if (archetype === 'wetland') buildWetlandRoads(builder);
  else if (archetype === 'waterTown') buildWaterTownRoads(builder);
  else if (archetype === 'westLakeCauseway') buildWestLakeCausewayRoads(builder);
  else if (archetype === 'royalGarden') buildGardenRoads(builder);
  else if (archetype === 'mountain') buildMountainRoads(builder);
  else if (archetype === 'urban') buildUrbanRoads(builder);
  else if (archetype === 'theme') buildThemeRoads(builder);
  else if (archetype === 'landmark') buildLandmarkRoads(builder);
  else buildGardenRoads(builder);

  placeFacilities(builder, archetype);

  const roads = builder.roadNodes();
  while (builder.edges.length < 260) {
    const a = choose(roads, Math.floor(builder.rand() * roads.length));
    const b = choose(roads, Math.floor(builder.rand() * roads.length));
    if (Math.hypot(a.x - b.x, a.y - b.y) < (archetype === 'mountain' ? 190 : 150)) {
      builder.connect(a, b, builder.rand() > 0.84 ? 'bike' : 'walk');
    }
  }

  return {
    id: `spot-${spot.id}`,
    name: `${spot.name}近似路网图`,
    type: 'scenic',
    width: WIDTH,
    height: HEIGHT,
    description: `课程设计用近似${archetypeLabel(archetype)}路网：按景点类型生成主游线、支路、建筑物和服务设施，规模控制在几百节点。`,
    nodes: builder.nodes,
    edges: builder.edges.map(({ key, ...edge }) => edge),
  };
}

function archetypeLabel(archetype) {
  return ({
    mountain: '山岳',
    wall: '长城',
    garden: '湖园',
    royalGarden: '皇家园林',
    urban: '街区古镇',
    waterTown: '水乡古镇',
    theme: '主题园区',
    landmark: '地标场馆',
    wetland: '湿地',
    yValley: '沟谷',
    waterworks: '水利景区',
    westLakeCauseway: '湖堤',
  })[archetype] || '景区';
}

async function currentApproxIds(client) {
  const { rows } = await client.query(`SELECT id FROM local_route_graphs WHERE name LIKE '%近似路网图' ORDER BY id`);
  return rows.map((row) => Number(row.id.replace('spot-', ''))).filter(Boolean);
}

async function saveGraph(client, graph) {
  await client.query(
    `INSERT INTO local_route_graphs (id, name, type, width, height, description)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [graph.id, graph.name, graph.type, graph.width, graph.height, graph.description]
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
  const result = await withTransaction(async (client) => {
    const ids = await currentApproxIds(client);
    await client.query(`DELETE FROM local_route_edges WHERE graph_id = ANY($1)`, [ids.map((id) => `spot-${id}`)]);
    await client.query(`DELETE FROM local_route_nodes WHERE graph_id = ANY($1)`, [ids.map((id) => `spot-${id}`)]);
    await client.query(`DELETE FROM local_route_graphs WHERE id = ANY($1)`, [ids.map((id) => `spot-${id}`)]);

    const summaries = [];
    for (const id of ids) {
      const spot = spots.find((item) => Number(item.id) === id);
      if (!spot) continue;
      const graph = buildGraph(spot);
      await saveGraph(client, graph);
      summaries.push({
        id: graph.id,
        name: graph.name,
        archetype: classifySpot(spot),
        nodes: graph.nodes.length,
        edges: graph.edges.length,
        buildings: graph.nodes.filter((node) => BUILDING_TYPES.includes(node.type)).length,
        services: graph.nodes.filter((node) => SERVICE_TYPES.includes(node.type)).length,
        serviceTypes: new Set(graph.nodes.filter((node) => SERVICE_TYPES.includes(node.type)).map((node) => node.type)).size,
      });
    }
    return summaries;
  });
  console.log(JSON.stringify({ regenerated: result.length, graphs: result }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
