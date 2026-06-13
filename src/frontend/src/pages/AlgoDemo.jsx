import { useEffect, useMemo, useState } from 'react';
import { searchSpots, getTopK, getSpots, getLocalRouteGraphs } from '../api/index.js';

/**
 * 算法演示页 — 课程验收专用
 * 可直观展示 Trie / Dijkstra / TopK / KMP 等算法的运行过程
 */
export default function AlgoDemo() {
  const [activeAlgo, setActiveAlgo] = useState('trie');

  // Compression tab state
  const [compressText, setCompressText] = useState('北京邮电大学沙河校区位于北京市昌平区，校园环境优美。这里有教学楼、图书馆、宿舍和食堂，学生们每天都在这里学习和生活。');
  const [compressResult, setCompressResult] = useState(null);
  const [compressLoading, setCompressLoading] = useState(false);

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
];

/* ====== Trie 演示 ====== */
const MODE_EXAMPLES = {
  prefix: [
    { label: '"故" → 前缀匹配故宫/故居', q: '故' },
    { label: '"颐和" → 颐和园', q: '颐和' },
    { label: '"北京邮电" → 北京邮电大学', q: '北京邮电' },
  ],
  fulltext: [
    { label: '历史文化 → 倒排索引 AND 检索', q: '历史文化' },
    { label: '皇家园林 → 颐和园等皇家园林', q: '皇家园林' },
    { label: '胡同文化 → 什刹海等老北京街区', q: '胡同文化' },
  ],
  fuzzy: [
    { label: '"故宫博物馆"（错字）→ 容错匹配"故宫博物院"', q: '故宫博物馆' },
    { label: '"天坛公院"（错字）→ 容错匹配"天坛公园"', q: '天坛公院' },
    { label: '"颐和圆"（错字）→ 容错匹配"颐和园"', q: '颐和圆' },
  ],
};

function TrieDemo() {
  const [q, setQ] = useState('故');
  const [mode, setMode] = useState('prefix');
  const [result, setResult] = useState([]);
  const [loading, setLoading] = useState(false);

  const run = async (overrideQ, overrideMode) => {
    const queryQ = overrideQ ?? q;
    const queryMode = overrideMode ?? mode;
    if (!queryQ) return;
    setLoading(true);
    try {
      const res = await searchSpots({ q: queryQ, mode: queryMode });
      setResult(res.data.data || []);
    } finally { setLoading(false); }
  };

  const runExample = (ex) => {
    setQ(ex.q);
    run(ex.q, mode);
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

      {/* 示例查询（每种模式至少 3 个） */}
      <div className="flex flex-wrap gap-2 mb-3 text-xs">
        {MODE_EXAMPLES[mode].map(ex => (
          <button key={ex.label} onClick={() => runExample(ex)}
            className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
            {ex.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="输入关键词（如：故宫、西湖、北大）"
          onKeyDown={e => e.key === 'Enter' && run()}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        <button onClick={() => run()} disabled={loading} className="btn-primary text-sm">
          {loading ? '运行中...' : '▶ 执行'}
        </button>
      </div>
      {result.length > 0 ? (
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
      ) : (
        <p className="text-xs text-gray-400">
          {mode === 'fulltext' && '提示：倒排索引按字分词并取多词交集（AND），可尝试"皇家园林""历史文化"等组合词。'}
          {mode === 'fuzzy' && '提示：模糊匹配基于编辑距离 ≤1，可尝试输入带错字的景点名，如"天坛公院"。'}
          {mode === 'prefix' && '提示：Trie 前缀树按字逐层索引，输入前几个字即可联想全部匹配景点。'}
        </p>
      )}
    </div>
  );
}

/* ====== Dijkstra 演示 ====== */
function LegacyDijkstraDemo() {
  const [fromId, setFromId] = useState(3);
  const [toId, setToId] = useState(16);
  const [mode, setMode] = useState('distance');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const EXAMPLES = [
    { label: '🏛️ 天坛公园 → 国家博物馆', from: 3, to: 16 },
    { label: '🏛️ 故宫 → 天坛公园',    from: 1, to: 3  },
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
const TOPK_CITIES = ['全部', '北京', '上海', '杭州', '成都', '西安', '云南', '广州', '武汉', '南京'];

function TopKDemo() {
  const [k, setK] = useState(5);
  const [type, setType] = useState('scenic');
  const [city, setCity] = useState('全部');
  const [result, setResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bench, setBench] = useState(null);
  const [benchLoading, setBenchLoading] = useState(false);

  const run = async () => {
    setLoading(true); setBench(null);
    try {
      const params = { k, type };
      if (city !== '全部') params.city = city;
      const res = await getTopK(params);
      setResult(res.data.data || []);
    } finally { setLoading(false); }
  };

  // 性能对比：MinHeap TopK O(N log K) vs 全量排序 O(N log N)
  const runBenchmark = async () => {
    setBenchLoading(true);
    try {
      const params = { limit: 300, type };
      if (city !== '全部') params.city = city;
      const res = await getSpots(params);
      const pool = res.data.data || [];

      const rounds = benchmarkRounds(pool.length);
      const heapBench = benchmarkOperation(() => clientTopK(pool, k), rounds);
      const sortBench = benchmarkOperation(() => [...pool].sort((a, b) => b.rating - a.rating).slice(0, k), rounds);
      const heapTop = heapBench.value;
      const sortTop = sortBench.value;

      const sameResult = JSON.stringify(heapTop.map(s => s.id).sort((a, b) => a - b)) ===
        JSON.stringify(sortTop.map(s => s.id).sort((a, b) => a - b));

      setBench({
        poolSize: pool.length,
        rounds,
        heapTime: heapBench.average,
        sortTime: sortBench.average,
        sameResult,
        heapNames: heapTop.map(s => s.name),
      });
    } finally { setBenchLoading(false); }
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
        <div>
          <label className="text-xs text-gray-500 mb-1 block">城市</label>
          <select value={city} onChange={e => setCity(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
            {TOPK_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button onClick={run} disabled={loading} className="btn-primary text-sm">
            {loading ? '运行中...' : '▶ 运行 TopK 堆'}
          </button>
          <button onClick={runBenchmark} disabled={benchLoading}
            className="px-4 py-2 bg-purple-50 text-purple-700 rounded-xl text-sm font-medium hover:bg-purple-100 transition-colors disabled:opacity-50">
            {benchLoading ? '对比中...' : '⚡ 对比全排序'}
          </button>
        </div>
      </div>

      {bench && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <div className="font-bold text-purple-600 text-lg">{formatBenchmarkMs(bench.heapTime)}</div>
            <div className="text-gray-400 text-xs mt-0.5">MinHeap TopK · O(N log K)</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="font-bold text-gray-600 text-lg">{formatBenchmarkMs(bench.sortTime)}</div>
            <div className="text-gray-400 text-xs mt-0.5">Array.sort 全排序 · O(N log N)</div>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <div className="font-bold text-green-600 text-lg">N={bench.poolSize}</div>
            <div className="text-gray-400 text-xs mt-0.5">{bench.sameResult ? '✅ 结果一致' : '⚠️ 结果不同'}</div>
          </div>
        </div>
      )}

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

/* ====== 客户端 MinHeap TopK（与 backend/src/algorithms/heap.js 逻辑一致，用于性能对比演示）====== */
class DemoMinHeap {
  constructor(compare) { this.data = []; this.compare = compare; }
  get size() { return this.data.length; }
  peek() { return this.data[0] || null; }
  push(item) {
    this.data.push(item);
    let i = this.data.length - 1;
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this.compare(this.data[i], this.data[p]) < 0) { [this.data[i], this.data[p]] = [this.data[p], this.data[i]]; i = p; }
      else break;
    }
  }
  pop() {
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = last;
      let i = 0, n = this.data.length;
      while (true) {
        let smallest = i, l = 2 * i + 1, r = 2 * i + 2;
        if (l < n && this.compare(this.data[l], this.data[smallest]) < 0) smallest = l;
        if (r < n && this.compare(this.data[r], this.data[smallest]) < 0) smallest = r;
        if (smallest === i) break;
        [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
        i = smallest;
      }
    }
    return top;
  }
}

function clientTopK(items, k) {
  if (k <= 0 || !items.length) return [];
  const heap = new DemoMinHeap((a, b) => a.rating - b.rating);
  for (const item of items) {
    if (heap.size < k) heap.push(item);
    else if (item.rating > heap.peek().rating) { heap.pop(); heap.push(item); }
  }
  return heap.data.sort((a, b) => b.rating - a.rating);
}

function benchmarkRounds(size) {
  if (size < 200) return 3000;
  if (size < 1000) return 1000;
  return 300;
}

function benchmarkOperation(fn, rounds) {
  let value;
  const start = performance.now();
  for (let index = 0; index < rounds; index += 1) {
    value = fn();
  }
  const total = performance.now() - start;
  return {
    value,
    total,
    average: total / Math.max(1, rounds),
  };
}

function formatBenchmarkMs(value) {
  if (!Number.isFinite(value)) return '--';
  if (value <= 0) return '< 0.001 ms';
  if (value < 0.001) return `${(value * 1000).toFixed(2)} μs`;
  return `${value.toFixed(3)} ms`;
}

/* ====== KMP 演示 ====== */
const KMP_EXAMPLES = [
  { label: '日记检索：故宫/天坛', text: '今天去了故宫博物院，天气晴朗，游客很多。参观了太和殿、中和殿，感受了皇家气派。离开故宫后去了天坛，继续体验北京历史文化。', pattern: '故宫' },
  { label: '多次出现：西湖之旅', text: '在西湖游玩了一整天，西湖的景色太美了，傍晚的西湖更加迷人，难怪人人都爱西湖。', pattern: '西湖' },
  { label: '失败函数对比：重复子串', text: 'ababcabababcababd', pattern: 'abab' },
  { label: '无匹配：关键词不存在', text: '今天天气很好，我们去了颐和园和圆明园，玩得很开心。', pattern: '故宫' },
];

function KMPDemo() {
  const [text, setText] = useState(KMP_EXAMPLES[0].text);
  const [pattern, setPattern] = useState(KMP_EXAMPLES[0].pattern);
  const [result, setResult] = useState(null);

  const runKMP = (overrideText, overridePattern) => {
    const t = overrideText ?? text;
    const p = overridePattern ?? pattern;
    const matches = kmpSearch(t, p);
    setResult({ matches, text: t, pattern: p });
  };

  const runExample = (ex) => {
    setText(ex.text);
    setPattern(ex.pattern);
    runKMP(ex.text, ex.pattern);
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

      {/* 项目实际应用场景说明 */}
      <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-gray-700">
        <p className="font-semibold text-blue-700 mb-1">📌 在本项目中的实际应用</p>
        <p>
          旅行日记的「KMP 精确搜索」（<code className="bg-white px-1 rounded">/diaries/search?mode=kmp</code>）使用本算法在标题与正文中定位关键词，
          命中位置由 <code className="bg-white px-1 rounded">highlightMatch</code> 包裹为 <code className="bg-white px-1 rounded">&lt;mark&gt;</code> 标签，
          前端 <code className="bg-white px-1 rounded">日记页 HL 组件</code> 渲染高亮，相比逐字暴力比对（O(m×n)）效率更高，适合长日记正文的实时检索。
        </p>
      </div>

      {/* 示例（≥3 组对比） */}
      <div className="flex flex-wrap gap-2 mb-3 text-xs">
        {KMP_EXAMPLES.map(ex => (
          <button key={ex.label} onClick={() => runExample(ex)}
            className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
            {ex.label}
          </button>
        ))}
      </div>

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
          <button onClick={() => runKMP()} className="btn-primary text-sm">▶ 运行 KMP</button>
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
function LegacyTwoOptDemo() {
  const [spots, setSpots] = useState('1,3,16,14');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const EXAMPLES = [
    { label: '🏛️ 天坛周边路线（故宫·天坛·国博·大栅栏）', ids: '1,3,16,14' },
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
function LegacyAStarDemo() {
  const [fromId, setFromId] = useState(3);
  const [toId, setToId] = useState(237);
  const [mode, setMode] = useState('distance');
  const [dijResult, setDijResult] = useState(null);
  const [astarResult, setAstarResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const EXAMPLES = [
    { label: '🏛️ 天坛公园 → 北京协和医院', from: 3, to: 237 },
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

function DijkstraDemo() {
  const { graph, loading: graphLoading, error: graphError } = useTempleGraph();
  const landmarks = useMemo(() => getTempleLandmarks(graph), [graph]);
  const examples = useMemo(() => buildTemplePairExamples(landmarks), [landmarks]);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [mode, setMode] = useState('distance');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!graph || fromId || toId) return;
    setFromId(landmarks[0]?.id || graph.nodes[0]?.id || '');
    setToId(landmarks[1]?.id || graph.nodes[1]?.id || '');
  }, [graph, landmarks, fromId, toId]);

  const run = () => {
    if (!graph) return setError('没有加载到数据库里的天坛路网图');
    const route = templeShortestPath(graph, Number(fromId), Number(toId), mode);
    setResult(route.reachable ? route : null);
    setError(route.reachable ? '' : '天坛路网中这两个节点不可达，请换一个入口或景点节点');
  };

  return (
    <div className="card p-6">
      <AlgoHeader
        name="Dijkstra 最短路径：天坛数据库路网"
        desc="从数据库 local_route_graphs 读取天坛路网，用道路边权计算入口、景点、服务设施之间的最短路径。"
        complexity={{ time: 'O((V+E) log V)', space: 'O(V+E)' }}
        where="local_route_graphs / local_route_nodes / local_route_edges"
      />
      <TempleGraphStatus graph={graph} loading={graphLoading} error={graphError} />
      <TemplePairControls
        examples={examples}
        fromId={fromId}
        toId={toId}
        setFromId={setFromId}
        setToId={setToId}
        mode={mode}
        setMode={setMode}
        onRun={run}
        buttonText="执行 Dijkstra"
        color="blue"
      />
      {error && <div className="text-red-600 text-sm bg-red-50 px-4 py-2 rounded-xl mb-4">{error}</div>}
      {result && (
        <TempleRouteResult graph={graph} route={result} title={mode === 'distance' ? '最短距离结果' : '最短时间结果'} color="blue" />
      )}
    </div>
  );
}

function TwoOptDemo() {
  const { graph, loading: graphLoading, error: graphError } = useTempleGraph();
  const landmarks = useMemo(() => getTempleLandmarks(graph), [graph]);
  const [waypointText, setWaypointText] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!graph || waypointText) return;
    setWaypointText(landmarks.slice(0, 5).map((node) => node.id).join(','));
  }, [graph, landmarks, waypointText]);

  const run = () => {
    if (!graph) return setError('没有加载到数据库里的天坛路网图');
    const ids = waypointText.split(/[,，\s]+/).map(Number).filter((id) => Number.isFinite(id));
    if (ids.length < 2) return setError('请至少输入 2 个天坛节点 ID');
    const route = templeMultiPointPath(graph, ids, 'distance');
    setResult(route.reachable ? route : null);
    setError(route.reachable ? '' : '这些节点在天坛路网中无法组成完整游览路线');
  };

  const examples = [
    { label: '中轴线游览', ids: landmarks.slice(0, 5).map((node) => node.id).join(',') },
    { label: '入口到祈年殿片区', ids: landmarks.slice(1, 7).map((node) => node.id).join(',') },
    { label: '服务设施补给线', ids: getTempleServiceNodes(graph).slice(0, 5).map((node) => node.id).join(',') },
  ].filter((item) => item.ids);

  return (
    <div className="card p-6">
      <AlgoHeader
        name="2-opt 多点路径：天坛游览顺序"
        desc="从天坛数据库路网中选多个目标点，先用最近邻构建游览顺序，再用 2-opt 尝试交换路段，减少总路网距离。"
        complexity={{ time: 'O(n²) × Dijkstra', space: 'O(V+E)' }}
        where="天坛 local_route_graphs + Dijkstra + 2-opt"
      />
      <TempleGraphStatus graph={graph} loading={graphLoading} error={graphError} />

      <div className="flex flex-wrap gap-2 mb-3 text-xs">
        {examples.map((example) => (
          <button key={example.label} onClick={() => setWaypointText(example.ids)} className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100">
            {example.label}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <label className="text-xs text-gray-500 mb-1 block">天坛途经节点 ID（逗号分隔）</label>
        <div className="flex gap-2">
          <input value={waypointText} onChange={(event) => setWaypointText(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && run()} className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
          <button onClick={run} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold">运行 2-opt</button>
        </div>
        <p className="text-xs text-gray-400 mt-1">当前示例只使用数据库中的天坛节点，距离为道路路网距离。</p>
      </div>

      {error && <div className="text-red-600 text-sm bg-red-50 px-4 py-2 rounded-xl mb-4">{error}</div>}
      {result && <TempleRouteResult graph={graph} route={result} title="2-opt 优化后天坛游览路线" color="purple" />}
    </div>
  );
}

function AStarDemo() {
  const { graph, loading: graphLoading, error: graphError } = useTempleGraph();
  const landmarks = useMemo(() => getTempleLandmarks(graph), [graph]);
  const examples = useMemo(() => buildTempleAStarExamples(graph, landmarks), [graph, landmarks]);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [mode, setMode] = useState('distance');
  const [dijkstraResult, setDijkstraResult] = useState(null);
  const [astarResult, setAstarResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!graph || fromId || toId) return;
    setFromId(examples[0]?.from || landmarks[0]?.id || graph.nodes[0]?.id || '');
    setToId(examples[0]?.to || landmarks[2]?.id || landmarks[1]?.id || graph.nodes[1]?.id || '');
  }, [graph, landmarks, examples, fromId, toId]);

  const run = () => {
    if (!graph) return setError('没有加载到数据库里的天坛路网图');
    const dij = templeShortestPath(graph, Number(fromId), Number(toId), mode);
    const astar = templeAStarPath(graph, Number(fromId), Number(toId), mode);
    if (!dij.reachable || !astar.reachable) {
      setDijkstraResult(null);
      setAstarResult(null);
      return setError('天坛路网中这两个节点不可达');
    }
    setError('');
    setDijkstraResult(dij);
    setAstarResult(astar);
  };

  return (
    <div className="card p-6">
      <AlgoHeader
        name="A* vs Dijkstra：天坛路网搜索对比"
        desc="A* 在同一张天坛数据库路网上运行，用节点坐标的欧氏距离作为启发函数，对比 Dijkstra 的全图扩展。"
        complexity={{ time: 'O((V+E) log V)', space: 'O(V+E)' }}
        where="天坛 local_route_graphs + coordinate heuristic"
      />
      <TempleGraphStatus graph={graph} loading={graphLoading} error={graphError} />
      <TemplePairControls
        examples={examples}
        fromId={fromId}
        toId={toId}
        setFromId={setFromId}
        setToId={setToId}
        mode={mode}
        setMode={setMode}
        onRun={run}
        buttonText="Dijkstra vs A* 对比"
        color="amber"
      />
      {error && <div className="text-red-600 text-sm bg-red-50 px-4 py-2 rounded-xl mb-4">{error}</div>}
      {dijkstraResult && astarResult && (
        <div className="space-y-4">
          <TempleRouteMap graph={graph} route={astarResult} color="#f59e0b" />
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Dijkstra', data: dijkstraResult, color: 'blue' },
              { label: 'A* 启发式', data: astarResult, color: 'amber' },
            ].map((item) => (
              <div key={item.label} className={`rounded-xl p-4 ${item.color === 'blue' ? 'bg-blue-50 border border-blue-100' : 'bg-amber-50 border border-amber-100'}`}>
                <div className={`text-xs font-bold mb-3 ${item.color === 'blue' ? 'text-blue-600' : 'text-amber-600'}`}>{item.label}</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">路径长度</span><span className="font-semibold">{formatTempleDistance(item.data.totalDist)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">途经节点</span><span className="font-semibold">{item.data.path.length}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">探索节点</span><span className="font-semibold">{item.data.nodesExplored}</span></div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
            A* 在天坛图中实际探索 {astarResult.nodesExplored} 个节点，Dijkstra 探索 {dijkstraResult.nodesExplored} 个节点；两者路径一致时，A* 通常能更快靠近目标区域。
          </div>
        </div>
      )}
    </div>
  );
}

function useTempleGraph() {
  const [state, setState] = useState({ graph: null, loading: true, error: '' });

  useEffect(() => {
    let cancelled = false;
    getLocalRouteGraphs()
      .then((res) => {
        if (cancelled) return;
        const graphs = res.data?.data || [];
        const graph = graphs.find((item) => String(item.name || '').includes('天坛'))
          || graphs.find((item) => String(item.id || '').includes('tiantan'))
          || graphs.find((item) => String(item.id || '') === 'spot-3');
        setState({
          graph: normalizeTempleGraph(graph),
          loading: false,
          error: graph ? '' : '数据库中没有找到名称包含“天坛”的本地路网图',
        });
      })
      .catch(() => {
        if (!cancelled) setState({ graph: null, loading: false, error: '读取数据库天坛路网失败，请确认后端已启动' });
      });
    return () => { cancelled = true; };
  }, []);

  return state;
}

function normalizeTempleGraph(graph) {
  if (!graph) return null;
  const nodes = (graph.nodes || []).map((node) => ({
    ...node,
    id: Number(node.id),
    x: Number(node.x) || 0,
    y: Number(node.y) || 0,
  }));
  const nodeSet = new Set(nodes.map((node) => node.id));
  const edges = (graph.edges || [])
    .map((edge) => ({
      ...edge,
      from: Number(edge.from),
      to: Number(edge.to),
      dist: Number(edge.dist) || 1,
      congestion: Number(edge.congestion) || 1,
      idealSpeedKmh: Number(edge.idealSpeedKmh) || 5,
    }))
    .filter((edge) => nodeSet.has(edge.from) && nodeSet.has(edge.to));
  return { ...graph, nodes, edges, nodeMap: new Map(nodes.map((node) => [node.id, node])) };
}

function TempleGraphStatus({ graph, loading, error }) {
  if (loading) return <div className="mb-4 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">正在读取数据库里的天坛路网...</div>;
  if (error) return <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>;
  return (
    <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
      当前示例图：<strong>{graph.name}</strong>，节点 {graph.nodes.length} 个，边 {graph.edges.length} 条，来源：数据库。
    </div>
  );
}

function TemplePairControls({ examples, fromId, toId, setFromId, setToId, mode, setMode, onRun, buttonText, color }) {
  const activeClass = color === 'amber' ? 'bg-amber-500 text-white' : 'bg-teal-600 text-white';
  const buttonClass = color === 'amber' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700';
  return (
    <>
      <div className="flex flex-wrap gap-2 mb-4 text-xs">
        {examples.map((example) => (
          <button key={example.label} onClick={() => { setFromId(example.from); setToId(example.to); }} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">
            {example.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <label className="text-xs text-gray-500">起点节点 ID
          <input type="number" value={fromId} onChange={(event) => setFromId(event.target.value)} className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </label>
        <label className="text-xs text-gray-500">终点节点 ID
          <input type="number" value={toId} onChange={(event) => setToId(event.target.value)} className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </label>
      </div>
      <div className="flex gap-2 mb-4">
        {[['distance', '最短距离'], ['time', '最短时间']].map(([value, label]) => (
          <button key={value} onClick={() => setMode(value)} className={`px-4 py-1.5 rounded-lg text-sm ${mode === value ? activeClass : 'bg-gray-100 text-gray-600'}`}>
            {label}
          </button>
        ))}
        <button onClick={onRun} className={`ml-auto px-5 py-2 text-white rounded-xl text-sm font-semibold ${buttonClass}`}>{buttonText}</button>
      </div>
    </>
  );
}

function TempleRouteResult({ graph, route, title, color }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-4">
      <TempleRouteMap graph={graph} route={route} color={color === 'purple' ? '#9333ea' : '#2563eb'} />
      <div className="grid grid-cols-3 gap-3">
        <MetricBox value={formatTempleDistance(route.totalDist)} label="路网距离" color={color} />
        <MetricBox value={formatTempleDuration(route.totalTime)} label="预计时间" color="teal" />
        <MetricBox value={route.path.length} label="途经节点" color="blue" />
      </div>
      <div>
        <div className="text-xs text-gray-500 mb-2 font-medium">{title}</div>
        <div className="flex flex-wrap gap-1.5">
          {(route.pathSpots || []).map((node, index) => (
            <span key={`${node.id}-${index}`} className="flex items-center gap-1">
              <span className={`${color === 'purple' ? 'bg-purple-600' : 'bg-blue-600'} text-white text-xs px-2.5 py-1 rounded-full`}>
                {node.name || `节点${node.id}`}
              </span>
              {index < route.pathSpots.length - 1 && <span className="text-gray-400 text-xs">→</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricBox({ value, label, color }) {
  const colorClass = ({ purple: 'text-purple-600', teal: 'text-teal-600', blue: 'text-blue-600' })[color] || 'text-blue-600';
  return (
    <div className="bg-white rounded-xl p-3 text-center shadow-sm">
      <div className={`font-bold text-lg ${colorClass}`}>{value}</div>
      <div className="text-gray-400 text-xs">{label}</div>
    </div>
  );
}

function TempleRouteMap({ graph, route, color = '#2563eb' }) {
  if (!graph) return null;
  const size = graph.size || { width: 1000, height: 620 };
  const shownEdges = graph.edges.slice(0, 520);
  const routeSet = new Set(route?.path || []);
  const pathPoints = (route?.path || []).map((id) => graph.nodeMap.get(id)).filter(Boolean);
  const importantNodes = getTempleLandmarks(graph).slice(0, 28);

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-blue-100 bg-sky-50">
      <svg viewBox={`0 0 ${size.width} ${size.height}`} className="block w-full h-auto max-h-[360px]" role="img" aria-label={`${graph.name}算法演示路网图`}>
        <rect width={size.width} height={size.height} fill="#e8f7f5" />
        {shownEdges.map((edge, index) => {
          const from = graph.nodeMap.get(edge.from);
          const to = graph.nodeMap.get(edge.to);
          if (!from || !to) return null;
          return <line key={index} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#9ca3af" strokeWidth="2" opacity="0.35" />;
        })}
        {pathPoints.length > 1 && (
          <polyline points={pathPoints.map((node) => `${node.x},${node.y}`).join(' ')} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
        )}
        {importantNodes.map((node) => (
          <g key={node.id}>
            <circle cx={node.x} cy={node.y} r={routeSet.has(node.id) ? 9 : 6} fill={routeSet.has(node.id) ? color : '#ffffff'} stroke="#2563eb" strokeWidth="3" />
            <text x={node.x + 9} y={node.y - 7} fontSize="24" fill="#0f172a" fontWeight="700">{node.name}</text>
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap items-center gap-4 px-4 py-2 text-xs text-gray-500">
        <span><i className="inline-block w-8 h-1 rounded bg-gray-400 opacity-50 mr-1" />数据库道路边</span>
        <span><i className="inline-block w-8 h-1 rounded mr-1" style={{ background: color }} />当前算法路径</span>
        <span>显示主要节点，实际参与计算节点 {graph.nodes.length} 个</span>
      </div>
    </div>
  );
}

function getTempleLandmarks(graph) {
  if (!graph) return [];
  const majorWords = ['祈年殿', '圜丘', '皇穹宇', '回音壁', '丹陛桥', '斋宫', '神乐署', '七星石', '成贞门', '天门', '入口', '售票', '游客'];
  const candidates = graph.nodes.filter((node) => (
    !node.routingOnly && majorWords.some((word) => String(node.name || '').includes(word))
  ));
  return (candidates.length ? candidates : graph.nodes.filter((node) => !node.routingOnly)).slice(0, 40);
}

function getTempleServiceNodes(graph) {
  if (!graph) return [];
  const words = ['卫生间', '厕所', '商店', '餐', '茶', '咖啡', '售票', '服务', '游客'];
  return graph.nodes.filter((node) => words.some((word) => String(node.name || '').includes(word))).slice(0, 20);
}

function buildTemplePairExamples(nodes) {
  const list = nodes.slice(0, 8);
  const pairs = [];
  for (let index = 0; index < list.length - 1 && pairs.length < 4; index += 2) {
    pairs.push({
      label: `${list[index].name} → ${list[index + 1].name}`,
      from: list[index].id,
      to: list[index + 1].id,
    });
  }
  if (pairs.length === 0 && list.length >= 2) pairs.push({ label: `${list[0].name} → ${list[1].name}`, from: list[0].id, to: list[1].id });
  return pairs;
}

function buildTempleAStarExamples(graph, landmarks) {
  if (!graph) return buildTemplePairExamples(landmarks);
  const candidates = uniqueTempleCandidates(graph, landmarks).slice(0, 22);
  const scored = [];
  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      const from = candidates[i];
      const to = candidates[j];
      const straight = Math.hypot(from.x - to.x, from.y - to.y);
      if (straight < Math.max(graph.size?.width || 1000, graph.size?.height || 600) * 0.18) continue;
      const dij = templeShortestPath(graph, from.id, to.id, 'distance');
      const astar = templeAStarPath(graph, from.id, to.id, 'distance');
      if (!dij.reachable || !astar.reachable) continue;
      if (Math.abs(dij.totalDist - astar.totalDist) > 2) continue;
      const saved = dij.nodesExplored - astar.nodesExplored;
      if (saved <= 0) continue;
      scored.push({
        from,
        to,
        saved,
        dij,
        direction: directionBucket(from, to),
        areaKey: `${areaBucket(graph, from)}-${areaBucket(graph, to)}`,
      });
    }
  }

  scored.sort((a, b) => b.saved - a.saved || b.dij.nodesExplored - a.dij.nodesExplored);
  const examples = pickDiverseTemplePairs(scored, 4).map((item) => ({
    label: `${item.from.name} → ${item.to.name}（少搜 ${item.saved}）`,
    from: item.from.id,
    to: item.to.id,
  }));
  return examples.length ? examples : buildTemplePairExamples(landmarks);
}

function uniqueTempleCandidates(graph, landmarks) {
  const demoNodes = graph.nodes.filter(isTempleDemoCandidate);
  const nodes = demoNodes.length >= 8 ? demoNodes : graph.nodes.filter((node) => !node.routingOnly);
  const landmarkNodes = landmarks.filter(isTempleDemoCandidate);
  const gridRepresentatives = gridTempleRepresentatives(graph, nodes);
  const picked = [
    ...(landmarkNodes.length ? landmarkNodes : landmarks).slice(0, 12),
    ...gridRepresentatives,
    extremeNode(nodes, (node) => node.x),
    extremeNode(nodes, (node) => -node.x),
    extremeNode(nodes, (node) => node.y),
    extremeNode(nodes, (node) => -node.y),
    extremeNode(nodes, (node) => node.x + node.y),
    extremeNode(nodes, (node) => -(node.x + node.y)),
    extremeNode(nodes, (node) => node.x - node.y),
    extremeNode(nodes, (node) => node.y - node.x),
  ].filter(Boolean);
  const seen = new Set();
  return picked.filter((node) => {
    if (seen.has(node.id)) return false;
    seen.add(node.id);
    return true;
  });
}

function isTempleDemoCandidate(node) {
  const name = String(node?.name || '');
  if (!name || node.routingOnly) return false;
  if (!/[\u4e00-\u9fff]/.test(name)) return false;
  return !/(商店|超市|食堂|餐|咖啡|茶|卫生间|洗手间|厕所|售票|游客|服务|医院|大学|银行|书店|公司|便利|全家|紫光园|烤鸭|涮肉|火锅|面馆|Store|Shop|Coffee|Tea|Restaurant|Hospital|University|Bank|Bookstore|Company)/i.test(name);
}

function gridTempleRepresentatives(graph, nodes) {
  const width = graph.size?.width || 1000;
  const height = graph.size?.height || 620;
  const cells = new Map();
  for (const node of nodes) {
    const col = Math.max(0, Math.min(2, Math.floor((node.x / width) * 3)));
    const row = Math.max(0, Math.min(2, Math.floor((node.y / height) * 3)));
    const key = `${col}-${row}`;
    const centerX = ((col + 0.5) / 3) * width;
    const centerY = ((row + 0.5) / 3) * height;
    const score = Math.hypot(node.x - centerX, node.y - centerY);
    const current = cells.get(key);
    if (!current || score < current.score) cells.set(key, { node, score });
  }
  return Array.from(cells.values()).map((item) => item.node);
}

function pickDiverseTemplePairs(scored, limit) {
  const picked = [];
  const usedDirections = new Set();
  const usedAreas = new Set();
  const usedEndpoints = new Set();

  const tryPick = (strict) => {
    for (const item of scored) {
      if (picked.length >= limit) break;
      const endpointKey = [item.from.id, item.to.id].sort().join('-');
      if (usedEndpoints.has(endpointKey)) continue;
      if (strict && usedDirections.has(item.direction)) continue;
      if (strict && usedAreas.has(item.areaKey)) continue;
      if (strict && picked.some((pickedItem) => pickedItem.from.id === item.from.id || pickedItem.to.id === item.to.id)) continue;
      picked.push(item);
      usedDirections.add(item.direction);
      usedAreas.add(item.areaKey);
      usedEndpoints.add(endpointKey);
    }
  };

  tryPick(true);
  tryPick(false);
  return picked.slice(0, limit);
}

function directionBucket(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) > Math.abs(dy) * 1.7) return dx > 0 ? 'east' : 'west';
  if (Math.abs(dy) > Math.abs(dx) * 1.7) return dy > 0 ? 'south' : 'north';
  if (dx >= 0 && dy >= 0) return 'south-east';
  if (dx >= 0 && dy < 0) return 'north-east';
  if (dx < 0 && dy >= 0) return 'south-west';
  return 'north-west';
}

function areaBucket(graph, node) {
  const width = graph.size?.width || 1000;
  const height = graph.size?.height || 620;
  const col = Math.max(0, Math.min(2, Math.floor((node.x / width) * 3)));
  const row = Math.max(0, Math.min(2, Math.floor((node.y / height) * 3)));
  return `${col}${row}`;
}

function extremeNode(nodes, scoreFn) {
  let best = null;
  let bestScore = Infinity;
  for (const node of nodes) {
    const score = scoreFn(node);
    if (score < bestScore) {
      best = node;
      bestScore = score;
    }
  }
  return best;
}

function templeShortestPath(graph, startId, endId, mode = 'distance') {
  const adjacency = buildTempleAdjacency(graph, mode);
  const dist = new Map(graph.nodes.map((node) => [node.id, Infinity]));
  const prev = new Map();
  const prevEdge = new Map();
  const visited = new Set();
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
      const next = best + edge.weight;
      if (next < dist.get(edge.to)) {
        dist.set(edge.to, next);
        prev.set(edge.to, current);
        prevEdge.set(edge.to, edge);
      }
    }
  }
  return buildTempleRoute(graph, startId, endId, prev, prevEdge, visited.size, 'Dijkstra');
}

function templeAStarPath(graph, startId, endId, mode = 'distance') {
  const adjacency = buildTempleAdjacency(graph, mode);
  const gScore = new Map(graph.nodes.map((node) => [node.id, Infinity]));
  const prev = new Map();
  const prevEdge = new Map();
  const open = new Set([startId]);
  const closed = new Set();
  gScore.set(startId, 0);

  while (open.size > 0) {
    let current = null;
    let best = Infinity;
    for (const id of open) {
      const value = gScore.get(id) + templeHeuristic(graph, id, endId, mode);
      if (value < best) {
        best = value;
        current = id;
      }
    }
    if (!current || current === endId) break;
    open.delete(current);
    closed.add(current);
    for (const edge of adjacency.get(current) || []) {
      if (closed.has(edge.to)) continue;
      const next = gScore.get(current) + edge.weight;
      if (next < gScore.get(edge.to)) {
        gScore.set(edge.to, next);
        prev.set(edge.to, current);
        prevEdge.set(edge.to, edge);
        open.add(edge.to);
      }
    }
  }
  return buildTempleRoute(graph, startId, endId, prev, prevEdge, closed.size + open.size, 'A*');
}

function templeMultiPointPath(graph, ids, mode = 'distance') {
  let order = nearestNeighborOrder(graph, ids, mode);
  order = improveOrderByTwoOpt(graph, order, mode);
  const path = [];
  const steps = [];
  let totalDist = 0;
  let totalTime = 0;
  for (let index = 0; index < order.length - 1; index += 1) {
    const route = templeShortestPath(graph, order[index], order[index + 1], mode);
    if (!route.reachable) return { reachable: false };
    path.push(...(index === 0 ? route.path : route.path.slice(1)));
    steps.push(...route.steps);
    totalDist += route.totalDist;
    totalTime += route.totalTime;
  }
  return {
    reachable: true,
    path,
    steps,
    order,
    totalDist: Math.round(totalDist),
    totalTime,
    pathSpots: routeDisplayNodes(path, graph.nodeMap),
    algorithm: 'NearestNeighbor + 2-opt',
  };
}

function nearestNeighborOrder(graph, ids, mode) {
  const remaining = new Set(ids.slice(1));
  const order = [ids[0]];
  while (remaining.size) {
    const current = order[order.length - 1];
    let best = null;
    let bestCost = Infinity;
    for (const id of remaining) {
      const route = templeShortestPath(graph, current, id, mode);
      const cost = mode === 'time' ? route.totalTime : route.totalDist;
      if (route.reachable && cost < bestCost) {
        best = id;
        bestCost = cost;
      }
    }
    if (!best) break;
    remaining.delete(best);
    order.push(best);
  }
  return order;
}

function improveOrderByTwoOpt(graph, order, mode) {
  if (order.length < 4) return order;
  let best = [...order];
  let bestCost = orderCost(graph, best, mode);
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < best.length - 2; i += 1) {
      for (let j = i + 1; j < best.length - 1; j += 1) {
        const candidate = [...best.slice(0, i), ...best.slice(i, j + 1).reverse(), ...best.slice(j + 1)];
        const cost = orderCost(graph, candidate, mode);
        if (cost < bestCost) {
          best = candidate;
          bestCost = cost;
          improved = true;
        }
      }
    }
  }
  return best;
}

function orderCost(graph, order, mode) {
  let cost = 0;
  for (let index = 0; index < order.length - 1; index += 1) {
    const route = templeShortestPath(graph, order[index], order[index + 1], mode);
    if (!route.reachable) return Infinity;
    cost += mode === 'time' ? route.totalTime : route.totalDist;
  }
  return cost;
}

function buildTempleAdjacency(graph, mode) {
  const adjacency = new Map(graph.nodes.map((node) => [node.id, []]));
  for (const edge of graph.edges) {
    const weight = mode === 'time' ? edgeTravelMinutes(edge) : edge.dist;
    const item = { ...edge, weight, time: edgeTravelMinutes(edge) };
    adjacency.get(edge.from)?.push({ ...item, to: edge.to });
    adjacency.get(edge.to)?.push({ ...item, from: edge.to, to: edge.from });
  }
  return adjacency;
}

function buildTempleRoute(graph, startId, endId, prev, prevEdge, nodesExplored, algorithm) {
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
  if (path[0] !== startId) return { reachable: false, path: [], steps: [], totalDist: 0, totalTime: 0, nodesExplored, algorithm };
  return {
    reachable: true,
    path,
    steps,
    totalDist: Math.round(steps.reduce((sum, edge) => sum + edge.dist, 0)),
    totalTime: steps.reduce((sum, edge) => sum + edge.time, 0),
    nodesExplored,
    pathSpots: routeDisplayNodes(path, graph.nodeMap),
    algorithm,
  };
}

function routeDisplayNodes(path, nodeMap) {
  const nodes = path.map((id) => nodeMap.get(id)).filter(Boolean);
  const keyNodes = nodes.filter((node, index) => index === 0 || index === nodes.length - 1 || !node.routingOnly);
  const selected = keyNodes.length >= 2 ? keyNodes : nodes;
  return selected.filter((node, index, list) => index === 0 || node.id !== list[index - 1]?.id);
}

function edgeTravelMinutes(edge) {
  const speed = Math.max(1, (edge.idealSpeedKmh || 5) * (edge.congestion || 1));
  return (edge.dist / 1000) / speed * 60;
}

function templeHeuristic(graph, fromId, toId, mode) {
  const from = graph.nodeMap.get(fromId);
  const to = graph.nodeMap.get(toId);
  if (!from || !to) return 0;
  const dist = Math.hypot(from.x - to.x, from.y - to.y) * 0.8;
  return mode === 'time' ? (dist / 1000) / 5 * 60 : dist;
}

function formatTempleDistance(value) {
  const meters = Math.round(Number(value) || 0);
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
}

function formatTempleDuration(minutes) {
  const totalSeconds = Math.max(0, Math.round((Number(minutes) || 0) * 60));
  if (totalSeconds < 60) return `${totalSeconds}秒`;
  const min = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  return sec ? `${min}分${sec}秒` : `${min}分钟`;
}
