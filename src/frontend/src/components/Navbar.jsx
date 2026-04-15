import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import BrandIcon from './BrandIcon.jsx';

const NAV_LINKS = [
  { to: '/',        label: '首页'   },
  { to: '/spots',   label: '发现'   },
  { to: '/route',   label: '路线'   },
  { to: '/diary',   label: '日记'   },
  { to: '/plaza',   label: '广场'   },
  { to: '/profile', label: '旅行者' },
  { to: '/algo',    label: '算法'   },
];

export default function Navbar() {
  const { pathname }            = useLocation();
  const navigate                = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isGuest, isLoggedIn, logout } = useAuth();

  const handleLogout = () => { logout(); navigate('/auth'); };

  return (
    <nav
      className="sticky top-0 z-50 glass-nav"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between" style={{ height: '52px' }}>

          {/* ── Logo ── */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <BrandIcon size={28} variant="dark" />
            <div className="hidden sm:flex flex-col leading-none">
              <span className="font-bold text-base tracking-tight" style={{ color: '#1d1d1f' }}>迹刻</span>
              <span className="text-[10px] font-medium tracking-widest uppercase" style={{ color: '#aeaeb2' }}>waylog</span>
            </div>
          </Link>

          {/* ── Desktop Nav ── */}
          <div className="hidden lg:flex items-center gap-0.5">
            {NAV_LINKS.map(link => {
              const active = pathname === link.to;
              return (
                <Link key={link.to} to={link.to}
                  className="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
                  style={{
                    color: active ? '#0071e3' : '#6e6e73',
                    background: active ? 'rgba(0,113,227,0.08)' : 'transparent',
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.color = '#1d1d1f'; e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; } }}
                  onMouseLeave={e => { e.currentTarget.style.color = active ? '#0071e3' : '#6e6e73'; e.currentTarget.style.background = active ? 'rgba(0,113,227,0.08)' : 'transparent'; }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* ── 右侧用户区 ── */}
          <div className="flex items-center gap-2 shrink-0">
            {isLoggedIn ? (
              <>
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-btn"
                  style={{ borderRadius: '0.75rem' }}>
                  {user.avatar?.startsWith('data:') ? (
                    <img src={user.avatar} alt="avatar"
                      className="w-6 h-6 rounded-full object-cover shrink-0" />
                  ) : (
                    <span className="text-base shrink-0">{user.avatar}</span>
                  )}
                  <span className="text-xs font-medium max-w-[80px] truncate" style={{ color: '#1d1d1f' }}>
                    {user.nickname}
                  </span>
                </div>
                <button onClick={handleLogout} title="退出登录"
                  className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-150"
                  style={{ color: '#6e6e73' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ff3b30'; e.currentTarget.style.background = '#fff1f0'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#6e6e73'; e.currentTarget.style.background = 'transparent'; }}
                >
                  退出
                </button>
              </>
            ) : isGuest ? (
              <>
                <span className="hidden sm:inline text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{ color: '#ff9500', background: '#fff6e5' }}>
                  访客模式
                </span>
                <Link to="/auth"
                  className="text-xs font-semibold px-4 py-1.5 rounded-lg transition-all duration-150"
                  style={{ background: '#0071e3', color: '#fff' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#0077ed'}
                  onMouseLeave={e => e.currentTarget.style.background = '#0071e3'}>
                  登录
                </Link>
              </>
            ) : (
              <Link to="/auth"
                className="text-xs font-semibold px-4 py-1.5 rounded-lg transition-all duration-150"
                style={{ background: '#0071e3', color: '#fff' }}
                onMouseEnter={e => e.currentTarget.style.background = '#0077ed'}
                onMouseLeave={e => e.currentTarget.style.background = '#0071e3'}>
                登录 / 注册
              </Link>
            )}

            {/* 移动端菜单按钮 */}
            <button
              className="lg:hidden p-2 rounded-lg text-base ml-1 transition-all duration-150"
              style={{ color: '#6e6e73' }}
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
          style={{ background: '#fff6e5', borderTop: '1px solid rgba(255,149,0,0.15)' }}>
          <span style={{ color: '#b36200' }}>访客模式 — 点赞、发帖等互动功能需登录后使用</span>
          <Link to="/auth" className="font-semibold hover:underline shrink-0" style={{ color: '#ff9500' }}>立即登录 →</Link>
        </div>
      )}

      {/* 移动端菜单 */}
      {menuOpen && (
        <div className="lg:hidden px-4 py-3 glass-nav"
          style={{ borderTop: '1px solid rgba(255,255,255,0.55)', borderBottom: 'none' }}>
          <div className="grid grid-cols-4 gap-2">
            {NAV_LINKS.map(link => {
              const active = pathname === link.to;
              return (
                <Link key={link.to} to={link.to} onClick={() => setMenuOpen(false)}
                  className="flex flex-col items-center gap-1 p-2.5 rounded-xl text-xs font-medium transition-all duration-150"
                  style={{
                    color: active ? '#0071e3' : '#6e6e73',
                    background: active ? 'rgba(0,113,227,0.07)' : 'transparent',
                  }}>
                  <span className="leading-tight text-center">{link.label}</span>
                </Link>
              );
            })}
          </div>
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            {isLoggedIn ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{user.avatar}</span>
                  <div>
                    <div className="text-sm font-medium" style={{ color: '#1d1d1f' }}>{user.nickname}</div>
                    <div className="text-xs" style={{ color: '#86868b' }}>{user.level}</div>
                  </div>
                </div>
                <button onClick={() => { handleLogout(); setMenuOpen(false); }}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{ color: '#ff3b30', border: '1px solid rgba(255,59,48,0.25)' }}>
                  退出
                </button>
              </div>
            ) : (
              <Link to="/auth" onClick={() => setMenuOpen(false)}
                className="block text-center text-sm font-semibold py-2.5 rounded-xl"
                style={{ background: '#0071e3', color: '#fff' }}>
                登录 / 注册
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
