import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
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
  const [scrolled, setScrolled] = useState(false);
  const { user, isGuest, isLoggedIn, logout } = useAuth();

  const handleLogout = () => { logout(); navigate('/auth'); };

  /* 滚动监听 */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* 首页顶部时透明 */
  const isHome = pathname === '/';
  const transparent = isHome && !scrolled;
  const textColor  = transparent ? 'rgba(255,255,255,0.92)' : '#6e6e73';
  const logoColor  = transparent ? '#fff' : '#1d1d1f';
  const subColor   = transparent ? 'rgba(255,255,255,0.45)' : '#aeaeb2';

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: transparent ? 'transparent' : 'rgba(255,255,255,0.80)',
      backdropFilter: transparent ? 'none' : 'blur(40px) saturate(1.8)',
      WebkitBackdropFilter: transparent ? 'none' : 'blur(40px) saturate(1.8)',
      borderBottom: transparent ? 'none' : '1px solid rgba(255,255,255,0.65)',
      boxShadow: transparent ? 'none' : '0 1px 0 rgba(0,0,0,0.05), 0 4px 32px rgba(0,0,0,0.05)',
      transition: 'background 0.4s ease, backdrop-filter 0.4s ease, box-shadow 0.4s ease, border-color 0.4s ease',
    }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between" style={{ height: '52px' }}>

          {/* ── Logo ── */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <BrandIcon size={28} variant="dark" />
            <div className="hidden sm:flex flex-col leading-none">
              <span className="font-bold text-base tracking-tight" style={{ color: logoColor, transition: 'color 0.4s ease' }}>迹刻</span>
              <span className="text-[10px] font-medium tracking-widest uppercase" style={{ color: subColor, transition: 'color 0.4s ease' }}>waylog</span>
            </div>
          </Link>

          {/* ── Desktop Nav ── */}
          <div className="hidden lg:flex items-center gap-0.5">
            {NAV_LINKS.map(link => {
              const active = pathname === link.to;
              const linkColor = transparent
                ? (active ? '#fff' : 'rgba(255,255,255,0.75)')
                : (active ? '#0071e3' : '#6e6e73');
              const linkBg = transparent
                ? (active ? 'rgba(255,255,255,0.15)' : 'transparent')
                : (active ? 'rgba(0,113,227,0.08)' : 'transparent');
              return (
                <Link key={link.to} to={link.to}
                  className="px-3.5 py-1.5 rounded-lg text-sm font-medium"
                  style={{ color: linkColor, background: linkBg, transition: 'color 0.3s ease, background 0.15s ease' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = transparent ? '#fff' : '#1d1d1f';
                    e.currentTarget.style.background = transparent ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.04)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = linkColor;
                    e.currentTarget.style.background = linkBg;
                  }}
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
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                  style={{
                    background: transparent ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.62)',
                    border: '1px solid ' + (transparent ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.82)'),
                    backdropFilter: 'blur(10px)', borderRadius: '0.75rem',
                    transition: 'all 0.4s ease',
                  }}>
                  {user.avatar?.startsWith('data:') ? (
                    <img src={user.avatar} alt="avatar" className="w-6 h-6 rounded-full object-cover shrink-0" />
                  ) : (
                    <span className="text-base shrink-0">{user.avatar}</span>
                  )}
                  <span className="text-xs font-medium max-w-[80px] truncate" style={{ color: logoColor, transition: 'color 0.4s ease' }}>
                    {user.nickname}
                  </span>
                </div>
                <button onClick={handleLogout} title="退出登录"
                  className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-150"
                  style={{ color: textColor }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ff3b30'; e.currentTarget.style.background = transparent ? 'rgba(255,59,48,0.2)' : '#fff1f0'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = textColor; e.currentTarget.style.background = 'transparent'; }}
                >退出</button>
              </>
            ) : isGuest ? (
              <>
                <span className="hidden sm:inline text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{
                    color: transparent ? 'rgba(255,255,255,0.8)' : '#ff9500',
                    background: transparent ? 'rgba(255,255,255,0.12)' : '#fff6e5',
                    transition: 'all 0.4s ease',
                  }}>访客模式</span>
                <Link to="/auth" className="text-xs font-semibold px-4 py-1.5 rounded-lg transition-all duration-150"
                  style={{
                    background: transparent ? 'rgba(255,255,255,0.18)' : '#0071e3',
                    color: '#fff', border: transparent ? '1px solid rgba(255,255,255,0.3)' : 'none',
                    backdropFilter: transparent ? 'blur(8px)' : 'none',
                    transition: 'all 0.4s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = transparent ? 'rgba(255,255,255,0.28)' : '#0077ed'}
                  onMouseLeave={e => e.currentTarget.style.background = transparent ? 'rgba(255,255,255,0.18)' : '#0071e3'}>
                  登录
                </Link>
              </>
            ) : (
              <Link to="/auth" className="text-xs font-semibold px-4 py-1.5 rounded-lg transition-all duration-150"
                style={{
                  background: transparent ? 'rgba(255,255,255,0.18)' : '#0071e3',
                  color: '#fff', border: transparent ? '1px solid rgba(255,255,255,0.3)' : 'none',
                  backdropFilter: transparent ? 'blur(8px)' : 'none',
                  transition: 'all 0.4s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = transparent ? 'rgba(255,255,255,0.28)' : '#0077ed'}
                onMouseLeave={e => e.currentTarget.style.background = transparent ? 'rgba(255,255,255,0.18)' : '#0071e3'}>
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
        <div className="px-4 py-1.5 flex items-center justify-between text-xs"
          style={{
            background: transparent ? 'rgba(0,0,0,0.25)' : '#fff6e5',
            backdropFilter: transparent ? 'blur(8px)' : 'none',
            borderTop: transparent ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,149,0,0.15)',
            transition: 'all 0.4s ease',
          }}>
          <span style={{ color: transparent ? 'rgba(255,255,255,0.7)' : '#b36200', transition: 'color 0.4s ease' }}>
            访客模式 — 点赞、发帖等互动功能需登录后使用
          </span>
          <Link to="/auth" className="font-semibold hover:underline shrink-0"
            style={{ color: transparent ? 'rgba(255,255,255,0.9)' : '#ff9500', transition: 'color 0.4s ease' }}>
            立即登录 →
          </Link>
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
