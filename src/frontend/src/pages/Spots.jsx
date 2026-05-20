import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getSpots, searchSpots, amapPoiSearch } from '../api/index.js';
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

  const handleSearch = async (event) => {
    event.preventDefault();
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
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              dataSource === value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder={dataSource === 'local' ? '搜索景点名称、城市...' : '搜索真实景点、餐饮、酒店...'}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button className="btn-primary text-sm">搜索</button>
        <button type="button" onClick={resetFilters} className="btn-outline text-sm">清除</button>
      </form>

      <div className="flex flex-wrap gap-2 mb-4">
        {CITIES.map((item) => (
          <button
            key={item}
            onClick={() => setSearchParams(item === '全部' ? {} : { city: item, ...(type ? { type } : {}) })}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              (item === '全部' && !city) || item === city ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
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
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              type === item.value ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
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
          {[...Array(8)].map((_, i) => <div key={i} className="card h-52 animate-pulse bg-gray-200" />)}
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
            <div key={spot.id} className="card p-5">
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
  );
}
