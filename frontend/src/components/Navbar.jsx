import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const NAV_LINKS = [
  { to: '/',        label: '首页',    icon: '🏠' },
  { to: '/spots',   label: '发现',    icon: '🗺️' },
  { to: '/route',   label: '路线',    icon: '🧭' },
  { to: '/diary',   label: '日记',    icon: '📖' },
  { to: '/plaza',   label: '广场',    icon: '🌏' },
  { to: '/profile', label: '旅行者',  icon: '👥' },
  { to: '/algo',    label: '算法',    icon: '⚙️' },
];

export default function Navbar() {
  const { pathname }            = useLocation();
  const navigate                = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isGuest, isLoggedIn, logout } = useAuth();

  const handleLogout = () => { logout(); navigate('/auth'); };

  return (
    <nav
      className="sticky top-0 z-50"
      style={{
        background: 'rgba(7,11,24,0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-15" style={{ height: '60px' }}>

          {/* ── Logo ── */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <span
              className="text-2xl group-hover:scale-110 transition-transform duration-200"
              style={{ filter: 'drop-shadow(0 0 8px rgba(14,165,233,0.5))' }}
            >
              🧭
            </span>
            <span
              className="hidden sm:block font-bold text-lg tracking-wide"
              style={{
                background: 'linear-gradient(135deg, #38bdf8, #2dd4bf)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Our Tour
            </span>
          </Link>

          {/* ── Desktop Nav ── */}
          <div className="hidden lg:flex items-center gap-0.5">
            {NAV_LINKS.map(link => {
              const active = pathname === link.to;
              return (
                <Link key={link.to} to={link.to}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                  style={{
                    color: active ? '#38bdf8' : 'rgba(255,255,255,0.50)',
                    background: active ? 'rgba(14,165,233,0.10)' : 'transparent',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.80)'; e.currentTarget.style.background = active ? 'rgba(14,165,233,0.10)' : 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = active ? '#38bdf8' : 'rgba(255,255,255,0.50)'; e.currentTarget.style.background = active ? 'rgba(14,165,233,0.10)' : 'transparent'; }}
                >
                  <span className="text-sm">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* ── 右侧用户区 ── */}
          <div className="flex items-center gap-2 shrink-0">
            {isLoggedIn ? (
              <>
                <Link to="/explore"
                  className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200"
                  style={{ background: 'linear-gradient(135deg,#0ea5e9,#14b8a6)', color: '#fff', boxShadow: '0 2px 10px rgba(14,165,233,0.25)' }}>
                  🌍 探索
                </Link>
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
                >
                  <span className="text-lg">{user.avatar}</span>
                  <span className="text-xs hidden sm:block max-w-[80px] truncate" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    {user.nickname}
                  </span>
                </div>
                <button onClick={handleLogout} title="退出登录"
                  className="text-xs px-2 py-1.5 rounded-lg transition-all duration-200"
                  style={{ color: 'rgba(255,255,255,0.30)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.30)'; e.currentTarget.style.background = 'transparent'; }}
                >
                  退出
                </button>
              </>
            ) : isGuest ? (
              <>
                <span className="hidden sm:flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg"
                  style={{ color: '#fcd34d', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                  👤 访客
                </span>
                <Link to="/auth"
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200"
                  style={{ background: 'rgba(14,165,233,0.12)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.25)' }}>
                  登录 / 注册
                </Link>
              </>
            ) : (
              <Link to="/auth"
                className="text-xs font-semibold px-4 py-2 rounded-xl transition-all duration-200"
                style={{ background: 'linear-gradient(135deg,#0ea5e9,#0891b2)', color: '#fff', boxShadow: '0 2px 12px rgba(14,165,233,0.22)' }}>
                登录 / 注册
              </Link>
            )}

            {/* 移动端菜单按钮 */}
            <button
              className="lg:hidden p-2 rounded-lg text-lg ml-1 transition-all duration-150"
              style={{ color: 'rgba(255,255,255,0.55)' }}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </div>

      {/* 访客横幅 */}
      {isGuest && (
        <div className="px-4 py-2 flex items-center justify-between text-xs"
          style={{ background: 'rgba(245,158,11,0.07)', borderTop: '1px solid rgba(245,158,11,0.12)' }}>
          <span style={{ color: '#fcd34d' }}>👤 访客模式 — 点赞、发帖等互动功能需登录后使用</span>
          <Link to="/auth" className="font-semibold hover:underline shrink-0" style={{ color: '#fcd34d' }}>立即登录 →</Link>
        </div>
      )}

      {/* 移动端菜单 */}
      {menuOpen && (
        <div className="lg:hidden px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(7,11,24,0.96)' }}>
          <div className="grid grid-cols-4 gap-2">
            {NAV_LINKS.map(link => {
              const active = pathname === link.to;
              return (
                <Link key={link.to} to={link.to} onClick={() => setMenuOpen(false)}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-medium transition-all duration-150"
                  style={{
                    color: active ? '#38bdf8' : 'rgba(255,255,255,0.45)',
                    background: active ? 'rgba(14,165,233,0.10)' : 'transparent',
                  }}>
                  <span className="text-xl">{link.icon}</span>
                  <span className="leading-tight text-center">{link.label}</span>
                </Link>
              );
            })}
          </div>
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {isLoggedIn ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{user.avatar}</span>
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>{user.nickname}</div>
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{user.level}</div>
                  </div>
                </div>
                <button onClick={() => { handleLogout(); setMenuOpen(false); }}
                  className="text-xs px-3 py-1.5 rounded-lg"
                  style={{ color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
                  退出
                </button>
              </div>
            ) : (
              <Link to="/auth" onClick={() => setMenuOpen(false)}
                className="block text-center text-sm font-semibold py-2.5 rounded-xl"
                style={{ background: 'linear-gradient(135deg,#0ea5e9,#14b8a6)', color: '#fff' }}>
                登录 / 注册
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
