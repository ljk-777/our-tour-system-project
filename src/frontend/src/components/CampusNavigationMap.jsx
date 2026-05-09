import { useMemo, useState } from 'react';
import { MapPin, Navigation, Route, School } from 'lucide-react';
import {
  CAMPUS_MAP_SIZE,
  campusAreas,
  campusBuildings,
  campusEdges,
  campusNodes,
} from '../data/campusMapData.js';

const nodeMap = new Map(campusNodes.map((node) => [node.id, node]));
const selectableNodes = campusNodes.filter((node) => !node.routingOnly);
const backgroundAreas = campusAreas.filter((area) => area.kind !== 'water');
const waterAreas = campusAreas.filter((area) => area.kind === 'water');

export default function CampusNavigationMap() {
  const [startId, setStartId] = useState('n_west_gate');
  const [endId, setEndId] = useState('n_library_access_south');
  const [selectedId, setSelectedId] = useState('n_library_access_south');

  const route = useMemo(() => findCampusRoute(startId, endId), [endId, startId]);
  const selectedNode = nodeMap.get(selectedId);
  const routeSet = new Set(route.path);
  const routePoints = route.path.map((id) => nodeMap.get(id)).filter(Boolean);
  const routeStops = routePoints.filter((node) => !node.routingOnly);

  return (
    <section className="card overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border-b border-gray-100 bg-white p-5 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <School size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">北邮沙河校园导航</h2>
              <p className="mt-1 text-sm text-gray-500">自定义校园路网 + Dijkstra</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <SelectField label="起点" value={startId} onChange={setStartId} />
            <SelectField label="终点" value={endId} onChange={setEndId} />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Metric value={`${Math.round(route.distance)} m`} label="路线距离" />
            <Metric value={`${Math.max(1, Math.round(route.distance / 75))} 分钟`} label="预计步行" />
          </div>

          <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Route size={16} />
              路线节点
            </div>
            <div className="space-y-2">
              {routeStops.map((node, index) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setSelectedId(node.id)}
                  className="flex w-full items-center gap-2 rounded-xl bg-white px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="truncate">{node.name}</span>
                </button>
              ))}
            </div>
          </div>

          {selectedNode && (
            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
              <div className="font-semibold">{selectedNode.name}</div>
              <div className="mt-1">类型：{selectedNode.type}</div>
              <div className="mt-1 text-blue-600">坐标：{selectedNode.x}, {selectedNode.y}</div>
            </div>
          )}
        </aside>

        <div className="relative bg-[#e8f6f8] p-3 md:p-5">
          <div className="relative mx-auto overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <svg
              className="block h-auto w-full select-none"
              viewBox={`0 0 ${CAMPUS_MAP_SIZE.width} ${CAMPUS_MAP_SIZE.height}`}
              role="img"
              aria-label="可计算的北邮沙河校园导航图"
            >
              <rect width={CAMPUS_MAP_SIZE.width} height={CAMPUS_MAP_SIZE.height} fill="#d8f3f7" />
              <rect x="58" y="108" width="1166" height="725" rx="0" fill="#dff6f8" stroke="#8f9aa0" strokeWidth="8" />
              <rect x="24" y="48" width="1232" height="840" fill="none" stroke="#111827" strokeWidth="4" strokeDasharray="13 10" />

              {backgroundAreas.map((area) => (
                <g key={area.id}>
                  <MapShape
                    shape={area}
                    fill={areaFill(area.kind)}
                    stroke={areaStroke(area.kind)}
                    strokeWidth={2}
                    strokeDasharray={area.kind === 'planned' ? '8 7' : '0'}
                  />
                  {area.id === 'sports-area' && (
                    <ellipse
                      cx={shapeCenter(area).x}
                      cy={shapeCenter(area).y}
                      rx="74"
                      ry="55"
                      fill="#f49a5d"
                      stroke="#e96c3d"
                      strokeWidth="3"
                    />
                  )}
                  {area.label && <MapLabel x={shapeCenter(area).x} y={shapeCenter(area).y} text={area.label} size={22} />}
                </g>
              ))}

              <RoadLayer edges={campusEdges} stroke="#f5f5f1" strokeWidth={24} />
              <RoadLayer edges={campusEdges} stroke="#9ca3af" strokeWidth={5} />

              {waterAreas.map((area) => (
                <g key={area.id}>
                  <MapShape
                    shape={area}
                    fill={areaFill(area.kind)}
                    stroke={areaStroke(area.kind)}
                    strokeWidth={3}
                  />
                </g>
              ))}

              {campusBuildings.map((building) => (
                <g key={building.id}>
                  <MapShape
                    shape={building}
                    fill={buildingFill(building.kind)}
                    stroke="rgba(15, 23, 42, 0.18)"
                    strokeWidth={2}
                    rx={10}
                  />
                  <MapLabel
                    x={shapeCenter(building).x}
                    y={shapeCenter(building).y}
                    text={building.label}
                    size={(building.width || shapeBounds(building).width) < 130 ? 14 : 16}
                  />
                </g>
              ))}

              {campusEdges.map(([fromId, toId]) => {
                const from = nodeMap.get(fromId);
                const to = nodeMap.get(toId);
                const active = isRouteEdge(route.path, fromId, toId);
                if (!from || !to || !active) return null;
                return (
                  <line
                    key={`active-${fromId}-${toId}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="#2563eb"
                    strokeWidth="12"
                    strokeLinecap="round"
                  />
                );
              })}

              {routePoints.length > 1 && (
                <polyline
                  points={routePoints.map((node) => `${node.x},${node.y}`).join(' ')}
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {selectableNodes.map((node) => {
                const active = routeSet.has(node.id);
                const selected = selectedId === node.id;
                return (
                  <g
                    key={node.id}
                    role="button"
                    tabIndex="0"
                    className="cursor-pointer"
                    onClick={() => setSelectedId(node.id)}
                  >
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={selected ? 16 : active ? 13 : 10}
                      fill={selected ? '#f97316' : active ? '#2563eb' : '#ffffff'}
                      stroke={active || selected ? '#ffffff' : '#2563eb'}
                      strokeWidth="4"
                    />
                    <circle cx={node.x} cy={node.y} r="4" fill={active || selected ? '#ffffff' : '#2563eb'} />
                  </g>
                );
              })}

              <MapLabel x="350" y="870" text="高教园南三街" size={28} anchor="start" />
              <MapLabel x="28" y="500" text="南丰路" size={26} rotate="-90" />
              <MapLabel x="1254" y="500" text="回昌路（规划）" size={24} rotate="90" />
              <MapLabel x="600" y="430" text="鸿雁路" size={24} />
              <MapLabel x="870" y="430" text="国脉路" size={18} />
              <MapLabel x="342" y="430" text="雁西路" size={18} />
              <MapLabel x="750" y="842" text="南门" size={18} />
              <MapLabel x="76" y="430" text="西门" size={18} anchor="start" />
              <circle cx="62" cy="424" r="11" fill="#111827" stroke="#ffffff" strokeWidth="3" />
              <circle cx="750" cy="830" r="11" fill="#111827" stroke="#ffffff" strokeWidth="3" />
            </svg>

            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm backdrop-blur">
              <Navigation size={14} className="text-blue-600" />
              校园步行路网地图
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SelectField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
        <MapPin size={15} />
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        {selectableNodes.map((node) => (
          <option key={node.id} value={node.id}>
            {node.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function Metric({ value, label }) {
  return (
    <div className="rounded-2xl bg-blue-50 px-3 py-4 text-center">
      <div className="text-2xl font-black text-blue-600">{value}</div>
      <div className="mt-1 text-xs text-gray-500">{label}</div>
    </div>
  );
}

function RoadLayer({ edges, stroke, strokeWidth, strokeDasharray }) {
  return edges.map(([fromId, toId]) => {
    const from = nodeMap.get(fromId);
    const to = nodeMap.get(toId);
    if (!from || !to) return null;
    return (
      <line
        key={`${stroke}-${strokeWidth}-${fromId}-${toId}`}
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={strokeDasharray}
      />
    );
  });
}

function findCampusRoute(startId, endId) {
  const graph = buildGraph();
  const distances = new Map(campusNodes.map((node) => [node.id, Infinity]));
  const previous = new Map();
  const visited = new Set();

  distances.set(startId, 0);

  while (visited.size < campusNodes.length) {
    let current = null;
    let bestDistance = Infinity;

    for (const [nodeId, distance] of distances.entries()) {
      if (!visited.has(nodeId) && distance < bestDistance) {
        current = nodeId;
        bestDistance = distance;
      }
    }

    if (!current || current === endId) break;
    visited.add(current);

    for (const edge of graph.get(current) || []) {
      const nextDistance = bestDistance + edge.distance;
      if (nextDistance < distances.get(edge.to)) {
        distances.set(edge.to, nextDistance);
        previous.set(edge.to, current);
      }
    }
  }

  return {
    path: restorePath(previous, startId, endId),
    distance: distances.get(endId) || 0,
  };
}

function buildGraph() {
  const graph = new Map(campusNodes.map((node) => [node.id, []]));

  for (const [fromId, toId] of campusEdges) {
    const from = nodeMap.get(fromId);
    const to = nodeMap.get(toId);
    if (!from || !to) continue;
    const distance = Math.hypot(from.x - to.x, from.y - to.y);
    graph.get(fromId).push({ to: toId, distance });
    graph.get(toId).push({ to: fromId, distance });
  }

  return graph;
}

function restorePath(previous, startId, endId) {
  const path = [];
  let current = endId;

  while (current) {
    path.unshift(current);
    if (current === startId) return path;
    current = previous.get(current);
  }

  return startId === endId ? [startId] : [];
}

function isRouteEdge(path, fromId, toId) {
  for (let index = 0; index < path.length - 1; index += 1) {
    const a = path[index];
    const b = path[index + 1];
    if ((a === fromId && b === toId) || (a === toId && b === fromId)) {
      return true;
    }
  }
  return false;
}

function MapLabel({ x, y, text, size = 16, anchor = 'middle', rotate = 0 }) {
  const lines = String(text).split('\n');
  const lineHeight = size * 1.25;
  const startY = y - ((lines.length - 1) * lineHeight) / 2;

  return (
    <text
      x={x}
      y={startY}
      textAnchor={anchor}
      dominantBaseline="middle"
      transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
      fill="#172033"
      fontSize={size}
      fontWeight="700"
    >
      {lines.map((line, index) => (
        <tspan key={`${line}-${index}`} x={x} dy={index === 0 ? 0 : lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

function MapShape({ shape, fill, stroke, strokeWidth = 2, strokeDasharray = '0', rx = 0 }) {
  if (shape.polygon) {
    return (
      <polygon
        points={shape.polygon.map(([x, y]) => `${x},${y}`).join(' ')}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
      />
    );
  }

  return (
    <rect
      x={shape.x}
      y={shape.y}
      width={shape.width}
      height={shape.height}
      rx={shape.rx ?? rx}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDasharray}
    />
  );
}

function shapeBounds(shape) {
  if (!shape.polygon) {
    return {
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
    };
  }

  const xs = shape.polygon.map(([x]) => x);
  const ys = shape.polygon.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function shapeCenter(shape) {
  const bounds = shapeBounds(shape);
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

function buildingFill(kind) {
  return {
    dorm: '#48b5ad',
    food: '#b75571',
    office: '#63c6d4',
    service: '#6dccd8',
    study: '#f45b6b',
    teaching: '#fb6671',
    lab: '#f75d6a',
    college: '#62c7d0',
    'green-building-yard': '#8fbd61',
  }[kind] || '#d7e8ef';
}

function areaFill(kind) {
  return {
    field: '#8fbd61',
    planned: '#f7efc7',
    water: '#7cc4e6',
    green: '#8fbd61',
  }[kind] || '#e6f4ee';
}

function areaStroke(kind) {
  return {
    field: '#76a94d',
    planned: '#777',
    water: '#5aa8cf',
    green: '#75a954',
  }[kind] || '#b5c9bf';
}
