import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import GlobePlaceholder  from '../components/GlobePlaceholder.jsx';
import GlassPanel        from '../components/GlassPanel.jsx';
import SearchOverlay     from '../components/SearchOverlay.jsx';
import ExploreActionBar  from '../components/ExploreActionBar.jsx';
import { useAuth }       from '../hooks/useAuth.js';
import { getTopK, getDiaries } from '../api/index.js';

/**
 * Explore — 登录后主界面 / 3D 地球主页
 *
 * ─── 升级路线 ────────────────────────────────────────────────
 * Phase 1 (当前): Canvas 模拟地球 + 玻璃面板布局
 * Phase 2:        接入 React Three Fiber 真 3D 地球
 *                 只需替换 <GlobePlaceholder> 即可，其余布局不变
 * Phase 3:        接入 CesiumJS，支持真实地理坐标和卫星底图
 * ─────────────────────────────────────────────────────────────
 */

const QUICK_ACTIONS = [
  { icon: '🗺️', label: '发现景点',  to: '/spots',   desc: 'Trie + TopK',      color: '#0ea5e9' },
  { icon: '🧭', label: '路线规划',  to: '/route',   desc: 'Dijkstra + 2-opt', color: '#14b8a6' },
  { icon: '📖', label: '旅行日记',  to: '/diary',   desc: 'KMP + 倒排索引',   color: '#a78bfa' },
  { icon: '🌏', label: '动态广场',  to: '/plaza',   desc: 'MinHeap 排序',     color: '#fb923c' },
  { icon: '👥', label: '旅行者',    to: '/profile', desc: '用户社区',         color: '#f472b6' },
  { icon: '⚙️', label: '算法演示',  to: '/algo',    desc: '课程验收',         color: '#94a3b8' },
];

export default function Explore() {
  const [showSearch, setShowSearch] = useState(false);
  const [hotSpots,   setHotSpots]   = useState([]);
  const [hotDiaries, setHotDiaries] = useState([]);
  const { user, logout, isLoggedIn, isGuest } = useAuth();
  const navigate  = useNavigate();

  // 未登录且非访客 → 重定向
  useEffect(() => {
    if (!isLoggedIn && !isGuest) navigate('/auth', { replace: true });
  }, [isLoggedIn, isGuest, navigate]);

  // 预加载热门数据（为地球热点面板准备）
  useEffect(() => {
    getTopK({ k: 5, type: 'scenic' })
      .then(r => setHotSpots(r.data.data || []))
      .catch(() => {});
    getDiaries({ sortBy: 'likes', order: 'desc', limit: 3 })
      .then(r => setHotDiaries(r.data.data || []))
      .catch(() => {});
  }, []);

  const handleLogout = () => { logout(); navigate('/auth'); };

  if (!isLoggedIn && !isGuest) return null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#02081e] animate-page-enter">

      {/* ── 宇宙背景层 ──────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* 深空渐变 */}
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, #030d2a 0%, #02081e 60%, #010510 100%)' }} />
        {/* 星云光斑 */}
        <div className="absolute top-1/4   left-1/4    w-96  h-96  bg-blue-700/8  rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4   w-[500px] h-[500px] bg-teal-700/6  rounded-full blur-[140px]" />
        <div className="absolute top-3/4   left-2/3    w-64  h-64  bg-purple-700/6 rounded-full blur-[80px]"  />
        <div className="absolute top-0     right-1/3   w-48  h-48  bg-indigo-600/5 rounded-full blur-[60px]"  />
      </div>

      {/* ── 顶部导航栏 ──────────────────────────────────────── */}
      <div style={{ animation: 'itemSlideIn 0.50s cubic-bezier(0.16,1,0.3,1) 0.05s both' }}>
      <ExploreActionBar
        user={user}
        isGuest={isGuest}
        onSearch={() => setShowSearch(true)}
        onLogout={handleLogout}
      />
      </div>

      {/* ── 地球主体（居中，占大部分视口）──────────────────── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <GlobePlaceholder
          autoRotate={true}
          className="w-[min(72vw,72vh)] h-[min(72vw,72vh)]"
          style={{ maxWidth: '680px', maxHeight: '680px' }}
        />
      </div>

      {/* ── 中心标题（地球上方）──────────────────────────────── */}
      <div className="absolute top-20 left-0 right-0 flex flex-col items-center pointer-events-none z-10 pt-2"
        style={{ animation: 'itemSlideIn 0.55s cubic-bezier(0.16,1,0.3,1) 0.18s both' }}>
        <div className="text-xs text-sky-400/50 font-mono tracking-[0.3em] uppercase mb-2">
          {user?.city || '探索世界'} · {user?.nickname || user?.username || (isGuest ? '访客旅行者' : 'Our Tour')}
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white/90 text-center tracking-wide">
          探索每一处{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-teal-400">
            美好风景
          </span>
        </h1>
        <p className="text-white/25 text-xs mt-2">旋转的光点代表热门景点 · 点击下方入口开始探索</p>
      </div>

      {/* ── 底部快捷操作面板 ─────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-5"
        style={{ animation: 'itemSlideIn 0.58s cubic-bezier(0.16,1,0.3,1) 0.30s both' }}>
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
            {QUICK_ACTIONS.map(action => (
              <Link
                key={action.to}
                to={action.to}
                className="group flex flex-col items-center gap-2 py-3.5 px-2 rounded-2xl border transition-all hover:scale-[1.04] hover:shadow-lg"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(12px)',
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = `${action.color}22`;
                  e.currentTarget.style.borderColor = `${action.color}55`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                }}
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">
                  {action.icon}
                </span>
                <span className="text-white/60 group-hover:text-white/90 text-xs font-medium transition-colors">
                  {action.label}
                </span>
                <span className="text-white/20 text-[10px] font-mono hidden sm:block group-hover:text-white/40 transition-colors">
                  {action.desc}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── 左侧热门景点面板（可收起，Phase 2 升级为地球标注）── */}
      {hotSpots.length > 0 && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 hidden xl:block">
          <GlassPanel className="rounded-2xl p-4 w-52">
            <div className="text-xs text-sky-400/60 font-mono mb-3 tracking-wider">
              🔥 热门景点 TOP 5
            </div>
            <div className="space-y-2">
              {hotSpots.map((s, i) => (
                <Link
                  key={s.id}
                  to={`/spots/${s.id}`}
                  className="flex items-center gap-2.5 py-1.5 px-2 rounded-xl hover:bg-white/8 transition-colors group"
                >
                  <span className={`text-xs font-bold w-5 text-center ${
                    i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-white/30'
                  }`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white/75 text-xs font-medium truncate group-hover:text-white">
                      {s.name}
                    </div>
                    <div className="text-white/30 text-[10px]">{s.city}</div>
                  </div>
                  <span className="text-yellow-400/70 text-[10px]">⭐{s.rating}</span>
                </Link>
              ))}
            </div>
            <Link to="/spots" className="block text-center text-sky-400/50 hover:text-sky-400/80 text-[10px] mt-3 transition-colors">
              查看全部 →
            </Link>
          </GlassPanel>
        </div>
      )}

      {/* ── 右侧热门日记面板 ─────────────────────────────────── */}
      {hotDiaries.length > 0 && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 hidden xl:block">
          <GlassPanel className="rounded-2xl p-4 w-56">
            <div className="text-xs text-purple-400/60 font-mono mb-3 tracking-wider">
              📖 热门旅行日记
            </div>
            <div className="space-y-3">
              {hotDiaries.map(d => (
                <Link
                  key={d.id}
                  to="/diary"
                  className="block hover:bg-white/8 rounded-xl p-2 transition-colors group"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">{d.userAvatar}</span>
                    <span className="text-white/40 text-[10px] truncate">{d.userName}</span>
                  </div>
                  <div className="text-white/70 text-xs font-medium line-clamp-1 group-hover:text-white">
                    {d.title}
                  </div>
                  <div className="text-white/25 text-[10px] mt-0.5">❤️ {d.likes} · {d.spotName}</div>
                </Link>
              ))}
            </div>
            <Link to="/diary" className="block text-center text-purple-400/50 hover:text-purple-400/80 text-[10px] mt-3 transition-colors">
              日记社区 →
            </Link>
          </GlassPanel>
        </div>
      )}

      {/* ── 搜索覆盖层 ───────────────────────────────────────── */}
      {showSearch && <SearchOverlay onClose={() => setShowSearch(false)} />}

      {/* ── Phase 升级指示（右下角，开发期可见）────────────────── */}
      <div className="absolute bottom-20 right-4 z-10 text-[10px] text-white/10 font-mono text-right pointer-events-none hidden lg:block">
        <div>Phase 1: Canvas Globe</div>
        <div>Phase 2: Three.js</div>
        <div>Phase 3: CesiumJS</div>
      </div>
    </div>
  );
}
