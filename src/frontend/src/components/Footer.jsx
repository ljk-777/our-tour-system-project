import { Link, useLocation } from 'react-router-dom';
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
      { color: '#0071e3', text: 'Dijkstra 最短路径' },
      { color: '#34c759', text: 'MinHeap TopK 推荐' },
      { color: '#ff9500', text: 'Trie 前缀补全' },
      { color: '#ff3b30', text: 'KMP 字符串匹配' },
      { color: '#af52de', text: '2-opt 路径优化' },
      { color: '#ff6b35', text: '倒排索引全文检索' },
    ],
  },
];

export function FooterFull() {
  return (
    <footer className="glass-footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6">
        {/* 上方区域 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 pb-8"
          style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>

          {/* 品牌 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BrandIcon size={26} variant="dark" />
              <div className="flex flex-col leading-none">
                <span className="font-bold text-base" style={{ color: '#1d1d1f' }}>迹刻</span>
                <span className="text-[10px] font-medium tracking-widest uppercase" style={{ color: '#aeaeb2' }}>waylog</span>
              </div>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#86868b' }}>
              旅游系统课程设计项目，涵盖景点发现、智能路线规划、旅行日记、算法可视化演示等功能。
            </p>
            <div className="mt-4 text-xs" style={{ color: '#aeaeb2' }}>
              265 景点 · 210+ 道路 · 11 用户
            </div>
          </div>

          {/* 导航列 */}
          {SECTIONS.map(s => (
            <div key={s.title}>
              <h4 className="text-xs font-semibold mb-4 tracking-widest uppercase"
                style={{ color: '#aeaeb2' }}>
                {s.title}
              </h4>
              {s.links && (
                <ul className="space-y-2.5">
                  {s.links.map(l => (
                    <li key={l.to}>
                      <Link to={l.to}
                        className="text-sm transition-colors duration-150"
                        style={{ color: '#6e6e73' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#0071e3'}
                        onMouseLeave={e => e.currentTarget.style.color = '#6e6e73'}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {s.items && (
                <ul className="space-y-2">
                  {s.items.map(item => (
                    <li key={item.text} className="flex items-center gap-2 text-xs" style={{ color: '#86868b' }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: item.color }} />
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
          style={{ color: '#aeaeb2' }}>
          <div>© 2025 迹刻 waylog · 旅游系统课程设计</div>
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
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-mobile-nav">
      <div className="grid grid-cols-7 h-14">
        {NAV_LINKS.map(link => {
          const active = pathname === link.to;
          return (
            <Link key={link.to} to={link.to}
              className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-all duration-150"
              style={{ color: active ? '#0071e3' : '#aeaeb2' }}>
              <span className="leading-tight">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
