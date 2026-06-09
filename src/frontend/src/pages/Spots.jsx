import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getSpots, searchSpots, amapPoiSearch, autocompleteSpots } from '../api/index.js';
import SpotCard from '../components/SpotCard.jsx';

const CITIES = ['全部', '北京', '上海', '杭州', '成都', '西安', '云南', '广州', '武汉', '南京'];
const TYPES = [
  { value: '', label: '全部' },
  { value: 'scenic', label: '景区' },
  { value: 'campus', label: '高校' },
  { value: 'restaurant', label: '餐厅' },
  { value: 'hotel', label: '酒店' },
  { value: 'mall', label: '商场' },
];

export default function Spots() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [spots, setSpots] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [offset, setOffset] = useState(0);
  const [dataSource, setDataSource] = useState('local');
  const [suggests, setSuggests] = useState([]);
  const [showSuggests, setShowSuggests] = useState(false);
  const suggestTimer = useRef(null);
  const searchBoxRef = useRef(null);

  const city = searchParams.get('city') || '';
  const type = searchParams.get('type') || '';
  const LIMIT = 16;

  useEffect(() => {
    setLoading(true);
    setOffset(0);

    if (dataSource === 'amap') {
      setSpots([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    const params = { limit: LIMIT, offset: 0 };
    if (city) params.city = city;
    if (type) params.type = type;

    getSpots(params)
      .then((res) => {
        setSpots(res.data.data || []);
        setTotal(res.data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [city, dataSource, type]);

  const handleSearchQChange = (value) => {
    setSearchQ(value);
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (!value.trim() || dataSource === 'amap') { setSuggests([]); setShowSuggests(false); return; }
    suggestTimer.current = setTimeout(async () => {
      try {
        const res = await autocompleteSpots(value.trim());
        const items = res.data.data || [];
        setSuggests(items);
        setShowSuggests(items.length > 0);
      } catch { setSuggests([]); }
    }, 200);
  };

  const handleSuggestSelect = (item) => {
    setSearchQ(item.name);
    setSuggests([]); setShowSuggests(false);
    setLoading(true);
    searchSpots({ q: item.name, mode: 'prefix' })
      .then(res => { setSpots(res.data.data || []); setTotal(res.data.data?.length || 0); })
      .finally(() => setLoading(false));
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    setSuggests([]); setShowSuggests(false);
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
      } else {
        const res = await searchSpots({ q: searchQ, mode: 'prefix' });
        setSpots(res.data.data || []);
        setTotal(res.data.data?.length || 0);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    const newOffset = offset + LIMIT;
    const params = { limit: LIMIT, offset: newOffset };
    if (city) params.city = city;
    if (type) params.type = type;

    const res = await getSpots(params);
    setSpots((prev) => [...prev, ...(res.data.data || [])]);
    setOffset(newOffset);
  };

  const resetFilters = () => {
    setSearchQ('');
    setSearchParams({});
    if (dataSource === 'amap') {
      setSpots([]);
      setTotal(0);
    }
  };

  return (
    <div className="glass-bg">
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="section-title">发现景点与高校</h1>
      <p className="section-sub">
        {dataSource === 'local'
          ? `共 ${total} 个本地点位，支持 Trie 前缀搜索 / 全文检索 / 模糊匹配`
          : '切换到高德实时模式后，可搜索真实景点、餐饮、酒店和周边设施'}
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {[
          ['local', '本地算法数据'],
          ['amap', '高德实时搜索'],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => {
              setDataSource(value);
              setSearchQ('');
            }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              dataSource === value ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 border border-gray-200'
            }`}
            style={dataSource === value ? { background: 'linear-gradient(135deg,#f59e0b,#f97316)', backdropFilter: 'none' } : { background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)' }}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div ref={searchBoxRef} style={{ flex: 1, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: '0 16px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.3 }}>
              <circle cx="11" cy="11" r="7" stroke="#000" strokeWidth="2.2"/>
              <path d="M16.5 16.5L21 21" stroke="#000" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              value={searchQ}
              onChange={(e) => handleSearchQChange(e.target.value)}
              onBlur={() => setTimeout(() => setShowSuggests(false), 150)}
              onFocus={() => suggests.length > 0 && setShowSuggests(true)}
              placeholder={dataSource === 'local' ? '搜索景点名称、城市... (Trie实时联想)' : '搜索真实景点、餐饮、酒店...'}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '0.88rem', color: '#1d1d1f', padding: '11px 0', fontFamily: 'Inter, sans-serif' }}
            />
          </div>
          {showSuggests && suggests.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, marginTop: 4,
              background: '#fff', borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden',
            }}>
              <div style={{ padding: '6px 12px 4px', fontSize: '0.7rem', color: '#aeaeb2', fontFamily: 'Inter, sans-serif', letterSpacing: '0.05em' }}>
                Trie 前缀联想
              </div>
              {suggests.map(item => (
                <button key={item.id} type="button" onMouseDown={() => handleSuggestSelect(item)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px',
                  background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(249,115,22,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <span style={{ fontSize: '0.85rem', color: '#1d1d1f', fontFamily: 'Inter, sans-serif' }}>{item.name}</span>
                  <span style={{ fontSize: '0.72rem', color: '#aeaeb2', marginLeft: 'auto', fontFamily: 'Inter, sans-serif' }}>{item.city} · {item.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button style={{ padding: '0 18px', background: 'linear-gradient(135deg,#f59e0b,#f97316)', color: '#fff', border: 'none', borderRadius: 12, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>搜索</button>
        <button type="button" onClick={resetFilters} style={{ padding: '0 14px', background: 'rgba(255,255,255,0.7)', color: '#86868b', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 12, fontSize: '0.85rem', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>清除</button>
      </form>

      <div className="flex flex-wrap gap-2 mb-4">
        {CITIES.map((item) => (
          <button
            key={item}
            onClick={() => setSearchParams(item === '全部' ? {} : { city: item, ...(type ? { type } : {}) })}
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

      <div className="flex flex-wrap gap-2 mb-6">
        {TYPES.map((item) => (
          <button
            key={item.value}
            onClick={() => setSearchParams({ ...(city ? { city } : {}), ...(item.value ? { type: item.value } : {}) })}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              type === item.value ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
            style={type === item.value
              ? { background: 'linear-gradient(135deg,#f59e0b,#f97316)' }
              : { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(10px)', border: '1px solid rgba(0,0,0,0.08)' }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {dataSource === 'amap' && (
        <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          高德模式返回的是实时 POI 结果，不会覆盖本地数据库数据。你可以先搜一个真实地点，再切到路线页继续做真实导航。
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="glass-card h-52 animate-pulse bg-gray-200" />)}
        </div>
      ) : spots.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-3">📭</div>
          <p>没有找到相关地点</p>
        </div>
      ) : dataSource === 'local' ? (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gridAutoRows: '160px',
            gap: 14,
          }}>
            {spots.map((spot, i) => (
              <SpotCard key={spot.id} spot={spot} index={i} animDelay={Math.min(i, 8) * 40} />
            ))}
          </div>
          {spots.length < total && (
            <div className="text-center mt-8">
              <button onClick={loadMore} className="btn-outline">加载更多</button>
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
