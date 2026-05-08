import { motion, AnimatePresence } from 'framer-motion';
import { Search, Map, Compass, BookOpen, Navigation, X, Calendar } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Link } from 'react-router-dom';

const TABS = [
  { id: 'explore',    icon: Compass,    label: '探索' },
  { id: 'search',     icon: Search,     label: '搜索' },
  { id: 'navigation', icon: Navigation, label: '路线' },
  { id: 'diary',      icon: BookOpen,   label: '日记' },
];

const TAB_ROUTES = {
  explore: '/spots',
  search: '/spots',
  navigation: '/route',
  diary: '/diary',
};

export default function GlobeOverlay() {
  const { activeTab, setActiveTab, selectedMarker, setSelectedMarker } = useAppStore();

  return (
    <div className="absolute inset-0 pointer-events-none p-5 flex flex-col justify-between">

      {/* 顶部：品牌 + 搜索框 */}
      <header className="flex justify-between items-center pointer-events-auto">
        <Link to="/" className="flex items-center gap-3 backdrop-blur-md bg-white/5 border border-white/10
          rounded-full px-5 py-3 shadow-lg hover:bg-white/10 transition-all">
          <Map className="w-5 h-5 text-orange-400" />
          <span className="text-base font-semibold tracking-wide text-white/90">迹刻 Globe</span>
        </Link>

        <div className="relative group w-64">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-hover:text-white/70 transition-colors" />
          <input
            type="text"
            placeholder="搜索中国景区..."
            className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-full
              py-3 pl-11 pr-4 text-sm text-white placeholder-white/35
              focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all"
          />
        </div>
      </header>

      {/* 中部：左侧景点卡片 + 右侧控制栏 */}
      <div className="flex-1 flex items-end justify-between pb-2 pt-6">

        {/* 左侧：选中景点详情卡 */}
        <div className="w-72 flex flex-col justify-end pointer-events-auto">
          <AnimatePresence mode="wait">
            {selectedMarker && (
              <motion.div
                key={selectedMarker.id}
                initial={{ opacity: 0, x: -40, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -40, scale: 0.96 }}
                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                className="backdrop-blur-xl bg-[#060d1f]/75 border border-white/10
                  rounded-3xl p-5 shadow-2xl flex flex-col gap-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 bg-orange-500/20 text-orange-300
                      text-xs font-medium rounded-full mb-2 border border-orange-500/20">
                      {selectedMarker.type === 'destination' ? '目的地' : '回忆录'}
                    </span>
                    <h2 className="text-2xl font-bold text-white tracking-tight">{selectedMarker.title}</h2>
                    <p className="text-sm text-white/50 mt-0.5">{selectedMarker.subtitle}</p>
                  </div>
                  <button onClick={() => setSelectedMarker(null)}
                    className="p-2 rounded-full bg-white/5 hover:bg-white/12 text-white/50 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-sm text-white/75 leading-relaxed">{selectedMarker.description}</p>

                <div className="flex items-center gap-3 text-xs text-white/40">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{selectedMarker.date}</span>
                  <span className="ml-auto">{selectedMarker.lat.toFixed(2)}°N, {selectedMarker.lng.toFixed(2)}°E</span>
                </div>

                <div className="flex gap-2 mt-1">
                  <Link to={`/spots`}
                    className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-400 text-white text-xs
                      font-semibold rounded-xl text-center transition-colors shadow-lg">
                    查看景点详情
                  </Link>
                  <Link to="/route"
                    className="px-3 py-2.5 bg-white/8 hover:bg-white/14 text-white/70
                      rounded-xl text-xs transition-colors border border-white/10">
                    规划路线
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 右侧：功能导航栏 */}
        <div className="flex flex-col justify-end pointer-events-auto h-full">
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-2
            shadow-lg flex flex-col gap-1.5">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <Link key={tab.id} to={TAB_ROUTES[tab.id]}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative p-3 rounded-xl flex items-center justify-center
                    transition-all duration-250
                    ${isActive ? 'bg-orange-500/20 text-orange-400' : 'text-white/45 hover:bg-white/10 hover:text-white/90'}`}
                >
                  {isActive && (
                    <motion.div layoutId="globeTab"
                      className="absolute inset-0 bg-orange-500/20 border border-orange-500/30 rounded-xl"
                      transition={{ type: 'spring', stiffness: 320, damping: 32 }} />
                  )}
                  <Icon className="w-5 h-5 relative z-10" />
                  <div className="absolute right-full mr-3 px-2.5 py-1.5 bg-[#060d1f]/90 backdrop-blur-sm
                    border border-white/10 rounded-lg text-xs text-white opacity-0
                    group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {tab.label}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* 底部：热门景点快捷标签 */}
      <div className="w-full flex justify-center pointer-events-auto">
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5
          shadow-lg flex items-center gap-3 overflow-x-auto max-w-2xl">
          <span className="text-xs font-semibold text-white/60 whitespace-nowrap">热门景区</span>
          <div className="w-px h-4 bg-white/15 shrink-0" />
          {['故宫', '黄山', '九寨沟', '张家界', '西湖', '布达拉宫'].map((tag, i) => (
            <Link key={i} to={`/spots?city=${tag}`}
              className="px-3 py-1.5 bg-white/5 hover:bg-orange-500/20 border border-white/8
                hover:border-orange-500/30 rounded-xl text-xs text-white/65 hover:text-orange-300
                transition-all whitespace-nowrap">
              {tag}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
