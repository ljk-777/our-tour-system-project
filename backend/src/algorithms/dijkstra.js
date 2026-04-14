/**
 * 算法模块：Dijkstra 最短路径
 * 课程设计知识点：单源最短路、优先队列优化
 * 支持：最短距离 / 最短时间 / 多交通方式
 */
const { MinHeap } = require('./heap');

/**
 * Dijkstra 算法
 * @param {Map} graph - 邻接表 Map<nodeId, Array<{to, dist, time, transport}>>
 * @param {number} startId - 起点 ID
 * @param {string} mode - 权重模式: 'distance'|'time'
 * @returns {{ dist, prev }} dist: 各节点最短距离, prev: 前驱节点（用于路径回溯）
 */
function dijkstra(graph, startId, mode = 'distance') {
  const dist = new Map();
  const prev = new Map();
  const visited = new Set();

  // 初始化所有节点为无穷大
  for (const nodeId of graph.keys()) {
    dist.set(nodeId, Infinity);
  }
  dist.set(startId, 0);

  // 小顶堆作优先队列
  const pq = new MinHeap((a, b) => a.dist - b.dist);
  pq.push({ id: startId, dist: 0 });

  while (!pq.isEmpty()) {
    const { id: u, dist: d } = pq.pop();
    if (visited.has(u)) continue;
    visited.add(u);

    const neighbors = graph.get(u) || [];
    for (const edge of neighbors) {
      const weight = mode === 'time' ? edge.time : edge.dist;
      const newDist = d + weight;
      if (newDist < (dist.get(edge.to) || Infinity)) {
        dist.set(edge.to, newDist);
        prev.set(edge.to, u);
        pq.push({ id: edge.to, dist: newDist });
      }
    }
  }
  return { dist, prev };
}

/**
 * 回溯路径
 * @param {Map} prev - dijkstra 返回的前驱节点 Map
 * @param {number} startId - 起点
 * @param {number} endId - 终点
 * @returns {Array<number>} 从起点到终点的节点 ID 数组
 */
function getPath(prev, startId, endId) {
  const path = [];
  let cur = endId;
  while (cur !== undefined && cur !== startId) {
    path.unshift(cur);
    cur = prev.get(cur);
  }
  if (cur === startId) path.unshift(startId);
  else return []; // 不可达
  return path;
}

/**
 * 单点最短路（对外接口）
 * @param {Array} nodesData - 所有节点
 * @param {Array} edgesData - 所有边 [{from, to, dist, time, transport}]
 * @param {number} startId
 * @param {number} endId
 * @param {string} mode - 'distance'|'time'
 */
function shortestPath(nodesData, edgesData, startId, endId, mode = 'distance') {
  const graph = buildGraph(edgesData);

  // 检查节点是否存在
  if (!graph.has(startId)) graph.set(startId, []);
  if (!graph.has(endId)) graph.set(endId, []);

  const { dist, prev } = dijkstra(graph, startId, mode);
  const path = getPath(prev, startId, endId);
  const totalCost = dist.get(endId);

  return {
    path,
    totalDist: mode === 'distance' ? totalCost : null,
    totalTime: mode === 'time' ? totalCost : null,
    reachable: totalCost !== Infinity,
  };
}

/**
 * 多点最短路：最近邻贪心 + 2-opt 优化
 * 课程设计知识点：TSP 近似算法、局部搜索
 * @param {Array} nodesData
 * @param {Array} edgesData
 * @param {Array<number>} waypointIds - 途经点 ID 数组（含起点终点）
 * @param {string} mode
 */
function multiPointPath(nodesData, edgesData, waypointIds, mode = 'distance') {
  if (waypointIds.length < 2) return { path: waypointIds, totalCost: 0, segments: [] };

  const graph = buildGraph(edgesData);

  // 预计算每对节点的最短路
  const pairDist = new Map();
  const pairPath = new Map();
  for (const id of waypointIds) {
    if (!graph.has(id)) graph.set(id, []);
    const { dist, prev } = dijkstra(graph, id, mode);
    for (const id2 of waypointIds) {
      const key = `${id}-${id2}`;
      pairDist.set(key, dist.get(id2) || Infinity);
      pairPath.set(key, getPath(prev, id, id2));
    }
  }

  // 最近邻贪心：从起点出发，每次选最近未访问节点
  const start = waypointIds[0];
  const end = waypointIds[waypointIds.length - 1];
  const middle = waypointIds.slice(1, -1);

  let order = [start, ...nearestNeighbor(middle, start, pairDist), end];

  // 2-opt 局部搜索优化（仅对中间节点）
  order = twoOpt(order, pairDist);

  // 拼接完整路径
  const segments = [];
  let totalCost = 0;
  const fullPath = [order[0]];
  for (let i = 0; i < order.length - 1; i++) {
    const key = `${order[i]}-${order[i + 1]}`;
    const seg = pairPath.get(key) || [];
    if (seg.length > 1) fullPath.push(...seg.slice(1));
    totalCost += pairDist.get(key) || 0;
    segments.push({ from: order[i], to: order[i + 1], cost: pairDist.get(key) });
  }

  return { path: fullPath, order, totalCost, segments };
}

// 最近邻贪心辅助
function nearestNeighbor(nodes, start, pairDist) {
  const unvisited = [...nodes];
  const result = [];
  let cur = start;
  while (unvisited.length > 0) {
    let minDist = Infinity, minIdx = 0;
    for (let i = 0; i < unvisited.length; i++) {
      const d = pairDist.get(`${cur}-${unvisited[i]}`) || Infinity;
      if (d < minDist) { minDist = d; minIdx = i; }
    }
    cur = unvisited[minIdx];
    result.push(cur);
    unvisited.splice(minIdx, 1);
  }
  return result;
}

// 2-opt 局部搜索优化
function twoOpt(route, pairDist) {
  let improved = true;
  let best = [...route];
  while (improved) {
    improved = false;
    for (let i = 1; i < best.length - 2; i++) {
      for (let j = i + 1; j < best.length - 1; j++) {
        const d1 = (pairDist.get(`${best[i-1]}-${best[i]}`) || 0) + (pairDist.get(`${best[j]}-${best[j+1]}`) || 0);
        const d2 = (pairDist.get(`${best[i-1]}-${best[j]}`) || 0) + (pairDist.get(`${best[i]}-${best[j+1]}`) || 0);
        if (d2 < d1) {
          // 翻转 i..j 段
          const seg = best.slice(i, j + 1).reverse();
          best = [...best.slice(0, i), ...seg, ...best.slice(j + 1)];
          improved = true;
        }
      }
    }
  }
  return best;
}

// 构建邻接表（双向图）
function buildGraph(edgesData) {
  const graph = new Map();
  for (const edge of edgesData) {
    if (!graph.has(edge.from)) graph.set(edge.from, []);
    if (!graph.has(edge.to)) graph.set(edge.to, []);
    graph.get(edge.from).push({ to: edge.to, dist: edge.dist, time: edge.time, transport: edge.transport });
    graph.get(edge.to).push({ to: edge.from, dist: edge.dist, time: edge.time, transport: edge.transport });
  }
  return graph;
}

module.exports = { dijkstra, shortestPath, multiPointPath, buildGraph, getPath };
