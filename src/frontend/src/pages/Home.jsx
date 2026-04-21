import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTopK, getGraphStats, searchSpots, getDiaries } from '../api/index.js';
import SpotCard from '../components/SpotCard.jsx';
import RippleButton from '../components/RippleButton.jsx';
import MapPreview from '../components/MapPreview.jsx';

const CITIES = ['北京', '上海', '杭州', '成都', '西安', '云南', '广州', '桂林'];
const CYCLE_WORDS = ['景区', '高校', '美食', '路线', '日记', '旅途'];

/* ── 循环文字动画 ──────────────────────────────────────────────── */
function CyclingWord() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setIdx(i => (i + 1) % CYCLE_WORDS.length); setVisible(true); }, 320);
    }, 2200);
    return () => clearInterval(timer);
  }, []);
  return (
    <span style={{
      display: 'inline-block',
      color: '#1a73e8',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(10px)',
      transition: 'opacity 0.28s ease, transform 0.28s cubic-bezier(0.16,1,0.3,1)',
    }}>
      {CYCLE_WORDS[idx]}
    </span>
  );
}

/* ── 功能卡片 ────────────────────────────────────────────────────── */
function FeatureCard({ icon, title, desc, badge, to, color, bgColor, delay = 0 }) {
  return (
    <Link to={to}
      className="flex flex-col p-6 rounded-2xl animate-item-in glass-card"
      style={{
        animationDelay: `${delay}ms`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 20px 56px rgba(0,0,0,0.12), 0 1px 0 rgba(255,255,255,1) inset';
        e.currentTarget.style.transform = 'translateY(-6px)';
        e.currentTarget.style.background = 'rgba(255,255,255,0.82)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.07), 0 1px 0 rgba(255,255,255,1) inset, 0 -0.5px 0 rgba(0,0,0,0.04) inset';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.background = 'rgba(255,255,255,0.65)';
      }}
      onMouseDown={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(0.97)'; }}
      onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-6px)'; }}
    >
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4"
        style={{
          background: bgColor,
          transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        ref={el => {
          if (!el) return;
          const card = el.closest('a');
          card.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.15) rotate(-5deg)'; });
          card.addEventListener('mouseleave', () => { el.style.transform = 'scale(1) rotate(0deg)'; });
        }}
      >
        {icon}
      </div>
      <h3 className="text-base font-semibold mb-2" style={{ color: '#1d1d1f' }}>{title}</h3>
      <p className="text-sm flex-1 leading-relaxed" style={{ color: '#6e6e73' }}>{desc}</p>
      <div className="mt-4">
        <span className="text-xs font-medium px-3 py-1 rounded-full"
          style={{ background: bgColor, color, border: `1px solid ${color}20` }}>
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
    <div>

      {/* ═══════════════════════════════ HERO ═══════════════════════════════ */}
      <section className="animate-page-enter" style={{
        background: 'linear-gradient(180deg, #ffffff 0%, #f8f9ff 100%)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}>
        <div className="max-w-6xl mx-auto px-4 pt-16 pb-10">
          <div className="flex flex-col lg:flex-row items-center gap-10">

            {/* 左侧文字区 */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full mb-6 font-medium"
                style={{ background: '#e8f1fc', color: '#1a73e8', border: '1px solid rgba(26,115,232,0.15)', animation: 'itemSlideIn 0.5s cubic-bezier(0.16,1,0.3,1) 0.05s both' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1a73e8', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                迹刻 waylog · 旅游探索系统
              </div>

              <h1 className="font-bold leading-tight mb-4"
                style={{ fontSize: 'clamp(2.4rem,5vw,3.8rem)', letterSpacing: '-0.04em', color: '#202124', animation: 'itemSlideIn 0.55s cubic-bezier(0.16,1,0.3,1) 0.12s both' }}>
                探索每一处
                <br />
                <CyclingWord />
              </h1>

              <p className="text-base md:text-lg mb-8 max-w-md font-light"
                style={{ color: '#5f6368', lineHeight: 1.6, animation: 'itemSlideIn 0.55s cubic-bezier(0.16,1,0.3,1) 0.22s both' }}>
                200+ 景区与高校 · 智能路线规划 · 旅行日记社区
              </p>

              {/* 搜索框 */}
              <form onSubmit={handleSearch} className="flex gap-2 mb-6 max-w-md"
                style={{ animation: 'itemSlideIn 0.55s cubic-bezier(0.16,1,0.3,1) 0.32s both' }}>
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  background: '#f1f3f4',
                  borderRadius: 24,
                  padding: '0 16px',
                  border: '1px solid rgba(0,0,0,0.08)',
                  transition: 'all 0.18s ease',
                }}
                  onFocusCapture={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 1px 6px rgba(32,33,36,0.28)'; e.currentTarget.style.borderColor = 'rgba(223,225,229,0)'; }}
                  onBlurCapture={e => { e.currentTarget.style.background = '#f1f3f4'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'; }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginRight: 8 }}>
                    <circle cx="11" cy="11" r="7" stroke="#9aa0a6" strokeWidth="2"/>
                    <path d="M16.5 16.5L21 21" stroke="#9aa0a6" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <input
                    type="text"
                    value={searchQ}
                    onChange={e => { setSearchQ(e.target.value); if (!e.target.value) setSearchResults([]); }}
                    placeholder="搜索景区、城市、高校..."
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '0.9rem', color: '#202124', padding: '12px 0' }}
                  />
                </div>
                <RippleButton
                  type="submit"
                  disabled={searching}
                  style={{
                    background: '#1a73e8', color: '#fff', fontWeight: 600, fontSize: '0.875rem',
                    padding: '0 20px', borderRadius: 24, border: 'none', cursor: 'pointer',
                    transition: 'background 0.15s ease, box-shadow 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#1557b0'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(26,115,232,0.4)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#1a73e8'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  {searching ? '...' : '搜索'}
                </RippleButton>
              </form>

              {/* 城市快捷入口 */}
              <div className="flex flex-wrap gap-2" style={{ animation: 'itemSlideIn 0.55s cubic-bezier(0.16,1,0.3,1) 0.42s both' }}>
                {CITIES.map(city => (
                  <Link key={city} to={`/spots?city=${city}`}
                    style={{ fontSize: '0.8rem', padding: '4px 14px', borderRadius: 16, fontWeight: 500, background: '#fff', border: '1px solid rgba(0,0,0,0.12)', color: '#5f6368', transition: 'all 0.15s ease', textDecoration: 'none' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#e8f1fc'; e.currentTarget.style.borderColor = 'rgba(26,115,232,0.3)'; e.currentTarget.style.color = '#1a73e8'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'; e.currentTarget.style.color = '#5f6368'; }}
                  >
                    {city}
                  </Link>
                ))}
              </div>
            </div>

            {/* 右侧：统计数字 */}
            <div className="flex flex-col gap-3 min-w-52" style={{ animation: 'itemSlideIn 0.6s cubic-bezier(0.16,1,0.3,1) 0.35s both' }}>
              {[
                { value: `${stats.totalSpots || 265}+`, label: '景区与高校', icon: '🏛️', color: '#1a73e8' },
                { value: `${stats.totalNodes || 155}+`, label: '道路图节点', icon: '📍', color: '#34a853' },
                { value: `${stats.totalEdges || 240}+`, label: '道路图边数', icon: '🛣️', color: '#ff6d00' },
                { value: '8+',                          label: '旅行日记',   icon: '📖', color: '#9c27b0' },
              ].map((s, i) => (
                <div key={s.label} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: '#fff', borderRadius: 12, padding: '10px 16px',
                  border: '1px solid rgba(0,0,0,0.08)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  animation: `itemSlideIn 0.5s cubic-bezier(0.16,1,0.3,1) ${0.4 + i * 0.07}s both`,
                  transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'none'; }}
                >
                  <span style={{ fontSize: '1.2rem' }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: s.color, lineHeight: 1.2 }}>{s.value}</div>
                    <div style={{ fontSize: '0.75rem', color: '#5f6368' }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════ 地图预览 ════════════════════════════════ */}
      <section style={{ background: '#f8f9ff', padding: '40px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#202124', letterSpacing: '-0.02em', marginBottom: 2 }}>
                探索地图
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#5f6368' }}>点击图钉或列表查看景点详情</p>
            </div>
            <Link to="/route"
              style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1a73e8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
              onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
            >
              规划路线 →
            </Link>
          </div>
          <MapPreview />
        </div>
      </section>

      {/* ─── 搜索结果 ─── */}
      {searchResults.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-8 animate-slide-up">
          <h2 className="section-title">
            搜索结果 <span style={{ color: '#1a73e8' }}>"{searchQ}"</span>
          </h2>
          <p className="section-sub">共 {searchResults.length} 个结果 · Trie 前缀树检索</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {searchResults.slice(0, 8).map(s => <SpotCard key={s.id} spot={s} />)}
          </div>
          {searchResults.length > 8 && (
            <div className="text-center mt-4">
              <Link to="/spots" className="btn-outline text-sm">查看更多结果</Link>
            </div>
          )}
        </section>
      )}

      {/* ═══════════════════════════ TopK 推荐 ═══════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-1">
          <h2 className="section-title">精选推荐</h2>
          <Link to="/spots" className="text-sm font-medium transition-colors duration-150"
            style={{ color: '#0071e3' }}>查看全部 →</Link>
        </div>
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs font-mono" style={{ color: '#aeaeb2' }}>
            MinHeap TopK · O(N log K) 最高评分提取
          </p>
          <div className="flex gap-1.5">
            {[['scenic','🏛️ 景区'],['campus','🎓 高校']].map(([k, l]) => (
              <button key={k} onClick={() => setSpotTab(k)}
                className="text-xs px-3 py-1.5 rounded-lg transition-all duration-150 font-medium"
                style={spotTab === k
                  ? { background: '#e8f1fc', color: '#0071e3', border: '1px solid rgba(0,113,227,0.20)' }
                  : { background: '#fff', color: '#86868b', border: '1px solid rgba(0,0,0,0.08)' }
                }>
                {l}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-2xl h-52 skeleton" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {(spotTab === 'scenic' ? topSpots : topCampus).map((s, i) => (
              <SpotCard key={s.id} spot={s} animDelay={i * 50} />
            ))}
          </div>
        )}
      </section>

      {/* ═══════════════════════════ 核心功能 ════════════════════════════════ */}
      <section className="py-16 glass-panel" style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none' }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight mb-3" style={{ color: '#1d1d1f', letterSpacing: '-0.02em' }}>核心功能</h2>
            <p className="text-base" style={{ color: '#6e6e73' }}>每个功能均内置自主实现的算法与数据结构</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FeatureCard icon="🗺️" title="景点发现"  to="/spots" color="#0071e3" bgColor="#e8f1fc" delay={0}
              desc="200+ 景区高校，Trie 前缀搜索 + 倒排索引全文检索" badge="Trie + TopK" />
            <FeatureCard icon="🧭" title="路线规划"  to="/route" color="#34c759" bgColor="#edfaf2" delay={80}
              desc="Dijkstra 单点最短路 + 最近邻 2-opt 多点路径优化" badge="Dijkstra + 2-opt" />
            <FeatureCard icon="📖" title="旅行日记"  to="/diary" color="#af52de" bgColor="#f5ecfd" delay={160}
              desc="KMP 精确检索 / 倒排索引全文检索，发布与分享" badge="KMP + 倒排索引" />
            <FeatureCard icon="🌏" title="动态广场"  to="/plaza" color="#ff6b35" bgColor="#fff1ec" delay={240}
              desc="旅行动态社交广场，热门排行，MinHeap 实时排序" badge="MinHeap 排序" />
          </div>
        </div>
      </section>

      {/* ═══════════════════════ 热门日记预览 ════════════════════════════════ */}
      {hotDiaries.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-1">
            <h2 className="section-title">热门旅行日记</h2>
            <Link to="/diary" className="text-sm font-medium" style={{ color: '#0071e3' }}>查看全部 →</Link>
          </div>
          <p className="section-sub">最受旅行者喜爱的日记</p>
          <div className="grid md:grid-cols-3 gap-5">
            {hotDiaries.map(diary => (
              <div key={diary.id} className="glass-card p-5 flex flex-col" style={{ borderRadius: '1.25rem' }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.11), 0 1px 0 rgba(255,255,255,1) inset';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.82)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.07), 0 1px 0 rgba(255,255,255,1) inset, 0 -0.5px 0 rgba(0,0,0,0.04) inset';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.65)';
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{diary.userAvatar}</span>
                  <div>
                    <div className="text-sm font-medium" style={{ color: '#1d1d1f' }}>{diary.userName}</div>
                    <div className="text-xs" style={{ color: '#aeaeb2' }}>
                      {diary.spotName && `📍 ${diary.spotName} · `}{diary.visitDate}
                    </div>
                  </div>
                </div>
                <h3 className="font-semibold mb-2 line-clamp-1" style={{ color: '#1d1d1f' }}>{diary.title}</h3>
                <p className="text-sm line-clamp-3 flex-1" style={{ color: '#6e6e73' }}>{diary.content}</p>
                <div className="flex items-center gap-3 mt-4 pt-3 text-xs"
                  style={{ borderTop: '1px solid rgba(0,0,0,0.06)', color: '#aeaeb2' }}>
                  <span>❤️ {diary.likes}</span>
                  <span>💬 {typeof diary.comments === 'number' ? diary.comments : (diary.comments?.length || 0)}</span>
                  <div className="ml-auto flex flex-wrap gap-1">
                    {(diary.tags || []).slice(0, 2).map(tag => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: '#f5f5f7', color: '#86868b' }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════════════════ 算法展示 ════════════════════════════════ */}
      <section className="py-14 glass-panel" style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderBottom: 'none' }}>
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-2 tracking-tight" style={{ color: '#1d1d1f', letterSpacing: '-0.02em' }}>
            课程设计算法实现
          </h2>
          <p className="text-sm mb-10" style={{ color: '#86868b' }}>
            每个核心功能均使用自主实现的数据结构与算法
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
            {[
              { name: 'MinHeap TopK',   desc: 'O(N log K) 景点评分推荐',  color: '#0071e3', bg: '#e8f1fc' },
              { name: 'Dijkstra',        desc: 'O((V+E)logV) 最短路径',    color: '#34c759', bg: '#edfaf2' },
              { name: '最近邻 + 2-opt',  desc: 'TSP 多点路径优化',         color: '#af52de', bg: '#f5ecfd' },
              { name: 'Trie + 编辑距离', desc: 'O(m) 前缀 & 模糊搜索',    color: '#ff6b35', bg: '#fff1ec' },
              { name: 'KMP',             desc: 'O(m+n) 字符串精确匹配',   color: '#ff9500', bg: '#fff6e5' },
              { name: '倒排索引',         desc: 'O(1) 词项查询全文检索',   color: '#ff3b30', bg: '#fff1f0' },
            ].map(algo => (
              <div key={algo.name}
                className="p-4 rounded-xl text-left transition-all duration-150 glass-card"
                style={{ borderRadius: '0.875rem' }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = `${algo.bg.replace(')', ', 0.72)').replace('rgb', 'rgba')}`;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10), 0 1px 0 rgba(255,255,255,1) inset';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.65)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.07), 0 1px 0 rgba(255,255,255,1) inset, 0 -0.5px 0 rgba(0,0,0,0.04) inset';
                }}
              >
                <div className="font-semibold text-sm mb-1" style={{ color: '#1d1d1f' }}>{algo.name}</div>
                <div className="text-xs" style={{ color: algo.color }}>{algo.desc}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <RippleButton
              rippleColor="rgba(0,0,0,0.08)"
              className="text-sm font-semibold px-6 py-2.5 rounded-2xl"
              style={{
                background: '#f5f5f7', border: '1px solid rgba(0,0,0,0.10)', color: '#1d1d1f',
                transition: 'background 0.15s ease, transform 0.15s cubic-bezier(0.34,1.56,0.64,1)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#e8e8ed'; e.currentTarget.style.transform = 'scale(1.03)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f5f5f7'; e.currentTarget.style.transform = 'scale(1)'; }}
              onClick={() => window.location.href = '/algo'}
            >
              ⚙️ 交互式算法演示
            </RippleButton>
            <RippleButton
              className="text-sm font-semibold px-6 py-2.5 rounded-2xl"
              style={{
                background: '#0071e3', color: '#fff',
                transition: 'background 0.15s ease, transform 0.15s cubic-bezier(0.34,1.56,0.64,1)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#0077ed'; e.currentTarget.style.transform = 'scale(1.03)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#0071e3'; e.currentTarget.style.transform = 'scale(1)'; }}
              onClick={() => window.location.href = '/route'}
            >
              🧭 立即体验路线规划
            </RippleButton>
          </div>
        </div>
      </section>
    </div>
  );
}
