import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getSpots, searchSpots } from '../api/index.js';

const HERO_SLIDES = [
  {
    bg: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=1920&q=85',
    tag: '点心', city: '上海', desc: '鲜汁四溢的精致蒸笼',
  },
  {
    bg: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1920&q=85',
    tag: '亚洲菜', city: '成都', desc: '色彩丰富的地道风味',
  },
  {
    bg: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=1920&q=85',
    tag: '热菜', city: '重庆', desc: '麻辣鲜香的巴蜀滋味',
  },
  {
    bg: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=85',
    tag: '精致料理', city: '北京', desc: '匠心烹制的味觉盛宴',
  },
  {
    bg: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=1920&q=85',
    tag: '街头小吃', city: '西安', desc: '烟火气十足的市井美食',
  },
];

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

  /* Hero 背景轮播 */
  const [slideIdx, setSlideIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSlideIdx(i => (i + 1) % HERO_SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  const getRatingColor = (r) => r >= 4.7 ? '#f97316' : r >= 4.4 ? '#1a73e8' : '#34a853';
  const slide = HERO_SLIDES[slideIdx];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(145deg, #fff8f2 0%, #fdf4ee 40%, #f8f9ff 100%)' }}>

      {/* ── Hero 动态背景 ── */}
      <div style={{ position: 'relative', height: 380, overflow: 'hidden', marginTop: '-52px' }}>

        {/* 交叉淡入背景层 */}
        {HERO_SLIDES.map((s, i) => (
          <div key={i} style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${s.bg})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: i === slideIdx ? 1 : 0,
            transition: 'opacity 1.4s cubic-bezier(0.4,0,0.2,1)',
            willChange: 'opacity',
          }} />
        ))}

        {/* 深色渐变遮罩 */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(160deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.72) 100%)',
        }} />

        {/* 内容 */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', padding: '52px 24px 0',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'rgba(249,115,22,0.2)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(249,115,22,0.4)', borderRadius: 99,
            padding: '5px 14px', marginBottom: 18,
            fontSize: '0.68rem', fontWeight: 700, color: '#fbbf24',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            transition: 'opacity 0.6s ease',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#f97316', display: 'inline-block' }} />
            {slide.city} · {slide.tag}
          </div>

          <h1 style={{
            fontFamily: 'Inter, -apple-system, sans-serif',
            fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
            fontWeight: 800, color: '#fff',
            letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 10,
            textShadow: '0 4px 24px rgba(0,0,0,0.3)',
          }}>
            探索中国<br />
            <span style={{ background: 'linear-gradient(90deg,#fbbf24,#f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              美食地图
            </span>
          </h1>

          <p style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 300,
            fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)',
            letterSpacing: '0.01em', marginBottom: 22,
            transition: 'opacity 0.6s ease',
          }}>
            {slide.desc} · MinHeap TopK 精选
          </p>

          {/* 搜索框 */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 480 }}>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center',
              background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)',
              borderRadius: 99, padding: '0 18px', gap: 10,
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
              transition: 'box-shadow 0.2s ease',
            }}
              onFocusCapture={e => e.currentTarget.style.boxShadow = '0 8px 40px rgba(0,0,0,0.4)'}
              onBlurCapture={e => e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.25)'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.35 }}>
                <circle cx="11" cy="11" r="7" stroke="#000" strokeWidth="2.2"/>
                <path d="M16.5 16.5L21 21" stroke="#000" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="搜索餐厅、菜系、城市..."
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9rem', color: '#202124', padding: '13px 0', fontFamily: 'Inter, sans-serif' }} />
            </div>
            <button type="submit" style={{
              background: 'linear-gradient(135deg,#f59e0b,#f97316)', color: '#fff',
              fontWeight: 700, fontSize: '0.85rem', padding: '0 20px', borderRadius: 99,
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              boxShadow: '0 4px 16px rgba(249,115,22,0.45)',
              fontFamily: 'Inter, sans-serif',
            }}>
              Search
            </button>
          </form>
        </div>

        {/* 底部指示器 */}
        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 3, display: 'flex', gap: 6,
        }}>
          {HERO_SLIDES.map((_, i) => (
            <div key={i} onClick={() => setSlideIdx(i)} style={{
              width: i === slideIdx ? 20 : 5, height: 5, borderRadius: 99,
              background: i === slideIdx ? '#fbbf24' : 'rgba(255,255,255,0.35)',
              transition: 'all 0.5s cubic-bezier(0.34,1.56,0.64,1)', cursor: 'pointer',
            }} />
          ))}
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
