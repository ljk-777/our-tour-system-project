import { useMemo, useState } from 'react';
import {
  Accessibility,
  ArrowUpDown,
  Building2,
  Clock3,
  Footprints,
  Layers,
  Navigation,
} from 'lucide-react';

const FLOORS = ['1F', '2F', '3F', '4F', '5F'];
const MAP_SIZE = { width: 1100, height: 700 };
const CORRIDOR_Y = { north: 240, south: 500 };
const EAST_CORRIDOR_X = 895;

const PREFERENCES = [
  { value: 'fast', label: '最快', icon: Clock3 },
  { value: 'accessible', label: '无障碍', icon: Accessibility },
  { value: 'stairs', label: '少等电梯', icon: ArrowUpDown },
];

const BUILDING = {
  id: 'bupt-shahe-teaching-lab',
  name: '教学实验综合楼',
  code: '教学实验综合楼',
  floors: FLOORS,
  nodes: buildTeachingLabNodes(),
};

export default function IndoorNavigationPanel() {
  const [floor, setFloor] = useState('1F');
  const [startId, setStartId] = useState('f1_s1');
  const [endId, setEndId] = useState('f3_east_4');
  const [preference, setPreference] = useState('accessible');

  const nodesById = useMemo(() => new Map(BUILDING.nodes.map((node) => [node.id, node])), []);
  const route = useMemo(() => buildIndoorRoute(BUILDING.nodes, startId, endId, preference), [endId, preference, startId]);
  const visibleNodes = BUILDING.nodes.filter((node) => node.floor === floor);
  const routeNodeIds = new Set(route.nodes.map((node) => node.id));
  const floorRoute = route.floorPaths[floor] || [];

  return (
    <section className="grid gap-0 overflow-hidden rounded-[28px] border border-blue-100 bg-white shadow-xl lg:grid-cols-[360px_1fr]">
      <aside className="space-y-5 border-b border-gray-100 bg-white p-5 lg:border-b-0 lg:border-r">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-blue-700">
            <Building2 size={18} /> 室内导航
          </div>
          <h2 className="mt-2 text-2xl font-black text-gray-900">教学实验综合楼</h2>
          <p className="mt-2 text-sm text-gray-500">按真实疏散图结构重绘，加入房间编号、门洞、消防设施、疏散箭头和跨层连接点。</p>
        </div>

        <Field label="查看楼层">
          <div className="grid grid-cols-5 gap-2">
            {BUILDING.floors.map((item) => (
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

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <Field label="起点">
            <select value={startId} onChange={(event) => setStartId(event.target.value)} className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400">
              {BUILDING.nodes.map((node) => <option key={node.id} value={node.id}>{node.floor} · {node.name}</option>)}
            </select>
          </Field>
          <Field label="终点">
            <select value={endId} onChange={(event) => setEndId(event.target.value)} className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400">
              {BUILDING.nodes.map((node) => <option key={node.id} value={node.id}>{node.floor} · {node.name}</option>)}
            </select>
          </Field>
        </div>

        <Field label="路线偏好">
          <div className="grid grid-cols-3 gap-2">
            {PREFERENCES.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setPreference(item.value)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-sm font-semibold transition ${preference === item.value ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-gray-50 text-gray-600 hover:bg-blue-50'}`}
                >
                  <Icon size={15} /> {item.label}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid grid-cols-3 gap-2">
          <Metric icon={Footprints} value={`${route.distance}m`} label="距离" />
          <Metric icon={Clock3} value={formatSeconds(route.seconds)} label="时间" />
          <Metric icon={Layers} value={`${route.floorChanges}次`} label="换层" />
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
          <div className="font-semibold">当前模型</div>
          <div className="mt-1">5 层室内矢量图，{BUILDING.nodes.length} 个导航点，房间门洞和消防设施为可视图层。</div>
        </div>
      </aside>

      <div className="bg-[#eef7ff] p-4">
        <div className="rounded-2xl border border-blue-100 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-lg font-black text-gray-900">{BUILDING.name}室内导航图</div>
              <div className="mt-1 text-sm text-gray-500">{floor} · 当前显示 {visibleNodes.length} 个点位</div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
              <Navigation size={16} /> {nodesById.get(startId)?.name} → {nodesById.get(endId)?.name}
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-[#f8fbff] p-2">
            <svg viewBox={`0 0 ${MAP_SIZE.width} ${MAP_SIZE.height}`} className="block h-auto w-full" role="img" aria-label={`${BUILDING.name}${floor}细化建模室内导航图`}>
              <rect x="0" y="0" width={MAP_SIZE.width} height={MAP_SIZE.height} rx="28" fill="#eef8fb" />
              <FloorModel floor={floor} />
              <RoutePolyline points={floorRoute} />
              {visibleNodes.map((node) => {
                const active = routeNodeIds.has(node.id);
                const showLabel = active || node.type !== 'room';
                return (
                  <g key={node.id}>
                    <circle cx={node.x} cy={node.y} r={active ? 13 : 7} fill={active ? '#2563eb' : '#ffffff'} stroke={nodeColor(node.type)} strokeWidth="4" />
                    <circle cx={node.x} cy={node.y} r="3" fill={active ? '#ffffff' : nodeColor(node.type)} />
                    {showLabel && (
                      <text x={node.x + 13} y={node.y - 9} fontSize="14" fontWeight="800" fill={active ? '#1d4ed8' : '#1f2937'} paintOrder="stroke" stroke="#ffffff" strokeWidth="4">
                        {node.name}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {route.steps.map((step, index) => (
              <div key={`${step.title}-${index}`} className="rounded-2xl bg-blue-50 p-3 text-sm text-blue-900">
                <div className="flex items-center gap-2 font-bold">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs text-white">{index + 1}</span>
                  {step.title}
                </div>
                <div className="mt-2 text-blue-700">{step.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
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

function FloorModel({ floor }) {
  const hasEastWing = floor !== '1F';
  return (
    <g>
      <text x="72" y="74" fontSize="34" fontWeight="900" fill="#be123c">{floor}</text>
      <text x="135" y="74" fontSize="25" fontWeight="900" fill="#111827">教学实验综合楼安全疏散建模图</text>
      <text x="930" y="74" fontSize="16" fontWeight="800" fill="#be123c">北</text>
      <path d="M942 92 L928 138 H956 Z" fill="#e11d48" />

      <BuildingWing y="115" floor={floor} wing="north" label="北部保卫处" />
      <BuildingWing y="375" floor={floor} wing="south" label="南部保卫处" />
      {hasEastWing && <EastWing floor={floor} />}

      <CorridorPath d={`M145 ${CORRIDOR_Y.north} H965`} />
      <CorridorPath d={`M145 ${CORRIDOR_Y.south} H965`} />
      {hasEastWing && <CorridorPath d={`M${EAST_CORRIDOR_X} ${CORRIDOR_Y.north} V${CORRIDOR_Y.south}`} />}
      <CorridorLabel x="540" y={CORRIDOR_Y.north - 18} text="北侧走廊" />
      <CorridorLabel x="540" y={CORRIDOR_Y.south - 18} text="南侧走廊" />
      {hasEastWing && <CorridorLabel x={EAST_CORRIDOR_X + 44} y="370" text="东翼走廊" vertical />}

      <ServiceCluster floor={floor} hasEastWing={hasEastWing} />
      <Legend />
    </g>
  );
}

function BuildingWing({ y, floor, wing, label }) {
  const roomXs = [155, 245, 335, 425, 515, 605, 695, 785, 875];
  return (
    <g>
      <rect x="120" y={y} width="875" height="170" rx="10" fill="#f8fafc" stroke="#111827" strokeWidth="4" />
      <rect x="145" y={y + 76} width="820" height="38" rx="4" fill="#e5e7eb" stroke="#111827" strokeWidth="2.5" />
      <text x="555" y={y + 101} textAnchor="middle" fontSize="13" fontWeight="900" fill="#475569">走廊</text>
      {roomXs.map((x, index) => {
        const codePrefix = wing === 'north' ? 'N' : 'S';
        const upperLabel = `${codePrefix}-${floorNumber(floor)}${String(index * 2 + 1).padStart(2, '0')}`;
        const lowerLabel = `${codePrefix}-${floorNumber(floor)}${String(index * 2 + 2).padStart(2, '0')}`;
        const upperKind = index % 2 === 0 ? '教室' : '实验室';
        const lowerKind = index % 2 === 0 ? '实验室' : '教室';
        return (
          <g key={x}>
            <RoomCell x={x - 24} y={y + 8} width={82} height="58" label={upperLabel} kind={upperKind} />
            <RoomCell x={x - 24} y={y + 124} width={82} height="38" label={lowerLabel} kind={lowerKind} compact />
            <Door x={x + 18} y={y + 76} flip={false} />
            <Door x={x + 18} y={y + 114} flip />
          </g>
        );
      })}
      <text x="128" y={y - 10} fontSize="15" fontWeight="800" fill="#64748b">{label}</text>
      <ExitIcon x="126" y={y + 104} />
      <FireIcon x="295" y={y + 94} />
      <FireIcon x="550" y={y + 94} />
      <FireIcon x="845" y={y + 94} />
    </g>
  );
}

function RoomCell({ x, y, width, height, label, kind, compact = false }) {
  const isClassroom = kind === '教室';
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx="6"
        fill="#ffffff"
        stroke="#111827"
        strokeWidth="2.6"
      />
      <text x={x + 8} y={y + (compact ? 17 : 21)} fontSize={compact ? 11 : 12} fontWeight="900" fill="#1f2937">{label}</text>
      <text x={x + 8} y={y + (compact ? 32 : 40)} fontSize={compact ? 10 : 11} fontWeight="900" fill={isClassroom ? '#334155' : '#64748b'}>{kind}</text>
    </g>
  );
}

function Door({ x, y, flip = false }) {
  const sweep = flip ? -1 : 1;
  return (
    <g>
      <rect x={x - 18} y={y - 6} width="36" height="12" rx="1" fill="#e5e7eb" stroke="#111827" strokeWidth="2" />
      <path d={`M${x - 15} ${y} Q${x} ${y + sweep * 24} ${x + 15} ${y}`} fill="none" stroke="#111827" strokeWidth="2.3" />
      <text x={x + 18} y={y + sweep * 13} fontSize="10" fontWeight="900" fill="#111827">门</text>
    </g>
  );
}

function EastWing({ floor }) {
  const roomYs = [304, 352, 400, 448];
  return (
    <g>
      <rect x="830" y="255" width="165" height="270" rx="10" fill="#f8fafc" stroke="#111827" strokeWidth="4" />
      <rect x="875" y="270" width="42" height="235" rx="4" fill="#e5e7eb" stroke="#111827" strokeWidth="2.5" />
      {roomYs.map((y) => <line key={y} x1="830" y1={y} x2="995" y2={y} stroke="#111827" strokeWidth="3" />)}
      {roomYs.map((y, index) => (
        <g key={y}>
          <RoomCell x="920" y={y - 42} width="62" height="34" label={`E-${floorNumber(floor)}${index + 1}`} kind="教室" />
          <Door x={872} y={y - 17} />
        </g>
      ))}
      <text x="913" y="272" fontSize="13" fontWeight="800" fill="#64748b">东翼</text>
      <FireIcon x="875" y="420" />
    </g>
  );
}

function ServiceCluster({ floor, hasEastWing }) {
  return (
    <g>
      <StairBlock x="410" y="168" label="楼梯口" />
      <ServiceBlock x="745" y="170" label="卫生间" accent="#0f766e" />
      <ServiceBlock x="812" y="170" label="开水间" accent="#0891b2" />
      <StairBlock x="915" y="172" label="东楼梯口" />
      <StairBlock x="410" y="428" label="楼梯口" />
      <ServiceBlock x="745" y="430" label="卫生间" accent="#0f766e" />
      <ServiceBlock x="812" y="430" label="开水间" accent="#0891b2" />
      <StairBlock x="915" y="432" label="东楼梯口" />
      <ElevatorBlock x={hasEastWing ? EAST_CORRIDOR_X : 800} y={hasEastWing ? 348 : 318} />
      <SafetyExitLabel x="510" y={floor === '1F' ? 330 : 120} />
      <SafetyExitLabel x="870" y={floor === '1F' ? 275 : 530} />
    </g>
  );
}

function ServiceBlock({ x, y, label, accent = '#7c3aed' }) {
  return (
    <g>
      <rect x={x - 31} y={y - 24} width="62" height="48" rx="8" fill="#eef2ff" stroke={accent} strokeWidth="3" />
      <text x={x} y={y + 5} textAnchor="middle" fontSize="12" fontWeight="800" fill="#334155">{label}</text>
    </g>
  );
}

function StairBlock({ x, y, label }) {
  return (
    <g>
      <rect x={x - 36} y={y - 27} width="72" height="54" rx="8" fill="#f5f3ff" stroke="#7c3aed" strokeWidth="3" />
      {[-18, -9, 0, 9, 18].map((offset) => (
        <line key={offset} x1={x - 24} y1={y + offset} x2={x + 24} y2={y + offset} stroke="#7c3aed" strokeWidth="2" />
      ))}
      <path d={`M${x - 20} ${y + 18} L${x + 20} ${y - 18}`} stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" />
      <text x={x} y={y + 42} textAnchor="middle" fontSize="12" fontWeight="900" fill="#5b21b6">{label}</text>
    </g>
  );
}

function ElevatorBlock({ x, y }) {
  return (
    <g>
      <rect x={x - 34} y={y - 28} width="68" height="56" rx="8" fill="#fff7ed" stroke="#f97316" strokeWidth="3" />
      <line x1={x} y1={y - 24} x2={x} y2={y + 24} stroke="#f97316" strokeWidth="2" />
      <path d={`M${x - 18} ${y - 6} L${x - 26} ${y - 14} M${x - 18} ${y - 6} L${x - 10} ${y - 14}`} stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
      <path d={`M${x + 18} ${y + 6} L${x + 10} ${y + 14} M${x + 18} ${y + 6} L${x + 26} ${y + 14}`} stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
      <text x={x} y={y + 43} textAnchor="middle" fontSize="12" fontWeight="900" fill="#c2410c">电梯口</text>
    </g>
  );
}

function CorridorPath({ d }) {
  return (
    <g>
      <path d={d} fill="none" stroke="#111827" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round" opacity="0.2" />
      <path d={d} fill="none" stroke="#e5e7eb" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="12 12" strokeLinecap="round" opacity="0.8" />
    </g>
  );
}

function CorridorLabel({ x, y, text, vertical = false }) {
  return (
    <text
      x={x}
      y={y}
      transform={vertical ? `rotate(90 ${x} ${y})` : undefined}
      textAnchor="middle"
      fontSize="13"
      fontWeight="900"
      fill="#475569"
      paintOrder="stroke"
      stroke="#f8fafc"
      strokeWidth="4"
    >
      {text}
    </text>
  );
}

function FireIcon({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-8" y="-10" width="7" height="18" rx="2" fill="#dc2626" />
      <rect x="2" y="-10" width="7" height="18" rx="2" fill="#dc2626" />
      <circle cx="-4.5" cy="-12" r="4" fill="#ef4444" />
      <circle cx="5.5" cy="-12" r="4" fill="#ef4444" />
    </g>
  );
}

function ExitIcon({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-14" y="-18" width="28" height="36" rx="2" fill="#ecfdf5" stroke="#10b981" strokeWidth="3" />
      <path d="M-5 -8 L5 0 L-5 8" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function SafetyExitLabel({ x, y }) {
  return (
    <g>
      <text x={x} y={y} fontSize="14" fontWeight="900" fill="#dc2626" textAnchor="middle">安全出口</text>
      <ExitIcon x={x} y={y + 22} />
    </g>
  );
}

function Legend() {
  return (
    <g transform="translate(130 638)">
      <LegendItem x={0} color="#16a34a" label="安全出口" />
      <LegendItem x={132} color="#2563eb" label="房间/教室" />
      <LegendItem x={282} color="#7c3aed" label="楼梯" />
      <LegendItem x={392} color="#f97316" label="电梯" />
      <LegendItem x={502} color="#dc2626" label="消防设施" />
      <LegendItem x={642} color="#94a3b8" label="走廊" line />
      <LegendItem x={742} color="#2563eb" label="当前路线" line />
    </g>
  );
}

function LegendItem({ x, color, label, line = false }) {
  return (
    <g transform={`translate(${x} 0)`}>
      {line ? <line x1="0" y1="9" x2="34" y2="9" stroke={color} strokeWidth="8" strokeLinecap="round" /> : <circle cx="10" cy="9" r="8" fill="#ffffff" stroke={color} strokeWidth="4" />}
      <text x="44" y="14" fontSize="15" fontWeight="700" fill="#475569">{label}</text>
    </g>
  );
}

function RoutePolyline({ points }) {
  if (points.length < 2) return null;
  return (
    <polyline
      points={points.map((point) => `${point.x},${point.y}`).join(' ')}
      fill="none"
      stroke="#2563eb"
      strokeWidth="10"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.94"
    />
  );
}

function buildTeachingLabNodes() {
  const nodes = [];
  for (let floor = 1; floor <= 5; floor += 1) {
    const f = `${floor}F`;
    const prefix = String(floor);
    const hasLongEastWing = floor >= 2;
    const north = [
      [170, 240], [260, 240], [350, 240], [440, 240], [530, 240], [620, 240], [710, 240], [800, 240], [940, 240],
    ];
    const south = [
      [170, 500], [260, 500], [350, 500], [440, 500], [530, 500], [620, 500], [710, 500], [800, 500], [940, 500],
    ];

    north.forEach(([x, y], index) => {
      nodes.push({ id: `f${floor}_n${index + 1}`, name: `N-${prefix}${String(index * 2 + 1).padStart(2, '0')}`, floor: f, type: 'room', wing: 'north', x, y });
    });
    south.forEach(([x, y], index) => {
      nodes.push({ id: `f${floor}_s${index + 1}`, name: `S-${prefix}${String(index * 2 + 1).padStart(2, '0')}`, floor: f, type: 'room', wing: 'south', x, y });
    });

    nodes.push({ id: `f${floor}_west_exit`, name: '西侧安全出口', floor: f, type: 'exit', wing: 'north', x: 130, y: 240 });
    nodes.push({ id: `f${floor}_south_exit`, name: '南侧安全出口', floor: f, type: 'exit', wing: 'south', x: 130, y: 500 });
    nodes.push({ id: `f${floor}_mid_stair`, name: '中部楼梯', floor: f, type: 'stair', wing: 'north', x: 410, y: 240 });
    nodes.push({ id: `f${floor}_east_stair`, name: '东侧楼梯', floor: f, type: 'stair', wing: 'north', x: 915, y: 240 });
    nodes.push({ id: `f${floor}_elevator`, name: '电梯', floor: f, type: 'elevator', wing: 'east', x: hasLongEastWing ? EAST_CORRIDOR_X : 800, y: hasLongEastWing ? 350 : 318 });
    nodes.push({ id: `f${floor}_wc_n`, name: '北侧卫生间', floor: f, type: 'service', wing: 'north', x: 745, y: 240 });
    nodes.push({ id: `f${floor}_wc_s`, name: '南侧卫生间', floor: f, type: 'service', wing: 'south', x: 745, y: 500 });
    nodes.push({ id: `f${floor}_water_n`, name: '北侧开水间', floor: f, type: 'service', wing: 'north', x: 812, y: 240 });
    nodes.push({ id: `f${floor}_water_s`, name: '南侧开水间', floor: f, type: 'service', wing: 'south', x: 812, y: 500 });

    if (hasLongEastWing) {
      [304, 352, 400, 448].forEach((y, index) => {
        nodes.push({ id: `f${floor}_east_${index + 1}`, name: `东翼房间 ${index + 1}`, floor: f, type: 'room', wing: 'east', x: 925, y });
      });
    }
  }
  return nodes;
}

function buildIndoorRoute(nodes, startId, endId, preference) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const start = nodesById.get(startId) || nodes[0];
  const end = nodesById.get(endId) || nodes[0];
  const useElevator = preference !== 'stairs';
  const connectorType = useElevator ? '电梯' : '楼梯';
  const connectorKey = useElevator ? 'elevator' : 'east_stair';
  const routeNodes = [start];

  if (start.floor !== end.floor) {
    const startConnector = nodesById.get(`f${floorNumber(start.floor)}_${connectorKey}`);
    const endConnector = nodesById.get(`f${floorNumber(end.floor)}_${connectorKey}`);
    if (startConnector && startConnector.id !== start.id) routeNodes.push(startConnector);
    if (endConnector && endConnector.id !== routeNodes[routeNodes.length - 1]?.id) routeNodes.push(endConnector);
  }
  if (end.id !== routeNodes[routeNodes.length - 1]?.id) routeNodes.push(end);

  const floorPaths = buildFloorPaths(routeNodes);
  const distance = Math.round(Object.values(floorPaths).flat().reduce((sum, point, index, allPoints) => {
    if (index === 0) return 0;
    const prev = allPoints[index - 1];
    if (point.floor !== prev.floor) return sum;
    return sum + Math.hypot(point.x - prev.x, point.y - prev.y) * 0.42;
  }, 0) + floorVerticalMeters(routeNodes));
  const floorChanges = Math.max(0, new Set(routeNodes.map((node) => node.floor)).size - 1);
  const seconds = Math.round(distance / 1.15 + floorChanges * (useElevator ? 35 : 22));

  return {
    nodes: routeNodes,
    floorPaths,
    distance,
    seconds,
    floorChanges,
    steps: buildSteps(routeNodes, connectorType),
  };
}

function buildFloorPaths(routeNodes) {
  const floorPaths = {};
  for (let i = 1; i < routeNodes.length; i += 1) {
    const from = routeNodes[i - 1];
    const to = routeNodes[i];
    if (from.floor !== to.floor) continue;
    const segment = orthogonalPath(from, to);
    floorPaths[from.floor] = [...(floorPaths[from.floor] || []), ...dropDuplicateJoin(floorPaths[from.floor], segment)];
  }
  return floorPaths;
}

function orthogonalPath(from, to) {
  if (from.wing === to.wing) {
    return [from, { floor: from.floor, x: to.x, y: from.y }, to];
  }
  const fromY = corridorY(from);
  const toY = corridorY(to);
  const joinX = from.wing === 'east' || to.wing === 'east' ? EAST_CORRIDOR_X : Math.max(from.x, to.x);
  return [
    from,
    { floor: from.floor, x: from.x, y: fromY },
    { floor: from.floor, x: joinX, y: fromY },
    { floor: from.floor, x: joinX, y: toY },
    { floor: from.floor, x: to.x, y: toY },
    to,
  ];
}

function dropDuplicateJoin(existing = [], next = []) {
  if (!existing.length || !next.length) return next;
  const last = existing[existing.length - 1];
  const first = next[0];
  return last.x === first.x && last.y === first.y ? next.slice(1) : next;
}

function corridorY(node) {
  if (node.wing === 'south') return CORRIDOR_Y.south;
  if (node.wing === 'east') return node.y;
  return CORRIDOR_Y.north;
}

function floorVerticalMeters(routeNodes) {
  return routeNodes.reduce((sum, node, index) => {
    if (index === 0) return 0;
    const prev = routeNodes[index - 1];
    return sum + Math.abs(floorNumber(node.floor) - floorNumber(prev.floor)) * 18;
  }, 0);
}

function buildSteps(nodes, connectorType) {
  return nodes.slice(1).map((node, index) => {
    const prev = nodes[index];
    if (node.floor !== prev.floor) {
      return {
        title: `${prev.floor} → ${node.floor}`,
        detail: `从${prev.name}乘坐${connectorType}到${node.floor}。`,
      };
    }
    return {
      title: `${prev.name} → ${node.name}`,
      detail: `沿${prev.floor}疏散通道前往${node.name}。`,
    };
  });
}

function floorNumber(floor) {
  return Number(String(floor).replace(/\D/g, '')) || 1;
}

function formatSeconds(seconds) {
  if (seconds < 60) return `${seconds}秒`;
  return `${Math.round(seconds / 60)}分钟`;
}

function nodeColor(type) {
  return ({
    exit: '#16a34a',
    room: '#2563eb',
    service: '#0f766e',
    stair: '#7c3aed',
    elevator: '#f97316',
  })[type] || '#2563eb';
}
