import { useMemo, useRef, useState } from 'react';
import { Check, Download, Eraser, MapPin, PencilLine, Undo2 } from 'lucide-react';
import campusMapImage from '../assets/bupt-shahe-campus-map.jpg';
import { campusReferenceRoads } from '../data/campusReferenceRoads.js';

const MAP_SIZE = { width: 1280, height: 914 };
const SNAP_DISTANCE = 24;

const DEFAULT_PLACES = [
  { id: 'west-gate', name: '西门', type: 'gate', entrances: [] },
  { id: 'south-gate', name: '南门', type: 'gate', entrances: [] },
  { id: 'library', name: '图书馆', type: 'study', entrances: [] },
  { id: 'public-teaching', name: '公共教学楼', type: 'teaching', entrances: [] },
  { id: 'lab-building', name: '教学实验综合楼', type: 'lab', entrances: [] },
  { id: 'student-dorm-north', name: '学生公寓（雁北园）', type: 'dorm', entrances: [] },
  { id: 'student-dorm-south', name: '学生公寓（雁南园）', type: 'dorm', entrances: [] },
  { id: 'student-canteen', name: '学生餐厅', type: 'food', entrances: [] },
  { id: 'smart-teaching-s1', name: '智慧教学楼 S1', type: 'teaching', entrances: [] },
  { id: 'smart-teaching-s2', name: '智慧教学楼 S2', type: 'teaching', entrances: [] },
  { id: 'engineering-lab', name: '工程实验楼 S3', type: 'lab', entrances: [] },
  { id: 'science-school', name: '理学院', type: 'college', entrances: [] },
];

export default function CampusMapAnnotator() {
  const svgRef = useRef(null);
  const [tool, setTool] = useState('entrance');
  const [places, setPlaces] = useState(DEFAULT_PLACES);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [draftRoad, setDraftRoad] = useState([]);
  const [placeId, setPlaceId] = useState('library');
  const [placeName, setPlaceName] = useState('图书馆');
  const [placeType, setPlaceType] = useState('study');
  const [showReference, setShowReference] = useState(true);

  const graphJson = useMemo(() => ({
    map: {
      id: 'bupt-shahe',
      name: '北京邮电大学沙河校区',
      width: MAP_SIZE.width,
      height: MAP_SIZE.height,
      image: 'bupt-shahe-campus-map.jpg',
    },
    places,
    nodes,
    edges,
  }), [edges, nodes, places]);

  const exportText = useMemo(() => JSON.stringify(graphJson, null, 2), [graphJson]);

  const handleMapClick = (event) => {
    if (!svgRef.current) return;
    const point = toSvgPoint(event, svgRef.current);

    if (tool === 'entrance') {
      addEntrance(point);
      return;
    }

    if (tool === 'road') {
      const snapped = findNearestNode(point, nodes);
      setDraftRoad((prev) => [
        ...prev,
        snapped
          ? { id: snapped.id, x: snapped.x, y: snapped.y, snap: true }
          : { id: null, x: point.x, y: point.y, snap: false },
      ]);
    }
  };

  const addEntrance = (point) => {
    const cleanPlaceId = slugify(placeId || placeName || 'place');
    const entranceCount = nodes.filter((node) => node.placeId === cleanPlaceId && node.type === 'entrance').length;
    const nodeId = `${cleanPlaceId}-entrance-${entranceCount + 1}`;

    const node = {
      id: nodeId,
      type: 'entrance',
      placeId: cleanPlaceId,
      x: point.x,
      y: point.y,
    };

    setNodes((prev) => [...prev, node]);
    setPlaces((prev) => upsertPlace(prev, {
      id: cleanPlaceId,
      name: placeName || cleanPlaceId,
      type: placeType || 'place',
      entranceId: nodeId,
    }));
    setPlaceId(cleanPlaceId);
  };

  const finishRoad = () => {
    if (draftRoad.length < 2) return;

    const newNodes = [];
    const roadNodeIds = draftRoad.map((point, index) => {
      if (point.id) return point.id;
      const id = `road-${nodes.length + index + 1}`;
      newNodes.push({
        id,
        type: 'road',
        x: point.x,
        y: point.y,
      });
      return id;
    });

    const newEdges = [];
    for (let index = 0; index < roadNodeIds.length - 1; index += 1) {
      if (roadNodeIds[index] !== roadNodeIds[index + 1]) {
        newEdges.push({
          from: roadNodeIds[index],
          to: roadNodeIds[index + 1],
          type: 'walkway',
          bidirectional: true,
        });
      }
    }

    setNodes((prev) => [...prev, ...newNodes]);
    setEdges((prev) => [...prev, ...newEdges]);
    setDraftRoad([]);
  };

  const undoDraftPoint = () => {
    setDraftRoad((prev) => prev.slice(0, -1));
  };

  const clearAll = () => {
    setNodes([]);
    setEdges([]);
    setDraftRoad([]);
    setPlaces(DEFAULT_PLACES);
  };

  const importReferenceRoads = () => {
    const importedNodes = [];
    const importedEdges = [];
    const nodeKeyMap = new Map();

    const getNodeId = ([x, y]) => {
      const key = `${x},${y}`;
      if (nodeKeyMap.has(key)) return nodeKeyMap.get(key);

      const id = `ref-road-${nodeKeyMap.size + 1}`;
      nodeKeyMap.set(key, id);
      importedNodes.push({
        id,
        type: 'road',
        x,
        y,
      });
      return id;
    };

    campusReferenceRoads.forEach((road) => {
      for (let index = 0; index < road.polyline.length - 1; index += 1) {
        importedEdges.push({
          from: getNodeId(road.polyline[index]),
          to: getNodeId(road.polyline[index + 1]),
          type: road.class === 'primary' ? 'primary_walkway' : 'walkway',
          bidirectional: true,
          sourceRoadId: road.id,
        });
      }
    });

    setNodes((prev) => [...prev, ...importedNodes]);
    setEdges((prev) => [...prev, ...importedEdges]);
  };

  return (
    <section className="card overflow-hidden">
      <div className="grid lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="border-b border-gray-100 bg-white p-5 lg:border-b-0 lg:border-r">
          <div>
            <h2 className="text-xl font-bold text-gray-900">校园路网标注</h2>
            <p className="mt-1 text-sm text-gray-500">在原图上标入口、画小路，并导出可用于 Dijkstra 的图数据。</p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <ToolButton active={tool === 'entrance'} onClick={() => setTool('entrance')} icon={<MapPin size={15} />}>
              标入口
            </ToolButton>
            <ToolButton active={tool === 'road'} onClick={() => setTool('road')} icon={<PencilLine size={15} />}>
              画道路
            </ToolButton>
          </div>

          <div className="mt-5 space-y-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <div className="text-sm font-semibold text-blue-900">参考路网</div>
            <label className="flex items-center justify-between gap-3 text-sm text-blue-800">
              <span>显示参考道路</span>
              <input
                type="checkbox"
                checked={showReference}
                onChange={(event) => setShowReference(event.target.checked)}
                className="h-4 w-4"
              />
            </label>
            <button
              type="button"
              onClick={importReferenceRoads}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
            >
              导入参考道路为标注
            </button>
            <p className="text-xs leading-5 text-blue-700">
              参考道路来自你提供的手工建模数据，只用于校准位置；导入后会进入下方 JSON。
            </p>
          </div>

          <div className="mt-5 space-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="text-sm font-semibold text-gray-800">当前地点</div>
            <input
              value={placeId}
              onChange={(event) => setPlaceId(event.target.value)}
              placeholder="place id，例如 library"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
            <input
              value={placeName}
              onChange={(event) => setPlaceName(event.target.value)}
              placeholder="地点名称，例如 图书馆"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
            <input
              value={placeType}
              onChange={(event) => setPlaceType(event.target.value)}
              placeholder="类型，例如 study / food / dorm"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
            <p className="text-xs leading-5 text-gray-500">
              一个地点可以重复点击多次来添加多个入口，比如图书馆西门、南门、东门。
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={finishRoad}
              disabled={draftRoad.length < 2}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check size={15} />
              完成道路
            </button>
            <button
              type="button"
              onClick={undoDraftPoint}
              disabled={draftRoad.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Undo2 size={15} />
              撤销点
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-red-50"
            >
              <Eraser size={15} />
              清空
            </button>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(exportText)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50"
            >
              <Download size={15} />
              复制 JSON
            </button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <Metric value={places.filter((place) => place.entrances.length).length} label="地点" />
            <Metric value={nodes.length} label="节点" />
            <Metric value={edges.length} label="道路边" />
          </div>

          <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="mb-2 text-sm font-semibold text-gray-800">导出 JSON</div>
            <textarea
              readOnly
              value={exportText}
              className="h-52 w-full resize-none rounded-xl border border-gray-200 bg-white p-3 font-mono text-xs text-gray-700 outline-none"
            />
          </div>
        </aside>

        <div className="bg-[#d8f3f7] p-3 md:p-5">
          <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <svg
              ref={svgRef}
              className="block h-auto w-full cursor-crosshair select-none"
              viewBox={`0 0 ${MAP_SIZE.width} ${MAP_SIZE.height}`}
              onClick={handleMapClick}
              role="img"
              aria-label="校园地图标注画布"
            >
              <image href={campusMapImage} x="0" y="0" width={MAP_SIZE.width} height={MAP_SIZE.height} preserveAspectRatio="xMidYMid meet" />

              {showReference && (
                <g opacity="0.78">
                  {campusReferenceRoads.map((road) => (
                    <polyline
                      key={road.id}
                      points={road.polyline.map(([x, y]) => `${x},${y}`).join(' ')}
                      fill="none"
                      stroke={road.class === 'primary' ? '#ef4444' : '#f97316'}
                      strokeWidth={road.class === 'primary' ? 7 : 5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={road.class === 'primary' ? undefined : '10 8'}
                    />
                  ))}
                </g>
              )}

              {edges.map((edge, index) => {
                const from = nodes.find((node) => node.id === edge.from);
                const to = nodes.find((node) => node.id === edge.to);
                if (!from || !to) return null;
                return (
                  <line
                    key={`${edge.from}-${edge.to}-${index}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="#2563eb"
                    strokeWidth="5"
                    strokeLinecap="round"
                    opacity="0.85"
                  />
                );
              })}

              {draftRoad.length > 1 && (
                <polyline
                  points={draftRoad.map((point) => `${point.x},${point.y}`).join(' ')}
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="12 9"
                />
              )}

              {nodes.map((node) => (
                <NodeMarker key={node.id} node={node} />
              ))}

              {draftRoad.map((point, index) => (
                <circle
                  key={`${point.x}-${point.y}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={point.snap ? 10 : 7}
                  fill={point.snap ? '#2563eb' : '#f97316'}
                  stroke="#ffffff"
                  strokeWidth="3"
                />
              ))}
            </svg>

            <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm backdrop-blur">
              {tool === 'entrance' ? '点击地图添加地点入口' : '点击地图绘制道路折线'}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ToolButton({ active, onClick, icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
        active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-blue-50'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function Metric({ value, label }) {
  return (
    <div className="rounded-xl bg-white px-3 py-3">
      <div className="text-xl font-black text-blue-600">{value}</div>
      <div className="mt-1 text-xs text-gray-500">{label}</div>
    </div>
  );
}

function NodeMarker({ node }) {
  const isEntrance = node.type === 'entrance';
  return (
    <g>
      <circle
        cx={node.x}
        cy={node.y}
        r={isEntrance ? 10 : 6}
        fill={isEntrance ? '#16a34a' : '#ffffff'}
        stroke={isEntrance ? '#ffffff' : '#2563eb'}
        strokeWidth="3"
      />
      {isEntrance && (
        <text x={node.x + 12} y={node.y - 10} fontSize="13" fontWeight="700" fill="#166534">
          {node.placeId}
        </text>
      )}
    </g>
  );
}

function toSvgPoint(event, svgElement) {
  const point = svgElement.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const transformed = point.matrixTransform(svgElement.getScreenCTM().inverse());
  return {
    x: Math.round(transformed.x),
    y: Math.round(transformed.y),
  };
}

function findNearestNode(point, nodes) {
  let nearest = null;
  let best = Infinity;

  for (const node of nodes) {
    const distance = Math.hypot(point.x - node.x, point.y - node.y);
    if (distance < best) {
      nearest = node;
      best = distance;
    }
  }

  return best <= SNAP_DISTANCE ? nearest : null;
}

function upsertPlace(places, nextPlace) {
  const index = places.findIndex((place) => place.id === nextPlace.id);
  if (index < 0) {
    return [
      ...places,
      {
        id: nextPlace.id,
        name: nextPlace.name,
        type: nextPlace.type,
        entrances: [nextPlace.entranceId],
      },
    ];
  }

  return places.map((place, placeIndex) => {
    if (placeIndex !== index) return place;
    return {
      ...place,
      name: nextPlace.name || place.name,
      type: nextPlace.type || place.type,
      entrances: place.entrances.includes(nextPlace.entranceId)
        ? place.entrances
        : [...place.entrances, nextPlace.entranceId],
    };
  });
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'place';
}
