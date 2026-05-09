import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Map, Compass, BookOpen, Navigation, X, Calendar, Sparkles, Users } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Link } from 'react-router-dom';
import { TOP_TRAVELERS, CITY_COORDS } from '@/data/globeData';

const TABS = [
  { id: 'explore',    icon: Compass,    label: '探索' },
  { id: 'search',     icon: Search,     label: '搜索' },
  { id: 'navigation', icon: Navigation, label: '路线' },
  { id: 'diary',      icon: BookOpen,   label: '日记' },
];

const TAB_ROUTES = {
  explore: '/spots', search: '/spots', navigation: '/route', diary: '/diary',
};

const DS_KEY = 'sk-513c1deb71594e8ca886d853eb4d2262';

/* ── 半透明玻璃面板基础样式 ─────────────────────── */
const glassStyle = {
  background: 'rgba(6,13,31,0.72)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 20,
};

/* ── 左侧：Top5 旅行者排行榜 ──────────────────────── */
function TravelerPanel() {
  const [open, setOpen] = useState(false);
  const { selectedTraveler, setSelectedTraveler } = useAppStore();

  const handleSelect = (t) => {
    setSelectedTraveler(selectedTraveler?.id === t.id ? null : t);
  };

  return (
    <div style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', zIndex: 20, pointerEvents: 'auto' }}>
      <AnimatePresence mode="wait">
        {!open ? (
          /* 收起态：闪烁提示文字 */
          <motion.button
            key="hint-left"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(true)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14,
              padding: '12px 8px', cursor: 'pointer',
              animation: 'globePulse 2.2s ease-in-out infinite',
            }}
          >
            <Users size={16} color="rgba(255,255,255,0.6)" />
            <span style={{
              writingMode: 'vertical-rl', fontSize: '0.65rem', fontWeight: 600,
              letterSpacing: '0.12em', color: 'rgba(255,255,255,0.5)',
              fontFamily: 'Inter, sans-serif', textTransform: 'uppercase',
            }}>旅行者</span>
          </motion.button>
        ) : (
          /* 展开态：旅行者列表 */
          <motion.div
            key="panel-left"
            initial={{ opacity: 0, x: -30, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 24, stiffness: 200 }}
            style={{ ...glassStyle, width: 250, padding: 16 }}
          >
            {/* 标题栏 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Users size={14} color="#f97316" />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff', fontFamily: 'Inter, sans-serif', letterSpacing: '0.04em' }}>
                  Top 5 旅行者
                </span>
              </div>
              <button onClick={() => { setOpen(false); setSelectedTraveler(null); }}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, padding: '4px 6px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}>
                <X size={12} />
              </button>
            </div>

            {/* 排行列表 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {TOP_TRAVELERS.map((t, i) => {
                const isSelected = selectedTraveler?.id === t.id;
                return (
                  <button key={t.id} onClick={() => handleSelect(t)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 10px',
                      borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                      background: isSelected ? `${t.color}22` : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${isSelected ? t.color + '60' : 'rgba(255,255,255,0.08)'}`,
                      transition: 'all 0.2s ease', width: '100%',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                  >
                    {/* 排名 */}
                    <span style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                      background: i < 3 ? ['#f59e0b','#9ca3af','#b45309'][i] : 'rgba(255,255,255,0.15)',
                      color: '#fff', fontSize: '0.65rem', fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{i + 1}</span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                        <span style={{ fontSize: '0.9rem' }}>{t.avatar}</span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fff' }}>{t.name}</span>
                        <span style={{ marginLeft: 'auto', fontSize: '0.6rem', fontWeight: 600, padding: '1px 6px', borderRadius: 99, background: `${t.color}30`, color: t.color }}>
                          {t.badge}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                        {t.spots.map(s => (
                          <span key={s.name} style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.07)', padding: '1px 6px', borderRadius: 6 }}>
                            {s.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedTraveler && (
              <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 10, background: `${selectedTraveler.color}18`, border: `1px solid ${selectedTraveler.color}40` }}>
                <span style={{ fontSize: '0.68rem', color: selectedTraveler.color }}>
                  ✦ 地球上已显示 {selectedTraveler.name} 的足迹
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── 右侧：AI 旅游规划 ────────────────────────────── */
function AiPlannerPanel() {
  const [open,     setOpen]     = useState(false);
  const [origin,   setOrigin]   = useState('');
  const [dest,     setDest]     = useState('');
  const [plan,     setPlan]     = useState('');
  const [loading,  setLoading]  = useState(false);
  const [animDone, setAnimDone] = useState(false);
  const { setAiRoute, setAiPlaying, aiPlaying } = useAppStore();

  const callDeepSeek = async () => {
    if (!origin.trim() || !dest.trim()) return;
    setLoading(true); setPlan(''); setAnimDone(false);
    try {
      const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${DS_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek-chat',
          stream: false,
          messages: [{
            role: 'user',
            content: `请为从「${origin}」出发前往「${dest}」的旅行者制定一套完整的旅游规划。要求：
1. 交通方案（最优出行方式、时间、费用）
2. 住宿推荐（档次、区域、参考价格）
3. 景点安排（按天拆分，每天3-4个）
4. 美食推荐（当地特色，每天1-2处）
5. 预算总览（人均参考）
6. 注意事项（最佳时节、特别提醒）
请用简洁清晰的格式输出，每部分加emoji图标，总字数控制在400字以内。`,
          }],
        }),
      });
      const data = await res.json();
      setPlan(data.choices?.[0]?.message?.content || '规划生成失败，请重试');
    } catch { setPlan('网络错误，请检查连接后重试'); }
    finally { setLoading(false); }
  };

  const startAnimation = () => {
    const fromCoord = CITY_COORDS[origin] || CITY_COORDS['北京'];
    const toCoord   = CITY_COORDS[dest]   || CITY_COORDS['上海'];
    setAiRoute({ from: fromCoord, to: toCoord });
    setAiPlaying(true);
    setAnimDone(false);
    setTimeout(() => setAnimDone(true), 5000);
  };

  return (
    <div style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', zIndex: 20, pointerEvents: 'auto' }}>
      <AnimatePresence mode="wait">
        {!open ? (
          <motion.button
            key="hint-right"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(true)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14,
              padding: '12px 8px', cursor: 'pointer',
              animation: 'globePulse 2.2s ease-in-out infinite',
            }}
          >
            <Sparkles size={16} color="rgba(255,255,255,0.6)" />
            <span style={{
              writingMode: 'vertical-rl', fontSize: '0.65rem', fontWeight: 600,
              letterSpacing: '0.12em', color: 'rgba(255,255,255,0.5)',
              fontFamily: 'Inter, sans-serif', textTransform: 'uppercase',
            }}>AI规划</span>
          </motion.button>
        ) : (
          <motion.div
            key="panel-right"
            initial={{ opacity: 0, x: 30, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 24, stiffness: 200 }}
            style={{ ...glassStyle, width: 300, padding: 18, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
          >
            {/* 标题栏 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Sparkles size={14} color="#fbbf24" />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff', fontFamily: 'Inter, sans-serif', letterSpacing: '0.04em' }}>
                  AI 智能旅游规划
                </span>
              </div>
              <button onClick={() => setOpen(false)}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, padding: '4px 6px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}>
                <X size={12} />
              </button>
            </div>

            {/* 输入区 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, flexShrink: 0 }}>
              <input value={origin} onChange={e => setOrigin(e.target.value)}
                placeholder="📍 出发地（如：北京）"
                style={{
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 10, padding: '9px 12px', color: '#fff', fontSize: '0.82rem',
                  outline: 'none', fontFamily: 'Inter, sans-serif',
                  width: '100%', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(251,191,36,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
              />
              <input value={dest} onChange={e => setDest(e.target.value)}
                placeholder="🏁 目的地（如：成都）"
                style={{
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 10, padding: '9px 12px', color: '#fff', fontSize: '0.82rem',
                  outline: 'none', fontFamily: 'Inter, sans-serif',
                  width: '100%', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(251,191,36,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
              />
              <button onClick={callDeepSeek} disabled={loading || !origin.trim() || !dest.trim()}
                style={{
                  background: loading ? 'rgba(251,191,36,0.3)' : 'linear-gradient(135deg,#f59e0b,#f97316)',
                  border: 'none', borderRadius: 10, padding: '10px', color: '#fff',
                  fontSize: '0.82rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'Inter, sans-serif', transition: 'all 0.2s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                {loading ? (
                  <>
                    <span style={{ width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'spin 0.8s linear infinite',display:'inline-block' }} />
                    AI 规划中...
                  </>
                ) : '✨ 生成旅行规划'}
              </button>
            </div>

            {/* 规划结果 */}
            {plan && (
              <div style={{ flex: 1, overflowY: 'auto', marginBottom: 10 }}
                className="scrollbar-thin">
                <div style={{
                  background: 'rgba(255,255,255,0.05)', borderRadius: 12,
                  padding: '12px 14px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)',
                  lineHeight: 1.75, whiteSpace: 'pre-wrap', fontFamily: 'Inter, sans-serif',
                }}>
                  {plan}
                </div>

                {/* 出发动画按钮 */}
                <button onClick={startAnimation}
                  disabled={aiPlaying}
                  style={{
                    marginTop: 10, width: '100%', padding: '10px',
                    background: aiPlaying ? 'rgba(251,191,36,0.25)' : 'rgba(251,191,36,0.15)',
                    border: '1px solid rgba(251,191,36,0.4)', borderRadius: 10,
                    color: '#fbbf24', fontSize: '0.8rem', fontWeight: 700,
                    cursor: aiPlaying ? 'not-allowed' : 'pointer',
                    fontFamily: 'Inter, sans-serif',
                    transition: 'all 0.2s ease',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                  onMouseEnter={e => { if (!aiPlaying) e.currentTarget.style.background = 'rgba(251,191,36,0.25)'; }}
                  onMouseLeave={e => { if (!aiPlaying) e.currentTarget.style.background = 'rgba(251,191,36,0.15)'; }}
                >
                  {aiPlaying ? '🛫 飞行中...' : '🌍 在地球上模拟路线'}
                </button>

                {animDone && (
                  <div style={{ marginTop: 8, textAlign: 'center', fontSize: '0.72rem', color: 'rgba(251,191,36,0.7)' }}>
                    ✦ 路线演示完成
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes globePulse {
          0%,100% { opacity:0.6; transform:scale(1); }
          50% { opacity:1; transform:scale(1.05); }
        }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  );
}

/* ── 主 Overlay（原有内容完整保留）──────────────────── */
export default function GlobeOverlay() {
  const { activeTab, setActiveTab, selectedMarker, setSelectedMarker } = useAppStore();

  return (
    <div className="absolute inset-0 pointer-events-none p-5 flex flex-col justify-between">

      {/* ── 新增：左侧旅行者排行榜 ── */}
      <TravelerPanel />

      {/* ── 新增：右侧 AI 规划 ── */}
      <AiPlannerPanel />

      {/* ── 原有：顶部品牌 + 搜索框 ── */}
      <header className="flex justify-between items-center pointer-events-auto">
        <Link to="/" className="flex items-center gap-3 backdrop-blur-md bg-white/5 border border-white/10
          rounded-full px-5 py-3 shadow-lg hover:bg-white/10 transition-all">
          <Map className="w-5 h-5 text-orange-400" />
          <span className="text-base font-semibold tracking-wide text-white/90">迹刻 Globe</span>
        </Link>

        <div className="relative group w-64">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-hover:text-white/70 transition-colors" />
          <input type="text" placeholder="搜索中国景区..."
            className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-full
              py-3 pl-11 pr-4 text-sm text-white placeholder-white/35
              focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all" />
        </div>
      </header>

      {/* ── 原有：中部景点卡片 + 导航栏 ── */}
      <div className="flex-1 flex items-end justify-between pb-2 pt-6">

        <div className="w-72 flex flex-col justify-end pointer-events-auto">
          <AnimatePresence mode="wait">
            {selectedMarker && (
              <motion.div
                key={selectedMarker.id}
                initial={{ opacity:0, x:-40, scale:0.96 }}
                animate={{ opacity:1, x:0, scale:1 }}
                exit={{ opacity:0, x:-40, scale:0.96 }}
                transition={{ type:'spring', damping:26, stiffness:220 }}
                className="backdrop-blur-xl bg-[#060d1f]/75 border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col gap-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 bg-orange-500/20 text-orange-300 text-xs font-medium rounded-full mb-2 border border-orange-500/20">
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
                  <Link to="/spots" className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-400 text-white text-xs font-semibold rounded-xl text-center transition-colors shadow-lg">
                    查看景点详情
                  </Link>
                  <Link to="/route" className="px-3 py-2.5 bg-white/8 hover:bg-white/14 text-white/70 rounded-xl text-xs transition-colors border border-white/10">
                    规划路线
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col justify-end pointer-events-auto h-full">
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-2 shadow-lg flex flex-col gap-1.5">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <Link key={tab.id} to={TAB_ROUTES[tab.id]}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative p-3 rounded-xl flex items-center justify-center transition-all duration-250
                    ${isActive ? 'bg-orange-500/20 text-orange-400' : 'text-white/45 hover:bg-white/10 hover:text-white/90'}`}
                >
                  {isActive && (
                    <motion.div layoutId="globeTabOrange"
                      className="absolute inset-0 bg-orange-500/20 border border-orange-500/30 rounded-xl"
                      transition={{ type:'spring', stiffness:320, damping:32 }} />
                  )}
                  <Icon className="w-5 h-5 relative z-10" />
                  <div className="absolute right-full mr-3 px-2.5 py-1.5 bg-[#060d1f]/90 backdrop-blur-sm border border-white/10 rounded-lg text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {tab.label}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 原有：底部热门景区标签 ── */}
      <div className="w-full flex justify-center pointer-events-auto">
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 shadow-lg flex items-center gap-3 overflow-x-auto max-w-2xl">
          <span className="text-xs font-semibold text-white/60 whitespace-nowrap">热门景区</span>
          <div className="w-px h-4 bg-white/15 shrink-0" />
          {['故宫','黄山','九寨沟','张家界','西湖','布达拉宫'].map((tag, i) => (
            <Link key={i} to={`/spots?city=${tag}`}
              className="px-3 py-1.5 bg-white/5 hover:bg-orange-500/20 border border-white/8 hover:border-orange-500/30 rounded-xl text-xs text-white/65 hover:text-orange-300 transition-all whitespace-nowrap">
              {tag}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
