import { useState, useEffect, useRef } from 'react';
import { searchSpots, shortestPath, aStarPath, getTopK, multiPointPath, getGraphStats, getDiaries } from '../api/index.js';

/**
 * 算法演示页 — 课程验收专用
 * 可直观展示 Trie / Dijkstra / TopK / KMP 等算法的运行过程
 */
export default function AlgoDemo() {
  const [activeAlgo, setActiveAlgo] = useState('trie');
  const [stats, setStats] = useState(null);

  // Compression tab state
  const [compressText, setCompressText] = useState('北京邮电大学沙河校区位于北京市昌平区，校园环境优美。这里有教学楼、图书馆、宿舍和食堂，学生们每天都在这里学习和生活。');
  const [compressResult, setCompressResult] = useState(null);
  const [compressLoading, setCompressLoading] = useState(false);

  useEffect(() => {
    getGraphStats().then(r => setStats(r.data.data)).catch(() => {});
  }, []);

  const runCompressionBenchmark = async () => {
    if (!compressText.trim()) return;
    setCompressLoading(true);
    try {
      const { default: api } = await import('../api/index.js');
      const res = await api.post('/compression/benchmark', { text: compressText.trim() });
      setCompressResult(res.data?.data || null);
    } catch (err) {
      alert(err?.response?.data?.message || '对比失败');
    } finally {
      setCompressLoading(false);
    }
  };

  const renderCompression = () => {
    const colorStyles = {
      blue: 'bg-blue-50 border-blue-200',
      green: 'bg-green-50 border-green-200',
      purple: 'bg-purple-50 border-purple-200',
    };

    return (
      <div className="glass-card rounded-2xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-gray-800 mb-2">📦 无损压缩算法对比</h3>
        <p className="text-sm text-gray-500 mb-4">Huffman 编码 · LZ77 滑动窗口 · BWT+MTF+Huffman 流水线</p>

        {/* Input */}
        <textarea
          value={compressText}
          onChange={e => setCompressText(e.target.value)}
          rows={4}
          placeholder="输入一段文本（或从已有日记选取）..."
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <button
          onClick={runCompressionBenchmark}
          disabled={compressLoading || !compressText.trim()}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 mb-4"
        >
          {compressLoading ? '对比中...' : '📊 一键对比'}
        </button>

        {/* Results */}
        {compressResult && !compressResult.error && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'huffman', label: 'Huffman 编码', color: 'blue' },
                { key: 'lz77', label: 'LZ77', color: 'green' },
                { key: 'bwt', label: 'BWT+MTF+Huffman', color: 'purple' },
              ].map(({ key, label, color }) => {
                const data = compressResult[key];
                if (!data || data.error) return null;
                return (
                  <div key={key} className={`${colorStyles[color]} rounded-xl p-4`}>
                    <div className="text-xs font-semibold text-gray-500 mb-2">{label}</div>
                    <div className="text-2xl font-bold text-gray-900">{data.stats.ratio}%</div>
                    <div className="text-xs text-gray-500 mt-1">
                      原文 {data.stats.originalSize}B → {data.stats.compressedSize}B
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      耗时 {data.stats.duration}ms
                      {data.stats.charCount !== undefined && ` · ${data.stats.charCount} 种字符`}
                      {data.stats.tokenCount !== undefined && ` · ${data.stats.tokenCount} tokens`}
                      {data.stats.matchRate !== undefined && ` · 匹配率 ${(data.stats.matchRate * 100).toFixed(0)}%`}
                    </div>
                    <div className="text-xs mt-1 font-medium">
                      {compressResult.verification?.[key]}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            {compressResult.summary && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                💡 {compressResult.summary}
              </div>
            )}

            {/* Text preview */}
            <div className="text-xs text-gray-400 mt-2">
              测试文本: {compressResult.textPreview}
            </div>
          </div>
        )}
      </div>
    );
  };

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
            { icon:'⚡', label:'核心算法数',  value: 7,                 color:'text-purple-600' },
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
          {activeAlgo === 'trie'        && <TrieDemo />}
          {activeAlgo === 'dijkstra'    && <DijkstraDemo />}
          {activeAlgo === 'astar'       && <AStarDemo />}
          {activeAlgo === 'twoopt'      && <TwoOptDemo />}
          {activeAlgo === 'topk'        && <TopKDemo />}
          {activeAlgo === 'kmp'         && <KMPDemo />}
          {activeAlgo === 'compression' && renderCompression()}
          {activeAlgo === 'aigc'        && <AIGCAnimationDemo />}
        </div>
      </div>
    </div>
  );
}

const ALGOS = [
  { key: 'trie',        name: 'Trie 前缀树',      icon: '🔍' },
  { key: 'dijkstra',    name: 'Dijkstra 最短路',   icon: '🛤️' },
  { key: 'astar',       name: 'A* 启发搜索',       icon: '⭐' },
  { key: 'twoopt',      name: '2-opt 多点路径',    icon: '🔄' },
  { key: 'topk',        name: 'MinHeap TopK',      icon: '⛏️' },
  { key: 'kmp',         name: 'KMP 字符串匹配',    icon: '🔎' },
  { key: 'compression', name: '无损压缩',          icon: '📦' },
  { key: 'aigc',        name: 'AIGC 旅游动画',     icon: '🎬' },
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

/* ====== A* 启发搜索演示 ====== */
function AStarDemo() {
  const [fromId, setFromId] = useState(1);
  const [toId, setToId] = useState(4);
  const [mode, setMode] = useState('distance');
  const [dijResult, setDijResult] = useState(null);
  const [astarResult, setAstarResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const EXAMPLES = [
    { label: '故宫 → 颐和园',    from: 1,   to: 4   },
    { label: '西湖 → 灵隐寺',    from: 36,  to: 38  },
    { label: '北大图书馆 → 博雅塔', from: 201, to: 206 },
  ];

  const run = async () => {
    setLoading(true); setError(''); setDijResult(null); setAstarResult(null);
    try {
      const [dijRes, asRes] = await Promise.all([
        shortestPath({ fromId: Number(fromId), toId: Number(toId), mode }),
        aStarPath({ fromId: Number(fromId), toId: Number(toId), mode }),
      ]);
      if (!dijRes.data.success || !asRes.data.success) { setError('路线不可达或节点不存在'); return; }
      setDijResult(dijRes.data.data);
      setAstarResult(asRes.data.data);
    } catch { setError('请求失败，请确认后端服务已启动'); }
    finally { setLoading(false); }
  };

  return (
    <div className="card p-6">
      <AlgoHeader
        name="A* 启发式搜索 vs Dijkstra 对比"
        desc="A* = Dijkstra + 启发函数 h(n)。h(n) 用 Haversine 公式估计当前节点到终点的直线距离（下界）。每次优先扩展 f(n) = g(n) + h(n) 最小的节点，减少无效探索。与 Dijkstra 路径相同，但探索节点更少。"
        complexity={{ time: 'O((V+E) log V)（启发函数好时实际更快）', space: 'O(V+E)' }}
        where="backend/src/algorithms/dijkstra.js → aStar / aStarPath"
      />

      <div className="flex flex-wrap gap-2 mb-4 text-xs">
        {EXAMPLES.map(ex => (
          <button key={ex.label} onClick={() => { setFromId(ex.from); setToId(ex.to); }}
            className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors">
            {ex.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">起点 节点ID</label>
          <input type="number" value={fromId} onChange={e => setFromId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">终点 节点ID</label>
          <input type="number" value={toId} onChange={e => setToId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {[['distance','最短距离'], ['time','最短时间']].map(([v, l]) => (
          <button key={v} onClick={() => setMode(v)}
            className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${mode === v ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {l}
          </button>
        ))}
        <button onClick={run} disabled={loading}
          className="ml-auto px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
          {loading ? '对比中...' : '▶ Dijkstra vs A* 对比'}
        </button>
      </div>

      {error && <div className="text-red-600 text-sm bg-red-50 px-4 py-2 rounded-xl mb-4">⚠️ {error}</div>}

      {dijResult && astarResult && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Dijkstra', data: dijResult, color: 'blue', explored: '全图' },
              { label: 'A* (启发)', data: astarResult, color: 'amber', explored: astarResult.nodesExplored },
            ].map(({ label, data, color, explored }) => (
              <div key={label} className={`rounded-xl p-4 ${color === 'blue' ? 'bg-blue-50 border border-blue-100' : 'bg-amber-50 border border-amber-100'}`}>
                <div className={`text-xs font-bold mb-3 ${color === 'blue' ? 'text-blue-600' : 'text-amber-600'}`}>{label}</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">路径长度</span>
                    <span className="font-semibold">
                      {data.totalDist >= 1000 ? `${(data.totalDist/1000).toFixed(1)}km` : `${data.totalDist}m`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">途经节点</span>
                    <span className="font-semibold">{data.path?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">探索节点数</span>
                    <span className={`font-bold ${color === 'amber' ? 'text-amber-600' : 'text-blue-600'}`}>{explored}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {astarResult.nodesExplored < (dijResult.path?.length || 0) * 3 && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
              💡 A* 仅探索了 {astarResult.nodesExplored} 个节点，有效利用 Haversine 启发函数剪枝，比盲目的 Dijkstra 更高效
            </div>
          )}
          <div>
            <div className="text-xs text-gray-400 mb-2">A* 路径（节点序列）：</div>
            <div className="flex flex-wrap gap-1.5">
              {(astarResult.pathSpots || []).map((s, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="bg-amber-500 text-white text-xs px-2.5 py-1 rounded-full">{s.name || `节点${s.id}`}</span>
                  {i < astarResult.pathSpots.length - 1 && <span className="text-gray-400 text-xs">→</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ====== AIGC 旅游动画演示 ====== */
function AIGCAnimationDemo() {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const [diaries, setDiaries] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getDiaries({ limit: 12, offset: 0, sortBy: 'likes', order: 'desc' })
      .then(res => { setDiaries(res.data.data || []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  const CARD_COLORS = [
    ['#f97316','#fbbf24'], ['#06b6d4','#3b82f6'], ['#8b5cf6','#ec4899'],
    ['#10b981','#06b6d4'], ['#f43f5e','#f97316'], ['#84cc16','#10b981'],
  ];

  const drawFrame = (canvas, diary, progress, colorPair) => {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    // Background gradient (animated)
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, colorPair[0] + '33');
    grad.addColorStop(1, colorPair[1] + '22');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Animated particles
    ctx.save();
    for (let i = 0; i < 20; i++) {
      const x = ((i * 137 + progress * 80) % W);
      const y = ((i * 89 + progress * 50) % H);
      const r = 2 + (i % 4);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = colorPair[0] + Math.floor(40 + 40 * Math.sin(progress * 0.05 + i)).toString(16).padStart(2,'0');
      ctx.fill();
    }
    ctx.restore();

    // Card (slide in from right)
    const slideX = W * 0.1 + (progress > 0.1 ? 0 : (0.1 - progress) / 0.1 * W * 0.5);
    const cardW = W * 0.8, cardH = H * 0.65;
    const cardY = H * 0.175;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(slideX, cardY, cardW, cardH, 20);
    ctx.fill();
    ctx.restore();

    // Color header bar
    const barGrad = ctx.createLinearGradient(slideX, 0, slideX + cardW, 0);
    barGrad.addColorStop(0, colorPair[0]);
    barGrad.addColorStop(1, colorPair[1]);
    ctx.fillStyle = barGrad;
    ctx.beginPath();
    ctx.roundRect(slideX, cardY, cardW, 54, [20, 20, 0, 0]);
    ctx.fill();

    // Title
    const titleAlpha = Math.min(1, (progress - 0.15) / 0.15);
    ctx.save();
    ctx.globalAlpha = Math.max(0, titleAlpha);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(W * 0.042)}px Inter, sans-serif`;
    ctx.textBaseline = 'middle';
    const title = (diary.title || '旅行记忆').slice(0, 14);
    ctx.fillText(title, slideX + 20, cardY + 27);
    ctx.restore();

    // Spot name chip
    if (diary.spotName) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, titleAlpha);
      ctx.fillStyle = colorPair[0] + '22';
      ctx.beginPath();
      ctx.roundRect(slideX + 20, cardY + 64, 120, 24, 12);
      ctx.fill();
      ctx.fillStyle = colorPair[0];
      ctx.font = `${Math.round(W * 0.028)}px Inter, sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.fillText('📍 ' + diary.spotName.slice(0, 8), slideX + 28, cardY + 76);
      ctx.restore();
    }

    // Content preview
    const contentAlpha = Math.min(1, (progress - 0.3) / 0.2);
    ctx.save();
    ctx.globalAlpha = Math.max(0, contentAlpha);
    ctx.fillStyle = '#374151';
    ctx.font = `${Math.round(W * 0.03)}px Inter, sans-serif`;
    ctx.textBaseline = 'top';
    const content = (diary.content || '').slice(0, 60) + (diary.content?.length > 60 ? '...' : '');
    const words = content.split('');
    let line = '', lines = [], lineW = cardW - 40;
    for (const ch of words) {
      const test = line + ch;
      if (ctx.measureText(test).width > lineW) { lines.push(line); line = ch; }
      else line = test;
    }
    if (line) lines.push(line);
    lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, slideX + 20, cardY + 100 + i * 26));
    ctx.restore();

    // Rating stars
    const starsAlpha = Math.min(1, (progress - 0.5) / 0.2);
    if (diary.rating > 0) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, starsAlpha);
      ctx.font = `${Math.round(W * 0.032)}px sans-serif`;
      ctx.textBaseline = 'bottom';
      ctx.fillText('⭐'.repeat(Math.floor(diary.rating)), slideX + 20, cardY + cardH - 16);
      ctx.restore();
    }

    // Progress bar at bottom
    const barH = 4;
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(slideX, cardY + cardH - barH, cardW, barH);
    const pbGrad = ctx.createLinearGradient(slideX, 0, slideX + cardW, 0);
    pbGrad.addColorStop(0, colorPair[0]);
    pbGrad.addColorStop(1, colorPair[1]);
    ctx.fillStyle = pbGrad;
    ctx.fillRect(slideX, cardY + cardH - barH, cardW * progress, barH);

    // Watermark
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#9ca3af';
    ctx.font = `${Math.round(W * 0.022)}px Inter, sans-serif`;
    ctx.textBaseline = 'bottom';
    ctx.fillText('✨ AIGC 旅游动画 · AI Generated Travel Memory', slideX + 10, H - 10);
    ctx.restore();
  };

  const startAnimation = () => {
    if (!canvasRef.current || diaries.length === 0) return;
    setPlaying(true);
    let idx = 0, startTime = null, DURATION = 3000;

    const animate = (ts) => {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      const progress = Math.min(elapsed / DURATION, 1);
      const diary = diaries[idx % diaries.length];
      const colorPair = CARD_COLORS[idx % CARD_COLORS.length];

      drawFrame(canvasRef.current, diary, progress, colorPair);
      setCurrentIdx(idx % diaries.length);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        idx++;
        startTime = null;
        if (idx < diaries.length) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          setPlaying(false);
        }
      }
    };
    animFrameRef.current = requestAnimationFrame(animate);
  };

  const stopAnimation = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setPlaying(false);
  };

  useEffect(() => () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); }, []);

  return (
    <div className="card p-6">
      <AlgoHeader
        name="AIGC 旅游记忆动画生成"
        desc="基于用户日记数据，利用 Canvas API 实时渲染动态旅游记忆卡片序列。每帧计算粒子轨迹、卡片滑入缓动、文字淡入时序和进度条动画，生成个性化的旅游回忆视频帧。"
        complexity={{ time: 'O(d × fps)，d=日记数', space: 'O(1) Canvas 帧缓冲' }}
        where="frontend/src/pages/AlgoDemo.jsx → AIGCAnimationDemo"
      />

      {!loaded ? (
        <div className="text-center py-8 text-gray-400">加载日记数据中...</div>
      ) : diaries.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <div className="text-3xl mb-2">📝</div>
          <p>暂无日记数据，请先在日记页面发布几篇日记</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={playing ? stopAnimation : startAnimation}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                playing ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gradient-to-r from-orange-400 to-pink-500 text-white hover:opacity-90'
              }`}>
              {playing ? '⏹ 停止动画' : '▶ 生成旅游动画'}
            </button>
            {playing && (
              <span className="text-sm text-gray-500">
                正在播放：{diaries[currentIdx]?.title || '旅行记忆'} ({currentIdx + 1}/{diaries.length})
              </span>
            )}
            <span className="text-xs text-gray-400 ml-auto">共 {diaries.length} 篇日记 · 每张 3s</span>
          </div>

          <canvas ref={canvasRef} width={560} height={360}
            className="w-full rounded-2xl shadow-lg border border-gray-100"
            style={{ background: '#f8fafc', display: 'block' }} />

          <div className="grid grid-cols-4 gap-2">
            {diaries.slice(0, 8).map((d, i) => (
              <div key={d.id}
                className={`px-3 py-2 rounded-xl text-xs transition-all ${
                  i === currentIdx && playing ? 'bg-orange-100 border border-orange-300 text-orange-700 font-semibold' : 'bg-gray-50 text-gray-500'
                }`}>
                {d.title?.slice(0, 8) || '日记'}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
