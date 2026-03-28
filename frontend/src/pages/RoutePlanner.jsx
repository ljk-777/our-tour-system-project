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
      if (!res.data.success) setError(res.data.message || '路线不可达');
      else setResult(res.data.data);
    } catch { setError('请求失败，请确认后端服务已启动'); }
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
              <label className="text-sm font-medium mb-1 block" style={{ color: 'rgba(255,255,255,0.6)' }}>📍 起点</label>
              <input
                type="text"
                value={fromName}
                onChange={e => { setFromName(e.target.value); setFromId(''); searchSuggests(e.target.value, setFromSuggests); }}
                placeholder="搜索起点名称"
                autoComplete="off"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.9)',
                }}
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {fromSuggests.length > 0 && (
                <div className="absolute top-full left-0 right-0 border rounded-xl shadow-lg z-20 mt-1"
                  style={{ background: '#1a1f2e', borderColor: 'rgba(255,255,255,0.1)' }}>
                  {fromSuggests.map(s => (
                    <button key={s.id} onClick={() => { setFromId(s.id); setFromName(s.name); setFromSuggests([]); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-blue-900/30 first:rounded-t-xl last:rounded-b-xl"
                      style={{ color: 'rgba(255,255,255,0.8)' }}>
                      {s.name} <span style={{ color: 'rgba(255,255,255,0.4)' }} className="text-xs">{s.city}</span>
                    </button>
                  ))}
                </div>
              )}
              {fromId && <p className="text-xs text-green-400 mt-1">✓ 已选择: {fromName} (ID: {fromId})</p>}
            </div>

            {/* 终点 */}
            <div className="relative">
              <label className="text-sm font-medium mb-1 block" style={{ color: 'rgba(255,255,255,0.6)' }}>🏁 终点</label>
              <input
                type="text"
                value={toName}
                onChange={e => { setToName(e.target.value); setToId(''); searchSuggests(e.target.value, setToSuggests); }}
                placeholder="搜索终点名称"
                autoComplete="off"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.9)',
                }}
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {toSuggests.length > 0 && (
                <div className="absolute top-full left-0 right-0 border rounded-xl shadow-lg z-20 mt-1"
                  style={{ background: '#1a1f2e', borderColor: 'rgba(255,255,255,0.1)' }}>
                  {toSuggests.map(s => (
                    <button key={s.id} onClick={() => { setToId(s.id); setToName(s.name); setToSuggests([]); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-blue-900/30 first:rounded-t-xl last:rounded-b-xl"
                      style={{ color: 'rgba(255,255,255,0.8)' }}>
                      {s.name} <span style={{ color: 'rgba(255,255,255,0.4)' }} className="text-xs">{s.city}</span>
                    </button>
                  ))}
                </div>
              )}
              {toId && <p className="text-xs text-green-400 mt-1">✓ 已选择: {toName} (ID: {toId})</p>}
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl text-xs" style={{ background: 'rgba(14,165,233,0.1)', color: '#38bdf8' }}>
            <strong>快速示例：</strong>
            <button className="ml-2 underline hover:no-underline" onClick={() => { setFromId(1); setFromName('故宫博物院'); setToId(4); setToName('颐和园'); setFromSuggests([]); setToSuggests([]); }}>
              故宫→颐和园
            </button>
            <button className="ml-3 underline hover:no-underline" onClick={() => { setFromId(36); setFromName('西湖'); setToId(38); setToName('灵隐寺'); setFromSuggests([]); setToSuggests([]); }}>
              西湖→灵隐寺
            </button>
            <button className="ml-3 underline hover:no-underline" onClick={() => { setFromId(202); setFromName('北大西门'); setToId(205); setToName('未名湖'); setFromSuggests([]); setToSuggests([]); }}>
              北大西门→未名湖
            </button>
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
          <div className="p-3 bg-orange-50 rounded-xl text-xs text-orange-700 mb-4">
            <strong>示例：</strong>
            <button className="ml-2 underline" onClick={() => setWaypoints(['1','7','10','20'])}>
              故宫→北海→什刹海→雍和宫
            </button>
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

          {/* 步骤路径可视化 */}
          <h3 className="text-sm font-medium text-gray-700 mb-3">详细路径</h3>
          <div className="relative pl-6 border-l-2 border-blue-200 space-y-4 mb-6">
            {(result.pathSpots || []).map((s, i) => (
              <div key={i} className="relative">
                {/* 节点标记 */}
                <div className={`absolute -left-[29px] w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                  i === 0 ? 'bg-green-500 text-white' :
                  i === (result.pathSpots || []).length - 1 ? 'bg-red-500 text-white' :
                  'bg-blue-500 text-white'
                }`}>
                  {i === 0 ? 'S' : i === (result.pathSpots || []).length - 1 ? 'E' : i}
                </div>
                {/* 节点信息 */}
                <div className="ml-4 p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{s.name || `节点 ${s.id}`}</span>
                    <span className="text-xs text-gray-400">ID: {s.id}</span>
                  </div>
                  {s.city && <div className="text-xs text-gray-400 mt-1">📍 {s.city}</div>}
                  {i < (result.pathSpots || []).length - 1 && result.edges && result.edges[i] && (
                    <div className="text-xs text-blue-600 mt-2 flex items-center gap-2">
                      <span>↓</span>
                      <span>{result.edges[i].transport === 'walk' ? '🚶 步行' : result.edges[i].transport === 'car' ? '🚗 驾车' : '🚌 公交'}</span>
                      <span>{formatDist(result.edges[i].dist)} · {formatTime(result.edges[i].time)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 简洁路径展示 */}
          <h3 className="text-sm font-medium text-gray-700 mb-3">简洁路径</h3>
          <div className="flex flex-wrap gap-2">
            {(result.pathSpots || []).map((s, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className={`text-xs px-3 py-1 rounded-full ${
                  i === 0 ? 'bg-green-100 text-green-700' :
                  i === (result.pathSpots || []).length - 1 ? 'bg-red-100 text-red-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {s.name || `节点${s.id}`}
                </span>
                {i < (result.pathSpots || []).length - 1 && <span className="text-gray-400 text-xs">→</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
