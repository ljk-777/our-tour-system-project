import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Clock3,
  Footprints,
  Layers,
  Minus,
  Plus,
  Route,
} from 'lucide-react';
import firstFloorNetwork from '../assets/indoor/teaching-lab-1f-network.json';
import secondFloorNetwork from '../assets/indoor/teaching-lab-2f-network.json';
import thirdFloorNetwork from '../assets/indoor/teaching-lab-3f-network.json';
import fourthFloorNetwork from '../assets/indoor/teaching-lab-4f-network.json';
import fifthFloorNetwork from '../assets/indoor/teaching-lab-5f-network.json';
import { describeRoute as describeRouteApi } from '../api/index.js';
import firstFloorImage from '../assets/indoor/teaching-lab-1f-reference.jpg';
import secondFloorImage from '../assets/indoor/teaching-lab-2f-reference.jpg';
import thirdFloorImage from '../assets/indoor/teaching-lab-3f-reference.jpg';
import fourthFloorImage from '../assets/indoor/teaching-lab-4f-reference.jpg';
import fifthFloorImage from '../assets/indoor/teaching-lab-5f-reference.jpg';

const FLOORS = ['1F', '2F', '3F', '4F', '5F'];
const ZOOM_LEVELS = [0.7, 1, 1.35, 1.8, 2.35, 3];
const PIXEL_TO_METER = 0.045;
const VERTICAL_TRANSFER_METERS = 18;

const FLOOR_IMAGES = {
  '1F': firstFloorImage,
  '2F': secondFloorImage,
  '3F': thirdFloorImage,
  '4F': fourthFloorImage,
  '5F': fifthFloorImage,
};

const FLOOR_NETWORKS = {
  '1F': firstFloorNetwork,
  '2F': secondFloorNetwork,
  '3F': thirdFloorNetwork,
  '4F': fourthFloorNetwork,
  '5F': fifthFloorNetwork,
};

export default function IndoorNavigationPanel() {
  const graph = useMemo(() => buildManualIndoorGraph(), []);
  const [floor, setFloor] = useState('1F');
  const [startId, setStartId] = useState(() => graph.selectableNodes[0]?.id || '');
  const [endId, setEndId] = useState(() => graph.selectableNodes.find((node) => node.floor === '3F' && node.type === 'door')?.id || graph.selectableNodes.at(-1)?.id || '');
  const [zoomIndex, setZoomIndex] = useState(2);
  const [facilityOriginId, setFacilityOriginId] = useState(() => graph.selectableNodes[0]?.id || '');
  const [facilityCategory, setFacilityCategory] = useState('all');
  const [facilityRadius, setFacilityRadius] = useState(120);

  const route = useMemo(() => shortestIndoorPath(graph, startId, endId), [endId, graph, startId]);
  const nearbyFacilities = useMemo(() => findNearbyIndoorFacilities(graph, facilityOriginId, {
    category: facilityCategory,
    radius: facilityRadius,
  }), [facilityCategory, facilityOriginId, facilityRadius, graph]);
  const currentSize = graph.floorSizes[floor];
  const visibleNodes = graph.nodes.filter((node) => node.floor === floor);
  const visibleEdges = graph.edges.filter((edge) => {
    const from = graph.nodeMap.get(edge.from);
    const to = graph.nodeMap.get(edge.to);
    return from?.floor === floor && to?.floor === floor;
  });
  const floorRoutePath = route.path.filter((id) => graph.nodeMap.get(id)?.floor === floor);
  const routeNodeIds = new Set(route.path);
  const activeEdgeKeys = new Set(route.edgeKeys);
  const zoom = ZOOM_LEVELS[zoomIndex];
  const showAllLabels = zoom >= 0.7;
  const descriptionPayload = useMemo(() => buildIndoorRouteDescriptionPayload(graph, route), [graph, route]);
  const routeDescription = useRouteDescription(descriptionPayload);

  return (
    <section className="grid gap-0 overflow-hidden rounded-[28px] border border-blue-100 bg-white shadow-xl lg:grid-cols-[360px_1fr]">
      <aside className="space-y-5 border-b border-gray-100 bg-white p-5 lg:border-b-0 lg:border-r">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-blue-700">
            <Building2 size={18} /> 室内导航
          </div>
          <h2 className="mt-2 text-2xl font-black text-gray-900">教学实验综合楼</h2>
          <p className="mt-2 text-sm text-gray-500">
            使用你手动标注的五层 JSON 建模。教室、门口、楼梯、电梯、安全出口、卫生间和开水间都会作为独立节点参与最短路径计算。
          </p>
        </div>

        <Field label="查看楼层">
          <div className="grid grid-cols-5 gap-2">
            {FLOORS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFloor(item)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${floor === item ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-gray-50 text-gray-600 hover:bg-blue-50'}`}
              >
                {item}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid gap-3">
          <Field label="起点">
            <IndoorNodeSelect graph={graph} value={startId} onChange={setStartId} />
          </Field>
          <Field label="终点">
            <IndoorNodeSelect graph={graph} value={endId} onChange={setEndId} />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Metric icon={Footprints} value={`${route.distance}m`} label="距离" />
          <Metric icon={Clock3} value={formatSeconds(route.seconds)} label="时间" />
          <Metric icon={Layers} value={`${graph.nodes.length}`} label="节点" />
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
          <div className="font-semibold">当前模型</div>
          <div className="mt-1">
            五层手动路网：{graph.nodes.length} 个点，{graph.edges.length} 条边。卫生间 {graph.counts.toilet} 个，开水间 {graph.counts.water} 个，均独立命名并参与导航。
          </div>
        </div>

        <RouteSteps route={route} graph={graph} />
      </aside>

      <div className="bg-[#eef7ff] p-4">
        <div className="rounded-2xl border border-blue-100 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-lg font-black text-gray-900">教学实验综合楼 {floor} 室内导航图</div>
              <div className="mt-1 text-sm text-gray-500">按当前楼层真实图片比例绘制，灰线为手动标注通道，蓝线为当前路线。</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomIndex((value) => Math.max(0, value - 1))}
                className="grid h-9 w-9 place-items-center rounded-full bg-gray-50 text-gray-600"
                aria-label="缩小地图"
              >
                <Minus size={16} />
              </button>
              <span className="w-14 text-center text-sm font-bold text-gray-600">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoomIndex((value) => Math.min(ZOOM_LEVELS.length - 1, value + 1))}
                className="grid h-9 w-9 place-items-center rounded-full bg-gray-50 text-gray-600"
                aria-label="放大地图"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="mt-4 max-h-[640px] overflow-auto rounded-2xl bg-[#f8fbff]">
            <svg
              viewBox={`0 0 ${currentSize.width} ${currentSize.height}`}
              className="block h-auto max-w-none"
              style={{ width: `${zoom * 100}%`, minWidth: '100%' }}
              role="img"
              aria-label={`教学实验综合楼${floor}手动路网室内导航图`}
            >
              <image href={FLOOR_IMAGES[floor]} x="0" y="0" width={currentSize.width} height={currentSize.height} preserveAspectRatio="xMidYMid meet" opacity="0.9" />
              <rect x="0" y="0" width={currentSize.width} height={currentSize.height} fill="transparent" stroke="#2563eb" strokeWidth="8" />
              <IndoorEdges graph={graph} edges={visibleEdges} activeEdgeKeys={activeEdgeKeys} />
              <RoutePolyline graph={graph} path={floorRoutePath} />
              <IndoorNodes nodes={visibleNodes} routeNodeIds={routeNodeIds} showAllLabels={showAllLabels} />
            </svg>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-600">
            <Legend color="#94a3b8" label="手动标注通道" line />
            <Legend color="#2563eb" label="当前路线" line />
            <Legend color="#0ea5e9" label="房间/教室" />
            <Legend color="#16a34a" label="安全出口" />
            <Legend color="#7c3aed" label="楼梯" />
            <Legend color="#f97316" label="电梯" />
            <Legend color="#0891b2" label="卫生间" />
            <Legend color="#0d9488" label="开水间" />
          </div>
        </div>
        <IndoorNearbyFacilitiesPanel
          graph={graph}
          originId={facilityOriginId}
          category={facilityCategory}
          radius={facilityRadius}
          results={nearbyFacilities}
          onOriginChange={setFacilityOriginId}
          onCategoryChange={setFacilityCategory}
          onRadiusChange={setFacilityRadius}
          onNavigate={(node) => {
            setStartId(facilityOriginId);
            setEndId(node.id);
            setFloor(node.floor);
          }}
        />
        <RouteDescriptionCard result={routeDescription} />
      </div>
    </section>
  );
}

function IndoorEdges({ graph, edges, activeEdgeKeys }) {
  return (
    <g>
      {edges.map((edge) => {
        const from = graph.nodeMap.get(edge.from);
        const to = graph.nodeMap.get(edge.to);
        if (!from || !to) return null;
        const active = activeEdgeKeys.has(edgeKey(edge.from, edge.to));
        return (
          <line
            key={`${edge.from}-${edge.to}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={active ? '#2563eb' : '#64748b'}
            strokeWidth={active ? 15 : 8}
            strokeLinecap="round"
            opacity={active ? 0.95 : 0.45}
          />
        );
      })}
    </g>
  );
}

function IndoorNodes({ nodes, routeNodeIds, showAllLabels }) {
  return (
    <g>
      {nodes.map((node) => {
        const active = routeNodeIds.has(node.id);
        const important = !['corridor', 'junction'].includes(node.type);
        const showLabel = active || important || showAllLabels;
        const radius = active ? 18 : important ? 13 : 8;
        return (
          <g key={node.id}>
            <title>{node.name}</title>
            <circle cx={node.x} cy={node.y} r={radius + 5} fill="#ffffff" opacity="0.9" />
            <circle cx={node.x} cy={node.y} r={radius} fill={active ? '#2563eb' : '#ffffff'} stroke={nodeColor(node.type)} strokeWidth="6" />
            <circle cx={node.x} cy={node.y} r="4" fill={active ? '#ffffff' : nodeColor(node.type)} />
            {showLabel && (
              <text
                x={node.x + 18}
                y={node.y - 15}
                fontSize={active ? 34 : 25}
                fontWeight="800"
                fill="#0f172a"
                stroke="#ffffff"
                strokeWidth="7"
                paintOrder="stroke"
              >
                {node.shortName}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

function RoutePolyline({ graph, path }) {
  if (path.length < 2) return null;
  const points = path.map((id) => graph.nodeMap.get(id)).filter(Boolean);
  return (
    <polyline
      points={points.map((point) => `${point.x},${point.y}`).join(' ')}
      fill="none"
      stroke="#2563eb"
      strokeWidth="14"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.95"
    />
  );
}

function RouteSteps({ route, graph }) {
  const compact = compactIndoorPath(route.path, graph.nodeMap);
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
        <Route size={16} /> 输出路径
      </div>
      <div className="space-y-2">
        {compact.map((id, index) => {
          const node = graph.nodeMap.get(id);
          return (
            <div key={`${id}-${index}`} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm text-gray-700">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">{index + 1}</span>
              <span className="font-semibold">{node?.name || id}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RouteDescriptionCard({ result }) {
  if (!result?.description && !result?.loading) return null;
  return (
    <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
      <div className="flex items-center justify-between gap-3">
        <div className="font-bold">路线说明</div>
        <span className="rounded-full bg-white/80 px-2 py-1 text-[11px] font-semibold text-blue-600">
          {result.loading ? '生成中' : result.source === 'api' ? 'API 生成' : '本地模板'}
        </span>
      </div>
      <p className="mt-2 whitespace-pre-line leading-6">{result.loading ? '正在根据当前路径生成说明...' : result.description}</p>
    </div>
  );
}

function IndoorNearbyFacilitiesPanel({
  graph,
  originId,
  category,
  radius,
  results,
  onOriginChange,
  onCategoryChange,
  onRadiusChange,
  onNavigate,
}) {
  return (
    <div className="mt-5 rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-black text-gray-900">附近设施排序</div>
          <div className="mt-1 text-sm text-gray-500">按室内路网距离排序，不按直线距离；可查最近卫生间和开水间。</div>
        </div>
        <div className="rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-700">
          Dijkstra 排序
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
        <Field label="当前位置">
          <IndoorNodeSelect graph={graph} value={originId} onChange={onOriginChange} />
        </Field>
        <Field label="设施类别">
          <select value={category} onChange={(event) => onCategoryChange(event.target.value)} className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400">
            <option value="all">全部设施</option>
            <option value="toilet">卫生间</option>
            <option value="water">开水间</option>
          </select>
        </Field>
        <Field label="搜索范围">
          <select value={radius} onChange={(event) => onRadiusChange(Number(event.target.value))} className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400">
            <option value={60}>60 米内</option>
            <option value={120}>120 米内</option>
            <option value={200}>200 米内</option>
            <option value={9999}>全部可达</option>
          </select>
        </Field>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {results.length === 0 ? (
          <div className="rounded-2xl bg-gray-50 px-4 py-5 text-center text-sm text-gray-400 md:col-span-2">
            当前范围内没有可达设施，试试扩大搜索范围。
          </div>
        ) : results.slice(0, 8).map((item, index) => (
          <div key={item.node.id} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-600 text-xs font-black text-white">{index + 1}</span>
                <span className="truncate text-sm font-bold text-gray-900">{item.node.name}</span>
              </div>
              <div className="mt-1 pl-9 text-xs text-gray-500">
                {indoorFacilityLabel(item.node.type)} · 路网距离 {item.distance} 米 · 约 {formatSeconds(item.seconds)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate(item.node)}
              className="shrink-0 rounded-full bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-sm shadow-blue-100"
            >
              导航
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function useRouteDescription(payload) {
  const [state, setState] = useState({ loading: false, description: '', source: '' });
  const payloadKey = useMemo(() => JSON.stringify(payload || {}), [payload]);

  useEffect(() => {
    if (!payload?.steps?.length) {
      setState({ loading: false, description: '', source: '' });
      return undefined;
    }

    let cancelled = false;
    setState({ loading: true, description: '', source: '' });
    describeRouteApi(payload)
      .then((res) => {
        if (cancelled) return;
        setState({
          loading: false,
          description: res.data?.data?.description || buildTemplateRouteDescription(payload),
          source: res.data?.data?.source || 'template',
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({
          loading: false,
          description: buildTemplateRouteDescription(payload),
          source: 'template',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [payloadKey]);

  return state;
}

function IndoorNodeSelect({ graph, value, onChange }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400">
      {graph.selectableNodes.map((node) => (
        <option key={node.id} value={node.id}>{node.name}</option>
      ))}
    </select>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-gray-700">{label}</span>
      {children}
    </label>
  );
}

function Metric({ icon: Icon, value, label }) {
  return (
    <div className="rounded-2xl bg-blue-50 p-3 text-center text-blue-800">
      <Icon size={17} className="mx-auto mb-1" />
      <div className="text-lg font-black">{value}</div>
      <div className="text-xs text-blue-500">{label}</div>
    </div>
  );
}

function Legend({ color, label, line = false }) {
  return (
    <span className="inline-flex items-center gap-2">
      {line ? <span className="h-1 w-8 rounded-full" style={{ backgroundColor: color }} /> : <span className="h-3 w-3 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: color }} />}
      {label}
    </span>
  );
}

function buildIndoorRouteDescriptionPayload(graph, route) {
  const start = graph.nodeMap.get(route.path[0]);
  const end = graph.nodeMap.get(route.path[route.path.length - 1]);
  const steps = compactIndoorDescriptionSteps(route.steps || [], graph.nodeMap);
  return {
    scene: 'indoor',
    mapName: '教学实验综合楼',
    strategy: '室内最短路径',
    start: start?.name || '当前位置',
    end: end?.name || '目标点',
    distance: route.distance,
    seconds: route.seconds,
    steps,
  };
}

function findNearbyIndoorFacilities(graph, originId, { category, radius }) {
  if (!originId || !graph.nodeMap.has(originId)) return [];
  const distances = shortestIndoorDistances(graph, originId);
  return graph.nodes
    .filter((node) => ['toilet', 'water'].includes(node.type))
    .filter((node) => category === 'all' || node.type === category)
    .map((node) => ({
      node,
      distance: Math.round(distances.get(node.id) ?? Infinity),
      seconds: Math.round((distances.get(node.id) ?? Infinity) / 1.15),
    }))
    .filter((item) => Number.isFinite(item.distance) && item.distance <= radius)
    .sort((a, b) => a.distance - b.distance || a.node.name.localeCompare(b.node.name, 'zh-CN'));
}

/**
 * Single-source Dijkstra for indoor facility sorting.
 * Time complexity: O(V^2 + E) with linear minimum-distance selection.
 */
function shortestIndoorDistances(graph, originId) {
  const dist = new Map(graph.nodes.map((node) => [node.id, Infinity]));
  const visited = new Set();
  const adjacency = new Map(graph.nodes.map((node) => [node.id, []]));
  for (const edge of graph.edges) {
    adjacency.get(edge.from)?.push({ to: edge.to, dist: edge.dist });
    adjacency.get(edge.to)?.push({ to: edge.from, dist: edge.dist });
  }

  dist.set(originId, 0);
  while (visited.size < graph.nodes.length) {
    let current = null;
    let best = Infinity;
    for (const [id, value] of dist.entries()) {
      if (!visited.has(id) && value < best) {
        current = id;
        best = value;
      }
    }
    if (!current) break;
    visited.add(current);
    for (const edge of adjacency.get(current) || []) {
      const next = best + edge.dist;
      if (next < dist.get(edge.to)) dist.set(edge.to, next);
    }
  }

  return dist;
}

function indoorFacilityLabel(type) {
  return ({ toilet: '卫生间', water: '开水间' })[type] || '设施';
}

function compactIndoorDescriptionSteps(steps, nodeMap) {
  const result = [];
  let segmentStart = steps[0]?.from;
  let segmentDist = 0;
  let segmentSteps = [];

  steps.forEach((step, index) => {
    const from = nodeMap.get(step.from);
    const to = nodeMap.get(step.to);

    if (step.kind === 'vertical' && segmentStart && segmentStart !== step.from && segmentDist > 0) {
      result.push(buildIndoorDescriptionStep(result.length + 1, segmentStart, step.from, segmentDist, 'indoor', nodeMap, segmentSteps));
      segmentStart = step.from;
      segmentDist = 0;
      segmentSteps = [];
    }

    segmentDist += step.dist || 0;
    segmentSteps.push(step);
    const isLast = index === steps.length - 1;
    const shouldCloseSegment = step.kind === 'vertical' || isDescriptionNode(to) || isLast;

    if (segmentStart && shouldCloseSegment) {
      result.push(buildIndoorDescriptionStep(
        result.length + 1,
        segmentStart,
        step.to,
        segmentDist,
        step.kind === 'vertical' ? verticalTransport(from, to) : 'indoor',
        nodeMap,
        segmentSteps,
      ));
      segmentStart = step.to;
      segmentDist = 0;
      segmentSteps = [];
    }
  });

  return result.filter((step) => step.from !== step.to);
}

function buildIndoorDescriptionStep(order, fromId, toId, distance, transport, nodeMap, segmentSteps = []) {
  const from = nodeMap.get(fromId);
  const to = nodeMap.get(toId);
  const dist = Math.round(distance || 0);
  const direction = transport === 'indoor' ? summarizeDirections(segmentSteps, nodeMap) : '';
  return {
    order,
    from: from?.name || fromId,
    to: to?.name || toId,
    floor: from?.floor === to?.floor ? from?.floor : `${from?.floor || ''} 到 ${to?.floor || ''}`,
    transport,
    distance: dist,
    seconds: Math.round(dist / 1.15),
    note: direction || (transport === 'elevator' || transport === 'stair' ? '跨楼层通行' : ''),
  };
}

function summarizeDirections(steps, nodeMap) {
  const directions = [];
  for (const step of steps) {
    const from = nodeMap.get(step.from);
    const to = nodeMap.get(step.to);
    if (!from || !to || from.floor !== to.floor) continue;
    const direction = edgeDirection(from, to);
    if (!direction) continue;
    if (directions.at(-1) !== direction) directions.push(direction);
  }
  const compact = directions.slice(0, 3);
  if (compact.length === 0) return '';
  if (compact.length === 1) return `行进方向：向${compact[0]}`;
  return `行进方向：先向${compact[0]}，再${compact.slice(1).map((item, index) => `向${item}${index === compact.length - 2 ? '一点' : ''}`).join('，再')}`;
}

function edgeDirection(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.hypot(dx, dy) < 4) return '';
  if (Math.abs(dx) >= Math.abs(dy) * 1.35) return dx > 0 ? '东' : '西';
  if (Math.abs(dy) >= Math.abs(dx) * 1.35) return dy > 0 ? '南' : '北';
  if (dx > 0 && dy < 0) return '东北';
  if (dx > 0 && dy > 0) return '东南';
  if (dx < 0 && dy < 0) return '西北';
  return '西南';
}

function isDescriptionNode(node) {
  if (!node) return false;
  if (['door', 'exit', 'stair', 'elevator', 'toilet', 'water'].includes(node.type)) return true;
  return !/节点|通道点/.test(node.name);
}

function verticalTransport(from, to) {
  if (from?.type === 'elevator' || to?.type === 'elevator') return 'elevator';
  return 'stair';
}

function buildTemplateRouteDescription(payload) {
  const firstLine = `从 ${payload.start} 出发，前往 ${payload.end}，全程约 ${payload.distance} 米，预计 ${formatSeconds(payload.seconds)}。`;
  const stepLines = (payload.steps || []).slice(0, 6).map((step, index) => (
    `${index + 1}. ${step.floor ? `在 ${step.floor}，` : ''}从 ${step.from} 到 ${step.to}，${indoorTransportLabel(step.transport)}约 ${step.distance} 米。${step.note || ''}`
  ));
  return [firstLine, ...stepLines].join('\n');
}

function indoorTransportLabel(transport) {
  return ({
    indoor: '沿室内通道前进',
    elevator: '乘坐电梯',
    stair: '通过楼梯',
  })[transport] || '前进';
}

function buildManualIndoorGraph() {
  const nodes = [];
  const edges = [];
  const floorSizes = {};
  const sourceNodeMap = new Map();

  for (const floor of FLOORS) {
    const network = FLOOR_NETWORKS[floor];
    const degree = getDegree(network.edges);
    floorSizes[floor] = network.imageSize;

    const floorNodes = network.nodes.map((sourceNode) => {
      const node = normalizeIndoorNode(sourceNode, floor, degree, network.imageSize);
      sourceNodeMap.set(node.id, sourceNode);
      return node;
    });
    applyUniqueServiceNames(floorNodes, network.imageSize);
    nodes.push(...floorNodes);

    for (const edge of network.edges) {
      edges.push({
        from: scopedNodeId(floor, edge.from),
        to: scopedNodeId(floor, edge.to),
        floor,
        kind: 'horizontal',
      });
    }
  }

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  edges.push(...buildVerticalEdges(nodes));

  const weightedEdges = edges
    .filter((edge) => nodeMap.has(edge.from) && nodeMap.has(edge.to))
    .map((edge) => {
      const from = nodeMap.get(edge.from);
      const to = nodeMap.get(edge.to);
      return {
        ...edge,
        dist: edge.kind === 'vertical'
          ? VERTICAL_TRANSFER_METERS
          : Math.max(1, Math.round(Math.hypot(from.x - to.x, from.y - to.y) * PIXEL_TO_METER)),
      };
    });

  const selectableNodes = nodes
    .filter((node) => !node.routingOnly && !['corridor', 'junction'].includes(node.type))
    .sort((a, b) => floorNumber(a.floor) - floorNumber(b.floor) || typeRank(a.type) - typeRank(b.type) || a.name.localeCompare(b.name, 'zh-CN'));

  return {
    floorSizes,
    nodes,
    edges: weightedEdges,
    nodeMap,
    selectableNodes,
    counts: {
      toilet: nodes.filter((node) => node.type === 'toilet').length,
      water: nodes.filter((node) => node.type === 'water').length,
    },
  };
}

function normalizeIndoorNode(sourceNode, floor, degree, imageSize) {
  const rawName = String(sourceNode.name || '').trim();
  const type = classifyNode(rawName, degree.get(sourceNode.id) || 0);
  const scopedId = scopedNodeId(floor, sourceNode.id);
  const fallbackName = type === 'corridor'
    ? `${floor} 通道点 ${sourceNode.id.replace('node_manual_', '')}`
    : `${floor} ${rawName || sourceNode.id}`;
  const name = readableName(rawName) ? `${floor} ${rawName}` : fallbackName;

  return {
    ...sourceNode,
    id: scopedId,
    sourceId: sourceNode.id,
    floor,
    name,
    shortName: shortLabel(name, floor),
    type,
    x: clampNumber(sourceNode.x, 0, imageSize.width),
    y: clampNumber(sourceNode.y, 0, imageSize.height),
    degree: degree.get(sourceNode.id) || 0,
  };
}

function applyUniqueServiceNames(floorNodes, imageSize) {
  const serviceNodes = floorNodes
    .filter((node) => ['toilet', 'water'].includes(node.type))
    .sort((a, b) => a.y - b.y || a.x - b.x);
  const counters = new Map();

  for (const node of serviceNodes) {
    const serviceLabel = node.type === 'toilet' ? '卫生间' : '开水间';
    const side = positionLabel(node, imageSize);
    const key = `${node.floor}-${node.type}-${side}`;
    const count = (counters.get(key) || 0) + 1;
    counters.set(key, count);
    const suffix = count > 1 ? count : '';
    node.name = `${node.floor} ${side}${serviceLabel}${suffix}`;
    node.shortName = `${side}${serviceLabel}${suffix}`;
  }
}

function classifyNode(name, degree) {
  if (name.includes('卫生间') || name.includes('厕所') || name.includes('洗手间')) return 'toilet';
  if (name.includes('开水间') || name.includes('饮水') || name.includes('水房')) return 'water';
  if (name.includes('电梯')) return 'elevator';
  if (name.includes('楼梯')) return 'stair';
  if (name.includes('出口')) return 'exit';
  if (/^[NS]\d{3}/.test(name)) return 'door';
  if (degree > 2) return 'junction';
  return 'corridor';
}

function buildVerticalEdges(nodes) {
  const edges = [];
  for (let index = 0; index < FLOORS.length - 1; index += 1) {
    const lowerFloor = FLOORS[index];
    const upperFloor = FLOORS[index + 1];
    const lowerConnectors = connectorsForFloor(nodes, lowerFloor);
    const upperConnectors = connectorsForFloor(nodes, upperFloor);
    const used = new Set();

    for (const lower of lowerConnectors) {
      const candidate = nearestConnector(lower, upperConnectors.filter((node) => node.type === lower.type && !used.has(node.id)));
      if (!candidate) continue;
      used.add(candidate.id);
      edges.push({
        from: lower.id,
        to: candidate.id,
        kind: 'vertical',
      });
    }
  }
  return edges;
}

function connectorsForFloor(nodes, floor) {
  return nodes
    .filter((node) => node.floor === floor && ['stair', 'elevator'].includes(node.type))
    .sort((a, b) => connectorRank(a) - connectorRank(b) || a.x - b.x || a.y - b.y);
}

function nearestConnector(node, candidates) {
  let best = null;
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    const distance = Math.hypot(node.x - candidate.x, node.y - candidate.y);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

function connectorRank(node) {
  if (node.name.includes('电梯')) return 1;
  if (node.name.includes('东')) return 2;
  if (node.name.includes('北')) return 3;
  if (node.name.includes('南')) return 4;
  return 5;
}

function getDegree(edges) {
  const degree = new Map();
  for (const edge of edges) {
    degree.set(edge.from, (degree.get(edge.from) || 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) || 0) + 1);
  }
  return degree;
}

/**
 * Dijkstra shortest path for the manually modeled indoor graph.
 * Time complexity: O(V^2 + E) with linear minimum-distance selection.
 */
function shortestIndoorPath(graph, startId, endId) {
  const dist = new Map(graph.nodes.map((node) => [node.id, Infinity]));
  const prev = new Map();
  const prevEdge = new Map();
  const visited = new Set();
  const adjacency = new Map(graph.nodes.map((node) => [node.id, []]));
  for (const edge of graph.edges) {
    adjacency.get(edge.from)?.push({ ...edge, to: edge.to });
    adjacency.get(edge.to)?.push({ ...edge, from: edge.to, to: edge.from });
  }

  if (!dist.has(startId) || !dist.has(endId)) return { path: [], steps: [], edgeKeys: [], distance: 0, seconds: 0 };

  dist.set(startId, 0);
  while (visited.size < graph.nodes.length) {
    let current = null;
    let best = Infinity;
    for (const [id, value] of dist.entries()) {
      if (!visited.has(id) && value < best) {
        current = id;
        best = value;
      }
    }
    if (!current || current === endId) break;
    visited.add(current);
    for (const edge of adjacency.get(current) || []) {
      const next = best + edge.dist;
      if (next < dist.get(edge.to)) {
        dist.set(edge.to, next);
        prev.set(edge.to, current);
        prevEdge.set(edge.to, edge);
      }
    }
  }

  const path = [];
  const steps = [];
  let current = endId;
  while (current) {
    path.unshift(current);
    if (current === startId) break;
    const edge = prevEdge.get(current);
    if (edge) steps.unshift(edge);
    current = prev.get(current);
  }
  if (path[0] !== startId) return { path: [], steps: [], edgeKeys: [], distance: 0, seconds: 0 };

  const distance = Math.round(dist.get(endId));
  return {
    path,
    steps,
    edgeKeys: path.slice(1).map((id, index) => edgeKey(path[index], id)),
    distance,
    seconds: Math.round(distance / 1.15),
  };
}

function compactIndoorPath(path, nodeMap) {
  const keyNodes = path.filter((id) => {
    const node = nodeMap.get(id);
    return node && (node.type !== 'corridor' || node.degree !== 2);
  });
  return keyNodes.length >= 2 ? keyNodes : path;
}

function edgeKey(from, to) {
  return [from, to].sort().join('__');
}

function nodeColor(type) {
  return ({
    door: '#0ea5e9',
    exit: '#16a34a',
    stair: '#7c3aed',
    elevator: '#f97316',
    toilet: '#0891b2',
    water: '#0d9488',
    junction: '#2563eb',
    corridor: '#64748b',
  })[type] || '#2563eb';
}

function typeRank(type) {
  return ({ door: 1, exit: 2, stair: 3, elevator: 4, toilet: 5, water: 6, junction: 7, corridor: 8 })[type] || 9;
}

function scopedNodeId(floor, baseId) {
  return `${floor.toLowerCase()}_${baseId}`;
}

function floorNumber(floor) {
  return Number(String(floor).replace(/\D/g, '')) || 1;
}

function readableName(name) {
  return name && !/^节点\s*\d+$/.test(name);
}

function shortLabel(name, floor) {
  return name.replace(`${floor} `, '').replace('N楼', 'N').replace('S楼', 'S');
}

function positionLabel(node, imageSize) {
  const wing = node.y < imageSize.height * 0.5 ? '北楼' : '南楼';
  if (node.x < imageSize.width * 0.42) return `${wing}西侧`;
  if (node.x > imageSize.width * 0.66) return `${wing}东侧`;
  return `${wing}中部`;
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function formatSeconds(seconds) {
  if (seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest > 0 ? `${minutes}分${rest}秒` : `${minutes}分钟`;
}
