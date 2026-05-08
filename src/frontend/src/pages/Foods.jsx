import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getSpots, searchSpots } from '../api/index.js';

const CITIES = ['全部', '北京', '上海', '成都', '西安', '杭州', '重庆', '桂林', '昆明', '丽江', '南京'];
const TAGS   = ['全部', '老字号', '必吃', '火锅', '面食', '小吃', '海鲜', '网红', '清真'];

const CITY_EMOJI = { 北京:'🏛️', 上海:'🌆', 成都:'🐼', 西安:'🏯', 杭州:'🌊', 重庆:'🌶️', 桂林:'🗻', 昆明:'☀️', 丽江:'🏔️', 南京:'🦆' };

export default function Foods() {
  const [searchParams] = useSearchParams();
  const [foods,    setFoods]    = useState([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [city,     setCity]     = useState(searchParams.get('city') || '全部');
  const [tagFilter,setTagFilter]= useState('全部');
  const [searchQ,  setSearchQ]  = useState('');
  const [offset,   setOffset]   = useState(0);
  const LIMIT = 18;

  useEffect(() => { setOffset(0); }, [city, tagFilter]);
  useEffect(() => { load(); }, [city, tagFilter, offset]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { type: 'restaurant', limit: LIMIT, offset };
      if (city !== '全部') params.city = city;
      const res = await getSpots(params);
      let data = res.data.data || [];
      if (tagFilter !== '全部') data = data.filter(f => (f.tags||[]).includes(tagFilter));
      setFoods(data);
      setTotal(res.data.total || 0);
    } catch { setFoods([]); }
    finally { setLoading(false); }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQ.trim()) { load(); return; }
    setLoading(true);
    try {
      const res = await searchSpots({ q: searchQ, mode: 'fulltext' });
      const data = (res.data.data || []).filter(s => s.type === 'restaurant');
      setFoods(data); setTotal(data.length);
    } catch { setFoods([]); }
    finally { setLoading(false); }
  };

  const getRatingColor = (r) => r >= 4.7 ? '#f97316' : r >= 4.4 ? '#1a73e8' : '#34a853';

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9ff' }}>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #1a0a00 0%, #3d1a00 40%, #1a0a00 100%)',
        padding: '48px 0 40px', marginBottom: 0,
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f97316', marginBottom: 10 }}>
            Food & Dining · 美食推荐
          </div>
          <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 12 }}>
            探索中国美食地图
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', marginBottom: 28 }}>
            MinHeap TopK 算法精选 · 覆盖全国各地特色餐厅
          </p>

          {/* 搜索 */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, maxWidth: 480, margin: '0 auto' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', borderRadius: 99, padding: '0 18px', border: '1px solid rgba(255,255,255,0.2)' }}
              onFocusCapture={e => e.currentTarget.style.background = 'rgba(255,255,255,0.92)'}
              onBlurCapture={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
                <circle cx="11" cy="11" r="7" stroke="#fff" strokeWidth="2"/>
                <path d="M16.5 16.5L21 21" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="搜索餐厅名称..."
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9rem', color: '#fff', padding: '13px 10px' }} />
            </div>
            <button type="submit" style={{ background: '#f97316', color: '#fff', fontWeight: 700, fontSize: '0.85rem', padding: '0 20px', borderRadius: 99, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              搜索
            </button>
          </form>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 32px 64px' }}>

        {/* 城市筛选 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {CITIES.map(c => (
            <button key={c} onClick={() => setCity(c)} style={{
              padding: '6px 16px', borderRadius: 99, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease',
              background: city === c ? '#f97316' : '#fff',
              color: city === c ? '#fff' : '#5f6368',
              border: `1px solid ${city === c ? '#f97316' : 'rgba(0,0,0,0.1)'}`,
              boxShadow: city === c ? '0 2px 10px rgba(249,115,22,0.35)' : 'none',
            }}>
              {CITY_EMOJI[c] ? `${CITY_EMOJI[c]} ${c}` : c}
            </button>
          ))}
        </div>

        {/* 标签筛选 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
          {TAGS.map(t => (
            <button key={t} onClick={() => setTagFilter(t)} style={{
              padding: '4px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s ease',
              background: tagFilter === t ? 'rgba(249,115,22,0.12)' : 'transparent',
              color: tagFilter === t ? '#f97316' : '#9aa0a6',
              border: `1px solid ${tagFilter === t ? 'rgba(249,115,22,0.3)' : 'transparent'}`,
            }}>
              {t}
            </button>
          ))}
        </div>

        {/* 结果数 */}
        <div style={{ fontSize: '0.82rem', color: '#9aa0a6', marginBottom: 20, fontFamily: 'Inter, sans-serif' }}>
          {loading ? '加载中...' : `共 ${foods.length} 家餐厅${city !== '全部' ? ` · ${city}` : ''}`}
        </div>

        {/* 餐厅卡片网格 */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {[...Array(9)].map((_, i) => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 16 }} />)}
          </div>
        ) : foods.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#9aa0a6' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🍽️</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>暂无餐厅数据</div>
            <div style={{ fontSize: '0.85rem' }}>尝试切换城市或清除筛选条件</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {foods.map((food, i) => (
              <Link key={food.id} to={`/spots/${food.id}`} style={{ textDecoration: 'none' }}>
                <div className="glass-card" style={{
                  borderRadius: 16, padding: '20px', cursor: 'pointer',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  animationDelay: `${i * 0.03}s`,
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.12)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; }}
                >
                  {/* 头部 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '1rem', color: '#202124', marginBottom: 3 }}>{food.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#9aa0a6' }}>
                        {CITY_EMOJI[food.city] || '📍'} {food.city} · {food.province?.replace('省','').replace('市','').replace('自治区','')}
                      </div>
                    </div>
                    <div style={{
                      fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '1.1rem',
                      color: getRatingColor(food.rating), lineHeight: 1,
                    }}>
                      {food.rating?.toFixed(1)}
                      <div style={{ fontSize: '0.6rem', fontWeight: 500, color: '#9aa0a6', textAlign: 'center' }}>评分</div>
                    </div>
                  </div>

                  {/* 描述 */}
                  <p style={{ fontSize: '0.82rem', color: '#5f6368', lineHeight: 1.6, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {food.description}
                  </p>

                  {/* 底部信息 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(food.tags || []).slice(0, 3).map(tag => (
                        <span key={tag} style={{
                          fontSize: '0.68rem', fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                          background: 'rgba(249,115,22,0.1)', color: '#f97316',
                        }}>{tag}</span>
                      ))}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#9aa0a6', whiteSpace: 'nowrap' }}>
                      🕐 {food.openHours || '营业中'}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* 分页 */}
        {total > LIMIT && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32 }}>
            <button onClick={() => setOffset(Math.max(0, offset - LIMIT))} disabled={offset === 0}
              style={{ padding: '8px 20px', borderRadius: 99, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', cursor: offset === 0 ? 'not-allowed' : 'pointer', opacity: offset === 0 ? 0.4 : 1 }}>
              ← 上一页
            </button>
            <span style={{ padding: '8px 16px', fontSize: '0.82rem', color: '#5f6368' }}>
              {Math.floor(offset/LIMIT)+1} / {Math.ceil(total/LIMIT)}
            </span>
            <button onClick={() => setOffset(offset + LIMIT)} disabled={offset + LIMIT >= total}
              style={{ padding: '8px 20px', borderRadius: 99, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', cursor: offset+LIMIT>=total ? 'not-allowed' : 'pointer', opacity: offset+LIMIT>=total ? 0.4 : 1 }}>
              下一页 →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
