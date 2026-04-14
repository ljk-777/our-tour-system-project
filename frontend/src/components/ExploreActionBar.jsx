import { Link } from 'react-router-dom';
import BrandIcon from './BrandIcon.jsx';

/**
 * ExploreActionBar — Explore 页面顶部玻璃导航栏
 *
 * 升级路线:
 *   Phase 2: 支持通知徽章、好友在线状态
 *   Phase 3: 集成地图视角切换（2D/3D/卫星）
 *
 * @param {object}   user      当前用户对象（null 时为访客）
 * @param {boolean}  isGuest   是否访客模式
 * @param {function} onSearch  打开搜索覆盖层
 * @param {function} onLogout  退出登录
 */
export default function ExploreActionBar({ user, isGuest, onSearch, onLogout }) {
  return (
    <div className="absolute top-0 left-0 right-0 z-30 px-4 pt-4">
      <div
        className="rounded-2xl px-4 py-2.5 flex items-center gap-3"
        style={{
          background: 'rgba(7,11,24,0.70)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.09)',
        }}
      >
        {/* Logo */}
        <Link to="/explore" className="flex items-center gap-2 shrink-0 group">
          <BrandIcon size={26} variant="light"
            className="group-hover:scale-110 transition-transform duration-200"
            style={{ filter: 'drop-shadow(0 0 8px rgba(14,165,233,0.55))' }} />
          <div className="hidden sm:flex flex-col leading-none">
            <span className="font-bold text-sm tracking-tight"
              style={{ background: 'linear-gradient(135deg,#38bdf8,#2dd4bf)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              迹刻
            </span>
            <span className="text-[9px] font-medium tracking-widest uppercase" style={{ color: 'rgba(56,189,248,0.45)' }}>waylog</span>
          </div>
        </Link>

        {/* 搜索触发按钮 */}
        <button onClick={onSearch}
          className="flex-1 flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-left transition-all duration-200"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.35)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
        >
          <span>🔍</span>
          <span className="hidden sm:block">搜索景点、城市...</span>
          <span className="sm:hidden">搜索</span>
          <span className="ml-auto text-xs font-mono hidden md:block" style={{ color: 'rgba(14,165,233,0.40)' }}>Trie</span>
        </button>

        {/* 快捷导航 */}
        <nav className="hidden md:flex items-center gap-0.5">
          {[
            { to: '/spots',   icon: '🗺️', tip: '发现景点' },
            { to: '/route',   icon: '🧭', tip: '路线规划' },
            { to: '/diary',   icon: '📖', tip: '旅行日记' },
            { to: '/plaza',   icon: '🌏', tip: '动态广场' },
            { to: '/algo',    icon: '⚙️', tip: '算法演示' },
          ].map(item => (
            <Link key={item.to} to={item.to} title={item.tip}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-base transition-all duration-150"
              style={{ color: 'rgba(255,255,255,0.45)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.80)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
            >
              {item.icon}
            </Link>
          ))}
        </nav>

        {/* 用户信息 */}
        {user ? (
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
              <span className="text-base">{user.avatar || '🧭'}</span>
              <span className="text-xs hidden sm:block max-w-[80px] truncate" style={{ color: 'rgba(255,255,255,0.65)' }}>
                {user.nickname || user.username}
              </span>
            </div>
            <button onClick={onLogout} title="退出登录"
              className="w-8 h-8 flex items-center justify-center rounded-xl text-sm transition-all duration-150"
              style={{ color: 'rgba(255,255,255,0.28)' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.10)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.28)'; e.currentTarget.style.background = 'transparent'; }}
            >
              ⏏
            </button>
          </div>
        ) : isGuest ? (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs px-2.5 py-1 rounded-lg hidden sm:block"
              style={{ color: '#fcd34d', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
              👤 访客
            </span>
            <Link to="/auth"
              className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all duration-200"
              style={{ background: 'rgba(14,165,233,0.12)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.25)' }}>
              登录
            </Link>
          </div>
        ) : (
          <Link to="/auth"
            className="shrink-0 text-xs font-semibold px-4 py-2 rounded-xl transition-all duration-200"
            style={{ background: 'linear-gradient(135deg,#0ea5e9,#14b8a6)', color: '#fff', boxShadow: '0 2px 10px rgba(14,165,233,0.25)' }}>
            登录
          </Link>
        )}
      </div>
    </div>
  );
}
