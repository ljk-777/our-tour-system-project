/**
 * Tour Data MCP Server
 * 暴露景点数据与算法能力，供 Claude Agent 调用
 */
const readline = require('readline');
const path = require('path');

const ALGO_PATH = path.join(__dirname, '../../../src/backend/src/algorithms');
const DATA_PATH = path.join(__dirname, '../../../src/backend/src/data');

// 懒加载算法和数据（避免启动报错）
function loadAlgorithms() {
  return {
    dijkstra: require(path.join(ALGO_PATH, 'dijkstra')),
    heap: require(path.join(ALGO_PATH, 'heap')),
    kmp: require(path.join(ALGO_PATH, 'kmp')),
    trie: require(path.join(ALGO_PATH, 'trie')),
  };
}

function loadData() {
  const spots = require(path.join(DATA_PATH, 'spots')).spots || require(path.join(DATA_PATH, 'spots'));
  const graph = require(path.join(DATA_PATH, 'graph'));
  return { spots, edges: graph.edges || graph };
}

// ── MCP 工具定义 ──────────────────────────────────────────

const TOOLS = [
  {
    name: 'get_spots',
    description: '获取景点列表，支持按城市/类型过滤',
    inputSchema: {
      type: 'object',
      properties: {
        city:  { type: 'string', description: '城市名称，如"杭州"' },
        type:  { type: 'string', description: '景点类型，如"自然"/"历史"' },
        limit: { type: 'number', description: '返回数量，默认20' },
      },
    },
  },
  {
    name: 'get_topk_spots',
    description: '用 MinHeap TopK 算法获取评分最高的 K 个景点',
    inputSchema: {
      type: 'object',
      properties: {
        k:    { type: 'number', description: 'Top K 数量，默认10' },
        city: { type: 'string', description: '限定城市' },
        type: { type: 'string', description: '限定类型' },
      },
    },
  },
  {
    name: 'find_shortest_path',
    description: '用 Dijkstra 算法计算两景点间最短路径',
    inputSchema: {
      type: 'object',
      required: ['fromId', 'toId'],
      properties: {
        fromId: { type: 'number', description: '起点景点 ID' },
        toId:   { type: 'number', description: '终点景点 ID' },
        mode:   { type: 'string', enum: ['distance', 'time'], description: '权重模式，默认distance' },
      },
    },
  },
  {
    name: 'find_multi_path',
    description: '用贪心 + 2-opt 计算多点游览路线',
    inputSchema: {
      type: 'object',
      required: ['waypointIds'],
      properties: {
        waypointIds: {
          type: 'array',
          items: { type: 'number' },
          description: '途经点 ID 数组（含起点和终点）',
        },
        mode: { type: 'string', enum: ['distance', 'time'], description: '权重模式' },
      },
    },
  },
  {
    name: 'search_spots',
    description: '用 KMP 算法在景点名称/描述中检索关键词',
    inputSchema: {
      type: 'object',
      required: ['keyword'],
      properties: {
        keyword: { type: 'string', description: '搜索关键词' },
        fields:  {
          type: 'array',
          items: { type: 'string' },
          description: '搜索字段，默认["name","description"]',
        },
      },
    },
  },
  {
    name: 'prefix_search',
    description: '用 Trie 前缀树进行景点名称自动补全',
    inputSchema: {
      type: 'object',
      required: ['prefix'],
      properties: {
        prefix: { type: 'string', description: '搜索前缀' },
        limit:  { type: 'number', description: '返回数量，默认10' },
      },
    },
  },
  {
    name: 'fuzzy_search',
    description: '用编辑距离进行模糊搜索，容忍拼写错误',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query:   { type: 'string', description: '模糊查询词' },
        maxDist: { type: 'number', description: '最大编辑距离，默认1' },
      },
    },
  },
];

// ── 工具实现 ──────────────────────────────────────────────

function handleTool(name, args) {
  const algo = loadAlgorithms();
  const { spots, edges } = loadData();

  switch (name) {
    case 'get_spots': {
      let result = spots;
      if (args.city) result = result.filter(s => s.city === args.city);
      if (args.type) result = result.filter(s => s.type === args.type);
      result = result.slice(0, args.limit || 20);
      return { spots: result, total: result.length };
    }

    case 'get_topk_spots': {
      let pool = spots;
      if (args.city) pool = pool.filter(s => s.city === args.city);
      if (args.type) pool = pool.filter(s => s.type === args.type);
      const result = algo.heap.topK(pool, args.k || 10);
      return { spots: result, algorithm: 'MinHeap-TopK', k: args.k || 10 };
    }

    case 'find_shortest_path': {
      const result = algo.dijkstra.shortestPath(spots, edges, args.fromId, args.toId, args.mode || 'distance');
      if (!result.reachable) return { reachable: false, message: '两点之间不可达' };
      const spotMap = new Map(spots.map(s => [s.id, s]));
      return {
        reachable: true,
        path: result.path,
        pathSpots: result.path.map(id => spotMap.get(id) || { id }),
        totalDist: result.totalDist,
        totalTime: result.totalTime,
        algorithm: 'Dijkstra',
      };
    }

    case 'find_multi_path': {
      const result = algo.dijkstra.multiPointPath(spots, edges, args.waypointIds, args.mode || 'distance');
      const spotMap = new Map(spots.map(s => [s.id, s]));
      return {
        order: result.order,
        orderSpots: (result.order || []).map(id => spotMap.get(id) || { id }),
        totalCost: result.totalCost,
        segments: result.segments,
        algorithm: 'NearestNeighbor+2opt',
      };
    }

    case 'search_spots': {
      const fields = args.fields || ['name', 'description'];
      const result = algo.kmp.searchInItems(spots, args.keyword, fields);
      return { spots: result, keyword: args.keyword, count: result.length, algorithm: 'KMP' };
    }

    case 'prefix_search': {
      const trie = new algo.trie.Trie();
      spots.forEach(s => {
        trie.insert(s.name, s);
        if (s.city) trie.insert(s.city, s);
      });
      const result = trie.searchByPrefix(args.prefix).slice(0, args.limit || 10);
      return { spots: result, prefix: args.prefix, algorithm: 'Trie' };
    }

    case 'fuzzy_search': {
      const trie = new algo.trie.Trie();
      const result = trie.fuzzySearch(args.query, spots, args.maxDist || 1);
      return { spots: result, query: args.query, maxDist: args.maxDist || 1, algorithm: 'EditDistance' };
    }

    default:
      throw new Error(`未知工具: ${name}`);
  }
}

// ── JSON-RPC over stdio ───────────────────────────────────

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  let req;
  try { req = JSON.parse(line); } catch { return; }

  const { id, method, params } = req;

  try {
    let result;

    if (method === 'initialize') {
      result = {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'tour-data-server', version: '1.0.0' },
      };
    } else if (method === 'tools/list') {
      result = { tools: TOOLS };
    } else if (method === 'tools/call') {
      const toolResult = handleTool(params.name, params.arguments || {});
      result = {
        content: [{ type: 'text', text: JSON.stringify(toolResult, null, 2) }],
      };
    } else if (method === 'notifications/initialized') {
      return; // 不需要响应
    } else {
      throw new Error(`未知方法: ${method}`);
    }

    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
  } catch (e) {
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0', id,
      error: { code: -32603, message: e.message },
    }) + '\n');
  }
});
