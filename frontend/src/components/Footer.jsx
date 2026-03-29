import { Link, useLocation } from 'react-router-dom';

const NAV_LINKS = [
  { to: '/',        label: '首页',   icon: '🏠' },
  { to: '/spots',   label: '发现',   icon: '🗺️' },
  { to: '/route',   label: '路线',   icon: '🧭' },
  { to: '/diary',   label: '日记',   icon: '📖' },
  { to: '/plaza',   label: '广场',   icon: '🌏' },
  { to: '/profile', label: '旅行者', icon: '👥' },
  { to: '/algo',    label: '算法',   icon: '⚙️' },
];

const SECTIONS = [
  {
    title: '功能导航',
    links: [
      { to: '/',        label: '系统首页' },
      { to: '/spots',   label: '景点发现' },
      { to: '/route',   label: '路线规划' },
      { to: '/diary',   label: '旅行日记' },
    ],
  },
  {
    title: '社区与更多',
    links: [
      { to: '/plaza',   label: '动态广场' },
      { to: '/profile', label: '旅行者社区' },
      { to: '/algo',    label: '算法演示' },
      { to: '/explore', label: '探索主界面' },
    ],
  },
  {
    title: '核心算法',
    items: [
      { color: '#38bdf8', text: 'Dijkstra 最短路径' },
      { color: '#fcd34d', text: 'MinHeap TopK 推荐' },
      { color: '#2dd4bf', text: 'Trie 前缀补全' },
      { color: '#f87171', text: 'KMP 字符串匹配' },
      { color: '#a78bfa', text: '2-opt 路径优化' },
      { color: '#fb923c', text: '倒排索引全文检索' },
    ],
  },
];

export function FooterFull() {
  return (
    <footer style={{ background: '#05091a', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6">
        {/* 上方区域 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 pb-8"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>

          {/* 品牌 */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="text-2xl" style={{ filter: 'drop-shadow(0 0 6px rgba(14,165,233,0.4))' }}>🧭</span>
              <span className="font-bold text-lg"
                style={{ background: 'linear-gradient(135deg,#38bdf8,#2dd4bf)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Our Tour
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.32)' }}>
              旅游系统课程设计项目，涵盖景点发现、智能路线规划、旅行日记、算法可视化演示等功能。
            </p>
            <div className="mt-4 text-xs" style={{ color: 'rgba(255,255,255,0.18)' }}>
              265 景点 · 210+ 道路 · 11 用户
            </div>
            {/* Phase 标注 */}
            <div className="mt-4 flex flex-col gap-1">
              {['Phase 1: 当前版本 ✓', 'Phase 2: 地图集成 →', 'Phase 3: 3D 地球 →'].map((p, i) => (
                <div key={p} className="text-xs font-mono"
                  style={{ color: i === 0 ? 'rgba(14,165,233,0.60)' : 'rgba(255,255,255,0.15)' }}>
                  {p}
                </div>
              ))}
            </div>
          </div>

          {/* 导航列 */}
          {SECTIONS.map(s => (
            <div key={s.title}>
              <h4 className="text-xs font-semibold mb-4 tracking-widest uppercase"
                style={{ color: 'rgba(255,255,255,0.30)' }}>
                {s.title}
              </h4>
              {s.links && (
                <ul className="space-y-2.5">
                  {s.links.map(l => (
                    <li key={l.to}>
                      <Link to={l.to}
                        className="text-sm transition-colors duration-150"
                        style={{ color: 'rgba(255,255,255,0.38)' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#38bdf8'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.38)'}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {s.items && (
                <ul className="space-y-2">
                  {s.items.map(item => (
                    <li key={item.text} className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.30)' }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: item.color, boxShadow: `0 0 5px ${item.color}60` }} />
                      {item.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* 版权行 */}
        <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs"
          style={{ color: 'rgba(255,255,255,0.18)' }}>
          <div>© 2025 Our Tour System · 旅游系统课程设计</div>
          <div className="flex items-center gap-4">
            <span>React + Vite + Tailwind</span>
            <span>Node.js + Express</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ── 移动端底部固定导航 ──────────────────────────────────────── */
export function MobileBottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(7,11,24,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
      <div className="grid grid-cols-7 h-14">
        {NAV_LINKS.map(link => {
          const active = pathname === link.to;
          return (
            <Link key={link.to} to={link.to}
              className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-all duration-150"
              style={{ color: active ? '#38bdf8' : 'rgba(255,255,255,0.35)' }}>
              <span className={`text-lg leading-none transition-transform duration-200 ${active ? 'scale-110' : ''}`}>
                {link.icon}
              </span>
              <span className="leading-tight">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
