import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate }      from 'react-router-dom';
import CosmosBackground     from '../components/CosmosBackground.jsx';
import InteractiveGlobe     from '../components/InteractiveGlobe.jsx';
import { useAuth }          from '../hooks/useAuth.js';

/* ── 演示账号 ──────────────────────────────────────────────── */
const DEMO_USERS = [
  { username: 'alice',   label: '小明',   city: '北京', emoji: '🏔️' },
  { username: 'bob',     label: '小红',   city: '上海', emoji: '🌊' },
  { username: 'charlie', label: '旅行者',  city: '杭州', emoji: '🌿' },
];

/* ═══════════════════════════════════════════════════════════════
   Auth — 旅行者登录页
   左列：InteractiveGlobe 互动角色（可独立替换）
   右列：登录 / 注册 / 访客表单
═══════════════════════════════════════════════════════════════ */
export default function Auth() {
  const { login, register, enterAsGuest, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  /* 已登录则跳转 */
  useEffect(() => {
    if (isLoggedIn) navigate('/explore', { replace: true });
  }, [isLoggedIn, navigate]);

  /* 全局鼠标位置（传原始 px，组件内部归一化）*/
  const [mouse, setMouse] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  useEffect(() => {
    const onMove = e => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  /* 角色尺寸（响应式）*/
  const [globeSize, setGlobeSize] = useState(
    () => Math.max(Math.min(window.innerWidth * 0.36, 360), 220),
  );
  useEffect(() => {
    const onResize = () => setGlobeSize(Math.max(Math.min(window.innerWidth * 0.36, 360), 220));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* 外部弹跳信号（hover / click 按钮时触发角色弹跳）*/
  const [bounceSignal, setBounceSignal] = useState(0);
  const triggerBounce = useCallback(() => setBounceSignal(s => s + 1), []);

  /* 表单状态 */
  const [tab,        setTab]        = useState('login');
  const [username,   setUsername]   = useState('');
  const [password,   setPassword]   = useState('');
  const [focusField, setFocusField] = useState('none');
  const [loading,    setLoading]    = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState('');
  const clearMsg = () => { setError(''); setSuccess(false); };

  /* 登录 / 注册 */
  const handleSubmit = useCallback(async e => {
    e.preventDefault();
    if (!username.trim()) { setError('请输入旅行者 ID'); return; }
    clearMsg(); setLoading(true);
    try {
      const res = tab === 'login'
        ? await login(username.trim())
        : await register(username.trim());
      if (!res.ok) {
        setError(res.message || (tab === 'login' ? '用户名不存在' : '注册失败'));
      } else {
        setSuccess(true);
        triggerBounce(); // 成功时角色弹跳庆祝
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [tab, username, login, register, triggerBounce]);

  /* 角色状态文案 */
  const statusMap = {
    none:     ['待机中',   '移动鼠标来互动'],
    username: ['身份扫描中', '请输入旅行者 ID'],
    password: ['监控已暂停', '传感器保护模式已激活'],
  };
  const [stTitle, stSub] = statusMap[focusField] ?? statusMap.none;
  const isPass = focusField === 'password';

  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex items-center justify-center"
      style={{ background: '#020916' }}
    >
      {/* ── 宇宙背景（独立模块，Phase 2/3 可换 Three.js）────────────── */}
      <CosmosBackground className="absolute inset-0" />

      {/* ── 主内容区（两栏）─────────────────────────────────────────── */}
      <div
        className="relative z-10 w-full max-w-5xl mx-auto px-4
                   flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16"
        style={{ animation: 'authEnter 0.65s cubic-bezier(0.16,1,0.3,1) both' }}
      >

        {/* ════ 左列：互动角色（可独立替换为 3D 地球）════════════════ */}
        <div className="flex flex-col items-center gap-4">

          {/* ▼ 只需替换此组件即可升级角色 ▼ */}
          <InteractiveGlobe
            mouseX={mouse.x}
            mouseY={mouse.y}
            focusField={focusField}
            size={globeSize}
            bounceSignal={bounceSignal}
          />

          {/* 状态文字 */}
          <div className="text-center" style={{ minHeight: 38 }}>
            <div
              className="text-xs font-mono tracking-[0.25em] uppercase transition-colors duration-500"
              style={{ color: isPass ? 'rgba(20,184,166,0.65)' : 'rgba(56,189,248,0.65)' }}
            >
              {stTitle}
            </div>
            <div className="text-[11px] mt-1 transition-all duration-500"
              style={{ color: 'rgba(255,255,255,0.26)' }}>
              {stSub}
            </div>
          </div>

          {/* 密码偷瞄提示气泡 */}
          <div
            className="text-[10px] font-mono px-3 py-1.5 rounded-full transition-all duration-500"
            style={{
              color:      isPass ? 'rgba(20,184,166,0.60)' : 'rgba(255,255,255,0)',
              background: isPass ? 'rgba(20,184,166,0.07)' : 'transparent',
              border:     `1px solid ${isPass ? 'rgba(20,184,166,0.18)' : 'transparent'}`,
              transform:  isPass ? 'translateY(0)' : 'translateY(6px)',
            }}
          >
            移动鼠标看右眼偷瞄 👀
          </div>

          {/* Phase 路线图（仅大屏可见）*/}
          <div className="hidden lg:flex flex-col items-center gap-1 mt-1">
            {[
              ['✓', 'Phase 1: Canvas 2D 地球', true],
              ['→', 'Phase 2: Three.js 3D 地球', false],
              ['→', 'Phase 3: CesiumJS + AI 表情', false],
            ].map(([icon, text, active]) => (
              <div key={text} className="text-[10px] font-mono"
                style={{ color: active ? 'rgba(56,189,248,0.42)' : 'rgba(255,255,255,0.12)' }}>
                {icon} {text}
              </div>
            ))}
          </div>
        </div>

        {/* ════ 右列：表单 ════════════════════════════════════════════ */}
        <div className="w-full max-w-sm flex flex-col gap-4">

          {/* 品牌 */}
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl"
              style={{ filter: 'drop-shadow(0 0 8px rgba(14,165,233,0.55))' }}>🧭</span>
            <div>
              <div className="text-xl font-bold"
                style={{
                  background: 'linear-gradient(135deg,#38bdf8,#2dd4bf)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>
                Our Tour
              </div>
              <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
                旅游探索系统 · Phase 1
              </div>
            </div>
          </div>

          {/* 玻璃卡片 */}
          <div
            className="rounded-2xl p-6"
            style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(22px)',
              WebkitBackdropFilter: 'blur(22px)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 8px 42px rgba(0,0,0,0.50)',
            }}
          >
            {/* Tab */}
            <div className="flex rounded-xl overflow-hidden mb-5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {[['login', '登 录'], ['register', '注 册']].map(([val, label]) => (
                <button key={val}
                  onClick={() => { setTab(val); clearMsg(); }}
                  className="flex-1 py-2 text-sm font-medium transition-all duration-250"
                  style={{
                    background: tab === val ? 'rgba(14,165,233,0.18)' : 'transparent',
                    color:      tab === val ? '#38bdf8' : 'rgba(255,255,255,0.35)',
                    borderRight: val === 'login' ? '1px solid rgba(255,255,255,0.07)' : 'none',
                  }}>
                  {label}
                </button>
              ))}
            </div>

            {/* 表单 */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">

              {/* 用户名 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.42)' }}>
                  旅行者 ID
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => { setUsername(e.target.value); clearMsg(); }}
                  onFocus={() => setFocusField('username')}
                  onBlur={() => setFocusField('none')}
                  placeholder="输入用户名"
                  autoComplete="username"
                  className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: `1px solid ${focusField === 'username' ? 'rgba(56,189,248,0.48)' : 'rgba(255,255,255,0.09)'}`,
                    color: 'rgba(255,255,255,0.88)',
                    boxShadow: focusField === 'username' ? '0 0 0 3px rgba(14,165,233,0.09)' : 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                />
              </div>

              {/* 密码（视觉，后端不校验）*/}
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center justify-between text-xs font-medium"
                  style={{ color: 'rgba(255,255,255,0.42)' }}>
                  <span>密码</span>
                  <span style={{ color: 'rgba(255,255,255,0.18)', fontWeight: 400 }}>演示模式可随意填写</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocusField('password')}
                  onBlur={() => setFocusField('none')}
                  placeholder="任意输入"
                  autoComplete="current-password"
                  className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: `1px solid ${focusField === 'password' ? 'rgba(20,184,166,0.48)' : 'rgba(255,255,255,0.09)'}`,
                    color: 'rgba(255,255,255,0.88)',
                    boxShadow: focusField === 'password' ? '0 0 0 3px rgba(20,184,166,0.09)' : 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                />
              </div>

              {/* 错误 / 成功 */}
              {error && (
                <div className="text-xs px-3 py-2 rounded-lg"
                  style={{ background: 'rgba(239,68,68,0.10)', color: '#f87171',
                           border: '1px solid rgba(239,68,68,0.20)', animation: 'authShake 0.35s ease' }}>
                  {error}
                </div>
              )}
              {success && (
                <div className="text-xs px-3 py-2 rounded-lg"
                  style={{ background: 'rgba(34,197,94,0.10)', color: '#4ade80',
                           border: '1px solid rgba(34,197,94,0.20)' }}>
                  ✓ 连接成功，正在进入…
                </div>
              )}

              {/* 提交按钮（hover 触发角色弹跳）*/}
              <button
                type="submit"
                disabled={loading || success}
                onMouseEnter={triggerBounce}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.97]"
                style={{
                  background: success
                    ? 'linear-gradient(135deg,rgba(34,197,94,0.80),rgba(20,184,166,0.80))'
                    : loading
                      ? 'rgba(14,165,233,0.28)'
                      : 'linear-gradient(135deg,rgba(14,165,233,0.88),rgba(20,184,166,0.88))',
                  color: '#fff',
                  boxShadow: loading || success ? 'none' : '0 4px 18px rgba(14,165,233,0.28)',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading  ? '连接中…'
                 : success ? '✓ 已连接'
                 : tab === 'login' ? '启程探索' : '创建账号'}
              </button>
            </form>
          </div>

          {/* 演示账号快捷选择 */}
          <div>
            <div className="text-xs text-center mb-2" style={{ color: 'rgba(255,255,255,0.20)' }}>
              — 快速体验 —
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_USERS.map(u => (
                <button
                  key={u.username}
                  onClick={() => { setUsername(u.username); setTab('login'); clearMsg(); triggerBounce(); }}
                  onMouseEnter={triggerBounce}
                  className="flex flex-col items-center gap-1 py-2 rounded-xl transition-all duration-200 hover:scale-[1.04]"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background  = 'rgba(14,165,233,0.10)';
                    e.currentTarget.style.borderColor = 'rgba(14,165,233,0.28)';
                    triggerBounce();
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background  = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                  }}
                >
                  <span className="text-base">{u.emoji}</span>
                  <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.55)' }}>{u.label}</span>
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.22)' }}>{u.city}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 访客入口 */}
          <button
            onClick={() => { enterAsGuest(); navigate('/explore'); }}
            onMouseEnter={triggerBounce}
            className="w-full py-2.5 rounded-xl text-sm transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.35)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color       = 'rgba(255,255,255,0.62)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)';
              triggerBounce();
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color       = 'rgba(255,255,255,0.35)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
            }}
          >
            以访客身份探索 →
          </button>
        </div>
      </div>

      {/* ── 页面私有动画 ─────────────────────────────────────────────── */}
      <style>{`
        @keyframes authEnter {
          from { opacity: 0; transform: translateY(18px) scale(0.975); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes authShake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-5px); }
          60%     { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}
