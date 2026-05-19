import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  shortestPath,
  multiPointPath,
  autocompleteSpots,
  amapPoiTips,
  amapRoute,
} from '../api/index.js';
import AmapRouteMap from '../components/AmapRouteMap.jsx';

const ALGORITHM_EXAMPLES = [
  { label: '故宫 -> 颐和园', from: 1, fromName: '故宫博物院', to: 4, toName: '颐和园' },
  { label: '西湖 -> 灵隐寺', from: 36, fromName: '西湖', to: 38, toName: '灵隐寺' },
  { label: '外滩 -> 东方明珠', from: 22, fromName: '外滩', to: 21, toName: '东方明珠塔' },
];

const AMAP_TRAVEL_MODES = [
  ['walking', '步行'],
  ['driving', '驾车'],
  ['cycling', '骑行'],
  ['transit', '公交'],
];

export default function RoutePlanner() {
  const [searchParams] = useSearchParams();
  const [plannerMode, setPlannerMode] = useState('algorithm');
  const [algoMode, setAlgoMode] = useState('single');
  const [weightMode, setWeightMode] = useState('distance');

  const [fromId, setFromId] = useState(searchParams.get('from') || '');
  const [toId, setToId] = useState(searchParams.get('to') || '');
  const [fromName, setFromName] = useState(searchParams.get('fromName') || '');
  const [toName, setToName] = useState(searchParams.get('toName') || '');
  const [fromSuggests, setFromSuggests] = useState([]);
  const [toSuggests, setToSuggests] = useState([]);

  // 多点模式
  const [waypoints,        setWaypoints]        = useState(['', '']);
  const [waypointNames,    setWaypointNames]    = useState(['', '']);
  const [waypointSuggests, setWaypointSuggests] = useState([[], []]);
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  amapPoiTips,
  amapRoute,
  autocompleteSpots,
  multiPointPath,
  shortestPath,
} from '../api/index.js';
import AmapRouteMap from '../components/AmapRouteMap.jsx';
import CampusMapAnnotator from '../components/CampusMapAnnotator.jsx';
import CampusNavigationMap from '../components/CampusNavigationMap.jsx';

const PLANNER_MODES = [
  { value: 'annotate', label: '地图标注' },
  { value: 'campus', label: '校园地图导航' },
  { value: 'algorithm', label: '本地算法模式' },
  { value: 'amap', label: '高德真实导航' },
];

const ALGO_MODE_OPTIONS = [
  { value: 'single', label: '单点最短路' },
  { value: 'multi', label: '多点路径' },
];

const WEIGHT_MODE_OPTIONS = [
  { value: 'distance', label: '最短距离' },
  { value: 'time', label: '最短时间' },
];

const TRAVEL_MODE_OPTIONS = [
  { value: 'walking', label: '步行' },
  { value: 'driving', label: '驾车' },
  { value: 'cycling', label: '骑行' },
  { value: 'transit', label: '公交' },
];

const MODE_BADGES = {
  walking: '步行',
  driving: '驾车',
  cycling: '骑行',
  transit: '公交',
};

export default function RoutePlanner() {
  const [searchParams] = useSearchParams();

  const [plannerMode, setPlannerMode] = useState('campus');
  const [algoMode, setAlgoMode] = useState('single');
  const [weightMode, setWeightMode] = useState('distance');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const [fromKeyword, setFromKeyword] = useState(searchParams.get('fromName') || '');
  const [toKeyword, setToKeyword] = useState(searchParams.get('toName') || '');
  const [fromSpot, setFromSpot] = useState(buildLocalSpotFromQuery(searchParams, 'from'));
  const [toSpot, setToSpot] = useState(buildLocalSpotFromQuery(searchParams, 'to'));
  const [fromSuggests, setFromSuggests] = useState([]);
  const [toSuggests, setToSuggests] = useState([]);

  const [multiKeyword, setMultiKeyword] = useState('');
  const [multiSuggests, setMultiSuggests] = useState([]);
  const [waypoints, setWaypoints] = useState(buildInitialWaypoints(searchParams));

  const [travelMode, setTravelMode] = useState('walking');
  const [amapOriginKeyword, setAmapOriginKeyword] = useState(searchParams.get('amapFromName') || '');
  const [amapDestinationKeyword, setAmapDestinationKeyword] = useState(searchParams.get('amapToName') || searchParams.get('toName') || '');
  const [amapOrigin, setAmapOrigin] = useState(buildAmapSpotFromQuery(searchParams, 'amapFrom'));
  const [amapDestination, setAmapDestination] = useState(
    buildAmapSpotFromQuery(searchParams, 'amapTo') || buildAmapFallbackFromLocal(searchParams, 'to')
  );
  const [amapOriginTips, setAmapOriginTips] = useState([]);
  const [amapDestinationTips, setAmapDestinationTips] = useState([]);

  useEffect(() => {
    if (amapDestination?.location) {
      setPlannerMode('amap');
    }
  }, [amapDestination]);

  const titleText = useMemo(() => {
    if (plannerMode === 'annotate') return '校园路网标注';
    if (plannerMode === 'campus') return '校园可视化导航';
    if (plannerMode === 'amap') return '真实导航模式';
    return algoMode === 'multi' ? '多点路线规划' : '最短路径规划';
  }, [algoMode, plannerMode]);

  const handleLocalKeywordChange = async (value, setter, setSuggests) => {
    setter(value);
    if (!value.trim()) {
      setSuggests([]);
      return;
    }

  const [travelMode, setTravelMode] = useState('walking');
  const [amapOriginName, setAmapOriginName] = useState(searchParams.get('amapFromName') || searchParams.get('fromName') || '');
  const [amapDestinationName, setAmapDestinationName] = useState(searchParams.get('amapToName') || searchParams.get('toName') || '');
  const [amapOrigin, setAmapOrigin] = useState(buildAmapQueryPoint(searchParams, 'amapFrom', 'fromName'));
  const [amapDestination, setAmapDestination] = useState(buildAmapQueryPoint(searchParams, 'amapTo', 'toName'));
  const [amapOriginTips, setAmapOriginTips] = useState([]);
  const [amapDestinationTips, setAmapDestinationTips] = useState([]);

  useEffect(() => {
    if (amapOrigin && amapDestination) {
      setPlannerMode('amap');
    }
  }, [amapOrigin, amapDestination]);

  const searchLocalSuggests = async (q, setter) => {
    if (!q) {
      setter([]);
      return;
    }
    try {
      const res = await autocompleteSpots(q);
      setter(res.data.data || []);
    } catch {
      setter([]);
    }
  };

  const searchAmapTips = async (q, setter) => {
    if (!q) {
      setter([]);
      return;
    }
    try {
      const res = await amapPoiTips({ keywords: q });
      setter(res.data.data || []);
    } catch {
      setter([]);
    }
  };

  const runSingle = async () => {
    if (!fromId || !toId) {
      setError('请选择起点和终点');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await shortestPath({ fromId: Number(fromId), toId: Number(toId), mode: weightMode });
      if (!res.data.success) {
        setError(res.data.message || '路线不可达');
      } else {
        setResult({ kind: 'algorithm', data: res.data.data });
      }
    } catch {
      setError('请求失败，请确认后端服务已启动');
    } finally {
      setLoading(false);
    }
  };

  const runMulti = async () => {
    const ids = waypoints.filter(Boolean).map(Number);
    if (ids.length < 2) {
      setError('请至少输入 2 个地点');
    try {
      const response = await autocompleteSpots(value.trim());
      setSuggests(response.data.data || []);
    } catch {
      setSuggests([]);
    }
  };

  const handleAmapKeywordChange = async (value, setter, setTips) => {
    setter(value);
    if (!value.trim()) {
      setTips([]);
      return;
    }

    try {
      const response = await amapPoiTips({ keywords: value.trim() });
      setTips(response.data.data || []);
    } catch {
      setTips([]);
    }
  };

  const handleRunSingle = async () => {
    if (!fromSpot?.id || !toSpot?.id) {
      setError('请先从联想结果中选择起点和终点');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await multiPointPath({ waypointIds: ids, mode: weightMode });
      if (!res.data.success) {
        setError(res.data.message || '多点路径规划失败');
      } else {
        setResult({ kind: 'algorithm', data: res.data.data });
      }
    } catch {
      setError('请求失败，请确认后端服务已启动');
      const response = await shortestPath({
        fromId: fromSpot.id,
        toId: toSpot.id,
        mode: weightMode,
      });
      if (!response.data.success) {
        setError(response.data.message || '路线计算失败');
        return;
      }

      setResult({
        source: 'algorithm',
        kind: 'single',
        payload: response.data.data,
      });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || '路线计算失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleRunMulti = async () => {
    if (waypoints.length < 2) {
      setError('多点路径至少需要选择 2 个点位');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await multiPointPath({
        waypointIds: waypoints.map((item) => item.id),
        mode: weightMode,
      });
      if (!response.data.success) {
        setError(response.data.message || '多点路径计算失败');
        return;
      }

      setResult({
        source: 'algorithm',
        kind: 'multi',
        payload: response.data.data,
      });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || '多点路径计算失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleRunAmap = async () => {
    if (!amapOrigin?.location || !amapDestination?.location) {
      setError('请先从高德联想结果中选择起点和终点');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await amapRoute({
        originLng: amapOrigin.location.lng,
        originLat: amapOrigin.location.lat,
        destLng: amapDestination.location.lng,
        destLat: amapDestination.location.lat,
        mode: travelMode,
      });

      setResult({
        source: 'amap',
        kind: 'amap',
        payload: response.data.data,
        origin: amapOrigin,
        destination: amapDestination,
      });
    } catch (requestError) {
      const message = requestError?.response?.data?.message || requestError?.message || '高德导航暂时不可用';
      setError(mapAmapRouteErrorMessage(message, travelMode));
    } finally {
      setLoading(false);
    }
  };

  const runAmapRoute = async () => {
    if (!amapOrigin?.location || !amapDestination?.location) {
      setError('请先从高德联想结果中选择起点和终点');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await amapRoute({
        originLng: amapOrigin.location.lng,
        originLat: amapOrigin.location.lat,
        destLng: amapDestination.location.lng,
        destLat: amapDestination.location.lat,
        mode: travelMode,
      });

      setResult({
        kind: 'amap',
        data: res.data.data,
        origin: amapOrigin,
        destination: amapDestination,
      });
    } catch (err) {
      setError(mapAmapRouteErrorMessage(err?.response?.data?.message, travelMode));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="section-title">路线规划</h1>
      <p className="section-sub">保留本地算法模式，同时接入高德真实导航模式</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {[
          ['algorithm', '本地算法模式'],
          ['amap', '高德导航模式'],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => {
              setPlannerMode(value);
              setError('');
              setResult(null);
            }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              plannerMode === value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {plannerMode === 'algorithm' ? (
        <>
          <div className="flex gap-2 mb-6">
            {[
              ['single', '单点最短路'],
              ['multi', '多点最短路'],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => {
                  setAlgoMode(value);
                  setResult(null);
                  setError('');
                }}
                className={`px-5 py-2 rounded-xl text-sm font-medium transition-colors ${
                  algoMode === value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
            <div className="ml-auto flex gap-2">
              {[
                ['distance', '最短距离'],
                ['time', '最短时间'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setWeightMode(value)}
                  className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
                    weightMode === value ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {algoMode === 'single' ? (
            <div className="card p-6 mb-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">起点</label>
                  <input
                    value={fromName}
                    onChange={(e) => {
                      setFromName(e.target.value);
                      searchLocalSuggests(e.target.value, setFromSuggests);
                    }}
                    placeholder="搜索本地景点名称"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  {fromSuggests.length > 0 && (
                    <SuggestPanel
                      items={fromSuggests}
                      onSelect={(item) => {
                        setFromId(item.id);
                        setFromName(item.name);
                        setFromSuggests([]);
                      }}
                    />
                  )}
                  {fromId && <p className="text-xs text-green-600 mt-1">已绑定 ID: {fromId}</p>}
                </div>

                <div className="relative">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">终点</label>
                  <input
                    value={toName}
                    onChange={(e) => {
                      setToName(e.target.value);
                      searchLocalSuggests(e.target.value, setToSuggests);
                    }}
                    placeholder="搜索本地景点名称"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  {toSuggests.length > 0 && (
                    <SuggestPanel
                      items={toSuggests}
                      onSelect={(item) => {
                        setToId(item.id);
                        setToName(item.name);
                        setToSuggests([]);
                      }}
                    />
                  )}
                  {toId && <p className="text-xs text-green-600 mt-1">已绑定 ID: {toId}</p>}
                </div>
              </div>

              <div className="mt-4 p-3 rounded-xl text-xs bg-blue-50 border border-blue-100 text-blue-700">
                <div className="font-semibold mb-2">快速示例</div>
                <div className="flex flex-wrap gap-2">
                  {ALGORITHM_EXAMPLES.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        setFromId(item.from);
                        setFromName(item.fromName);
                        setToId(item.to);
                        setToName(item.toName);
                        setError('');
                        setResult(null);
                      }}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-white border border-blue-200 text-blue-700"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={runSingle} disabled={loading} className="btn-primary w-full mt-4 text-base">
                {loading ? '计算中...' : '开始规划'}
              </button>
            </div>
          ) : (
            <div className="card p-6 mb-6">
              <p className="text-sm text-gray-500 mb-4">输入节点 ID，保留原有课程算法展示逻辑。</p>
              {waypoints.map((value, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    value={value}
                    onChange={(e) => {
                      const next = [...waypoints];
                      next[index] = e.target.value;
                      setWaypoints(next);
                    }}
                    placeholder={`节点 ${index + 1} ID`}
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  {waypoints.length > 2 && (
                    <button onClick={() => setWaypoints(waypoints.filter((_, i) => i !== index))} className="text-red-500 px-3">
                      删除
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => setWaypoints([...waypoints, ''])} className="text-blue-600 text-sm hover:underline mb-4">
                + 添加途经点
              </button>
              <button onClick={runMulti} disabled={loading} className="btn-primary w-full">
                {loading ? '计算中...' : '规划多点路线'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="grid lg:grid-cols-[420px,1fr] gap-6 mb-6">
          <div className="card p-6">
            <div className="space-y-4">
              <div className="relative">
                <label className="text-sm font-medium text-gray-700 mb-1 block">高德起点</label>
                <input
                  value={amapOriginName}
                  onChange={(e) => {
                    setAmapOriginName(e.target.value);
                    setAmapOrigin(null);
                    searchAmapTips(e.target.value, setAmapOriginTips);
                  }}
                  placeholder="搜索真实地点"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {amapOriginTips.length > 0 && (
                  <SuggestPanel
                    items={amapOriginTips}
                    onSelect={(item) => {
                      setAmapOriginName(item.name);
                      setAmapOrigin(item);
                      setAmapOriginTips([]);
                    }}
                    renderExtra={(item) => item.district || item.address}
                  />
                )}
              </div>

              <div className="relative">
                <label className="text-sm font-medium text-gray-700 mb-1 block">高德终点</label>
                <input
                  value={amapDestinationName}
                  onChange={(e) => {
                    setAmapDestinationName(e.target.value);
                    setAmapDestination(null);
                    searchAmapTips(e.target.value, setAmapDestinationTips);
                  }}
                  placeholder="搜索真实地点"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {amapDestinationTips.length > 0 && (
                  <SuggestPanel
                    items={amapDestinationTips}
                    onSelect={(item) => {
                      setAmapDestinationName(item.name);
                      setAmapDestination(item);
                      setAmapDestinationTips([]);
                    }}
                    renderExtra={(item) => item.district || item.address}
                  />
                )}
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">出行方式</div>
                <div className="flex flex-wrap gap-2">
                  {AMAP_TRAVEL_MODES.map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setTravelMode(value)}
                      className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
                        travelMode === value ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                高德模式会从联想结果中绑定真实坐标，再通过后端 `/api/amap/route` 调用真实导航。
              </div>

              <button onClick={runAmapRoute} disabled={loading} className="btn-primary w-full text-base">
                {loading ? '规划中...' : '开始真实导航'}
              </button>
  const addWaypoint = (spot) => {
    if (!spot?.id) return;
    setWaypoints((prev) => {
      if (prev.some((item) => item.id === spot.id)) return prev;
      return [...prev, spot];
    });
    setMultiKeyword('');
    setMultiSuggests([]);
  };

  const removeWaypoint = (spotId) => {
    setWaypoints((prev) => prev.filter((item) => item.id !== spotId));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="card p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Route Planner</div>
            <h1 className="mt-2 text-3xl font-black text-gray-900 md:text-4xl">{titleText}</h1>
            <p className="mt-3 text-sm text-gray-500 md:text-base">
              保留课程设计里的 Dijkstra / 多点路径算法，并接入你提供的北邮沙河校区地图做可视化导航。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {PLANNER_MODES.map((mode) => (
              <ModeButton
                key={mode.value}
                active={plannerMode === mode.value}
                onClick={() => {
                  setPlannerMode(mode.value);
                  setError('');
                }}
              >
                {mode.label}
              </ModeButton>
            ))}
          </div>
        </div>
      </section>

      {plannerMode === 'annotate' && <CampusMapAnnotator />}

      {plannerMode === 'campus' && <CampusNavigationMap />}

      {plannerMode === 'algorithm' && (
        <>
          <section className="card space-y-5 p-6">
            <div className="flex flex-wrap gap-2">
              {ALGO_MODE_OPTIONS.map((option) => (
                <ModeButton key={option.value} active={algoMode === option.value} onClick={() => setAlgoMode(option.value)}>
                  {option.label}
                </ModeButton>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {WEIGHT_MODE_OPTIONS.map((option) => (
                <ModeButton key={option.value} active={weightMode === option.value} onClick={() => setWeightMode(option.value)}>
                  {option.label}
                </ModeButton>
              ))}
            </div>

          <AmapRouteMap
            origin={amapOrigin}
            destination={amapDestination}
            polyline={result?.kind === 'amap' ? result.data.polyline : []}
          />
        </div>
      )}

      {/* 多点模式 */}
      {mode === 'multi' && (
        <div className="card p-6 mb-6">
          <p className="text-sm text-gray-500 mb-4">搜索景点名称，算法自动规划最优顺序（最近邻 + 2-opt）</p>
          {waypoints.map((w, i) => (
            <div key={i} className="relative flex gap-2 mb-2">
              <input
                value={waypointNames[i] || ''}
                onChange={e => {
                  const names = [...waypointNames]; names[i] = e.target.value; setWaypointNames(names);
                  const ids = [...waypoints]; ids[i] = ''; setWaypoints(ids);
                  searchSuggests(e.target.value, s => {
                    const sug = [...waypointSuggests]; sug[i] = s; setWaypointSuggests(sug);
                  });
                }}
                placeholder={`地点 ${i+1}（搜索名称）`}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {waypointSuggests[i]?.length > 0 && (
                <div className="absolute top-full left-0 right-8 bg-white border border-gray-100 rounded-xl shadow-lg z-20 mt-1">
                  {waypointSuggests[i].map(s => (
                    <button key={s.id} onClick={() => {
                      const ids=[...waypoints]; ids[i]=String(s.id); setWaypoints(ids);
                      const names=[...waypointNames]; names[i]=s.name; setWaypointNames(names);
                      const sug=[...waypointSuggests]; sug[i]=[]; setWaypointSuggests(sug);
                    }} className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 first:rounded-t-xl last:rounded-b-xl">
                      {s.name} <span className="text-gray-400 text-xs">{s.city}</span>
                    </button>
                  ))}
                </div>
              )}
              {waypoints[i] && <span className="text-xs text-green-600 absolute -bottom-4 left-4">✓ {waypointNames[i]}</span>}
              {waypoints.length > 2 && (
                <button onClick={() => {
                  setWaypoints(waypoints.filter((_,j)=>j!==i));
                  setWaypointNames(waypointNames.filter((_,j)=>j!==i));
                  setWaypointSuggests(waypointSuggests.filter((_,j)=>j!==i));
                }} className="text-red-400 hover:text-red-600 px-3">✕</button>
              )}
            </div>
          ))}
          <button onClick={() => {
            setWaypoints([...waypoints,'']);
            setWaypointNames([...waypointNames,'']);
            setWaypointSuggests([...waypointSuggests,[]]);
          }} className="text-blue-600 text-sm hover:underline mb-4 mt-5 block">
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
            {algoMode === 'single' ? (
              <div className="grid gap-4 md:grid-cols-2">
                <SearchField
                  label="起点"
                  value={fromKeyword}
                  onChange={(value) => handleLocalKeywordChange(value, setFromKeyword, setFromSuggests)}
                  placeholder="搜索景区、高校、城市..."
                  suggests={fromSuggests}
                  onSelect={(spot) => {
                    setFromSpot(spot);
                    setFromKeyword(renderLocalSpotLabel(spot));
                    setFromSuggests([]);
                  }}
                />
                <SearchField
                  label="终点"
                  value={toKeyword}
                  onChange={(value) => handleLocalKeywordChange(value, setToKeyword, setToSuggests)}
                  placeholder="选择要前往的本地点位"
                  suggests={toSuggests}
                  onSelect={(spot) => {
                    setToSpot(spot);
                    setToKeyword(renderLocalSpotLabel(spot));
                    setToSuggests([]);
                  }}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <SearchField
                  label="添加途经点"
                  value={multiKeyword}
                  onChange={(value) => handleLocalKeywordChange(value, setMultiKeyword, setMultiSuggests)}
                  placeholder="搜索后点击加入途经点列表"
                  suggests={multiSuggests}
                  onSelect={addWaypoint}
                />

                <div className="flex flex-wrap gap-2">
                  {waypoints.length === 0 ? (
                    <div className="text-sm text-gray-400">还没有添加途经点</div>
                  ) : (
                    waypoints.map((spot, index) => (
                      <button
                        key={spot.id}
                        type="button"
                        onClick={() => removeWaypoint(spot.id)}
                        className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-sm text-blue-700 hover:bg-blue-100"
                      >
                        <span>{index + 1}. {spot.name}</span>
                        <span className="text-blue-400">x</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={algoMode === 'single' ? handleRunSingle : handleRunMulti}
                className="btn-primary text-sm"
                disabled={loading}
              >
                {loading ? '正在计算...' : '开始路线计算'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setResult(null);
                }}
                className="btn-outline text-sm"
              >
                清空结果
              </button>
            </div>
          </section>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      {result?.kind === 'algorithm' && (
        <div className="card p-6 animate-slide-up">
          <h2 className="text-lg font-semibold mb-4">算法模式结果</h2>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <MetricCard
              value={
                result.data.totalDist != null
                  ? formatDist(result.data.totalDist)
                  : result.data.totalTime != null
                    ? formatDuration(result.data.totalTime * 60)
                    : formatDist(result.data.totalCost)
              }
              label={weightMode === 'distance' ? '总距离' : '总时间'}
            />
            <MetricCard value={result.data.path?.length || 0} label="途经节点" />
            <MetricCard value={result.data.algorithm} label="使用算法" />
          </div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">途经路径</h3>
          <div className="flex flex-wrap gap-2">
            {(result.data.pathSpots || []).map((spot, index) => (
              <div key={`${spot.id}-${index}`} className="flex items-center gap-1">
                <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full">{spot.name || `节点${spot.id}`}</span>
                {index < result.data.pathSpots.length - 1 && <span className="text-gray-400 text-xs">→</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {result?.kind === 'amap' && (
        <div className="card p-6 animate-slide-up">
          <h2 className="text-lg font-semibold mb-4">高德导航结果</h2>
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <MetricCard value={formatDist(result.data.distance || 0)} label="路线距离" />
            <MetricCard value={formatDuration(result.data.duration || 0)} label="预计时间" />
            <MetricCard value={travelModeLabel(travelMode)} label="出行方式" />
            <MetricCard value={`${result.data.steps?.length || 0} 步`} label="导航步骤" />
          </div>
          <div className="space-y-3">
            {(result.data.steps || []).slice(0, 8).map((step, index) => (
              <div key={index} className="rounded-xl border border-gray-200 px-4 py-3">
                <div className="text-sm font-medium text-gray-900">{index + 1}. {step.instruction}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatDist(step.distance || 0)} · {formatDuration(step.duration || 0)}
          {result?.source === 'algorithm' && (
            <AlgorithmResult result={result} weightMode={weightMode} />
          )}
        </>
      )}

      {plannerMode === 'amap' && (
        <>
          <section className="card space-y-5 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <SearchField
                label="起点"
                value={amapOriginKeyword}
                onChange={(value) => handleAmapKeywordChange(value, setAmapOriginKeyword, setAmapOriginTips)}
                placeholder="输入真实地点，使用高德联想"
                suggests={amapOriginTips}
                mode="amap"
                onSelect={(item) => {
                  setAmapOrigin(item);
                  setAmapOriginKeyword(renderAmapLabel(item));
                  setAmapOriginTips([]);
                }}
              />
              <SearchField
                label="终点"
                value={amapDestinationKeyword}
                onChange={(value) => handleAmapKeywordChange(value, setAmapDestinationKeyword, setAmapDestinationTips)}
                placeholder="例如：清华大学、故宫博物院"
                suggests={amapDestinationTips}
                mode="amap"
                onSelect={(item) => {
                  setAmapDestination(item);
                  setAmapDestinationKeyword(renderAmapLabel(item));
                  setAmapDestinationTips([]);
                }}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {TRAVEL_MODE_OPTIONS.map((option) => (
                <ModeButton key={option.value} active={travelMode === option.value} onClick={() => setTravelMode(option.value)}>
                  {option.label}
                </ModeButton>
              ))}
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              高德模式会从联想结果中绑定真实坐标，再通过后端 `/api/amap/route` 调用真实导航。
            </div>

            <button type="button" onClick={handleRunAmap} className="btn-primary w-full text-base" disabled={loading}>
              {loading ? '正在请求真实导航...' : '开始真实导航'}
            </button>
          </section>

          <section className="space-y-6">
            <AmapRouteMap
              origin={amapOrigin}
              destination={amapDestination}
              polyline={result?.source === 'amap' ? result.payload.polyline : []}
              height={360}
            />

            {result?.source === 'amap' && (
              <div className="card p-6">
                <h2 className="text-2xl font-bold text-gray-900">高德导航结果</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <MetricCard value={formatDistance(result.payload.distance)} label="路线距离" />
                  <MetricCard value={formatDuration(result.payload.duration)} label="预计时间" />
                  <MetricCard value={MODE_BADGES[result.payload.mode] || '导航'} label="出行方式" />
                  <MetricCard value={`${result.payload.steps?.length || 0} 步`} label="导航步骤" />
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}

function SuggestPanel({ items, onSelect, renderExtra }) {
  return (
    <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-lg z-20 mt-1 max-h-64 overflow-auto">
      {items.map((item, index) => (
        <button
          key={`${item.id || item.name}-${index}`}
          onClick={() => onSelect(item)}
          className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 first:rounded-t-xl last:rounded-b-xl"
        >
          <div className="font-medium text-gray-800">{item.name}</div>
          <div className="text-xs text-gray-400">{renderExtra ? renderExtra(item) : item.city}</div>
        </button>
      ))}
    </div>
  );
}

function MetricCard({ value, label }) {
  return (
    <div className="bg-blue-50 rounded-xl p-3 text-center">
      <div className="text-xl font-bold text-blue-600">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
function AlgorithmResult({ result, weightMode }) {
  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">算法规划结果</h2>
          <p className="mt-1 text-sm text-gray-500">{result.payload.algorithm || 'Dijkstra 路线规划'}</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600">
          {weightMode === 'distance' ? '按距离优化' : '按时间优化'}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard value={formatDistance(result.payload.totalDist ?? result.payload.totalCost)} label="路线距离" />
        <MetricCard value={formatDuration(result.payload.totalTime)} label="预计时间" />
        <MetricCard value={`${result.payload.path?.length || 0} 个`} label="经过节点" />
        <MetricCard value={result.kind === 'multi' ? '多点' : '单点'} label="规划类型" />
      </div>

      <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-4">
        <div className="mb-3 text-sm font-medium text-gray-700">路径节点</div>
        <div className="flex flex-wrap gap-2">
          {(result.payload.pathSpots || []).map((spot, index) => (
            <span key={`${spot.id}-${index}`} className="rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
              {index + 1}. {spot.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function SearchField({ label, value, onChange, placeholder, suggests, onSelect, mode = 'local' }) {
  return (
    <div className="relative space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <SuggestPanel items={suggests} onSelect={onSelect} mode={mode} />
    </div>
  );
}

function buildAmapQueryPoint(searchParams, prefix, fallbackNameKey) {
  const lng = searchParams.get(`${prefix}Lng`);
  const lat = searchParams.get(`${prefix}Lat`);
  const name = searchParams.get(`${prefix}Name`) || searchParams.get(fallbackNameKey) || '';
  if (!lng || !lat) return null;
  return {
    id: `${prefix}-${lng}-${lat}`,
    name,
function buildLocalSpotFromQuery(searchParams, prefix) {
  const id = searchParams.get(prefix);
  if (!id) return null;

  return {
    id: Number(id),
    name: searchParams.get(`${prefix}Name`) || `点位 ${id}`,
    city: '',
    type: '',
  };
}

function buildInitialWaypoints(searchParams) {
  const from = buildLocalSpotFromQuery(searchParams, 'from');
  const to = buildLocalSpotFromQuery(searchParams, 'to');
  return [from, to].filter(Boolean);
}

function buildAmapSpotFromQuery(searchParams, prefix) {
  const lng = searchParams.get(`${prefix}Lng`);
  const lat = searchParams.get(`${prefix}Lat`);
  const name = searchParams.get(`${prefix}Name`);

  if (!lng || !lat) return null;

  return {
    id: `${prefix}-${lng}-${lat}`,
    name: name || '已选地点',
    district: '',
    address: '',
    location: {
      lng: Number(lng),
      lat: Number(lat),
    },
  };
}

function travelModeLabel(mode) {
  return Object.fromEntries(AMAP_TRAVEL_MODES)[mode] || mode;
}

function formatDist(value) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${value} m`;
}

function formatDuration(seconds) {
  const mins = Math.round(seconds / 60);
  if (mins >= 60) return `${Math.floor(mins / 60)} 小时 ${mins % 60} 分`;
  return `${mins} 分钟`;
}

function mapAmapRouteErrorMessage(message, mode) {
  if (!message) return '高德导航请求失败，请稍后再试';
  if (message.includes('MISSING_REQUIRED_PARAMS')) {
    return mode === 'transit'
      ? '当前这组起终点暂不支持公交方案，请改用步行、驾车或骑行模式'
      : '当前路线方式所需参数不完整，请重新选择起点和终点';
  }
  return message;
}
function buildAmapFallbackFromLocal(searchParams, prefix) {
  const lng = searchParams.get(`${prefix}Lng`);
  const lat = searchParams.get(`${prefix}Lat`);
  const name = searchParams.get(`${prefix}Name`);
  if (!lng || !lat) return null;

  return {
    id: `${prefix}-${lng}-${lat}`,
    name: name || '已选地点',
    district: '',
    address: '',
    location: {
      lng: Number(lng),
      lat: Number(lat),
    },
  };
}

function renderLocalSpotLabel(spot) {
  return [spot?.name, spot?.city].filter(Boolean).join(' · ');
}

function renderAmapLabel(item) {
  return [item?.name, item?.district || item?.address].filter(Boolean).join(' · ');
}

function formatDistance(distance) {
  const value = Number(distance || 0);
  if (value <= 0) return '0 m';
  if (value < 1000) return `${Math.round(value)} m`;
  return `${(value / 1000).toFixed(1)} km`;
}

function formatDuration(duration) {
  const seconds = Number(duration || 0);
  if (seconds <= 0) return '0 分钟';

  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} 分钟`;

  const hours = Math.floor(minutes / 60);
  const remain = minutes % 60;
  return remain > 0 ? `${hours} 小时 ${remain} 分钟` : `${hours} 小时`;
}

function mapAmapRouteErrorMessage(message, mode) {
  if (message.includes('MISSING_REQUIRED_PARAMS')) {
    if (mode === 'transit') {
      return '当前这组起终点暂不支持公交方案，请改用步行、驾车或骑行模式';
    }
    return '当前路线方式所需参数不完整，请重新选择起点和终点';
  }

  if (message.includes('参数不完整') && mode === 'transit') {
    return '当前这组起终点暂不支持公交方案，请改用步行、驾车或骑行模式';
  }

  return message;
}

function ModeButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
        active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  );
}

function MetricCard({ value, label }) {
  return (
    <div className="rounded-2xl bg-blue-50 px-4 py-6 text-center">
      <div className="text-3xl font-black text-blue-600">{value}</div>
      <div className="mt-2 text-sm text-gray-500">{label}</div>
    </div>
  );
}

function SuggestPanel({ items, onSelect, mode = 'local' }) {
  if (!items?.length) return null;

  return (
    <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
      {items.map((item) => (
        <button
          key={`${mode}-${item.id}-${item.name}`}
          type="button"
          onClick={() => onSelect(item)}
          className="block w-full border-b border-gray-100 px-4 py-3 text-left last:border-b-0 hover:bg-gray-50"
        >
          <div className="text-sm font-medium text-gray-900">{item.name}</div>
          <div className="mt-1 text-xs text-gray-500">
            {mode === 'local'
              ? [item.city, item.type].filter(Boolean).join(' · ')
              : [item.district, item.address].filter(Boolean).join(' · ')}
          </div>
        </button>
      ))}
    </div>
  );
}
