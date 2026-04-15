const express = require('express');
const router = express.Router();
const { edges } = require('../data/graph');
const spotRepo = require('../repositories/spotRepository');
const { shortestPath, multiPointPath, buildGraph, dijkstra } = require('../algorithms/dijkstra');

// POST /api/routes/shortest — 单点最短路（Dijkstra）
router.post('/shortest', (req, res) => {
  const { fromId, toId, mode = 'distance' } = req.body;
  if (!fromId || !toId) return res.status(400).json({ success: false, message: '缺少 fromId 或 toId' });

  const spots = spotRepo.getAll();
  const result = shortestPath(spots, edges, Number(fromId), Number(toId), mode);
  if (!result.reachable) {
    return res.json({ success: false, message: '两点之间不可达，请检查节点ID是否在道路图中', reachable: false });
  }

  const pathSpots = result.path.map(id => {
    const s = spotRepo.findById(id);
    return s ? { id: s.id, name: s.name, city: s.city, type: s.type } : { id };
  });

  res.json({
    success: true,
    data: { path: result.path, pathSpots, totalDist: result.totalDist, totalTime: result.totalTime, mode, algorithm: 'Dijkstra + MinHeap' },
  });
});

// POST /api/routes/multi — 多点最短路（最近邻 + 2-opt）
router.post('/multi', (req, res) => {
  const { waypointIds, mode = 'distance' } = req.body;
  if (!waypointIds || waypointIds.length < 2) {
    return res.status(400).json({ success: false, message: '至少需要 2 个途经点' });
  }

  const spots = spotRepo.getAll();
  const result = multiPointPath(spots, edges, waypointIds.map(Number), mode);

  const pathSpots = result.path.map(id => {
    const s = spotRepo.findById(id);
    return s ? { id: s.id, name: s.name, city: s.city, type: s.type } : { id };
  });

  res.json({
    success: true,
    data: { ...result, pathSpots, mode, algorithm: 'NearestNeighbor + 2-opt' },
  });
});

// GET /api/routes/nearby?spotId=1&maxDist=5000&type=restaurant — 附近场所（按道路距离）
router.get('/nearby', (req, res) => {
  const { spotId, maxDist = 5000, type, limit = 10 } = req.query;
  if (!spotId) return res.status(400).json({ success: false, message: '缺少 spotId' });

  const graph = buildGraph(edges);
  const { dist } = dijkstra(graph, Number(spotId), 'distance');

  let candidates = [];
  for (const [nodeId, d] of dist.entries()) {
    if (d <= Number(maxDist) && nodeId !== Number(spotId)) {
      const spot = spotRepo.findById(nodeId);
      if (spot && (!type || spot.type === type)) {
        candidates.push({ ...spot, roadDist: d });
      }
    }
  }

  candidates.sort((a, b) => a.roadDist - b.roadDist);
  candidates = candidates.slice(0, Number(limit));

  res.json({
    success: true,
    data: candidates,
    note: '距离为道路距离（米），非直线距离',
    algorithm: 'Dijkstra shortest path',
  });
});

// GET /api/routes/graph-stats — 图统计
router.get('/graph-stats', (req, res) => {
  const nodeSet = new Set();
  edges.forEach(e => { nodeSet.add(e.from); nodeSet.add(e.to); });
  res.json({
    success: true,
    data: {
      totalEdges: edges.length,
      totalNodes: nodeSet.size,
      totalSpots: spotRepo.getAll().length,
    },
  });
});

module.exports = router;
