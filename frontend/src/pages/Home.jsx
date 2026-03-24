import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getTopK, getGraphStats, searchSpots, getDiaries } from '../api/index.js';
import SpotCard from '../components/SpotCard.jsx';

const CITIES = ['北京', '上海', '杭州', '成都', '西安', '云南', '广州', '桂林'];

/* ── 星空粒子背景（纯 Canvas，零依赖）─────────────────────────── */
function StarField({ className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    let W, H, raf;
    const stars = [];

    const init = () => {
      W = c.width = c.offsetWidth;
      H = c.height = c.offsetHeight;
      stars.length = 0;
      for (let i = 0; i < 180; i++) {
        stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.2 + 0.1, a: Math.random(), da: (Math.random() - 0.5) * 0.005 });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      stars.forEach(s => {
        s.a = Math.max(0.05, Math.min(1, s.a + s.da));
        if (s.a <= 0.05 || s.a >= 1) s.da *= -1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,225,255,${s.a * 0.7})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };

    init();
    draw();
    const ro = new ResizeObserver(init);
    ro.observe(c);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  return <canvas ref={ref} className={`absolute inset-0 w-full h-full pointer-events-none ${className}`} />;
}

/* ── 统计数字项 ─────────────────────────────────────────────────── */
function StatCard({ icon, value, label, accent }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-6 py-4 rounded-2xl transition-all duration-200 hover:scale-[1.03]"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <span className="text-2xl">{icon}</span>
      <span className="text-2xl font-bold" style={{ color: accent }}>{value}</span>
      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.38)' }}>{label}</span>
    </div>
  );
}

/* ── 功能卡片 ────────────────────────────────────────────────────── */
function FeatureCard({ icon, title, desc, badge, to, accentColor }) {
  return (
    <Link to={to}
      className="group flex flex-col p-6 rounded-2xl transition-all duration-250 hover:scale-[1.02]"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
      onMouseEnter={e => { e.currentTarget.style.border = `1px solid ${accentColor}40`; e.currentTarget.style.background = `${accentColor}08`; }}
      onMouseLeave={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
    >
      <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-200">{icon}</div>
      <h3 className="text-base font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.90)' }}>{title}</h3>
      <p className="text-sm flex-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{desc}</p>
      <div className="mt-4">
        <span className="text-xs font-medium px-3 py-1 rounded-full font-mono"
          style={{ background: `${accentColor}14`, color: accentColor, border: `1px solid ${accentColor}25` }}>
          {badge}
        </span>
      </div>
    </Link>
  );
}

export default function Home() {
  const [topSpots,    setTopSpots]    = useState([]);
  const [topCampus,   setTopCampus]   = useState([]);
  const [stats,       setStats]       = useState({});
  const [hotDiaries,  setHotDiaries]  = useState([]);
  const [searchQ,     setSearchQ]     = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching,   setSearching]   = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [spotTab,     setSpotTab]     = useState('scenic');
  const navigate = useNavigate();

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
    <div style={{ background: '#070b18' }}>

      {/* ═══════════════════════════════ HERO ═══════════════════════════════ */}
      <section className="relative min-h-[620px] flex items-center justify-center overflow-hidden">
        {/* 深空背景 */}
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, #0d2045 0%, #07111e 45%, #070b18 100%)' }} />
        {/* 星云光斑 */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none animate-cosmos-glow"
          style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full pointer-events-none animate-cosmos-glow"
          style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.07) 0%, transparent 70%)', animationDelay: '2s' }} />
        {/* 星空 */}
        <StarField />
        {/* 底部淡出 */}
        <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{ background: 'linear-gradient(to top, #070b18, transparent)' }} />

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto animate-fade-in">
          {/* 标签 */}
          <div className="inline-flex items-center gap-2 text-xs px-4 py-1.5 rounded-full mb-8"
            style={{ background: 'rgba(14,165,233,0.10)', border: '1px solid rgba(14,165,233,0.22)', color: '#7dd3fc' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            旅游系统课程设计 · Our Tour System
          </div>

          <div className="text-6xl mb-6 animate-float inline-block"
            style={{ filter: 'drop-shadow(0 0 20px rgba(14,165,233,0.4))' }}>
            🧭
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-5 leading-tight tracking-tight" style={{ color: 'rgba(255,255,255,0.92)' }}>
            探索中国
            <span style={{ background: 'linear-gradient(135deg,#38bdf8,#2dd4bf)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              {' '}每一处
            </span>
            <br />美好风景
          </h1>
          <p className="text-base md:text-lg mb-10 max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.40)' }}>
            200+ 景区与高校 &nbsp;·&nbsp; 智能路线规划 &nbsp;·&nbsp; 旅行日记社区
          </p>

          {/* 搜索框 */}
          <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mx-auto mb-7">
            <input
              type="text"
              value={searchQ}
              onChange={e => { setSearchQ(e.target.value); if (!e.target.value) setSearchResults([]); }}
              placeholder="搜索景区、城市、高校..."
              className="flex-1 px-5 py-3.5 rounded-2xl text-sm outline-none transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.88)',
              }}
              onFocus={e => { e.target.style.borderColor = 'rgba(14,165,233,0.50)'; e.target.style.background = 'rgba(255,255,255,0.09)'; e.target.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.08)'; }}
              onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.background = 'rgba(255,255,255,0.07)'; e.target.style.boxShadow = 'none'; }}
            />
            <button type="submit" disabled={searching}
              className="font-semibold px-7 py-3.5 rounded-2xl text-sm transition-all duration-200 shrink-0"
              style={{ background: 'linear-gradient(135deg,#0ea5e9,#14b8a6)', color: '#fff', boxShadow: '0 2px 16px rgba(14,165,233,0.28)' }}>
              {searching ? '...' : '搜索'}
            </button>
          </form>

          {/* 城市快捷入口 */}
          <div className="flex flex-wrap justify-center gap-2">
            {CITIES.map(city => (
              <Link key={city} to={`/spots?city=${city}`}
                className="text-sm px-4 py-1.5 rounded-full transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.55)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(14,165,233,0.10)'; e.currentTarget.style.borderColor = 'rgba(14,165,233,0.30)'; e.currentTarget.style.color = '#7dd3fc'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
              >
                {city}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 搜索结果 ─── */}
      {searchResults.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-8 animate-slide-up">
          <h2 className="section-title">
            搜索结果{' '}
            <span style={{ background: 'linear-gradient(135deg,#38bdf8,#2dd4bf)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              "{searchQ}"
            </span>
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

      {/* ═══════════════════════════════ STATS ═══════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon="🏛️" value={`${stats.totalSpots || 265}+`} label="景区与高校"   accent="#38bdf8" />
          <StatCard icon="📍" value={`${stats.totalNodes || 155}+`} label="道路图节点"   accent="#2dd4bf" />
          <StatCard icon="🛣️" value={`${stats.totalEdges || 240}+`} label="道路图边数"   accent="#a78bfa" />
          <StatCard icon="📖" value="8+"                             label="旅行日记"     accent="#fb923c" />
        </div>
      </section>

      {/* ═══════════════════════════ TopK 推荐 ═══════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 pb-10">
        <div className="flex items-center justify-between mb-1">
          <h2 className="section-title">精选推荐</h2>
          <Link to="/spots" className="text-sm transition-colors duration-150" style={{ color: '#38bdf8' }}
            onMouseEnter={e => e.currentTarget.style.color = '#7dd3fc'}
            onMouseLeave={e => e.currentTarget.style.color = '#38bdf8'}>
            查看全部 →
          </Link>
        </div>
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.28)' }}>
            MinHeap TopK · O(N log K) 最高评分提取
          </p>
          <div className="flex gap-1.5">
            {[['scenic','🏛️ 景区'],['campus','🎓 高校']].map(([k, l]) => (
              <button key={k} onClick={() => setSpotTab(k)}
                className="text-xs px-3 py-1.5 rounded-lg transition-all duration-200 font-medium"
                style={spotTab === k
                  ? { background: 'rgba(14,165,233,0.15)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.30)' }
                  : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.07)' }
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
            {(spotTab === 'scenic' ? topSpots : topCampus).map(s => <SpotCard key={s.id} spot={s} />)}
          </div>
        )}
      </section>

      {/* ═══════════════════════════ 地图入口预留 ══════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 pb-10">
        <div className="flex items-center justify-between mb-1">
          <h2 className="section-title">地图探索</h2>
          <span className="text-xs px-3 py-1 rounded-full"
            style={{ color: 'rgba(255,255,255,0.30)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
            Phase 2 开发中
          </span>
        </div>
        <p className="section-sub">规划中：2D 地图 · 3D 地球视图 · 室内导航</p>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: '🗺️', title: '2D 交互地图', desc: 'Leaflet / 高德地图 · 景点标记 · 路线可视化', badge: 'Phase 2 开发中', accent: '#38bdf8' },
            { icon: '🌍', title: '3D 地球视图', desc: 'CesiumJS · 全球景点分布 · 飞线动画', badge: 'Phase 3 规划中', accent: '#2dd4bf' },
            { icon: '🏫', title: '校园室内导航', desc: '北大校园路径 · 20+ 建筑节点 · 步行路线', badge: '立即体验', accent: '#a78bfa', to: '/route' },
          ].map(item => (
            <div key={item.title}
              className="group p-6 rounded-2xl transition-all duration-200 cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px dashed rgba(255,255,255,0.10)` }}
              onMouseEnter={e => { e.currentTarget.style.border = `1px dashed ${item.accent}40`; e.currentTarget.style.background = `${item.accent}06`; }}
              onMouseLeave={e => { e.currentTarget.style.border = '1px dashed rgba(255,255,255,0.10)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
              onClick={() => item.to && navigate(item.to)}
            >
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-200">{item.icon}</div>
              <h3 className="font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.85)' }}>{item.title}</h3>
              <p className="text-sm mb-3" style={{ color: 'rgba(255,255,255,0.38)' }}>{item.desc}</p>
              <span className="text-xs font-medium px-3 py-1 rounded-full"
                style={{ background: `${item.accent}12`, color: item.accent, border: `1px solid ${item.accent}25` }}>
                {item.badge}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════ 核心功能 ════════════════════════════════ */}
      <section className="py-16" style={{ background: 'linear-gradient(180deg, #070b18 0%, #0a1020 50%, #070b18 100%)' }}>
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="section-title text-center mb-2">核心功能</h2>
          <p className="section-sub text-center mb-10">每个功能均内置自主实现的算法与数据结构</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FeatureCard icon="🗺️" title="景点发现"    to="/spots"   accentColor="#0ea5e9"
              desc="200+ 景区高校，Trie 前缀搜索 + 倒排索引全文检索" badge="Trie + TopK" />
            <FeatureCard icon="🧭" title="路线规划"    to="/route"   accentColor="#14b8a6"
              desc="Dijkstra 单点最短路 + 最近邻 2-opt 多点路径优化" badge="Dijkstra + 2-opt" />
            <FeatureCard icon="📖" title="旅行日记"    to="/diary"   accentColor="#818cf8"
              desc="KMP 精确检索 / 倒排索引全文检索，发布与分享" badge="KMP + 倒排索引" />
            <FeatureCard icon="🌏" title="动态广场"    to="/plaza"   accentColor="#fb923c"
              desc="旅行动态社交广场，热门排行，MinHeap 实时排序" badge="MinHeap 排序" />
          </div>
        </div>
      </section>

      {/* ═══════════════════════ 热门日记预览 ════════════════════════════════ */}
      {hotDiaries.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-1">
            <h2 className="section-title">热门旅行日记</h2>
            <Link to="/diary" className="text-sm" style={{ color: '#38bdf8' }}>查看全部 →</Link>
          </div>
          <p className="section-sub">最受旅行者喜爱的日记</p>
          <div className="grid md:grid-cols-3 gap-5">
            {hotDiaries.map(diary => (
              <div key={diary.id} className="card p-5 flex flex-col hover:scale-[1.01] transition-transform duration-200">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{diary.userAvatar}</span>
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>{diary.userName}</div>
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.30)' }}>
                      {diary.spotName && `📍 ${diary.spotName} · `}{diary.visitDate}
                    </div>
                  </div>
                </div>
                <h3 className="font-semibold mb-2 line-clamp-1" style={{ color: 'rgba(255,255,255,0.88)' }}>{diary.title}</h3>
                <p className="text-sm line-clamp-3 flex-1" style={{ color: 'rgba(255,255,255,0.45)' }}>{diary.content}</p>
                <div className="flex items-center gap-3 mt-4 pt-3 text-xs" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.30)' }}>
                  <span>❤️ {diary.likes}</span>
                  <span>💬 {typeof diary.comments === 'number' ? diary.comments : (diary.comments?.length || 0)}</span>
                  <div className="ml-auto flex flex-wrap gap-1">
                    {(diary.tags || []).slice(0, 2).map(tag => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}>
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
      <section className="py-14" style={{ background: 'linear-gradient(135deg, #050a15, #070f22)' }}>
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'rgba(255,255,255,0.90)' }}>
            课程设计算法实现
          </h2>
          <p className="text-sm mb-10" style={{ color: 'rgba(255,255,255,0.30)' }}>
            每个核心功能均使用自主实现的数据结构与算法
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
            {[
              { name: 'MinHeap TopK',   desc: 'O(N log K) 景点评分推荐',   icon: '⛏️', color: '#38bdf8' },
              { name: 'Dijkstra',        desc: 'O((V+E)logV) 最短路径',     icon: '🛤️', color: '#2dd4bf' },
              { name: '最近邻 + 2-opt',  desc: 'TSP 多点路径优化',          icon: '🔄', color: '#a78bfa' },
              { name: 'Trie + 编辑距离', desc: 'O(m) 前缀 & 模糊搜索',     icon: '🔍', color: '#fb923c' },
              { name: 'KMP',             desc: 'O(m+n) 字符串精确匹配',    icon: '🔎', color: '#f472b6' },
              { name: '倒排索引',         desc: 'O(1) 词项查询全文检索',    icon: '📚', color: '#fcd34d' },
            ].map(algo => (
              <div key={algo.name}
                className="p-4 rounded-xl text-left transition-all duration-200 hover:scale-[1.02]"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${algo.color}35`; e.currentTarget.style.background = `${algo.color}08`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              >
                <div className="text-2xl mb-2">{algo.icon}</div>
                <div className="font-semibold text-sm mb-0.5" style={{ color: 'rgba(255,255,255,0.88)' }}>{algo.name}</div>
                <div className="text-xs" style={{ color: algo.color + 'aa' }}>{algo.desc}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/algo"
              className="text-sm font-semibold px-6 py-2.5 rounded-2xl transition-all duration-200"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.80)' }}>
              ⚙️ 交互式算法演示
            </Link>
            <Link to="/route"
              className="text-sm font-semibold px-6 py-2.5 rounded-2xl transition-all duration-200"
              style={{ background: 'linear-gradient(135deg,#14b8a6,#0ea5e9)', color: '#fff', boxShadow: '0 2px 16px rgba(20,184,166,0.25)' }}>
              🧭 立即体验路线规划
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
