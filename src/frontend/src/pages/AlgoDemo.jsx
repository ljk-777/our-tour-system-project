import { useState, useEffect } from 'react';
import { searchSpots, shortestPath, getTopK, multiPointPath, getGraphStats } from '../api/index.js';

/**
 * 算法演示页 — 课程验收专用
 * 可直观展示 Trie / Dijkstra / TopK / KMP 等算法的运行过程
 */
export default function AlgoDemo() {
  const [activeAlgo, setActiveAlgo] = useState('trie');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getGraphStats().then(r => setStats(r.data.data)).catch(() => {});
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">算法演示中心</h1>
        <p className="text-gray-500 text-sm">课程设计核心算法交互演示 · 可用于现场验收答辩</p>
      </div>

      {/* 图谱统计 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { icon:'🗺️', label:'图中节点数',  value: stats.totalNodes,  color:'text-blue-600' },
            { icon:'🛤️', label:'道路边数',    value: stats.totalEdges,  color:'text-teal-600' },
            { icon:'📍', label:'景点总数',    value: stats.totalSpots,  color:'text-orange-600' },
            { icon:'⚡', label:'核心算法数',  value: 6,                 color:'text-purple-600' },
          ].map(s => (
            <div key={s.label} className="card p-4 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-4 gap-6">
        {/* 侧边：算法列表 */}
        <div className="lg:col-span-1">
          <div className="card p-3">
            <div className="text-xs font-semibold text-gray-500 px-2 mb-2">选择算法</div>
            <div className="space-y-1">
              {ALGOS.map(a => (
                <button key={a.key} onClick={() => setActiveAlgo(a.key)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all ${
                    activeAlgo === a.key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}>
                  <span>{a.icon}</span>
                  <span>{a.name}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 px-2 pt-3 border-t border-gray-100">
              <div className="text-xs font-semibold text-gray-500 mb-2">算法速查</div>
              <div className="space-y-1.5 text-xs text-gray-500">
                <div>Trie → O(m) 查询</div>
                <div>Dijkstra → O((V+E)logV)</div>
                <div>2-opt → O(n²) 每轮</div>
                <div>TopK → O(N log K)</div>
                <div>KMP → O(m+n)</div>
                <div>倒排索引 → O(1) 查词</div>
              </div>
            </div>
          </div>
        </div>

        {/* 主内容区 */}
        <div className="lg:col-span-3 animate-fade-in">
          {activeAlgo === 'trie'     && <TrieDemo />}
          {activeAlgo === 'dijkstra' && <DijkstraDemo />}
          {activeAlgo === 'twoopt'   && <TwoOptDemo />}
          {activeAlgo === 'topk'     && <TopKDemo />}
          {activeAlgo === 'kmp'      && <KMPDemo />}
        </div>
      </div>
    </div>
  );
}

const ALGOS = [
  { key: 'trie',     name: 'Trie 前缀树',      icon: '🔍' },
  { key: 'dijkstra', name: 'Dijkstra 最短路',   icon: '🛤️' },
  { key: 'twoopt',   name: '2-opt 多点路径',    icon: '🔄' },
  { key: 'topk',     name: 'MinHeap TopK',      icon: '⛏️' },
  { key: 'kmp',      name: 'KMP 字符串匹配',    icon: '🔎' },
];

/* ====== Trie 演示 ====== */
function TrieDemo() {
  const [q, setQ] = useState('故');
  const [mode, setMode] = useState('prefix');
  const [result, setResult] = useState([]);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!q) return;
    setLoading(true);
    try {
      const res = await searchSpots({ q, mode });
      setResult(res.data.data || []);
    } finally { setLoading(false); }
  };

  return (
    <div className="card p-6">
      <AlgoHeader
        name="Trie 前缀树 + 倒排索引 + 编辑距离"
        desc="景点搜索引擎：Trie 支持前缀自动补全；倒排索引支持全文检索；编辑距离支持模糊匹配"
        complexity={{ time: 'O(m)', space: 'O(ALPHABET_SIZE × m)' }}
        where="backend/src/algorithms/trie.js"
      />
      <div className="flex flex-wrap gap-2 mb-4">
        {[['prefix','Trie 前缀'], ['fulltext','倒排索引全文'], ['fuzzy','模糊匹配']].map(([v, l]) => (
          <button key={v} onClick={() => setMode(v)}
            className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${mode === v ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {l}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mb-4">
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="输入关键词（如：故宫、西湖、北大）"
          onKeyDown={e => e.key === 'Enter' && run()}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        <button onClick={run} disabled={loading} className="btn-primary text-sm">
          {loading ? '运行中...' : '▶ 执行'}
        </button>
      </div>
      {result.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-2">返回 {result.length} 条结果（算法：{mode}）</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {result.slice(0, 8).map(s => (
              <div key={s.id} className="bg-blue-50 rounded-xl p-3">
                <div className="font-medium text-sm text-gray-900">{s.name}</div>
                <div className="text-gray-400 text-xs mt-0.5">{s.city} · {s.type}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ====== Dijkstra 演示 ====== */
function DijkstraDemo() {
  const [fromId, setFromId] = useState(1);
  const [toId, setToId] = useState(4);
  const [mode, setMode] = useState('distance');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const EXAMPLES = [
    { label: '故宫 → 颐和园',       from: 1,   to: 4   },
    { label: '西湖 → 灵隐寺',       from: 36,  to: 38  },
    { label: '北大西门 → 未名湖',    from: 202, to: 205 },
    { label: '北大图书馆 → 博雅塔',  from: 201, to: 206 },
  ];

  const run = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await shortestPath({ fromId: Number(fromId), toId: Number(toId), mode });
      if (!res.data.success) setError(res.data.message || '路线不可达');
      else setResult(res.data.data);
    } catch { setError('请求失败，请确认后端服务已启动'); }
    finally { setLoading(false); }
  };

  return (
    <div className="card p-6">
      <AlgoHeader
        name="Dijkstra 最短路径 + MinHeap 优先队列"
        desc="单源最短路：从起点出发，用小顶堆维护待访问节点，每次贪心取出距离最小的节点扩展邻居。时间复杂度 O((V+E) log V)"
        complexity={{ time: 'O((V+E) log V)', space: 'O(V+E)' }}
        where="backend/src/algorithms/dijkstra.js"
      />

      <div className="flex flex-wrap gap-2 mb-4 text-xs">
        {EXAMPLES.map(ex => (
          <button key={ex.label} onClick={() => { setFromId(ex.from); setToId(ex.to); }}
            className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
            {ex.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">起点 节点ID</label>
          <input type="number" value={fromId} onChange={e => setFromId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">终点 节点ID</label>
          <input type="number" value={toId} onChange={e => setToId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {[['distance','最短距离'], ['time','最短时间']].map(([v, l]) => (
          <button key={v} onClick={() => setMode(v)}
            className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${mode === v ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {l}
          </button>
        ))}
        <button onClick={run} disabled={loading} className="btn-primary text-sm ml-auto">
          {loading ? '计算中...' : '▶ 执行 Dijkstra'}
        </button>
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 px-4 py-2 rounded-xl mb-4">⚠️ {error}</div>
      )}

      {result && (
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white rounded-xl p-3 text-center shadow-sm">
              <div className="font-bold text-blue-600 text-lg">
                {result.totalDist >= 1000 ? `${(result.totalDist/1000).toFixed(1)} km` : `${result.totalDist} m`}
              </div>
              <div className="text-gray-400 text-xs">最短{mode === 'distance' ? '距离' : '时间'}</div>
            </div>
            <div className="bg-white rounded-xl p-3 text-center shadow-sm">
              <div className="font-bold text-teal-600 text-lg">{result.path?.length || 0}</div>
              <div className="text-gray-400 text-xs">途经节点数</div>
            </div>
            <div className="bg-white rounded-xl p-3 text-center shadow-sm">
              <div className="font-bold text-purple-600 text-sm">{result.algorithm}</div>
              <div className="text-gray-400 text-xs">使用算法</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mb-2">完整路径：</div>
          <div className="flex flex-wrap gap-1.5">
            {(result.pathSpots || []).map((s, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="bg-blue-600 text-white text-xs px-2.5 py-1 rounded-full">{s.name || `节点${s.id}`}</span>
                {i < result.pathSpots.length - 1 && <span className="text-gray-400 text-xs">→</span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ====== TopK 演示 ====== */
function TopKDemo() {
  const [k, setK] = useState(5);
  const [type, setType] = useState('scenic');
  const [result, setResult] = useState([]);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const res = await getTopK({ k, type });
      setResult(res.data.data || []);
    } finally { setLoading(false); }
  };

  return (
    <div className="card p-6">
      <AlgoHeader
        name="MinHeap TopK 小顶堆"
        desc="维护大小为 K 的最小堆。遍历数组：堆未满则插入；若当前元素评分 > 堆顶，弹出堆顶并插入当前元素。最终堆中保存 TopK 最高评分景点。"
        complexity={{ time: 'O(N log K)', space: 'O(K)' }}
        where="backend/src/algorithms/heap.js"
      />
      <div className="flex flex-wrap gap-3 mb-4">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">K 值（取前 K 个）</label>
          <input type="number" min={1} max={20} value={k} onChange={e => setK(Number(e.target.value))}
            className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">类型</label>
          <select value={type} onChange={e => setType(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
            <option value="scenic">景区</option>
            <option value="campus">高校</option>
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={run} disabled={loading} className="btn-primary text-sm">
            {loading ? '运行中...' : '▶ 运行 TopK 堆'}
          </button>
        </div>
      </div>
      {result.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 mb-2">从全部景点中取出评分最高的 {result.length} 个：</p>
          {result.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                i === 0 ? 'bg-yellow-400 text-white' :
                i === 1 ? 'bg-gray-300 text-white' :
                i === 2 ? 'bg-orange-400 text-white' :
                'bg-gray-100 text-gray-500'
              }`}>{i + 1}</span>
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900">{s.name}</div>
                <div className="text-xs text-gray-400">{s.city} · {s.type}</div>
              </div>
              <div className="text-yellow-500 font-semibold text-sm">⭐ {s.rating}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ====== KMP 演示 ====== */
function KMPDemo() {
  const [text, setText] = useState('今天去了故宫博物院，天气晴朗，游客很多。参观了太和殿、中和殿，感受了皇家气派。离开故宫后去了天坛，继续体验北京历史文化。');
  const [pattern, setPattern] = useState('故宫');
  const [result, setResult] = useState(null);

  const runKMP = () => {
    const matches = kmpSearch(text, pattern);
    setResult({ matches, text, pattern });
  };

  const highlighted = result ? highlightMatches(result.text, result.pattern, result.matches) : null;
  const failFunc = pattern ? buildFailureFunc(pattern) : [];

  return (
    <div className="card p-6">
      <AlgoHeader
        name="KMP 字符串匹配算法"
        desc="Knuth-Morris-Pratt：先构建模式串的失败函数（部分匹配表），利用已匹配信息避免重复比较。比朴素匹配从 O(m×n) 降至 O(m+n)。"
        complexity={{ time: 'O(m+n)', space: 'O(m)' }}
        where="backend/src/algorithms/kmp.js"
      />
      <div className="mb-3">
        <label className="text-xs text-gray-500 mb-1 block">文本串</label>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
      </div>
      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">模式串（搜索关键词）</label>
          <input value={pattern} onChange={e => setPattern(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runKMP()}
            className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div className="flex items-end">
          <button onClick={runKMP} className="btn-primary text-sm">▶ 运行 KMP</button>
        </div>
      </div>

      {/* 失败函数可视化（实时更新） */}
      {pattern && (
        <div className="mb-4 p-4 bg-gray-50 rounded-xl">
          <p className="text-xs text-gray-500 mb-2">失败函数 / 部分匹配表（next 数组）：</p>
          <div className="flex gap-1 flex-wrap">
            {failFunc.map((v, i) => (
              <div key={i} className="text-center">
                <div className="w-9 h-8 flex items-center justify-center text-sm bg-blue-100 rounded-t-lg text-blue-800 font-mono border border-blue-200">
                  {pattern[i]}
                </div>
                <div className="w-9 h-6 flex items-center justify-center text-xs text-gray-500 font-mono bg-white rounded-b-lg border border-t-0 border-gray-200">
                  {v}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div className="bg-yellow-50 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">
            找到 <strong className="text-blue-600">{result.matches.length}</strong> 处匹配
            {result.matches.length > 0 && `，位置索引：[${result.matches.join(', ')}]`}
          </p>
          <div className="text-sm leading-loose p-3 bg-white rounded-xl border border-yellow-100"
            dangerouslySetInnerHTML={{ __html: highlighted }} />
        </div>
      )}
    </div>
  );
}

/* ====== 2-opt 多点路径演示 ====== */
function TwoOptDemo() {
  const [spots, setSpots] = useState('1,4,36,38');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const EXAMPLES = [
    { label: '北京景点环线', ids: '1,4,2,5,6' },
    { label: '西湖 + 杭州景点', ids: '36,38,39,40' },
    { label: '北大校园巡游', ids: '201,202,205,206,210' },
  ];

  const run = async () => {
    const ids = spots.split(/[,，\s]+/).map(Number).filter(n => !isNaN(n) && n > 0);
    if (ids.length < 2) { setError('请输入至少 2 个景点 ID'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await multiPointPath({ waypointIds: ids, mode: 'distance' });
      if (!res.data.success) setError(res.data.message || '路线计算失败');
      else setResult(res.data.data);
    } catch { setError('请求失败，请确认后端服务已启动'); }
    finally { setLoading(false); }
  };

  return (
    <div className="card p-6">
      <AlgoHeader
        name="2-opt 多点路径优化 + NearestNeighbor"
        desc="先用贪心最近邻算法构建初始路径，再用 2-opt 局部搜索：每次枚举交换两条边，若交换后路径更短则接受，直到无改善为止。适合旅行商问题（TSP）近似求解。"
        complexity={{ time: 'O(n²) × 迭代次数', space: 'O(n)' }}
        where="backend/src/algorithms/dijkstra.js → multiPointPath"
      />

      <div className="flex flex-wrap gap-2 mb-3 text-xs">
        {EXAMPLES.map(ex => (
          <button key={ex.label} onClick={() => setSpots(ex.ids)}
            className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors">
            {ex.label}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <label className="text-xs text-gray-500 mb-1 block">途经景点 ID（逗号分隔，至少 2 个）</label>
        <div className="flex gap-2">
          <input value={spots} onChange={e => setSpots(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run()}
            placeholder="如：1,4,36,38"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <button onClick={run} disabled={loading} className="btn-primary text-sm shrink-0">
            {loading ? '优化中...' : '▶ 运行 2-opt'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">提示：同一城市内的景点 ID 才有连通的道路路径</p>
      </div>

      {error && <div className="text-red-600 text-sm bg-red-50 px-4 py-2 rounded-xl mb-4">⚠️ {error}</div>}

      {result && (() => {
        const totalCost = result.totalCost || 0;
        // Build ordered waypoints from order array + pathSpots lookup
        const spotMap = {};
        (result.pathSpots || []).forEach(s => { spotMap[s.id] = s; });
        const orderedWaypoints = (result.order || []).map(id => spotMap[id] || { id, name: `节点${id}` });
        return (
          <div className="bg-gray-50 rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                <div className="font-bold text-purple-600 text-lg">
                  {totalCost >= 1000 ? `${(totalCost/1000).toFixed(1)} km` : `${totalCost} m`}
                </div>
                <div className="text-gray-400 text-xs">2-opt 优化后总距离</div>
              </div>
              <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                <div className="font-bold text-teal-600 text-lg">{orderedWaypoints.length}</div>
                <div className="text-gray-400 text-xs">途经景点数</div>
              </div>
              <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                <div className="font-bold text-blue-600 text-xs leading-tight">{result.algorithm || 'NearestNeighbor + 2-opt'}</div>
                <div className="text-gray-400 text-xs">使用算法</div>
              </div>
            </div>

            {orderedWaypoints.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 mb-2 font-medium">2-opt 优化后路径顺序：</div>
                <div className="flex flex-wrap gap-2">
                  {orderedWaypoints.map((w, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                        i === 0 ? 'bg-green-600 text-white' :
                        i === orderedWaypoints.length - 1 ? 'bg-red-500 text-white' :
                        'bg-purple-600 text-white'
                      }`}>{w.name}</span>
                      {i < orderedWaypoints.length - 1 && result.segments?.[i] && (
                        <span className="text-gray-400 text-xs">
                          {result.segments[i].cost >= 1000
                            ? `→ ${(result.segments[i].cost/1000).toFixed(1)}km`
                            : `→ ${result.segments[i].cost}m`}
                        </span>
                      )}
                      {i < orderedWaypoints.length - 1 && !result.segments?.[i] && (
                        <span className="text-gray-400 text-xs">→</span>
                      )}
                    </span>
                  ))}
                </div>
                <div className="flex gap-4 mt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-600 rounded-full inline-block"></span>起点</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded-full inline-block"></span>终点</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-600 rounded-full inline-block"></span>途经点</span>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

/* ====== 算法说明头部组件 ====== */
function AlgoHeader({ name, desc, complexity, where }) {
  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl border border-blue-100">
      <h2 className="font-bold text-gray-900 text-lg mb-1">{name}</h2>
      <p className="text-gray-600 text-sm mb-3">{desc}</p>
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="bg-white px-3 py-1 rounded-full border border-gray-200 font-mono">
          ⏱ T: <strong>{complexity.time}</strong>
        </span>
        <span className="bg-white px-3 py-1 rounded-full border border-gray-200 font-mono">
          💾 S: <strong>{complexity.space}</strong>
        </span>
        <span className="bg-white px-3 py-1 rounded-full border border-gray-200 text-gray-400">
          📄 {where}
        </span>
      </div>
    </div>
  );
}

/* ====== KMP 算法 前端实现（演示用）====== */
function buildFailureFunc(pattern) {
  const m = pattern.length;
  const fail = new Array(m).fill(0);
  let j = 0;
  for (let i = 1; i < m; i++) {
    while (j > 0 && pattern[i] !== pattern[j]) j = fail[j - 1];
    if (pattern[i] === pattern[j]) j++;
    fail[i] = j;
  }
  return fail;
}

function kmpSearch(text, pattern) {
  if (!pattern || !text) return [];
  const n = text.length, m = pattern.length;
  const fail = buildFailureFunc(pattern);
  const matches = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    while (j > 0 && text[i] !== pattern[j]) j = fail[j - 1];
    if (text[i] === pattern[j]) j++;
    if (j === m) { matches.push(i - m + 1); j = fail[j - 1]; }
  }
  return matches;
}

function highlightMatches(text, pattern, matches) {
  if (!matches.length) return escapeHtml(text);
  let result = '', lastIdx = 0;
  for (const idx of matches) {
    result += escapeHtml(text.slice(lastIdx, idx));
    result += `<mark class="bg-yellow-300 text-yellow-900 px-0.5 rounded font-semibold">${escapeHtml(pattern)}</mark>`;
    lastIdx = idx + pattern.length;
  }
  result += escapeHtml(text.slice(lastIdx));
  return result;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
