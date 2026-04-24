import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getTopK, getGraphStats, searchSpots, getDiaries } from '../api/index.js';
import SpotCard from '../components/SpotCard.jsx';
import RippleButton from '../components/RippleButton.jsx';
import MapPreview from '../components/MapPreview.jsx';

/* ── Hero 背景图数据（已验证可用）────────────────────────────── */
const HERO_SLIDES = [
  { bg: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85', tag: 'Mountain',  location: '高山峡谷',  sub: 'Alpine Valley' },
  { bg: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=1920&q=85', tag: 'Balloon',   location: '热气球平原', sub: 'Balloon Safari' },
  { bg: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1920&q=85', tag: 'Lake',      location: '高原明镜',  sub: 'Highland Lake'  },
  { bg: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&q=85', tag: 'Forest',    location: '原始森林',  sub: 'Ancient Forest' },
  { bg: 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=1920&q=85', tag: 'Snow',      location: '雪山之巅',  sub: 'Snow Peaks'     },
];

const CITIES = ['北京', '上海', '杭州', '成都', '西安', '云南', '广州', '桂林'];

/* ── 滚动淡入 Hook（CSS class 驱动，更可靠）──────────────────── */
function useScrollReveal(className = 'reveal', threshold = 0.12) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 先确保有初始隐藏 class
    el.classList.add(className);
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        el.classList.add('visible');
        obs.disconnect();
      }
    }, { threshold });
    // 延迟 80ms 再 observe，确保渲染后再判断位置
    const t = setTimeout(() => obs.observe(el), 80);
    return () => { clearTimeout(t); obs.disconnect(); };
  }, [className]);
  return ref;
}

/* ── 功能卡片 ────────────────────────────────────────────────────── */
function FeatureCard({ icon, title, desc, badge, to, color, bgColor, delay = 0 }) {
  return (
    <Link to={to}
      className="flex flex-col p-6 rounded-2xl glass-card"
      style={{ animationDelay: `${delay}ms` }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-6px)';
        e.currentTarget.style.boxShadow = '0 20px 56px rgba(0,0,0,0.14)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4" style={{ background: bgColor }}>
        {icon}
      </div>
      <h3 className="text-base font-semibold mb-2" style={{ color: '#1d1d1f' }}>{title}</h3>
      <p className="text-sm flex-1 leading-relaxed" style={{ color: '#6e6e73' }}>{desc}</p>
      <div className="mt-4">
        <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ background: bgColor, color, border: `1px solid ${color}20` }}>
          {badge}
        </span>
      </div>
    </Link>
  );
}

export default function Home() {
  const [topSpots,      setTopSpots]      = useState([]);
  const [topCampus,     setTopCampus]     = useState([]);
  const [stats,         setStats]         = useState({});
  const [hotDiaries,    setHotDiaries]    = useState([]);
  const [searchQ,       setSearchQ]       = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching,     setSearching]     = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [spotTab,       setSpotTab]       = useState('scenic');

  /* Hero 轮播 */
  const [slideIdx, setSlideIdx] = useState(0);

  /* 滚动区 refs */
  const statsRef = useScrollReveal('reveal');
  const mapRef   = useScrollReveal('reveal');
  const spotsRef = useScrollReveal('reveal');
  const featRef  = useScrollReveal('reveal');
  const diaryRef = useScrollReveal('reveal');
  const algoRef  = useScrollReveal('reveal');

  useEffect(() => {
    Promise.all([
      getTopK({ k: 8, type: 'scenic' }),
      getTopK({ k: 6, type: 'campus' }),
      getGraphStats(),
      getDiaries({ sortBy: 'likes', order: 'desc', limit: 3 }),
    ]).then(([r1, r2, r3, r4]) => {
      setTopSpots(r1.data.data || []);
      setTopCampus(r2.data.data || []);
      setStats(r3.data.data || {});
      setHotDiaries(r4.data.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  /* 背景图自动切换（直接更新 idx，CSS transition 处理交叉淡入）*/
  useEffect(() => {
    const t = setInterval(() => setSlideIdx(i => (i + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      const res = await searchSpots({ q: searchQ, mode: 'prefix' });
      setSearchResults(res.data.data || []);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  return (
    <div style={{ background: '#f5f5f7' }}>

      {/* ════════════════════ HERO — Apple 风格全屏 ════════════════════ */}
      <section style={{ position: 'relative', height: '100vh', minHeight: 600, overflow: 'hidden', marginTop: '-52px' }}>

        {/* 预加载第一张图（移动端网络慢时防灰屏）*/}
        <link rel="preload" as="image" href={HERO_SLIDES[0].bg} />

        {/* 交叉淡入背景层——所有图层叠放，active 层 opacity:1 其余 0 */}
        {HERO_SLIDES.map((s, i) => (
          <div key={i} style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${s.bg})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: i === slideIdx ? 1 : 0,
            transition: 'opacity 1.4s cubic-bezier(0.4,0,0.2,1)',
            zIndex: i === slideIdx ? 1 : 0,
            willChange: 'opacity',
          }} />
        ))}

        {/* 底部渐变遮罩（淡出到下方内容色）*/}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2,
          background: 'linear-gradient(160deg, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.18) 50%, rgba(0,0,0,0.55) 100%)',
        }} />

        {/* Apple 风格居中内容 */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 3,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', padding: '0 20px',
          overflowX: 'hidden',
        }}>

          {/* 小标签 */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.22)', borderRadius: 99,
            padding: '6px 16px', marginBottom: 28,
            fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            animation: 'itemSlideIn 0.7s cubic-bezier(0.16,1,0.3,1) 0.05s both',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block', boxShadow: '0 0 6px #4ade80' }} />
            迹刻 waylog &nbsp;·&nbsp; Travel Explorer
          </div>

          {/* 主标题 — Apple 超大超紧 */}
          <h1 style={{
            fontFamily: 'Inter, -apple-system, sans-serif',
            fontSize: 'clamp(3.2rem, 8vw, 6.5rem)',
            fontWeight: 800,
            color: '#fff',
            lineHeight: 1.0,
            letterSpacing: '-0.05em',
            marginBottom: 16,
            animation: 'itemSlideIn 0.7s cubic-bezier(0.16,1,0.3,1) 0.15s both',
            textShadow: '0 4px 32px rgba(0,0,0,0.25)',
          }}>
            Explore<br />
            <span style={{
              background: 'linear-gradient(90deg, #fbbf24, #f97316)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>China.</span>
          </h1>

          {/* 副标题 */}
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 'clamp(1rem, 2.2vw, 1.25rem)',
            fontWeight: 300,
            color: 'rgba(255,255,255,0.8)',
            letterSpacing: '-0.01em',
            lineHeight: 1.6,
            marginBottom: 40,
            maxWidth: 520,
            animation: 'itemSlideIn 0.7s cubic-bezier(0.16,1,0.3,1) 0.25s both',
          }}>
            200+ 景区与高校 &nbsp;·&nbsp; 智能路线规划 &nbsp;·&nbsp; 旅行日记社区
          </p>

          {/* 搜索框 */}
          <form onSubmit={handleSearch} style={{
            display: 'flex', gap: 8, width: '100%', maxWidth: 520, marginBottom: 28,
            animation: 'itemSlideIn 0.7s cubic-bezier(0.16,1,0.3,1) 0.35s both',
          }}>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center',
              background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)',
              borderRadius: 99, padding: '0 20px', gap: 10,
              boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
              transition: 'box-shadow 0.25s ease',
            }}
              onFocusCapture={e => e.currentTarget.style.boxShadow = '0 8px 40px rgba(0,0,0,0.4)'}
              onBlurCapture={e => e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.28)'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
                <circle cx="11" cy="11" r="7" stroke="#000" strokeWidth="2.2"/>
                <path d="M16.5 16.5L21 21" stroke="#000" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
              <input
                type="text" value={searchQ}
                onChange={e => { setSearchQ(e.target.value); if (!e.target.value) setSearchResults([]); }}
                placeholder="搜索景区、城市、高校..."
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '0.95rem', color: '#202124', padding: '14px 0', fontFamily: 'Inter, sans-serif' }}
              />
            </div>
            <RippleButton type="submit" disabled={searching} style={{
              background: 'linear-gradient(135deg, #f59e0b, #f97316)',
              color: '#fff', fontWeight: 700, fontFamily: 'Inter, sans-serif',
              fontSize: '0.85rem', padding: '0 18px', borderRadius: 99,
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              boxShadow: '0 4px 20px rgba(249,115,22,0.5)',
              transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(249,115,22,0.65)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(249,115,22,0.5)'; }}
            >
              {searching ? '···' : 'Search'}
            </RippleButton>
          </form>

          {/* 城市快捷入口 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, animation: 'itemSlideIn 0.7s cubic-bezier(0.16,1,0.3,1) 0.45s both' }}>
            {CITIES.map(city => (
              <Link key={city} to={`/spots?city=${city}`} style={{
                fontSize: '0.78rem', padding: '6px 16px', borderRadius: 99, fontWeight: 500,
                background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.85)',
                textDecoration: 'none',
                transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                fontFamily: 'Inter, sans-serif', letterSpacing: '0.01em',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; e.currentTarget.style.transform = 'translateY(-2px) scale(1.04)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; }}
              >
                {city}
              </Link>
            ))}
          </div>
        </div>

        {/* 底部：当前景点标签 + 指示器 */}
        <div style={{
          position: 'absolute', bottom: 32, left: 0, right: 0, zIndex: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
        }}>
          {/* 景点标签 */}
          <div style={{
            fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)',
            fontFamily: 'Inter, sans-serif', fontWeight: 500, letterSpacing: '0.08em',
            textTransform: 'uppercase', transition: 'opacity 0.6s ease',
          }}>
            {HERO_SLIDES[slideIdx].location} &nbsp;·&nbsp; {HERO_SLIDES[slideIdx].sub}
          </div>

          {/* 点状指示器 */}
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {HERO_SLIDES.map((_, i) => (
              <div key={i}
                onClick={() => setSlideIdx(i)}
                style={{
                  width: i === slideIdx ? 22 : 5, height: 5, borderRadius: 99,
                  background: i === slideIdx ? '#fbbf24' : 'rgba(255,255,255,0.35)',
                  transition: 'all 0.5s cubic-bezier(0.34,1.56,0.64,1)',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>

        {/* 向下滚动线 */}
        <div style={{
          position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          zIndex: 4, width: 1, height: 60,
          background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.35))',
          animation: 'float 2.8s ease-in-out infinite',
        }} />
      </section>

      {/* ─── 搜索结果 ─── */}
      {searchResults.length > 0 && (
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 32px' }}>
          <h2 className="section-title">搜索结果 <span style={{ color: '#1a73e8' }}>"{searchQ}"</span></h2>
          <p className="section-sub">共 {searchResults.length} 个结果 · Trie 前缀树检索</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {searchResults.slice(0, 8).map(s => <SpotCard key={s.id} spot={s} />)}
          </div>
        </section>
      )}

      {/* ════════════════════ 统计栏 ════════════════════ */}
      <div ref={statsRef} style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <div className="stats-bar" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px', display: 'flex', justifyContent: 'space-around' }}>
          {[
            { value: `${stats.totalSpots || 265}+`, label: 'Destinations', sub: '景区与高校', icon: '🏛️', color: '#1a73e8' },
            { value: `${stats.totalNodes || 155}+`, label: 'Map Nodes',    sub: '道路图节点', icon: '📍', color: '#34a853' },
            { value: `${stats.totalEdges || 240}+`, label: 'Road Edges',   sub: '道路图边数', icon: '🛣️', color: '#ff6d00' },
            { value: '8+',                           label: 'Diaries',      sub: '旅行日记',   icon: '📖', color: '#9c27b0' },
          ].map((s, i) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '22px 16px' }}>
              <span style={{ fontSize: '1.6rem' }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: s.color, lineHeight: 1, fontFamily: 'Inter, sans-serif', letterSpacing: '-0.02em' }}>{s.value}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#202124', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 3 }}>{s.label}</div>
                <div style={{ fontSize: '0.68rem', color: '#9aa0a6' }}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════ 地图预览 ════════════════════ */}
      <section ref={mapRef} style={{ background: '#f8f9ff', padding: '56px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1a73e8', marginBottom: 6 }}>Explore · 探索地图</div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#202124', letterSpacing: '-0.03em', marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>Find Your Next<br /><span style={{ color: '#1a73e8' }}>Destination</span></h2>
              <p style={{ fontSize: '0.85rem', color: '#5f6368' }}>点击图钉或列表查看景点详情 · 支持类型筛选</p>
            </div>
            <Link to="/route" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1a73e8', textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
            >规划路线 →</Link>
          </div>
          <MapPreview />
        </div>
      </section>

      {/* ════════════════════ TopK 推荐 ════════════════════ */}
      <section ref={spotsRef} style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#ff6d00', marginBottom: 5 }}>Top Picks · 精选推荐</div>
            <h2 style={{ fontSize: '1.7rem', fontWeight: 800, color: '#202124', letterSpacing: '-0.03em', fontFamily: 'Inter, sans-serif' }}>Most Popular Spots</h2>
          </div>
          <Link to="/spots" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1a73e8', textDecoration: 'none', letterSpacing: '0.02em' }}>View All →</Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <p style={{ fontSize: '0.72rem', color: '#aeaeb2', fontFamily: 'SF Mono, Fira Code, monospace', letterSpacing: '0.03em' }}>MinHeap TopK · O(N log K)</p>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['scenic','🏛️ 景区'],['campus','🎓 高校']].map(([k,l]) => (
              <button key={k} onClick={() => setSpotTab(k)} style={{
                fontSize: '0.75rem', padding: '5px 12px', borderRadius: 8, fontWeight: 500, cursor: 'pointer',
                ...(spotTab === k
                  ? { background: '#e8f1fc', color: '#1a73e8', border: '1px solid rgba(26,115,232,0.2)' }
                  : { background: '#fff', color: '#86868b', border: '1px solid rgba(0,0,0,0.08)' })
              }}>{l}</button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="rounded-2xl h-52 skeleton" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {(spotTab === 'scenic' ? topSpots : topCampus).map((s, i) => (
              <SpotCard key={s.id} spot={s} animDelay={i * 50} />
            ))}
          </div>
        )}
      </section>

      {/* ════════════════════ 核心功能 ════════════════════ */}
      <section ref={featRef} style={{ padding: '64px 0', background: 'linear-gradient(180deg, #f8f9ff 0%, #fff 100%)', borderTop: '1px solid rgba(0,0,0,0.05)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9c27b0', marginBottom: 10 }}>Core Features · 核心功能</div>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#202124', letterSpacing: '-0.03em', fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>Built with Real Algorithms</h2>
            <p style={{ fontSize: '0.9rem', color: '#5f6368' }}>每个功能均内置自主实现的数据结构与算法</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FeatureCard icon="🗺️" title="景点发现" to="/spots" color="#1a73e8" bgColor="#e8f1fc" delay={0}
              desc="200+ 景区高校，Trie 前缀搜索 + 倒排索引全文检索" badge="Trie + TopK" />
            <FeatureCard icon="🧭" title="路线规划" to="/route" color="#34a853" bgColor="#edfaf2" delay={80}
              desc="Dijkstra 单点最短路 + 最近邻 2-opt 多点路径优化" badge="Dijkstra + 2-opt" />
            <FeatureCard icon="📖" title="旅行日记" to="/diary" color="#9c27b0" bgColor="#f5ecfd" delay={160}
              desc="KMP 精确检索 / 倒排索引全文检索，发布与分享" badge="KMP + 倒排索引" />
            <FeatureCard icon="🌏" title="动态广场" to="/plaza" color="#ff6d00" bgColor="#fff1ec" delay={240}
              desc="旅行动态社交广场，热门排行，MinHeap 实时排序" badge="MinHeap 排序" />
          </div>
        </div>
      </section>

      {/* ════════════════════ 热门日记 ════════════════════ */}
      {hotDiaries.length > 0 && (
        <section ref={diaryRef} style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#34a853', marginBottom: 5 }}>Travel Stories · 旅行日记</div>
              <h2 style={{ fontSize: '1.7rem', fontWeight: 800, color: '#202124', letterSpacing: '-0.03em', fontFamily: 'Inter, sans-serif' }}>From Our Community</h2>
            </div>
            <Link to="/diary" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1a73e8', textDecoration: 'none', letterSpacing: '0.02em' }}>View All →</Link>
          </div>
          <p className="section-sub">最受旅行者喜爱的日记</p>
          <div className="grid md:grid-cols-3 gap-5">
            {hotDiaries.map((diary, i) => (
              <div key={diary.id} className="glass-card p-5 flex flex-col" style={{
                borderRadius: '1.25rem',
                transitionDelay: `${i * 0.1}s`,
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: '1.25rem' }}>{diary.userAvatar}</span>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1d1d1f' }}>{diary.userName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#aeaeb2' }}>{diary.spotName && `📍 ${diary.spotName} · `}{diary.visitDate}</div>
                  </div>
                </div>
                <h3 style={{ fontWeight: 600, marginBottom: 8, color: '#1d1d1f' }} className="line-clamp-1">{diary.title}</h3>
                <p style={{ fontSize: '0.875rem', color: '#6e6e73', flex: 1 }} className="line-clamp-3">{diary.content}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(0,0,0,0.06)', fontSize: '0.75rem', color: '#aeaeb2' }}>
                  <span>❤️ {diary.likes}</span>
                  <span>💬 {typeof diary.comments === 'number' ? diary.comments : (diary.comments?.length || 0)}</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                    {(diary.tags || []).slice(0, 2).map(tag => (
                      <span key={tag} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, background: '#f5f5f7', color: '#86868b' }}>#{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ════════════════════ 算法展示 ════════════════════ */}
      <section ref={algoRef} style={{ padding: '64px 0', background: '#fff', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1a73e8', marginBottom: 10 }}>Under the Hood · 算法实现</div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#202124', letterSpacing: '-0.03em', fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>Real Data Structures,<br />Real Performance</h2>
          <p style={{ fontSize: '0.875rem', color: '#86868b', marginBottom: 36 }}>每个核心功能均使用自主实现的数据结构与算法</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
            {[
              { name: 'MinHeap TopK',    desc: 'O(N log K) 景点评分推荐',  color: '#1a73e8', bg: '#e8f1fc' },
              { name: 'Dijkstra',         desc: 'O((V+E)logV) 最短路径',    color: '#34a853', bg: '#edfaf2' },
              { name: '最近邻 + 2-opt',   desc: 'TSP 多点路径优化',          color: '#9c27b0', bg: '#f5ecfd' },
              { name: 'Trie + 编辑距离',  desc: 'O(m) 前缀 & 模糊搜索',     color: '#ff6d00', bg: '#fff1ec' },
              { name: 'KMP',              desc: 'O(m+n) 字符串精确匹配',     color: '#ff9500', bg: '#fff6e5' },
              { name: '倒排索引',          desc: 'O(1) 词项查询全文检索',     color: '#ff3b30', bg: '#fff1f0' },
            ].map((algo, i) => (
              <div key={algo.name} className="glass-card p-4 text-left" style={{
                borderRadius: '0.875rem',
                transitionDelay: `${i * 0.07}s`,
              }}
                onMouseEnter={e => { e.currentTarget.style.background = algo.bg; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.transform = algoVisible ? 'none' : 'translateY(16px)'; }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1d1d1f', marginBottom: 4 }}>{algo.name}</div>
                <div style={{ fontSize: '0.75rem', color: algo.color }}>{algo.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <RippleButton rippleColor="rgba(0,0,0,0.08)" style={{
              fontSize: '0.875rem', fontWeight: 600, padding: '10px 24px', borderRadius: 24,
              background: '#f5f5f7', border: '1px solid rgba(0,0,0,0.10)', color: '#1d1d1f', cursor: 'pointer',
              transition: 'background 0.15s ease, transform 0.15s ease',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#e8e8ed'; e.currentTarget.style.transform = 'scale(1.03)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f5f5f7'; e.currentTarget.style.transform = 'scale(1)'; }}
              onClick={() => window.location.href = '/algo'}
            >⚙️ 交互式算法演示</RippleButton>
            <RippleButton style={{
              fontSize: '0.875rem', fontWeight: 600, padding: '10px 24px', borderRadius: 24,
              background: '#1a73e8', color: '#fff', cursor: 'pointer',
              transition: 'background 0.15s ease, transform 0.15s ease',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1557b0'; e.currentTarget.style.transform = 'scale(1.03)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#1a73e8'; e.currentTarget.style.transform = 'scale(1)'; }}
              onClick={() => window.location.href = '/route'}
            >🧭 立即体验路线规划</RippleButton>
          </div>
        </div>
      </section>
    </div>
  );
}
