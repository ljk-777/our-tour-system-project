import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowDownUp,
  Compass,
  GraduationCap,
  Heart,
  Landmark,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
} from 'lucide-react';
import { amapPoiSearch, autocompleteSpots, recommendForYou, recommendSpots, searchSpots } from '../api/index.js';
import SpotCard from '../components/SpotCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const CITIES = ['全部', '北京', '上海', '杭州', '成都', '西安', '云南', '广州', '武汉', '南京'];
const TYPES = [
  { value: 'all', label: '全部', icon: Compass },
  { value: 'scenic', label: '景点', icon: Landmark },
  { value: 'campus', label: '学校', icon: GraduationCap },
];
const SORT_OPTIONS = [
  { key: 'popularity', label: '热度', icon: SlidersHorizontal },
  { key: 'rating', label: '评价', icon: Star },
  { key: 'interest', label: '兴趣', icon: Heart },
];
const INTERESTS = ['历史', '文化', '自然', '高校', '博物馆', '古镇', '夜景', '园林', '美食', '亲子', '工科', '艺术'];

const LIMIT = 16;

export default function Spots() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [spots, setSpots] = useState([]);
  const [total, setTotal] = useState(0);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [dataSource, setDataSource] = useState('local');
  const [suggests, setSuggests] = useState([]);
  const [showSuggests, setShowSuggests] = useState(false);
  const [sortBy, setSortBy] = useState('popularity');
  const [interests, setInterests] = useState(['历史', '自然']);
  const [visibleCount, setVisibleCount] = useState(LIMIT);
  const [forYou, setForYou] = useState([]);
  const [forYouTags, setForYouTags] = useState([]);
  const [forYouPersonalized, setForYouPersonalized] = useState(false);
  const suggestTimer = useRef(null);
  const searchBoxRef = useRef(null);

  const city = searchParams.get('city') || '';
  const type = searchParams.get('type') || 'all';

  useEffect(() => {
    if (dataSource !== 'local') {
      setLoading(false);
      return;
    }
    loadRecommendations();
  }, [city, type, sortBy, interests, dataSource]);

  const visibleSpots = useMemo(() => spots.slice(0, visibleCount), [spots, visibleCount]);
  const hasMore = visibleCount < spots.length;

  async function loadRecommendations() {
    setLoading(true);
    setVisibleCount(LIMIT);
    try {
      const params = {
        type,
        sortBy,
        limit: 10,
        includeAll: true,
      };
      if (city) params.city = city;
      if (sortBy === 'interest') params.interests = interests.join(',');

      const res = await recommendSpots(params);
      const list = res.data.data || [];
      setSpots(list);
      setTotal(res.data.totalCandidates || list.length);
      setMeta(res.data);
    } finally {
      setLoading(false);
    }
  }

  function updateCity(nextCity) {
    setSearchParams({
      ...(nextCity && nextCity !== '全部' ? { city: nextCity } : {}),
      ...(type && type !== 'all' ? { type } : {}),
    });
  }

  function updateType(nextType) {
    setSearchParams({
      ...(city ? { city } : {}),
      ...(nextType && nextType !== 'all' ? { type: nextType } : {}),
    });
  }

  function toggleInterest(value) {
    setInterests((current) => {
      if (current.includes(value)) return current.filter((item) => item !== value);
      return [...current, value].slice(-5);
    });
    setSortBy('interest');
  }

  useEffect(() => {
    if (!user) {
      setForYou([]);
      setForYouTags([]);
      setForYouPersonalized(false);
      return;
    }
    recommendForYou({ limit: 4 })
      .then((res) => {
        setForYou(res.data.data || []);
        setForYouTags(res.data.preferredTags || []);
        setForYouPersonalized(!!res.data.personalized);
      })
      .catch(() => {
        setForYou([]);
        setForYouTags([]);
        setForYouPersonalized(false);
      });
  }, [user]);

  const handleSearchQChange = (value) => {
    setSearchQ(value);
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (!value.trim() || dataSource === 'amap') {
      setSuggests([]);
      setShowSuggests(false);
      return;
    }
    suggestTimer.current = setTimeout(async () => {
      try {
        const res = await autocompleteSpots(value.trim());
        const items = (res.data.data || []).filter((item) => ['scenic', 'campus'].includes(item.type));
        setSuggests(items);
        setShowSuggests(items.length > 0);
      } catch {
        setSuggests([]);
      }
    }, 200);
  };

  const handleSuggestSelect = (item) => {
    setSearchQ(item.name);
    setSuggests([]);
    setShowSuggests(false);
    setLoading(true);
    searchSpots({ q: item.name, mode: 'prefix' })
      .then((res) => {
        const list = (res.data.data || []).filter((spot) => ['scenic', 'campus'].includes(spot.type));
        setSpots(list);
        setTotal(list.length);
        setMeta({ algorithm: 'Trie prefix search', rankedCount: list.length, totalCandidates: list.length });
        setVisibleCount(LIMIT);
      })
      .finally(() => setLoading(false));
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    setSuggests([]);
    setShowSuggests(false);
    if (!searchQ.trim()) return;

    setLoading(true);
    try {
      if (dataSource === 'amap') {
        const res = await amapPoiSearch({
          keywords: searchQ,
          city,
          pageSize: 12,
        });
        setSpots(res.data.data || []);
        setTotal(res.data.data?.length || 0);
        setMeta({ algorithm: 'Amap POI search' });
      } else {
        const res = await searchSpots({ q: searchQ, mode: 'prefix' });
        const list = (res.data.data || []).filter((spot) => ['scenic', 'campus'].includes(spot.type));
        setSpots(list);
        setTotal(list.length);
        setMeta({ algorithm: 'Trie prefix search', rankedCount: list.length, totalCandidates: list.length });
      }
      setVisibleCount(LIMIT);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setSearchQ('');
    setSearchParams({});
    setSortBy('popularity');
    setInterests(['历史', '自然']);
    if (dataSource === 'amap') {
      setSpots([]);
      setTotal(0);
      setMeta(null);
    }
  };

  return (
    <div className="glass-bg">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 border border-white/70 text-xs font-semibold text-orange-600 mb-4">
            <Sparkles size={14} />
            MinHeap TopK · O(N log K)
          </div>
          <h1 className="section-title">景点与学校推荐</h1>
          <p className="section-sub">
            按旅游热度、评价和个人兴趣推荐景点/学校，默认先排出前 10 个推荐项，更多内容继续保持同一排序逻辑。
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {[
            ['local', '本地推荐算法'],
            ['amap', '高德实时搜索'],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => {
                setDataSource(value);
                setSearchQ('');
                if (value === 'amap') {
                  setSpots([]);
                  setTotal(0);
                  setMeta(null);
                }
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                dataSource === value ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 border border-gray-200'
              }`}
              style={
                dataSource === value
                  ? { background: 'linear-gradient(135deg,#f59e0b,#f97316)', backdropFilter: 'none' }
                  : { background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)' }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {user && forYou.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1d1d1f', fontFamily: 'Inter, sans-serif' }}>
                鉁? 涓轰綘鎺ㄨ崘
              </span>
              <span style={{ fontSize: '0.72rem', color: '#9aa0a6', fontFamily: 'Inter, sans-serif' }}>
                {forYouPersonalized
                  ? `鍩轰簬浣犳敹钘忕殑 ${forYouTags.slice(0, 3).join('銆?) || '鏅偣'} 鍋忓ソ 路 MinHeap TopK`
                  : '鐑棬绮鹃€? 路 MinHeap TopK'}
              </span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gridAutoRows: '160px',
                gap: 14,
              }}
            >
              {forYou.map((spot, i) => (
                <SpotCard key={spot.id} spot={spot} index={i} animDelay={i * 40} />
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <div ref={searchBoxRef} style={{ flex: 1, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: '0 16px' }}>
              <Search size={16} color="#64748b" />
              <input
                type="text"
                value={searchQ}
                onChange={(e) => handleSearchQChange(e.target.value)}
                onBlur={() => setTimeout(() => setShowSuggests(false), 150)}
                onFocus={() => suggests.length > 0 && setShowSuggests(true)}
                placeholder={dataSource === 'local' ? '搜索景点、学校、城市...（Trie 联想）' : '搜索真实景点、学校或周边 POI...'}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '0.88rem', color: '#1d1d1f', padding: '11px 0', fontFamily: 'Inter, sans-serif' }}
              />
            </div>
            {showSuggests && suggests.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, marginTop: 4,
                background: '#fff', borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden',
              }}>
                <div style={{ padding: '6px 12px 4px', fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'Inter, sans-serif', letterSpacing: '0.05em' }}>
                  Trie 前缀联想
                </div>
                {suggests.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onMouseDown={() => handleSuggestSelect(item)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px',
                      background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', color: '#1d1d1f', fontFamily: 'Inter, sans-serif' }}>{item.name}</span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: 'auto', fontFamily: 'Inter, sans-serif' }}>
                      {item.city} · {item.type === 'campus' ? '学校' : '景点'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button style={{ padding: '0 18px', background: 'linear-gradient(135deg,#f59e0b,#f97316)', color: '#fff', border: 'none', borderRadius: 12, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>搜索</button>
          <button type="button" onClick={resetFilters} style={{ padding: '0 14px', background: 'rgba(255,255,255,0.7)', color: '#64748b', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 12, fontSize: '0.85rem', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>清除</button>
        </form>

        {dataSource === 'local' && (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              {SORT_OPTIONS.map(({ key, label, icon: Icon }) => {
                const active = sortBy === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSortBy(key)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                      active ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
                    }`}
                    style={active
                      ? { background: 'linear-gradient(135deg,#2563eb,#0ea5e9)' }
                      : { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(10px)', border: '1px solid rgba(0,0,0,0.08)' }}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                );
              })}
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 px-2">
                <ArrowDownUp size={14} />
                前 10 使用堆排序
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {INTERESTS.map((item) => {
                const active = interests.includes(item);
                return (
                  <button
                    key={item}
                    onClick={() => toggleInterest(item)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      active ? 'text-orange-700' : 'text-gray-500 hover:text-gray-800'
                    }`}
                    style={active
                      ? { background: '#fff7ed', border: '1px solid #fed7aa' }
                      : { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(10px)', border: '1px solid rgba(0,0,0,0.08)' }}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          {CITIES.map((item) => (
            <button
              key={item}
              onClick={() => updateCity(item)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                (item === '全部' && !city) || item === city ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
              style={(item === '全部' && !city) || item === city
                ? { background: 'linear-gradient(135deg,#f59e0b,#f97316)' }
                : { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(10px)', border: '1px solid rgba(0,0,0,0.08)' }}
            >
              {item}
            </button>
          ))}
        </div>

        {dataSource === 'local' && (
          <div className="flex flex-wrap gap-2 mb-6">
            {TYPES.map(({ value, label, icon: Icon }) => {
              const active = type === value || (!searchParams.get('type') && value === 'all');
              return (
                <button
                  key={value}
                  onClick={() => updateType(value)}
                  className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    active ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
                  }`}
                  style={active
                    ? { background: 'linear-gradient(135deg,#f59e0b,#f97316)' }
                    : { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(10px)', border: '1px solid rgba(0,0,0,0.08)' }}
                >
                  <Icon size={14} />
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {dataSource === 'amap' && (
          <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            高德模式返回实时 POI 结果，不覆盖本地数据库；本地推荐算法只作用于数据库中的景点和学校。
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center justify-end gap-3 text-sm text-gray-500">
          <span>{meta?.algorithm || (dataSource === 'local' ? 'MinHeap TopK O(N log K)' : 'Amap POI search')}</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="glass-card h-52 animate-pulse bg-gray-200" />)}
          </div>
        ) : spots.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-3">⌕</div>
            <p>没有找到相关景点或学校</p>
          </div>
        ) : dataSource === 'local' ? (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gridAutoRows: '160px',
              gap: 14,
            }}>
              {visibleSpots.map((spot, i) => (
                <SpotCard key={spot.id} spot={spot} index={i} animDelay={Math.min(i, 8) * 40} />
              ))}
            </div>
            {hasMore && (
              <div className="text-center mt-8">
                <button onClick={() => setVisibleCount((count) => Math.min(count + LIMIT, spots.length))} className="btn-outline">
                  加载更多
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {spots.map((spot) => (
              <div key={spot.id} className="glass-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{spot.name}</div>
                    <div className="text-sm text-gray-500 mt-1">{spot.type || '高德 POI'}</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600">实时</span>
                </div>
                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <div>城市：<span className="text-gray-800">{spot.city || '未知'}</span></div>
                  <div>区域：<span className="text-gray-800">{spot.district || '未知'}</span></div>
                  <div>地址：<span className="text-gray-800">{spot.address || '暂无地址'}</span></div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link
                    to={`/route?amapToName=${encodeURIComponent(spot.name)}&amapToLng=${spot.location?.lng || ''}&amapToLat=${spot.location?.lat || ''}`}
                    className="btn-primary text-sm flex-1 text-center"
                  >
                    设为目的地
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      const nextQuery = `${spot.name} ${spot.city || ''}`.trim();
                      setSearchQ(nextQuery);
                    }}
                    className="btn-outline text-sm"
                  >
                    再搜附近
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
