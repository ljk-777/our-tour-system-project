const express = require('express');
const router = express.Router();
const spotRepo = require('../repositories/spotRepository');
const routeRepo = require('../repositories/routeRepository');
const { shortestPath, multiPointPath, buildGraph, dijkstra } = require('../algorithms/dijkstra');

router.post('/shortest', async (req, res, next) => {
  try {
    const { fromId, toId, mode = 'distance' } = req.body;
    if (!fromId || !toId) return res.status(400).json({ success: false, message: '缺少 fromId 或 toId' });

    const [spots, edges] = await Promise.all([spotRepo.getAll(), routeRepo.getAll()]);
    const result = shortestPath(spots, edges, Number(fromId), Number(toId), mode);
    if (!result.reachable) {
      return res.json({ success: false, message: '两点之间不可达，请检查节点 ID 是否存在于道路图中', reachable: false });
    }

    const spotMap = new Map(spots.map((spot) => [spot.id, spot]));
    const pathSpots = result.path.map((id) => {
      const spot = spotMap.get(id);
      return spot ? { id: spot.id, name: spot.name, city: spot.city, type: spot.type } : { id };
    });

    res.json({
      success: true,
      data: {
        path: result.path,
        pathSpots,
        totalDist: result.totalDist,
        totalTime: result.totalTime,
        mode,
        algorithm: 'Dijkstra + MinHeap',
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/multi', async (req, res, next) => {
  try {
    const { waypointIds, mode = 'distance' } = req.body;
    if (!waypointIds || waypointIds.length < 2) {
      return res.status(400).json({ success: false, message: '至少需要 2 个途经点' });
    }

    const [spots, edges] = await Promise.all([spotRepo.getAll(), routeRepo.getAll()]);
    const result = multiPointPath(spots, edges, waypointIds.map(Number), mode);
    const spotMap = new Map(spots.map((spot) => [spot.id, spot]));
    const pathSpots = result.path.map((id) => {
      const spot = spotMap.get(id);
      return spot ? { id: spot.id, name: spot.name, city: spot.city, type: spot.type } : { id };
    });

    res.json({
      success: true,
      data: { ...result, pathSpots, mode, algorithm: 'NearestNeighbor + 2-opt' },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/nearby', async (req, res, next) => {
  try {
    const { spotId, maxDist = 5000, type, limit = 10 } = req.query;
    if (!spotId) return res.status(400).json({ success: false, message: '缺少 spotId' });

    const [edges, allSpots] = await Promise.all([routeRepo.getAll(), spotRepo.getAll()]);
    const graph = buildGraph(edges);
    const { dist } = dijkstra(graph, Number(spotId), 'distance');
    const spotMap = new Map(allSpots.map((spot) => [spot.id, spot]));

    let candidates = [];
    for (const [nodeId, roadDist] of dist.entries()) {
      if (roadDist <= Number(maxDist) && nodeId !== Number(spotId)) {
        const spot = spotMap.get(nodeId);
        if (spot && (!type || spot.type === type)) {
          candidates.push({ ...spot, roadDist });
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
  } catch (error) {
    next(error);
  }
});

router.get('/graph-stats', async (req, res, next) => {
  try {
    const [edges, allSpots] = await Promise.all([routeRepo.getAll(), spotRepo.getAll()]);
    const nodeSet = new Set();
    edges.forEach((edge) => {
      nodeSet.add(edge.from);
      nodeSet.add(edge.to);
    });

    res.json({
      success: true,
      data: {
        totalEdges: edges.length,
        totalNodes: nodeSet.size,
        totalSpots: allSpots.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
