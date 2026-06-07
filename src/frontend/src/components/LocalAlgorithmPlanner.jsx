import { useEffect, useMemo, useRef, useState } from 'react';
import { Bike, Footprints, MapPin, Minus, Plus, Route, Shuffle, TramFront } from 'lucide-react';
import { getLocalRouteGraphs } from '../api/index.js';

const ROUTE_MODES = [
  { value: 'single', label: '单点最短路' },
  { value: 'multi', label: '多点路径' },
];

const STRATEGIES = [
  { value: 'distance', label: '最短距离' },
  { value: 'time', label: '最短时间' },
  { value: 'walk', label: '步行时间' },
  { value: 'bike', label: '自行车时间' },
  { value: 'cart', label: '电瓶车时间' },
  { value: 'mixed', label: '混合交通时间' },
];

const STRATEGY_ICON = {
  distance: Route,
  time: Route,
  walk: Footprints,
  bike: Bike,
  cart: TramFront,
  mixed: Shuffle,
};

const MAJOR_LABEL_TYPES = new Set(['校门', '入口', '出口', '景点', '教学楼', '办公', '宿舍', '运动', '场馆', '寺庙', '街区', '生活区']);
const ZOOM_LEVELS = [1, 1.35, 1.7, 2.2, 2.8];

export default function LocalAlgorithmPlanner() {
  const [graphs, setGraphs] = useState([]);
  const [graphSource, setGraphSource] = useState('数据库');
  const [graphLoadError, setGraphLoadError] = useState('正在从数据库加载路网数据...');
  const [graphId, setGraphId] = useState('');
  const [routeMode, setRouteMode] = useState('single');
  const [strategy, setStrategy] = useState('distance');
  const [startId, setStartId] = useState('');
  const [endId, setEndId] = useState('');
  const [waypointIds, setWaypointIds] = useState([]);

  useEffect(() => {
    let cancelled = false;
    getLocalRouteGraphs()
      .then((res) => {
        const nextGraphs = res.data?.data;
        if (cancelled || !Array.isArray(nextGraphs) || nextGraphs.length === 0) return;
        setGraphs(nextGraphs);
        setGraphSource('数据库');
        setGraphLoadError('');
        if (!graphId || !nextGraphs.some((item) => item.id === graphId)) {
          const first = nextGraphs[0];
          const firstSelectable = selectableNodes(first);
          setGraphId(first.id);
          setStartId(firstSelectable[0]?.id || '');
          setEndId(firstSelectable[Math.min(4, firstSelectable.length - 1)]?.id || '');
          setWaypointIds(firstSelectable.slice(2, 5).map((node) => node.id));
        }
      })
      .catch(() => {
        if (cancelled) return;
        setGraphSource('数据库');
        setGraphLoadError('数据库路网暂不可用，请确认后端已启动并已导入路网数据');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const graph = graphs.find((item) => item.id === graphId) || graphs[0] || null;
  const nodeMap = useMemo(() => new Map((graph?.nodes || []).map((node) => [node.id, node])), [graph]);
  const edges = useMemo(() => (graph?.edges || []).map(enrichEdge), [graph]);
  const route = useMemo(() => {
    if (!graph || !startId) return emptyRoute();
    if (routeMode === 'single') return shortestPath(graph.nodes, edges, startId, endId, strategy, graph.type);
    return roundTripPath(graph.nodes, edges, startId, waypointIds, strategy, graph.type);
  }, [edges, endId, graph?.nodes, graph?.type, routeMode, startId, strategy, waypointIds]);
  const routeSet = new Set(route.path);

  const resetForGraph = (nextGraphId, sourceGraphs = graphs) => {
    const next = sourceGraphs.find((item) => item.id === nextGraphId) || sourceGraphs[0];
    if (!next) return;
    const nextSelectable = selectableNodes(next);
    setGraphId(next.id);
    setStartId(nextSelectable[0]?.id || '');
    setEndId(nextSelectable[Math.min(4, nextSelectable.length - 1)]?.id || '');
    setWaypointIds(nextSelectable.slice(2, 5).map((node) => node.id));
  };

  return (
    <section className="glass-card overflow-hidden p-0">
      <div className="grid gap-0 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-5 border-b border-gray-100 bg-white/80 p-5 lg:border-b-0 lg:border-r">
          <div>
            <div className="text-sm font-semibold text-blue-600">本地算法导航</div>
            <h2 className="mt-1 text-2xl font-black text-gray-900">景区/校园独立路网</h2>
            <p className="mt-2 text-sm text-gray-500">每次只在一个图内计算，支持最短距离、拥挤度时间和交通工具限制。</p>
          </div>

          <Field label="选择地图">
            <select value={graphId} onChange={(event) => resetForGraph(event.target.value)} className="compact-input" disabled={graphs.length === 0}>
              {graphs.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            {ROUTE_MODES.map((item) => (
              <ModeButton key={item.value} active={routeMode === item.value} onClick={() => setRouteMode(item.value)}>
                {item.label}
              </ModeButton>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {STRATEGIES.map((item) => {
              const Icon = STRATEGY_ICON[item.value] || Route;
              return (
                <ModeButton key={item.value} active={strategy === item.value} onClick={() => setStrategy(item.value)}>
                  <Icon size={14} /> {item.label}
                </ModeButton>
              );
            })}
          </div>

          <Field label="当前位置">
            {graph ? <NodeSelect graph={graph} value={startId} onChange={setStartId} /> : <EmptyInput />}
          </Field>

          {routeMode === 'single' ? (
            <Field label="目标地点">
              {graph ? <NodeSelect graph={graph} value={endId} onChange={setEndId} /> : <EmptyInput />}
            </Field>
          ) : (
            <Field label="参观点（自动返回当前位置）">
              <div className="space-y-2">
                {selectableNodes(graph).filter((node) => node.id !== startId).map((node) => (
                  <label key={node.id} className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={waypointIds.includes(node.id)}
                      onChange={(event) => {
                        setWaypointIds((prev) => event.target.checked
                          ? [...prev, node.id]
                          : prev.filter((id) => id !== node.id));
                      }}
                    />
                    {node.name}
                  </label>
                ))}
              </div>
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Metric value={formatMeters(route.distance)} label="路线距离" />
            <Metric value={formatDurationMinutes(route.time)} label="预计时间" />
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
            <div className="font-semibold">{graph?.name || '数据库路网'}</div>
            <div className="mt-1">{graph?.description || '本地算法模式只读取数据库中的路网图。'}</div>
            <div className="mt-2 text-xs text-blue-600">节点 {graph?.nodes?.length || 0} 个，边 {graph?.edges?.length || 0} 条 · 来源：{graphSource}</div>
            {graphLoadError && <div className="mt-2 text-xs text-amber-600">{graphLoadError}</div>}
          </div>
        </aside>

        <div className="bg-[#eef7ff] p-4">
          {graph ? (
            <>
              <LocalRouteMap graph={graph} edges={edges} route={route} routeSet={routeSet} nodeMap={nodeMap} />
              <RouteResult graph={graph} route={route} nodeMap={nodeMap} strategy={strategy} />
            </>
          ) : (
            <div className="rounded-2xl border border-blue-100 bg-white p-6 text-sm text-gray-500">
              {graphLoadError || '正在从数据库加载路网数据...'}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function LocalRouteMap({ graph, edges, route, routeSet, nodeMap }) {
  const activeEdges = new Set(route.edgeKeys || []);
  const scrollRef = useRef(null);
  const [zoomIndex, setZoomIndex] = useState(0);
  const zoom = ZOOM_LEVELS[zoomIndex];
  const showDetailLabels = zoom >= 1.35;
  const visibleLabelCount = graph.nodes.filter((node) => shouldShowNodeLabel(node, routeSet, showDetailLabels)).length;
  const routeBounds = useMemo(() => getRouteBounds(route.path, nodeMap), [nodeMap, route.path]);
  const routeKey = route.path.join('-');

  useEffect(() => {
    setZoomIndex(zoomIndexForRoute(routeBounds, graph.size));
  }, [graph.id, graph.size.height, graph.size.width, routeBounds?.height, routeBounds?.width, routeKey]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !routeBounds) return;
    const frame = requestAnimationFrame(() => {
      centerScrollOnRoute(container, routeBounds, graph.size);
    });
    return () => cancelAnimationFrame(frame);
  }, [graph.size.height, graph.size.width, routeBounds, routeKey, zoom]);

  return (
    <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div>
          <div className="text-sm font-bold text-gray-900">{graph.name}路网图</div>
          <div className="text-xs text-gray-500">概览显示主要地点，放大后显示全部服务点名称</div>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-gray-50 p-1">
          <button
            type="button"
            onClick={() => setZoomIndex((value) => Math.max(0, value - 1))}
            disabled={zoomIndex === 0}
            className="grid h-8 w-8 place-items-center rounded-full text-gray-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="缩小地图"
          >
            <Minus size={15} />
          </button>
          <span className="w-12 text-center text-xs font-semibold text-gray-600">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoomIndex((value) => Math.min(ZOOM_LEVELS.length - 1, value + 1))}
            disabled={zoomIndex === ZOOM_LEVELS.length - 1}
            className="grid h-8 w-8 place-items-center rounded-full text-gray-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="放大地图"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="max-h-[520px] overflow-auto bg-[#f8fbff]">
        <svg
          viewBox={`0 0 ${graph.size.width} ${graph.size.height}`}
          className="block h-auto max-w-none"
          style={{ width: `${zoom * 100}%`, minWidth: '100%' }}
          role="img"
          aria-label={`${graph.name}路网图`}
        >
          <rect width={graph.size.width} height={graph.size.height} fill="#f8fbff" />
          <rect x="28" y="28" width={graph.size.width - 56} height={graph.size.height - 56} rx="24" fill="#e6f7f5" stroke="#cbd5e1" strokeWidth="2" />
          {edges.map((edge, index) => {
            const from = nodeMap.get(edge.from);
            const to = nodeMap.get(edge.to);
            if (!from || !to) return null;
            const active = activeEdges.has(edgeKey(edge.from, edge.to));
            return (
              <line
                key={`${edge.from}-${edge.to}-${edge.transport}-${index}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={active ? '#2563eb' : transportColor(edge.transport)}
                strokeWidth={active ? 8 : 4}
                strokeLinecap="round"
                strokeDasharray={edge.transport === 'walk' ? '0' : edge.transport === 'bike' ? '8 5' : '14 7'}
                opacity={active ? 0.95 : 0.42}
              />
            );
          })}
          {route.path.length > 1 && (
            <polyline
              points={route.path.map((id) => nodeMap.get(id)).filter(Boolean).map((node) => `${node.x},${node.y}`).join(' ')}
              fill="none"
              stroke="#f97316"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {graph.nodes.map((node) => {
            const active = routeSet.has(node.id);
            const showLabel = shouldShowNodeLabel(node, routeSet, showDetailLabels);
            if (node.routingOnly && !active) return null;
            const radius = node.routingOnly ? 4 : active ? 13 : showLabel ? 9 : 6;
            return (
              <g key={node.id}>
                <title>{node.name}</title>
                <circle cx={node.x} cy={node.y} r={radius} fill={active ? '#2563eb' : '#ffffff'} stroke="#2563eb" strokeWidth={showLabel ? 3 : 2} opacity={node.routingOnly ? 0.72 : 1} />
                <circle cx={node.x} cy={node.y} r={node.routingOnly ? 1.6 : active ? 3 : 2.5} fill={active ? '#ffffff' : '#2563eb'} />
                {showLabel && (
                  <text
                    x={node.x + 12}
                    y={node.y - 10}
                    fontSize={active ? 15 : 13}
                    fontWeight={active ? 800 : 700}
                    fill="#0f172a"
                    paintOrder="stroke"
                    stroke="#ffffff"
                    strokeWidth="4"
                    strokeLinejoin="round"
                  >
                    {node.name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 px-4 py-3 text-xs text-gray-600">
        <Legend color="#94a3b8" label="步行路" />
        <Legend color="#16a34a" label="自行车道" dashed />
        <Legend color="#7c3aed" label="电瓶车固定线" dashed />
        <Legend color="#2563eb" label="选中路径" />
        <span className="ml-auto text-gray-400">当前显示 {visibleLabelCount} / {graph.nodes.length} 个名称</span>
      </div>
    </div>
  );
}

function getRouteBounds(path, nodeMap) {
  const points = path.map((id) => nodeMap.get(id)).filter(Boolean);
  if (points.length === 0) return null;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

function zoomIndexForRoute(bounds, size) {
  if (!bounds) return 0;
  const coverage = Math.max(bounds.width / size.width, bounds.height / size.height);
  if (coverage > 0.72) return 0;
  if (coverage > 0.5) return 1;
  if (coverage > 0.32) return 2;
  if (coverage > 0.18) return 3;
  return 4;
}

function centerScrollOnRoute(container, bounds, size) {
  const targetX = (bounds.centerX / size.width) * container.scrollWidth;
  const targetY = (bounds.centerY / size.height) * container.scrollHeight;
  container.scrollTo({
    left: Math.max(0, targetX - container.clientWidth / 2),
    top: Math.max(0, targetY - container.clientHeight / 2),
    behavior: 'smooth',
  });
}

function RouteResult({ route, nodeMap, strategy }) {
  const displayPath = routeDisplayNodes(route.path, nodeMap);
  const compactSteps = compactRouteSteps(route.steps, nodeMap);
  return (
    <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
        <Route size={16} /> 输出路径
      </div>
      {route.path.length === 0 ? (
        <p className="mt-3 text-sm text-gray-400">当前策略下不可达，请切换交通方式或目标点。</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {displayPath.map((id, index) => (
              <span key={`${id}-${index}`} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {index + 1}. {nodeMap.get(id)?.name || id}
              </span>
            ))}
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            {compactSteps.map((step, index) => (
              <div key={`${step.from}-${step.to}-${index}`} className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800">
                <div className="font-semibold">{nodeMap.get(step.from)?.name} → {nodeMap.get(step.to)?.name}</div>
                <div className="mt-1">{transportLabel(step.transport)} · {step.dist}m · {formatDurationMinutes(step.time)}</div>
                <div className="mt-1 text-blue-500">拥挤度 {step.congestion}，理想速度 {step.idealSpeedKmh}km/h</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500">当前策略：{STRATEGIES.find((item) => item.value === strategy)?.label}</p>
        </>
      )}
    </div>
  );
}

function shouldShowNodeLabel(node, routeSet, showDetailLabels) {
  if (node.routingOnly) return false;
  if (routeSet.has(node.id)) return true;
  if (node.sourceSpotId) return true;
  if (showDetailLabels) return true;
  return MAJOR_LABEL_TYPES.has(node.type) && Number(node.id) < 5000;
}

function routeDisplayNodes(path, nodeMap) {
  const keyNodes = path.filter((id) => !nodeMap.get(id)?.routingOnly);
  if (keyNodes.length >= 2) return keyNodes;
  return [...new Set([path[0], path[path.length - 1]].filter(Boolean))];
}

function displayNodeName(id, nodeMap) {
  const node = nodeMap.get(id);
  if (!node) return id;
  return node.routingOnly ? '沿路前进' : node.name;
}

function compactRouteSteps(steps, nodeMap) {
  const compact = [];
  let fromKey = null;
  let dist = 0;
  let time = 0;
  let lastStep = null;

  for (const step of steps) {
    const fromNode = nodeMap.get(step.from);
    const toNode = nodeMap.get(step.to);
    if (!fromKey && !fromNode?.routingOnly) fromKey = step.from;
    dist += step.dist;
    time += step.time;
    lastStep = step;

    if (fromKey && toNode && !toNode.routingOnly && toNode.id !== fromKey) {
      compact.push({ ...step, from: fromKey, to: step.to, dist, time });
      fromKey = step.to;
      dist = 0;
      time = 0;
    }
  }

  if (compact.length === 0 && lastStep) {
    compact.push({ ...lastStep, dist, time });
  }

  return compact.slice(0, 12);
}

function enrichEdge(edge) {
  const time = edge.time || travelMinutes(edge.dist, edge.idealSpeedKmh || 5, edge.congestion || 1);
  return { ...edge, time };
}

function shortestPath(nodes, edges, startId, endId, strategy, graphType) {
  const graph = buildGraph(nodes, edges, strategy, graphType);
  const dist = new Map(nodes.map((node) => [node.id, Infinity]));
  const prev = new Map();
  const prevEdge = new Map();
  const visited = new Set();
  dist.set(Number(startId), 0);

  while (visited.size < nodes.length) {
    let current = null;
    let best = Infinity;
    for (const [nodeId, value] of dist.entries()) {
      if (!visited.has(nodeId) && value < best) {
        current = nodeId;
        best = value;
      }
    }
    if (!current || current === Number(endId)) break;
    visited.add(current);

    for (const edge of graph.get(current) || []) {
      const next = best + edge.weight;
      if (next < dist.get(edge.to)) {
        dist.set(edge.to, next);
        prev.set(edge.to, current);
        prevEdge.set(edge.to, edge);
      }
    }
  }

  const path = [];
  const steps = [];
  let cur = Number(endId);
  while (cur) {
    path.unshift(cur);
    if (cur === Number(startId)) break;
    const edge = prevEdge.get(cur);
    if (edge) steps.unshift(edge);
    cur = prev.get(cur);
  }
  if (path[0] !== Number(startId)) return emptyRoute();
  return summarizeRoute(path, steps);
}

function roundTripPath(nodes, edges, startId, waypointIds, strategy, graphType) {
  const targets = waypointIds.map(Number).filter((id) => id !== Number(startId));
  if (targets.length === 0) return emptyRoute();
  const remaining = new Set(targets);
  let current = Number(startId);
  const fullPath = [current];
  const fullSteps = [];

  while (remaining.size > 0) {
    let bestTarget = null;
    let bestRoute = null;
    for (const target of remaining) {
      const route = shortestPath(nodes, edges, current, target, strategy, graphType);
      const routeCost = strategy === 'distance' ? route.distance : route.time;
      const bestCost = bestRoute ? (strategy === 'distance' ? bestRoute.distance : bestRoute.time) : Infinity;
      if (route.path.length && routeCost < bestCost) {
        bestTarget = target;
        bestRoute = route;
      }
    }
    if (!bestRoute) return emptyRoute();
    fullPath.push(...bestRoute.path.slice(1));
    fullSteps.push(...bestRoute.steps);
    remaining.delete(bestTarget);
    current = bestTarget;
  }

  const back = shortestPath(nodes, edges, current, Number(startId), strategy, graphType);
  if (!back.path.length) return emptyRoute();
  fullPath.push(...back.path.slice(1));
  fullSteps.push(...back.steps);
  return summarizeRoute(fullPath, fullSteps);
}

function buildGraph(nodes, edges, strategy, graphType) {
  const graph = new Map(nodes.map((node) => [node.id, []]));
  for (const edge of edges) {
    const strategyEdge = edgeForStrategy(edge, strategy, graphType);
    if (!strategyEdge) continue;
    const weight = strategy === 'distance' ? strategyEdge.dist : strategyEdge.time;
    const item = { ...strategyEdge, weight };
    graph.get(edge.from)?.push({ ...item, to: edge.to });
    graph.get(edge.to)?.push({ ...item, from: edge.to, to: edge.from });
  }
  return graph;
}

function edgeForStrategy(edge, strategy, graphType) {
  if (strategy === 'cart') return edge.transport === 'cart' ? edge : null;

  if (graphType === 'campus' && strategy === 'bike') {
    if (edge.bikeAllowed === false || edge.transport === 'cart') return null;
    return edge.transport === 'bike' ? edge : retimeEdge(edge, 'bike', 14);
  }

  if (strategy === 'bike') return edge.transport === 'bike' ? edge : null;

  if (strategy === 'walk') {
    if (edge.transport === 'cart') return null;
    return edge.transport === 'bike' ? retimeEdge(edge, 'walk', 5) : edge;
  }

  return edge;
}

function retimeEdge(edge, transport, idealSpeedKmh) {
  return {
    ...edge,
    transport,
    idealSpeedKmh,
    time: travelMinutes(edge.dist, idealSpeedKmh, edge.congestion || 0.8),
  };
}

function travelMinutes(dist, idealSpeedKmh, congestion) {
  return (dist / 1000 / Math.max(0.1, idealSpeedKmh * congestion)) * 60;
}

function summarizeRoute(path, steps) {
  return {
    path,
    steps,
    distance: steps.reduce((sum, edge) => sum + edge.dist, 0),
    time: steps.reduce((sum, edge) => sum + edge.time, 0),
    edgeKeys: steps.map((step) => edgeKey(step.from, step.to)),
  };
}

function emptyRoute() {
  return { path: [], steps: [], distance: 0, time: 0, edgeKeys: [] };
}

function edgeKey(from, to) {
  return [Number(from), Number(to)].sort((a, b) => a - b).join('-');
}

function NodeSelect({ graph, value, onChange }) {
  const nodes = selectableNodes(graph);
  return (
    <select value={value} onChange={(event) => onChange(Number(event.target.value))} className="compact-input">
      {nodes.map((node) => (
        <option key={node.id} value={node.id}>{node.name}</option>
      ))}
    </select>
  );
}

function selectableNodes(graph) {
  return (graph?.nodes || []).filter((node) => !node.routingOnly);
}

function EmptyInput() {
  return (
    <div className="compact-input flex items-center text-gray-400">
      等待数据库路网
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      {children}
    </label>
  );
}

function ModeButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
        active ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  );
}

function Metric({ value, label }) {
  return (
    <div className="rounded-2xl bg-blue-50 px-4 py-4 text-center">
      <div className="text-2xl font-black text-blue-600">{value}</div>
      <div className="mt-1 text-xs text-gray-500">{label}</div>
    </div>
  );
}

function Legend({ color, label, dashed }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1 w-8 rounded-full" style={{ backgroundColor: color, opacity: 0.8, borderTop: dashed ? '2px dashed currentColor' : undefined }} />
      {label}
    </span>
  );
}

function transportColor(transport) {
  return ({ walk: '#94a3b8', bike: '#16a34a', cart: '#7c3aed' })[transport] || '#94a3b8';
}

function transportLabel(transport) {
  return ({ walk: '步行', bike: '自行车', cart: '电瓶车' })[transport] || transport;
}

function formatMeters(value) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${Math.round(value)} m`;
}

function formatDurationMinutes(value) {
  const minutes = Number(value || 0);
  if (minutes <= 0) return '0秒';
  if (minutes < 1) return `${Math.max(1, Math.round(minutes * 60))}秒`;
  if (minutes < 60) return `${Math.round(minutes)}分钟`;
  const hours = Math.floor(minutes / 60);
  const remain = Math.round(minutes % 60);
  return remain > 0 ? `${hours}小时${remain}分钟` : `${hours}小时`;
}
