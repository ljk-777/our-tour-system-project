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
import MapWorkspace from './MapWorkspace.jsx';

const PLANNER_MODES = [
  { value: 'workspace', label: '地图工作台' },
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

  const [plannerMode, setPlannerMode] = useState('workspace');
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
    if (plannerMode === 'workspace') return '地图工作台';
    if (plannerMode === 'amap') return '真实导航模式';
    return algoMode === 'multi' ? '多点路线规划' : '最短路径规划';
  }, [algoMode, plannerMode]);

  const handleLocalKeywordChange = async (value, setter, setSuggests) => {
    setter(value);
    if (!value.trim()) {
      setSuggests([]);
      return;
    }

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
              上传地图图片、一键识别道路、编辑路网、Dijkstra 导航 — 一站式地图工作台。
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

      {plannerMode === 'workspace' && <MapWorkspace />}

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
