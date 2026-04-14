import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getSpots, searchSpots } from '../api/index.js';
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

  const city = searchParams.get('city') || '';
  const type = searchParams.get('type') || '';
  const LIMIT = 16;

  useEffect(() => {
    setLoading(true);
    setOffset(0);
    const params = { limit: LIMIT, offset: 0 };
    if (city) params.city = city;
    if (type) params.type = type;
    getSpots(params).then(res => {
      setSpots(res.data.data || []);
      setTotal(res.data.total || 0);
    }).finally(() => setLoading(false));
  }, [city, type]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQ.trim()) return;
    setLoading(true);
    try {
      const res = await searchSpots({ q: searchQ, mode: 'prefix' });
      setSpots(res.data.data || []);
      setTotal(res.data.data?.length || 0);
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
    setSpots(prev => [...prev, ...(res.data.data || [])]);
    setOffset(newOffset);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="section-title">发现景点与高校</h1>
      <p className="section-sub">共 {total} 个地点 · 支持 Trie 前缀搜索 / 全文检索 / 模糊匹配</p>

      {/* 搜索 */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={searchQ}
          onChange={e => setSearchQ(e.target.value)}
          placeholder="搜索景点名称、城市..."
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button className="btn-primary text-sm">搜索</button>
        <button type="button" onClick={() => { setSearchQ(''); setSearchParams({}); }}
          className="btn-outline text-sm">清除</button>
      </form>

      {/* 城市筛选 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {CITIES.map(c => (
          <button key={c}
            onClick={() => setSearchParams(c === '全部' ? {} : { city: c, ...(type ? { type } : {}) })}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              (c === '全部' && !city) || c === city
                ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>{c}</button>
        ))}
      </div>

      {/* 类型筛选 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TYPES.map(t => (
          <button key={t.value}
            onClick={() => setSearchParams({ ...(city ? { city } : {}), ...(t.value ? { type: t.value } : {}) })}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              type === t.value ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>{t.label}</button>
        ))}
      </div>

      {/* 景点列表 */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="card h-52 animate-pulse bg-gray-200" />)}
        </div>
      ) : spots.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-3">🔍</div>
          <p>没有找到相关地点</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {spots.map(s => <SpotCard key={s.id} spot={s} />)}
          </div>
          {spots.length < total && (
            <div className="text-center mt-8">
              <button onClick={loadMore} className="btn-outline">加载更多</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
