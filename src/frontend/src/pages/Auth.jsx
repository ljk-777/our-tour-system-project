import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate }      from 'react-router-dom';
import { useAuth }          from '../hooks/useAuth.js';
import BrandIcon            from '../components/BrandIcon.jsx';

/* ── 演示账号 ──────────────────────────────────────────────── */
const DEMO_USERS = [
  { username: 'alice',   label: '小明',   city: '北京', emoji: '🏔️' },
  { username: 'bob',     label: '小红',   city: '上海', emoji: '🌊' },
  { username: 'charlie', label: '旅行者',  city: '杭州', emoji: '🌿' },
];

/* ── 预设头像 emoji ─────────────────────────────────────────── */
const PRESET_AVATARS = [
  '🧭','🏔️','🌊','🌿','🐼','🏛️','⛰️','🌲',
  '🗻','🌏','🎒','🚂','🏄','🌺','🦋','🌙',
  '🦅','🌋','🏕️','🗼','🎑','🌅','🏖️','🎿',
];

/* ── 图片压缩工具（canvas resize 到 128×128 JPEG）─────────── */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const SIZE = 128;
      const canvas = document.createElement('canvas');
      const side = Math.min(img.width, img.height);
      const sx   = (img.width  - side) / 2;
      const sy   = (img.height - side) / 2;
      canvas.width  = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('图片加载失败')); };
    img.src = url;
  });
}

/* ── 头像选择器组件 ─────────────────────────────────────────── */
function AvatarPicker({ value, onChange }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [showGrid, setShowGrid]   = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('请选择图片文件'); return; }
    setUploading(true);
    try {
      const b64 = await compressImage(file);
      onChange(b64);
      setShowGrid(false);
    } catch {
      alert('图片处理失败，请重试');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const isImage = value && value.startsWith('data:');

  return (
    <div className="flex flex-col items-center gap-3">
      {/* 头像预览圆 */}
      <div
        className="relative cursor-pointer group"
        onClick={() => setShowGrid(v => !v)}
        title="点击更换头像"
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden transition-all duration-200"
          style={{
            border: showGrid ? '2.5px solid #0071e3' : '2.5px solid rgba(0,113,227,0.25)',
            background: isImage ? 'transparent' : '#e8f1fc',
            boxShadow: showGrid ? '0 0 0 4px rgba(0,113,227,0.10)' : 'none',
          }}
        >
          {isImage ? (
            <img src={value} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl select-none">{value || '🧭'}</span>
          )}
        </div>
        {/* 编辑遮罩 */}
        <div
          className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ background: 'rgba(0,0,0,0.28)' }}
        >
          <span className="text-white text-xs font-medium">更换</span>
        </div>
      </div>

      <span className="text-[11px]" style={{ color: '#86868b' }}>
        点击头像选择
      </span>

      {/* 选择面板 */}
      {showGrid && (
        <div
          className="rounded-2xl p-4 w-full"
          style={{
            background: '#f5f5f7',
            border: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          {/* 上传图片按钮 */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full py-2 rounded-xl text-sm font-medium mb-3 transition-all duration-150"
            style={{
              background: uploading ? 'rgba(0,0,0,0.04)' : '#e8f1fc',
              border: '1px solid rgba(0,113,227,0.20)',
              color: uploading ? '#aeaeb2' : '#0071e3',
            }}
          >
            {uploading ? '处理中…' : '📷 上传本地图片'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />

          {/* Emoji 网格 */}
          <div className="text-[10px] font-medium mb-2 tracking-wider uppercase"
            style={{ color: '#aeaeb2' }}>
            预设图标
          </div>
          <div className="grid grid-cols-8 gap-1">
            {PRESET_AVATARS.map(em => (
              <button
                key={em}
                type="button"
                onClick={() => { onChange(em); setShowGrid(false); }}
                className="aspect-square rounded-lg text-xl flex items-center justify-center transition-all duration-150"
                style={{
                  background: value === em ? '#e8f1fc' : 'transparent',
                  border: value === em ? '1px solid rgba(0,113,227,0.35)' : '1px solid transparent',
                  transform: value === em ? 'scale(1.15)' : 'scale(1)',
                }}
                onMouseEnter={e => { if (value !== em) e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; }}
                onMouseLeave={e => { if (value !== em) e.currentTarget.style.background = 'transparent'; }}
              >
                {em}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Auth — 迹刻 waylog 旅行者登录页
══════════════════════════════════════════════════════════════ */
export default function Auth() {
  const { login, register, enterAsGuest, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  /* 已登录则跳转首页 */
  useEffect(() => {
    if (isLoggedIn) navigate('/', { replace: true });
  }, [isLoggedIn, navigate]);

  /* 表单状态 */
  const [tab,        setTab]        = useState('login');
  const [username,   setUsername]   = useState('');
  const [password,   setPassword]   = useState('');
  const [avatar,     setAvatar]     = useState('🧭');
  const [focusField, setFocusField] = useState('none');
  const [loading,    setLoading]    = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState('');
  const clearMsg = () => { setError(''); setSuccess(false); };

  const handleTabChange = (val) => {
    setTab(val);
    clearMsg();
    if (val === 'register') setAvatar('🧭');
  };

  /* 登录 / 注册 */
  const handleSubmit = useCallback(async e => {
    e.preventDefault();
    if (!username.trim()) { setError('请输入旅行者 ID'); return; }
    clearMsg(); setLoading(true);
    try {
      const res = tab === 'login'
        ? await login(username.trim())
        : await register(username.trim(), avatar);
      if (res?.id) {
        setSuccess(true);
        // isLoggedIn 变为 true → useEffect 负责导航
      } else {
        setError(tab === 'login' ? '用户名不存在' : '注册失败，请重试');
      }
    } catch (err) {
      const msg = err?.response?.data?.message;
      setError(msg || (tab === 'login' ? '用户名不存在' : '用户名已存在或注册失败'));
    } finally {
      setLoading(false);
    }
  }, [tab, username, avatar, login, register]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        background: `
          radial-gradient(ellipse at 25% 35%, rgba(120, 119, 198, 0.12) 0%, transparent 55%),
          radial-gradient(ellipse at 78% 72%, rgba(80, 160, 255, 0.10) 0%, transparent 52%),
          radial-gradient(ellipse at 60% 10%, rgba(255, 200, 100, 0.07) 0%, transparent 48%),
          #f0f4ff
        `,
        backgroundAttachment: 'fixed',
        animation: 'authEnter 0.55s cubic-bezier(0.16,1,0.3,1) both'
      }}
    >
      <div className="w-full max-w-sm flex flex-col gap-5">

        {/* 品牌 */}
        <div className="flex flex-col items-center gap-2 mb-2">
          <BrandIcon size={52} variant="dark" />
          <div className="text-center">
            <div className="text-2xl font-bold tracking-tight" style={{ color: '#1d1d1f' }}>
              迹刻
            </div>
            <div className="text-xs font-medium tracking-[0.25em] uppercase mt-0.5" style={{ color: '#aeaeb2' }}>
              waylog
            </div>
          </div>
          <p className="text-sm text-center" style={{ color: '#86868b' }}>
            {tab === 'login' ? '欢迎回来，继续你的旅程' : '创建账号，开始记录旅行'}
          </p>
        </div>

        {/* 主卡片 */}
        <div
          className="glass-card p-6"
          style={{ borderRadius: '1.5rem' }}
        >
          {/* Tab */}
          <div className="flex rounded-xl overflow-hidden mb-5 glass"
            style={{ border: '1px solid rgba(255,255,255,0.65)' }}>
            {[['login', '登 录'], ['register', '注 册']].map(([val, label]) => (
              <button key={val}
                onClick={() => handleTabChange(val)}
                className="flex-1 py-2 text-sm font-medium transition-all duration-200"
                style={{
                  background: tab === val ? 'rgba(255,255,255,0.90)' : 'transparent',
                  color:      tab === val ? '#0071e3' : '#86868b',
                  boxShadow:  tab === val ? '0 2px 8px rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,1) inset' : 'none',
                  borderRadius: '0.625rem',
                  margin: tab === val ? '3px' : '0',
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* 注册：头像选择器 */}
          {tab === 'register' && (
            <div className="mb-5">
              <div className="text-xs font-medium mb-3" style={{ color: '#6e6e73' }}>
                选择头像
              </div>
              <AvatarPicker value={avatar} onChange={setAvatar} />
            </div>
          )}

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">

            {/* 用户名 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: '#6e6e73' }}>
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
                  background: focusField === 'username' ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.58)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: `1px solid ${focusField === 'username' ? 'rgba(0,113,227,0.50)' : 'rgba(255,255,255,0.78)'}`,
                  color: '#1d1d1f',
                  boxShadow: focusField === 'username'
                    ? '0 0 0 3px rgba(0,113,227,0.10), 0 2px 8px rgba(0,0,0,0.05), 0 1px 0 rgba(255,255,255,0.95) inset'
                    : '0 2px 8px rgba(0,0,0,0.05), 0 1px 0 rgba(255,255,255,0.95) inset',
                  transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
                }}
              />
            </div>

            {/* 密码 */}
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center justify-between text-xs font-medium"
                style={{ color: '#6e6e73' }}>
                <span>密码</span>
                <span style={{ color: '#aeaeb2', fontWeight: 400 }}>演示模式可随意填写</span>
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
                  background: focusField === 'password' ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.58)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: `1px solid ${focusField === 'password' ? 'rgba(0,113,227,0.50)' : 'rgba(255,255,255,0.78)'}`,
                  color: '#1d1d1f',
                  boxShadow: focusField === 'password'
                    ? '0 0 0 3px rgba(0,113,227,0.10), 0 2px 8px rgba(0,0,0,0.05), 0 1px 0 rgba(255,255,255,0.95) inset'
                    : '0 2px 8px rgba(0,0,0,0.05), 0 1px 0 rgba(255,255,255,0.95) inset',
                  transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
                }}
              />
            </div>

            {/* 错误 / 成功 */}
            {error && (
              <div className="text-xs px-3 py-2 rounded-lg"
                style={{ background: '#fff1f0', color: '#ff3b30',
                         border: '1px solid rgba(255,59,48,0.18)', animation: 'authShake 0.35s ease' }}>
                {error}
              </div>
            )}
            {success && (
              <div className="text-xs px-3 py-2 rounded-lg"
                style={{ background: '#edfaf2', color: '#34c759',
                         border: '1px solid rgba(52,199,89,0.22)' }}>
                ✓ 连接成功，正在进入…
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.97]"
              style={{
                background: success
                  ? '#34c759'
                  : loading
                    ? 'rgba(0,113,227,0.45)'
                    : '#0071e3',
                color: '#fff',
                boxShadow: loading || success ? 'none' : '0 2px 12px rgba(0,113,227,0.28)',
                opacity: loading ? 0.7 : 1,
                cursor: loading || success ? 'not-allowed' : 'pointer',
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
          <div className="text-xs text-center mb-2" style={{ color: '#aeaeb2' }}>
            — 快速体验 —
          </div>
          <div className="grid grid-cols-3 gap-2">
            {DEMO_USERS.map(u => (
              <button
                key={u.username}
                onClick={() => { setUsername(u.username); setTab('login'); clearMsg(); }}
                className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all duration-200 glass-btn"
                style={{ borderRadius: '0.875rem' }}
                onMouseEnter={e => {
                  e.currentTarget.style.background  = 'rgba(232,241,252,0.85)';
                  e.currentTarget.style.borderColor = 'rgba(0,113,227,0.30)';
                  e.currentTarget.style.transform   = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow   = '0 6px 20px rgba(0,113,227,0.10), 0 1px 0 rgba(255,255,255,1) inset';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background  = 'rgba(255,255,255,0.62)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.82)';
                  e.currentTarget.style.transform   = 'none';
                  e.currentTarget.style.boxShadow   = '0 2px 8px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,0.96) inset';
                }}
              >
                <span className="text-lg">{u.emoji}</span>
                <span className="text-xs font-medium" style={{ color: '#1d1d1f' }}>{u.label}</span>
                <span className="text-[10px]" style={{ color: '#86868b' }}>{u.city}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 访客入口 */}
        <button
          onClick={() => { enterAsGuest(); navigate('/'); }}
          className="w-full py-2.5 rounded-xl text-sm transition-all duration-200 glass-btn"
          style={{ color: '#6e6e73', borderRadius: '0.875rem' }}
          onMouseEnter={e => {
            e.currentTarget.style.background  = 'rgba(255,255,255,0.84)';
            e.currentTarget.style.color       = '#1d1d1f';
            e.currentTarget.style.transform   = 'translateY(-1px)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background  = 'rgba(255,255,255,0.62)';
            e.currentTarget.style.color       = '#6e6e73';
            e.currentTarget.style.transform   = 'none';
          }}
        >
          以访客身份探索 →
        </button>
      </div>

      <style>{`
        @keyframes authEnter {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
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
