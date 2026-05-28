import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import BrandIcon from './BrandIcon.jsx';

const NAV_LINKS = [
  { to: '/',        label: '首页'   },
  { to: '/spots',   label: '发现'   },
  { to: '/foods',   label: '美食'   },
  { to: '/route',   label: '路线'   },
  { to: '/diary',   label: '日记'   },
  { to: '/plaza',   label: '广场'   },
  { to: '/profile', label: '旅行者' },
  { to: '/globe',   label: '🌍 星球' },
];

const DROPDOWN_ITEMS = [
  { icon: '🗺️', label: '我的主页',   to: '/profile',  desc: '查看旅行足迹与成就' },
  { icon: '📝', label: '旅行日记',   to: '/diary',    desc: '记录与浏览旅行故事' },
  { icon: '🏔️', label: '发现景点',   to: '/spots',    desc: '探索全国热门景区' },
  { icon: '🛣️', label: '规划路线',   to: '/route',    desc: 'Dijkstra智能路径规划' },
  { icon: '🍜', label: '美食推荐',   to: '/foods',    desc: '当地特色美食导航' },
  { icon: '🌍', label: '3D 星球',    to: '/globe',    desc: '互动地球探索模式' },
  { icon: '🏙️', label: '旅行广场',   to: '/plaza',    desc: '社区动态与精选内容' },
];

const LEVEL_COLOR = {
  '旅行新手':  '#86868b',
  '旅行达人':  '#0071e3',
  '资深旅行者':'#9333ea',
  '探险家':    '#f97316',
  '美食家':    '#ef4444',
  '文化学者':  '#d97706',
  '尊享会员':  '#eab308',
  '超级管理员':'#6b7280',
};

function UserDropdown({ user, transparent, onClose, onLogout }) {
  const lvlColor = LEVEL_COLOR[user.level] || '#f97316';
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 10px)', right: 0,
      width: 270, borderRadius: 18, overflow: 'hidden', zIndex: 200,
      background: 'rgba(255,255,255,0.82)',
      backdropFilter: 'blur(40px) saturate(2)',
      WebkitBackdropFilter: 'blur(40px) saturate(2)',
      border: '1px solid rgba(255,255,255,0.9)',
      boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 1px 0 rgba(255,255,255,0.9) inset',
    }}>
      {/* 用户信息头 */}
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(249,115,22,0.08)', border: '2px solid rgba(249,115,22,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', flexShrink: 0 }}>
            {user.avatar?.startsWith('data:') ? (
              <img src={user.avatar} alt="avatar" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover' }} />
            ) : user.avatar}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1d1d1f', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em', truncate: true, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.nickname}
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: lvlColor, marginTop: 2, fontFamily: 'Inter, sans-serif' }}>
              @{user.username} · {user.level}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#aeaeb2', marginTop: 1, fontFamily: 'Inter, sans-serif' }}>
              {user.city || '旅行中'}
            </div>
          </div>
        </div>
      </div>

      {/* 菜单项 */}
      <div style={{ padding: '6px 8px' }}>
        {DROPDOWN_ITEMS.map((item, i) => (
          <Link key={item.to} to={item.to} onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 10, textDecoration: 'none',
              transition: 'background 0.15s ease',
              marginBottom: i < DROPDOWN_ITEMS.length - 1 ? 1 : 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(249,115,22,0.07)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(249,115,22,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
              {item.icon}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1d1d1f', fontFamily: 'Inter, sans-serif' }}>{item.label}</div>
              <div style={{ fontSize: '0.68rem', color: '#aeaeb2', fontFamily: 'Inter, sans-serif', marginTop: 1 }}>{item.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* 退出按钮 */}
      <div style={{ padding: '6px 8px 10px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <button onClick={onLogout}
          style={{
            width: '100%', padding: '9px 10px', borderRadius: 10,
            background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,59,48,0.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <span style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,59,48,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
            🚪
          </span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ff3b30', fontFamily: 'Inter, sans-serif' }}>退出登录</div>
            <div style={{ fontSize: '0.68rem', color: '#aeaeb2', fontFamily: 'Inter, sans-serif', marginTop: 1 }}>结束当前旅行会话</div>
          </div>
        </button>
      </div>
    </div>
  );
}

export default function Navbar() {
  const { pathname }              = useLocation();
  const navigate                  = useNavigate();
  const [menuOpen, setMenuOpen]   = useState(false);
  const [scrolled, setScrolled]   = useState(false);
  const [dropOpen, setDropOpen]   = useState(false);
  const dropRef                   = useRef(null);
  const { user, isGuest, isLoggedIn, logout } = useAuth();

  const handleLogout = () => { setDropOpen(false); logout(); navigate('/auth'); };

  /* 点击外部关闭下拉 */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <nav className="sticky top-0 z-50" style={{
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
            <div className="flex flex-col leading-none">
              <span className="font-bold text-sm tracking-tight" style={{ color: logoColor, transition: 'color 0.4s ease' }}>迹刻</span>
              <span className="text-[9px] font-medium tracking-widest uppercase" style={{ color: subColor, transition: 'color 0.4s ease' }}>waylog</span>
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
              /* 头像 + 下拉菜单 */
              <div ref={dropRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setDropOpen(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '5px 10px 5px 6px', borderRadius: 14, cursor: 'pointer',
                    background: dropOpen
                      ? (transparent ? 'rgba(255,255,255,0.25)' : 'rgba(249,115,22,0.08)')
                      : (transparent ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.62)'),
                    border: '1px solid ' + (transparent ? 'rgba(255,255,255,0.25)' : (dropOpen ? 'rgba(249,115,22,0.3)' : 'rgba(255,255,255,0.82)')),
                    backdropFilter: 'blur(10px)', transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => { if (!dropOpen) { e.currentTarget.style.background = transparent ? 'rgba(255,255,255,0.2)' : 'rgba(249,115,22,0.06)'; } }}
                  onMouseLeave={e => { if (!dropOpen) { e.currentTarget.style.background = transparent ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.62)'; } }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(249,115,22,0.12)', border: '1.5px solid rgba(249,115,22,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                    {user.avatar?.startsWith('data:') ? (
                      <img src={user.avatar} alt="avatar" style={{ width: 26, height: 26, borderRadius: 7, objectFit: 'cover' }} />
                    ) : user.avatar}
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: logoColor, maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'color 0.4s ease' }}>
                    {user.nickname}
                  </span>
                  <svg width="10" height="10" viewBox="0 0 10 10" style={{ flexShrink: 0, transform: dropOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease', color: transparent ? 'rgba(255,255,255,0.5)' : '#86868b' }}>
                    <path d="M1 3L5 7L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                </button>

                {dropOpen && (
                  <UserDropdown
                    user={user}
                    transparent={transparent}
                    onClose={() => setDropOpen(false)}
                    onLogout={handleLogout}
                  />
                )}
              </div>
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
              style={{
                color: textColor,
                background: transparent ? 'rgba(255,255,255,0.12)' : 'transparent',
                border: transparent ? '1px solid rgba(255,255,255,0.2)' : 'none',
                transition: 'all 0.4s ease',
              }}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </div>

      {/* 访客横幅 — 透明态隐藏，避免遮挡背景图 */}
      {isGuest && !transparent && (
        <div className="px-4 py-1.5 flex items-center justify-between text-xs"
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
                <Link to="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                  <span className="text-xl">{user.avatar}</span>
                  <div>
                    <div className="text-sm font-medium" style={{ color: '#1d1d1f' }}>{user.nickname}</div>
                    <div className="text-xs" style={{ color: '#86868b' }}>{user.level}</div>
                  </div>
                </Link>
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
