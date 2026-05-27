import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import shaheData from '../data/sh.json';
import xituchengData from '../data/xtc.json';
import { CAMPUS_CONFIGS } from '../data/campusConfigs.js';
import {
  Download, Eraser, FileUp, Image as ImageIcon, MapPin, Navigation,
  PencilLine, Route, School, Scissors,
} from 'lucide-react';

/* ── Constants ── */

const PRESETS = {
  shahe: {
    label: '沙河校区',
    image: CAMPUS_CONFIGS.shahe.bgImage,
    size: { width: 1280, height: 914 },
  },
  xitucheng: {
    label: '西土城校区',
    image: CAMPUS_CONFIGS.xitucheng.bgImage,
    defaultData: null,
    size: { width: 1500, height: 2100 },
  },
};

const SNAP_DISTANCE = 20;
const PIXEL_TO_METER = 0.6; // Scale factor: pixels to meters
let nodeCounter = 0;

/* ── Component ── */

export default function MapWorkspace() {
  const svgRef = useRef(null);
  const fileInputRef = useRef(null);
  const nodeDragRef = useRef(null); // { id, startX, startY, origX, origY }
  const jsonInputRef = useRef(null);

  // Image
  const [imageUrl, setImageUrl] = useState(null);
  const [imageSize, setImageSize] = useState({ width: 800, height: 600 });
  const [presetId, setPresetId] = useState(null);

  // Annotation data
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  // Tool: 'select' | 'add-node' | 'add-edge' | 'navigate'
  const [tool, setTool] = useState('select');
  const [edgeSource, setEdgeSource] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  // Node editing
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [editingNodeName, setEditingNodeName] = useState('');

  // Navigation
  const [navigateFrom, setNavigateFrom] = useState('');
  const [navigateTo, setNavigateTo] = useState('');

  // Derive
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const selectableOptions = useMemo(
    () => nodes.filter((n) => !n.routingOnly).map((n) => ({ value: n.id, label: n.name || n.id })),
    [nodes],
  );

  const route = useMemo(() => {
    if (!navigateFrom || !navigateTo || nodes.length < 2 || edges.length < 1) {
      return { path: [], distance: 0 };
    }
    return findRoute(navigateFrom, navigateTo, nodeMap, edges);
  }, [navigateFrom, navigateTo, nodeMap, edges, nodes.length, edges.length]);

  const routeSet = useMemo(() => new Set(route.path), [route.path]);
  const routePoints = useMemo(
    () => route.path.map((id) => nodeMap.get(id)).filter(Boolean),
    [route.path, nodeMap],
  );

  /* ── Preset / Upload ── */

  const loadPreset = (id) => {
    const preset = PRESETS[id];
    if (!preset) return;
    setPresetId(id);
    setImageUrl(preset.image);
    setImageSize(preset.size);

    setNodes([]);
    setEdges([]);

    setEdgeSource(null);
    setSelectedNodeId(null);
    setNavigateFrom('');
    setNavigateTo('');

    // Auto-load preset data from JSON
    const data = id === 'shahe' ? shaheData : id === 'xitucheng' ? xituchengData : null;
    if (data && data.nodes?.length && data.edges?.length) {
      setNodes(data.nodes);
      setEdges(data.edges);
      if (data.imageSize) setImageSize(data.imageSize);
    }
  };

  const handleUpload = (file) => {
    if (!file) return;
    setPresetId(null);
    const url = URL.createObjectURL(file);
    setImageUrl(url);

    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
    };
    img.src = url;

    setNodes([]);
    setEdges([]);
    setEdgeSource(null);
    setSelectedNodeId(null);
    setNavigateFrom('');
    setNavigateTo('');
  };

  /* ── Zoom and Pan state (declared early to avoid TDZ) ── */

  const [panState, setPanState] = useState({ dx: 0, dy: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const pointerStartRef = useRef(null);

  /* ── Canvas Interaction ── */

  const toSvgPoint = useCallback((event) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const ct = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: Math.round(ct.x), y: Math.round(ct.y) };
  }, []);

  const toMapCoords = useCallback(
    (svgPt) => ({
      x: (svgPt.x - panState.dx) / panState.zoom,
      y: (svgPt.y - panState.dy) / panState.zoom,
    }),
    [panState],
  );

  const findNearestNode = useCallback(
    (point) => {
      let nearest = null;
      let best = Infinity;
      for (const node of nodes) {
        const d = Math.hypot(point.x - node.x, point.y - node.y);
        if (d < best) {
          best = d;
          nearest = node;
        }
      }
      return best <= SNAP_DISTANCE ? nearest : null;
    },
    [nodes],
  );

  const handleSvgClick = useCallback(
    (event) => {
      const svgPt = toSvgPoint(event);
      const mapPt = toMapCoords(svgPt);

      if (tool === 'add-node') {
        const snapped = findNearestNode(mapPt);
        if (snapped) {
          setSelectedNodeId(snapped.id);
          return;
        }
        nodeCounter++;
        const id = `node_manual_${nodeCounter}`;
        setNodes((prev) => [
          ...prev,
          { id, name: `节点 ${nodeCounter}`, type: 'road', x: mapPt.x, y: mapPt.y, routingOnly: false },
        ]);
        setSelectedNodeId(id);
        return;
      }

      if (tool === 'add-edge') {
        const snapped = findNearestNode(mapPt);
        if (!snapped) return;

        if (!edgeSource) {
          setEdgeSource(snapped);
          return;
        }

        if (edgeSource.id === snapped.id) {
          setEdgeSource(null);
          return;
        }

        const exists = edges.some(
          (e) =>
            (e.from === edgeSource.id && e.to === snapped.id) ||
            (e.from === snapped.id && e.to === edgeSource.id),
        );
        if (!exists) {
          setEdges((prev) => [
            ...prev,
            { from: edgeSource.id, to: snapped.id, type: 'walkway', bidirectional: true },
          ]);
        }
        setEdgeSource(null);
        return;
      }

      if (tool === 'select') {
        const snapped = findNearestNode(mapPt);
        setSelectedNodeId(snapped ? snapped.id : null);
        return;
      }

      if (tool === 'navigate') {
        const snapped = findNearestNode(mapPt);
        if (!snapped || snapped.routingOnly) return;
        if (!navigateFrom) {
          setNavigateFrom(snapped.id);
        } else if (!navigateTo) {
          setNavigateTo(snapped.id);
        } else {
          setNavigateFrom(snapped.id);
          setNavigateTo('');
        }
        return;
      }
    },
    [tool, toSvgPoint, toMapCoords, findNearestNode, edgeSource, edges, nodes, navigateFrom, navigateTo],
  );

  /* ── Right-click delete ── */

  const handleRightClick = useCallback(
    (event) => {
      event.preventDefault();
      const svgPt = toSvgPoint(event);
      const mapPt = toMapCoords(svgPt);
      const clicked = findNearestNode(mapPt);
      if (!clicked) return;

      setEdges((prev) => prev.filter((e) => e.from !== clicked.id && e.to !== clicked.id));
      if (edgeSource && edgeSource.id === clicked.id) setEdgeSource(null);
      if (selectedNodeId === clicked.id) setSelectedNodeId(null);
      if (navigateFrom === clicked.id) setNavigateFrom('');
      if (navigateTo === clicked.id) setNavigateTo('');
      setNodes((prev) => prev.filter((n) => n.id !== clicked.id));
    },
    [toSvgPoint, toMapCoords, findNearestNode, edgeSource, selectedNodeId, navigateFrom, navigateTo],
  );

  /* ── Zoom and Pan ── */

  const handlePointerDown = (e) => {
    pointerStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      panDx: panState.dx,
      panDy: panState.dy,
    };
  };

  const handlePointerMove = (e) => {
    // Check if dragging a node
    if (nodeDragRef.current) {
      const svgPt = toSvgPoint(e);
      const drag = nodeDragRef.current;
      const dx = (svgPt.x - drag.startX) / panState.zoom;
      const dy = (svgPt.y - drag.startY) / panState.zoom;
      setNodes(prev => prev.map(n =>
        n.id === drag.id ? { ...n, x: drag.origX + dx, y: drag.origY + dy } : n
      ));
      return;
    }

    if (!pointerStartRef.current) return;

    const start = pointerStartRef.current;
    const dx = e.clientX - start.clientX;
    const dy = e.clientY - start.clientY;

    if (!isPanning && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      setIsPanning(true);
    }

    if (isPanning) {
      setPanState((prev) => ({ dx: start.panDx + dx, dy: start.panDy + dy, zoom: prev.zoom }));
    }
  };

  const handlePointerUp = (e) => {
    // Check if we were dragging a node
    if (nodeDragRef.current) {
      nodeDragRef.current = null;
      return;
    }

    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    setIsPanning(false);

    if (start) {
      const dx = Math.abs(e.clientX - start.clientX);
      const dy = Math.abs(e.clientY - start.clientY);
      if (dx <= 5 && dy <= 5) {
        handleSvgClick(e);
      }
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    if (!svgRef.current) return;

    const ZOOM_STEP = 0.15;
    const MAX_ZOOM = 10;
    const MIN_ZOOM = 1;
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    const svgPt = toSvgPoint(e);

    setPanState((prev) => {
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom + delta));
      if (newZoom === prev.zoom) return prev;
      const mapX = (svgPt.x - prev.dx) / prev.zoom;
      const mapY = (svgPt.y - prev.dy) / prev.zoom;
      return { dx: svgPt.x - mapX * newZoom, dy: svgPt.y - mapY * newZoom, zoom: newZoom };
    });
  };

  // Native wheel handler (to prevent page scroll)
  const handleWheelRef = useRef(handleWheel);
  handleWheelRef.current = handleWheel;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e) => {
      if (!svgRef.current) return;
      e.preventDefault();
      handleWheelRef.current(e);
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  /* ── Auto-save to localStorage ── */

  useEffect(() => {
    const data = { nodes, edges, imageUrl, imageSize, presetId };
    try {
      localStorage.setItem('map_workspace_data', JSON.stringify(data));
    } catch (e) {
      // localStorage may be full, silently ignore
    }
  }, [nodes, edges, imageUrl, imageSize, presetId]);

  /* ── Restore from localStorage on mount ── */

  useEffect(() => {
    try {
      const saved = localStorage.getItem('map_workspace_data');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.nodes && data.edges) {
          setNodes(data.nodes);
          setEdges(data.edges);
          if (data.imageUrl) setImageUrl(data.imageUrl);
          if (data.imageSize) setImageSize(data.imageSize);
          if (data.presetId) setPresetId(data.presetId);
          // Update nodeCounter to avoid ID collisions
          const maxId = data.nodes.reduce((max, n) => {
            const match = n.id.match(/\d+$/);
            return match ? Math.max(max, parseInt(match[0]) + 1) : max;
          }, 0);
          nodeCounter = maxId;
          return; // exit early if localStorage had data
        }
      }
    } catch (e) {
      // Ignore parse errors
    }

    // No saved data — load from shahe JSON by default
    if (shaheData && shaheData.nodes?.length && shaheData.edges?.length) {
      const preset = PRESETS['shahe'];
      if (preset) {
        setPresetId('shahe');
        setImageUrl(preset.image);
        setImageSize(shaheData.imageSize || preset.size);
      }
      setNodes(shaheData.nodes);
      setEdges(shaheData.edges);
      const maxId = shaheData.nodes.reduce((max, n) => {
        const match = n.id.match(/\d+$/);
        return match ? Math.max(max, parseInt(match[0]) + 1) : max;
      }, 0);
      nodeCounter = maxId;
    }
  }, []);

  /* ── Export ── */

  const exportJson = useMemo(
    () =>
      JSON.stringify(
        {
          map: { width: imageSize.width, height: imageSize.height },
          nodes,
          edges,
        },
        null,
        2,
      ),
    [imageSize, nodes, edges],
  );

  const handleCopyJson = () => {
    navigator.clipboard?.writeText(exportJson);
    alert('已复制到剪贴板');
  };

  const handleImportJson = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        let nodes, edges, size, preset;

        if (data.nodes?.length && data.nodes[0].coord) {
          // Format A: GitHub format — use raw coordinates, canvas matches map image size
          preset = 'shahe';
          const presetCfg = PRESETS[preset];
          nodes = data.nodes.map(n => ({
            id: n.id, name: n.name || n.id, type: 'road',
            x: n.coord[0], y: n.coord[1], routingOnly: false
          }));
          edges = data.edges.map(e => ({
            from: e.from, to: e.to, type: 'walkway', bidirectional: true
          }));
          size = presetCfg.size;
        } else if (data.nodes?.length && typeof data.nodes[0].x === 'number') {
          // Format B: Our export format { nodes: [{ id, x, y }], edges: [{ from, to }] }
          nodes = data.nodes;
          edges = data.edges;
          size = data.imageSize || (data.map ? { width: data.map.width, height: data.map.height } : null) || { width: 1280, height: 914 };
          preset = data.presetId || 'shahe';
        }

        if (nodes && edges) {
          if (preset && PRESETS[preset]) {
            const p = PRESETS[preset];
            setPresetId(preset);
            setImageUrl(p.image);
            setImageSize(size);
          } else {
            setImageSize(size);
          }
          setNodes(nodes);
          setEdges(edges);
          setEdgeSource(null);
          setSelectedNodeId(null);
          setNavigateFrom('');
          setNavigateTo('');
          alert(`导入成功：${nodes.length} 节点，${edges.length} 边`);
        } else {
          alert('无法识别的 JSON 格式：需要 nodes 和 edges 字段');
        }
      } catch (err) {
        alert('JSON 解析失败：' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const handleExportJson = useCallback(() => {
    const data = JSON.stringify({
      presetId,
      imageUrl,
      imageSize,
      nodes,
      edges,
    }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campus-map-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [presetId, imageUrl, imageSize, nodes, edges]);

  const clearAll = () => {
    if (!confirm('确定要清空所有节点和边吗？此操作不可撤销。')) return;
    setNodes([]);
    setEdges([]);
    setEdgeSource(null);
    setSelectedNodeId(null);
    setNavigateFrom('');
    setNavigateTo('');
  };

  /* ── Render ── */

  return (
    <section className="card overflow-hidden">
      <div className="grid lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* ── Sidebar ── */}
        <aside className="border-b border-gray-100 bg-white p-5 lg:border-b-0 lg:border-r">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <MapPin size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">地图工作台</h2>
              <p className="mt-1 text-sm text-gray-500">上传识别 · 编辑路网 · Dijkstra 导航</p>
            </div>
          </div>

          {/* Image source */}
          <div className="mt-5 space-y-3">
            <div className="flex gap-2">
              <select
                value={presetId || ''}
                onChange={(e) => {
                  if (e.target.value) loadPreset(e.target.value);
                }}
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">选择预设地图...</option>
                {Object.entries(PRESETS).map(([id, p]) => (
                  <option key={id} value={id}>{p.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50"
                title="上传图片"
              >
                <FileUp size={16} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleUpload(e.target.files[0]);
                }}
              />
            </div>

          </div>

          {/* Tools */}
          <div className="mt-5 space-y-2">
            <div className="text-sm font-semibold text-gray-800">工具</div>
            <div className="grid grid-cols-2 gap-2">
              <ToolBtn active={tool === 'select'} onClick={() => { setTool('select'); setEdgeSource(null); }}>
                <Scissors size={15} /> 选择
              </ToolBtn>
              <ToolBtn active={tool === 'add-node'} onClick={() => { setTool('add-node'); setEdgeSource(null); }}>
                <MapPin size={15} /> 加节点
              </ToolBtn>
              <ToolBtn active={tool === 'add-edge'} onClick={() => { setTool('add-edge'); setEdgeSource(null); }}>
                <PencilLine size={15} /> 画边
              </ToolBtn>
              <ToolBtn active={tool === 'navigate'} onClick={() => { setTool('navigate'); setEdgeSource(null); }}>
                <Navigation size={15} /> 导航
              </ToolBtn>
            </div>
          </div>

          {/* Tool context */}
          {tool === 'add-edge' && edgeSource && (
            <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              已选起点：{edgeSource.name || edgeSource.id} — 点击另一节点创建边
            </div>
          )}

          {tool === 'navigate' && (
            <div className="mt-4 space-y-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                <Route size={15} /> 导航
              </div>
              <div className="space-y-2">
                <select
                  value={navigateFrom}
                  onChange={(e) => setNavigateFrom(e.target.value)}
                  className="w-full rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-xs outline-none"
                >
                  <option value="">选择起点...</option>
                  {selectableOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <select
                  value={navigateTo}
                  onChange={(e) => setNavigateTo(e.target.value)}
                  className="w-full rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-xs outline-none"
                >
                  <option value="">选择终点...</option>
                  {selectableOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {route.distance > 0 && (
                <div className="text-xs text-blue-700">
                  距离：{Math.round(route.distance * PIXEL_TO_METER)}m · 步行约 {Math.max(1, Math.round(route.distance * PIXEL_TO_METER / 75))} 分钟
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button onClick={handleExportJson}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50">
              <Download size={15} /> 导出 JSON
            </button>
            <button onClick={() => jsonInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-green-50">
              <FileUp size={15} /> 导入 JSON
            </button>
            <button onClick={handleCopyJson}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-purple-50">
              <Download size={15} /> 复制 JSON
            </button>
            <button onClick={clearAll}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-red-50">
              <Eraser size={15} /> 清空
            </button>
          </div>
          <input type="file" ref={jsonInputRef} onChange={handleImportJson} accept=".json" className="hidden" />

          {/* Stats */}
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-blue-50 px-2 py-3">
              <div className="text-xl font-black text-blue-600">{nodes.length}</div>
              <div className="mt-0.5 text-xs text-gray-500">节点</div>
            </div>
            <div className="rounded-xl bg-blue-50 px-2 py-3">
              <div className="text-xl font-black text-blue-600">{edges.length}</div>
              <div className="mt-0.5 text-xs text-gray-500">边</div>
            </div>
            <div className="rounded-xl bg-blue-50 px-2 py-3">
              <div className="text-xl font-black text-blue-600">{imageSize.width}×{imageSize.height}</div>
              <div className="mt-0.5 text-xs text-gray-500">尺寸</div>
            </div>
          </div>

          {/* Selected node info */}
          {selectedNodeId && nodeMap.get(selectedNodeId) && (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
              <div className="font-semibold">
                {editingNodeId === selectedNodeId ? (
                  <input
                    type="text"
                    value={editingNodeName}
                    onChange={e => setEditingNodeName(e.target.value)}
                    onBlur={() => {
                      if (editingNodeName.trim()) {
                        setNodes(prev => prev.map(n =>
                          n.id === selectedNodeId ? { ...n, name: editingNodeName.trim() } : n
                        ));
                      }
                      setEditingNodeId(null);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        if (editingNodeName.trim()) {
                          setNodes(prev => prev.map(n =>
                            n.id === selectedNodeId ? { ...n, name: editingNodeName.trim() } : n
                          ));
                        }
                        setEditingNodeId(null);
                      }
                      if (e.key === 'Escape') setEditingNodeId(null);
                    }}
                    autoFocus
                    className="w-full rounded border border-blue-300 bg-white px-1.5 py-0.5 text-xs text-blue-900 outline-none"
                  />
                ) : (
                  <span
                    className="cursor-pointer hover:bg-blue-100 px-1 -ml-1 rounded"
                    onClick={() => {
                      setEditingNodeId(selectedNodeId);
                      setEditingNodeName(nodeMap.get(selectedNodeId).name || selectedNodeId);
                    }}
                    title="点击重命名"
                  >
                    {nodeMap.get(selectedNodeId).name || selectedNodeId}
                  </span>
                )}
              </div>
              <div className="mt-1">坐标：({nodeMap.get(selectedNodeId).x}, {nodeMap.get(selectedNodeId).y})</div>
              <div>类型：{nodeMap.get(selectedNodeId).type}</div>
            </div>
          )}

          {/* Route stops */}
          {routePoints.length > 0 && (
            <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                <Route size={13} /> 路线节点 ({routePoints.length})
              </div>
              <div className="space-y-1">
                {routePoints.map((node, i) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setSelectedNodeId(node.id)}
                    className="flex w-full items-center gap-2 rounded-lg bg-white px-2 py-1.5 text-left text-xs text-gray-600 hover:bg-blue-50"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="truncate">{node.name || node.id}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          
        </aside>

        {/* ── Canvas ── */}
        <div className="bg-[#d8f3f7] p-3 md:p-5">
          <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <svg
              ref={svgRef}
              className={`block h-auto w-full select-none touch-none ${isPanning || nodeDragRef.current ? 'cursor-grabbing' : tool === 'select' ? 'cursor-default' : 'cursor-crosshair'}`}
              viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onContextMenu={handleRightClick}
            >
              <g transform={`translate(${panState.dx}, ${panState.dy}) scale(${panState.zoom})`}>
                {/* Background image */}
                {imageUrl && (
                  <image href={imageUrl} x="0" y="0" width={imageSize.width} height={imageSize.height} preserveAspectRatio="xMidYMid meet" />
                )}

                {/* Edges */}
                {edges.map((edge, idx) => {
                  const from = nodeMap.get(edge.from);
                  const to = nodeMap.get(edge.to);
                  if (!from || !to) return null;
                  const active = isRouteEdge(route.path, edge.from, edge.to);
                  const isWalkway = edge.type === 'walkway';
                  return (
                    <line
                      key={`e-${idx}`}
                      x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                      stroke={isWalkway ? '#f97316' : active ? '#2563eb' : '#94a3b8'}
                      strokeWidth={isWalkway ? 2 : active ? 8 : 3}
                      strokeDasharray={isWalkway ? '4,3' : undefined}
                      strokeLinecap="round"
                      opacity={isWalkway ? 0.6 : active ? 0.85 : 0.5}
                      style={{ cursor: 'pointer' }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm(`删除从 "${nodeMap.get(edge.from)?.name || edge.from}" 到 "${nodeMap.get(edge.to)?.name || edge.to}" 的边？`)) {
                          setEdges(prev => prev.filter(e => !(e.from === edge.from && e.to === edge.to)));
                        }
                      }}
                    />
                  );
                })}

                {/* Edge creation preview line */}
                {tool === 'add-edge' && edgeSource && (
                  <EdgePreviewLine edgeSource={edgeSource} svgRef={svgRef} panState={panState} />
                )}

                {/* Route polyline */}
                {routePoints.length > 1 && (
                  <polyline
                    points={routePoints.map((n) => `${n.x},${n.y}`).join(' ')}
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.8"
                  />
                )}

                {/* Nodes */}
                  {nodes.map((node) => {
                  const isSelected = selectedNodeId === node.id;
                  const inRoute = routeSet.has(node.id);
                  const isNavigateTarget = navigateFrom === node.id || navigateTo === node.id;
                  const isBuilding = node.type === 'building';
                  return (
                    <g
                      key={node.id}
                      onPointerDown={e => {
                        if (tool === 'select') {
                          e.stopPropagation();
                          const svgPt = toSvgPoint(e);
                          nodeDragRef.current = {
                            id: node.id,
                            startX: svgPt.x,
                            startY: svgPt.y,
                            origX: node.x,
                            origY: node.y,
                          };
                          setSelectedNodeId(node.id);
                        }
                      }}
                      style={{ cursor: tool === 'select' ? 'grab' : undefined }}
                    >
                      {isBuilding ? (
                        <>
                          <rect
                            x={node.x - (isSelected ? 10 : 6)} y={node.y - (isSelected ? 10 : 6)}
                            width={isSelected ? 20 : 12} height={isSelected ? 20 : 12}
                            rx={2}
                            fill={isSelected ? '#c2410c' : inRoute ? '#2563eb' : '#f97316'}
                            stroke={isSelected || inRoute ? '#ffffff' : '#ffffff'}
                            strokeWidth={2}
                            opacity={0.85}
                          />
                          {isSelected && (
                            <text x={node.x + 10} y={node.y - 8} fontSize="11" fontWeight="700" fill="#1e40af">
                              {node.name || node.id}
                            </text>
                          )}
                        </>
                      ) : (
                        <>
                          <circle
                            cx={node.x} cy={node.y}
                            r={isNavigateTarget ? 14 : isSelected ? 12 : inRoute ? 10 : 7}
                            fill={isNavigateTarget ? '#f97316' : isSelected ? '#f97316' : inRoute ? '#2563eb' : '#ffffff'}
                            stroke={isNavigateTarget || isSelected ? '#ffffff' : inRoute ? '#ffffff' : '#2563eb'}
                            strokeWidth={3}
                          />
                          <circle cx={node.x} cy={node.y} r="3" fill={isSelected || inRoute || isNavigateTarget ? '#ffffff' : '#2563eb'} />
                          {isSelected && (
                            <text x={node.x + 10} y={node.y - 8} fontSize="11" fontWeight="700" fill="#1e40af">
                              {node.name || node.id}
                            </text>
                          )}
                        </>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Floating badge */}
            {imageUrl && (
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm backdrop-blur">
                {presetId ? <School size={13} /> : <ImageIcon size={13} />}
                {presetId ? PRESETS[presetId]?.label : '自定义地图'}
              </div>
            )}

            {/* Empty state */}
            {!imageUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#d8f3f7]">
                <div className="text-center">
                  <ImageIcon size={48} className="mx-auto text-gray-300" />
                  <p className="mt-4 text-lg font-semibold text-gray-500">选择预设或上传地图图片</p>
                  <p className="mt-2 text-sm text-gray-400">使用工具手动添加节点和边来构建路网</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Sub-components ── */

function ToolBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium ${
        active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-blue-50'
      }`}
    >
      {children}
    </button>
  );
}

/* ── Edge preview line (follows mouse) ── */

function EdgePreviewLine({ edgeSource, svgRef, panState }) {
  const [mousePos, setMousePos] = useState(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e) => {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ct = pt.matrixTransform(svg.getScreenCTM().inverse());
      // Convert SVG viewBox coords to map coords (account for pan/zoom)
      setMousePos({
        x: (ct.x - panState.dx) / panState.zoom,
        y: (ct.y - panState.dy) / panState.zoom,
      });
    };
    svg.addEventListener('mousemove', handler);
    return () => svg.removeEventListener('mousemove', handler);
  }, [svgRef]);

  if (!mousePos) return null;

  return (
    <line
      x1={edgeSource.x} y1={edgeSource.y}
      x2={mousePos.x} y2={mousePos.y}
      stroke="#f97316"
      strokeWidth="3"
      strokeLinecap="round"
      strokeDasharray="8 6"
      opacity="0.6"
    />
  );
}

/* ── Algorithm helpers (Dijkstra) ── */

function buildGraph(nodeMap, edges) {
  const graph = new Map();
  for (const [nodeId] of nodeMap) {
    graph.set(nodeId, []);
  }
  // Handle both array format [from, to] and object format {from, to}
  for (const edge of edges) {
    const fromId = Array.isArray(edge) ? edge[0] : edge.from;
    const toId = Array.isArray(edge) ? edge[1] : edge.to;
    const from = nodeMap.get(fromId);
    const to = nodeMap.get(toId);
    if (!from || !to) continue;
    const distance = Math.hypot(from.x - to.x, from.y - to.y);
    graph.get(fromId).push({ to: toId, distance });
    graph.get(toId).push({ to: fromId, distance });
  }
  return graph;
}

function findRoute(startId, endId, nodeMap, edges) {
  const graph = buildGraph(nodeMap, edges);
  const nodeIds = [...nodeMap.keys()];
  const distances = new Map(nodeIds.map((id) => [id, Infinity]));
  const previous = new Map();
  const visited = new Set();

  distances.set(startId, 0);

  while (visited.size < nodeIds.length) {
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
    path: (() => {
      const path = [];
      let cur = endId;
      while (cur) {
        path.unshift(cur);
        if (cur === startId) return path;
        cur = previous.get(cur);
      }
      return startId === endId ? [startId] : [];
    })(),
    distance: distances.get(endId) || 0,
  };
}

function isRouteEdge(path, fromId, toId) {
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    if ((a === fromId && b === toId) || (a === toId && b === fromId)) return true;
  }
  return false;
}
