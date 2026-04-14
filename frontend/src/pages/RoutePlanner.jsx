import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { shortestPath, multiPointPath, autocompleteSpots } from '../api/index.js';

export default function RoutePlanner() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState('single'); // single | multi
  const [weightMode, setWeightMode] = useState('distance'); // distance | time

  // 单点模式
  const [fromId, setFromId] = useState(searchParams.get('from') || '');
  const [toId, setToId] = useState(searchParams.get('to') || '');
  const [fromSuggests, setFromSuggests] = useState([]);
  const [toSuggests, setToSuggests] = useState([]);
  const [fromName, setFromName] = useState('');
  const [toName, setToName] = useState('');

  // 多点模式
  const [waypoints, setWaypoints] = useState(['', '']);
  const [waypointNames, setWaypointNames] = useState(['', '']);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const searchSuggests = async (q, setter) => {
    if (!q || q.length < 1) { setter([]); return; }
    try {
      const res = await autocompleteSpots(q);
      setter(res.data.data || []);
    } catch { setter([]); }
  };

  const runSingle = async () => {
    if (!fromId || !toId) { setError('请选择起点和终点'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await shortestPath({ fromId: Number(fromId), toId: Number(toId), mode: weightMode });
      if (!res.data.success) {
        setError((res.data.message || '路线不可达') + ' — 该景点可能不在当前路网覆盖范围内，请尝试上方已验证示例');
      } else setResult(res.data.data);
    } catch { setError('请求失败，请确认后端服务已启动（后端端口 3001）'); }
    finally { setLoading(false); }
  };

  const runMulti = async () => {
    const ids = waypoints.filter(w => w).map(Number);
    if (ids.length < 2) { setError('请至少选择2个地点'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await multiPointPath({ waypointIds: ids, mode: weightMode });
      if (!res.data.success) setError(res.data.message);
      else setResult(res.data.data);
    } catch { setError('请求失败'); }
    finally { setLoading(false); }
  };

  const formatDist = (d) => d >= 1000 ? `${(d/1000).toFixed(1)} km` : `${d} m`;
  const formatTime = (t) => t >= 60 ? `${Math.floor(t/60)}小时${t%60}分` : `${t}分钟`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="section-title">路线规划</h1>
      <p className="section-sub">算法：Dijkstra（单点）+ 最近邻/2-opt（多点）</p>

      {/* 模式切换 */}
      <div className="flex gap-2 mb-6">
        {[['single', '单点最短路'], ['multi', '多点最短路']].map(([v, label]) => (
          <button key={v} onClick={() => { setMode(v); setResult(null); setError(''); }}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition-colors ${
              mode === v ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>{label}</button>
        ))}
        <div className="ml-auto flex gap-2">
          {[['distance', '最短距离'], ['time', '最短时间']].map(([v, label]) => (
            <button key={v} onClick={() => setWeightMode(v)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
                weightMode === v ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>{label}</button>
          ))}
        </div>
      </div>

      {/* 单点模式输入 */}
      {mode === 'single' && (
        <div className="card p-6 mb-6">
          <div className="grid md:grid-cols-2 gap-4">
            {/* 起点 */}
            <div className="relative">
              <label className="text-sm font-medium text-gray-700 mb-1 block">📍 起点</label>
              <input
                value={fromName}
                onChange={e => { setFromName(e.target.value); searchSuggests(e.target.value, setFromSuggests); }}
                placeholder="搜索起点名称"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {fromSuggests.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-lg z-20 mt-1">
                  {fromSuggests.map(s => (
                    <button key={s.id} onClick={() => { setFromId(s.id); setFromName(s.name); setFromSuggests([]); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 first:rounded-t-xl last:rounded-b-xl">
                      {s.name} <span className="text-gray-400 text-xs">{s.city}</span>
                    </button>
                  ))}
                </div>
              )}
              {fromId && <p className="text-xs text-green-600 mt-1">✓ ID: {fromId}</p>}
            </div>

            {/* 终点 */}
            <div className="relative">
              <label className="text-sm font-medium text-gray-700 mb-1 block">🏁 终点</label>
              <input
                value={toName}
                onChange={e => { setToName(e.target.value); searchSuggests(e.target.value, setToSuggests); }}
                placeholder="搜索终点名称"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {toSuggests.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-lg z-20 mt-1">
                  {toSuggests.map(s => (
                    <button key={s.id} onClick={() => { setToId(s.id); setToName(s.name); setToSuggests([]); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 first:rounded-t-xl last:rounded-b-xl">
                      {s.name} <span className="text-gray-400 text-xs">{s.city}</span>
                    </button>
                  ))}
                </div>
              )}
              {toId && <p className="text-xs text-green-600 mt-1">✓ ID: {toId}</p>}
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl text-xs" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', color: '#1e40af' }}>
            <div className="font-semibold mb-2">⚡ 快速示例（已验证可达）</div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '故宫→颐和园', from: 1, fromN: '故宫博物院', to: 4, toN: '颐和园' },
                { label: '西湖→灵隐寺', from: 36, fromN: '西湖', to: 38, toN: '灵隐寺' },
                { label: '外滩→东方明珠', from: 22, fromN: '外滩', to: 21, toN: '东方明珠塔' },
                { label: '大雁塔→兵马俑', from: 82, fromN: '大雁塔', to: 81, toN: '兵马俑' },
                { label: '北大西门→未名湖', from: 202, fromN: '北大西门', to: 205, toN: '未名湖' },
              ].map(ex => (
                <button key={ex.label}
                  onClick={() => { setFromId(ex.from); setFromName(ex.fromN); setToId(ex.to); setToName(ex.toN); setError(''); setResult(null); }}
                  className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                  style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(59,130,246,0.25)', color: '#1d4ed8' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(219,234,254,0.9)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.7)'}
                >
                  {ex.label}
                </button>
              ))}
            </div>
            <div className="mt-2 pt-2 text-[11px] opacity-70" style={{ borderTop: '1px solid rgba(59,130,246,0.15)' }}>
              💡 有路网数据的区域：北京市区 · 颐和园/北大周边 · 上海 · 杭州 · 西安 · 成都市区 · 桂林 · 张家界 · 北大校园内部
            </div>
          </div>

          <button onClick={runSingle} disabled={loading}
            className="btn-primary w-full mt-4 text-base">
            {loading ? '计算中...' : '🧭 开始规划'}
          </button>
        </div>
      )}

      {/* 多点模式 */}
      {mode === 'multi' && (
        <div className="card p-6 mb-6">
          <p className="text-sm text-gray-500 mb-4">输入节点 ID（可在景点详情页查看），算法自动规划最优顺序</p>
          {waypoints.map((w, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input value={w} onChange={e => { const a=[...waypoints]; a[i]=e.target.value; setWaypoints(a); }}
                placeholder={`节点 ${i+1} ID`}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              {waypoints.length > 2 && (
                <button onClick={() => setWaypoints(waypoints.filter((_,j)=>j!==i))}
                  className="text-red-400 hover:text-red-600 px-3">✕</button>
              )}
            </div>
          ))}
          <button onClick={() => setWaypoints([...waypoints, ''])} className="text-blue-600 text-sm hover:underline mb-4">
            + 添加途经点
          </button>
          <div className="p-3 rounded-xl text-xs mb-4" style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)', color: '#92400e' }}>
            <div className="font-semibold mb-1.5">⚡ 多点示例（已验证）</div>
            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-1 rounded-lg text-xs font-medium"
                style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(251,146,60,0.3)' }}
                onClick={() => { setWaypoints(['1','7','10','20']); setError(''); setResult(null); }}>
                故宫→北海→什刹海→雍和宫（北京）
              </button>
              <button className="px-3 py-1 rounded-lg text-xs font-medium"
                style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(251,146,60,0.3)' }}
                onClick={() => { setWaypoints(['22','21','25','29']); setError(''); setResult(null); }}>
                外滩→东方明珠→陆家嘴→新天地（上海）
              </button>
              <button className="px-3 py-1 rounded-lg text-xs font-medium"
                style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(251,146,60,0.3)' }}
                onClick={() => { setWaypoints(['36','42','41','37']); setError(''); setResult(null); }}>
                西湖→断桥→苏堤→雷峰塔（杭州）
              </button>
            </div>
          </div>
          <button onClick={runMulti} disabled={loading} className="btn-primary w-full">
            {loading ? '计算中...' : '🧭 规划多点路线'}
          </button>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* 结果展示 */}
      {result && (
        <div className="card p-6 animate-slide-up">
          <h2 className="text-lg font-semibold mb-4">路线规划结果</h2>

          {/* 摘要 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-blue-600">
                {result.totalDist != null ? formatDist(result.totalDist)
                 : result.totalTime != null ? formatTime(result.totalTime)
                 : formatDist(result.totalCost)}
              </div>
              <div className="text-xs text-gray-500 mt-1">{weightMode === 'distance' ? '总距离' : '总时间'}</div>
            </div>
            <div className="bg-teal-50 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-teal-600">{result.path?.length || 0}</div>
              <div className="text-xs text-gray-500 mt-1">途经节点</div>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <div className="text-sm font-semibold text-purple-600 mt-1">{result.algorithm}</div>
              <div className="text-xs text-gray-500 mt-1">使用算法</div>
            </div>
          </div>

          {/* 路径节点 */}
          <h3 className="text-sm font-medium text-gray-700 mb-3">途经路径</h3>
          <div className="flex flex-wrap gap-2">
            {(result.pathSpots || []).map((s, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full">
                  {s.name || `节点${s.id}`}
                </span>
                {i < result.pathSpots.length - 1 && <span className="text-gray-400 text-xs">→</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
