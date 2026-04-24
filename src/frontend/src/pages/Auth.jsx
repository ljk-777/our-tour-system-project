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

  /* 背景图轮播（与首页相同，交叉淡入）*/
  const BG_IMAGES = [
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85',
    'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=1920&q=85',
    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1920&q=85',
    'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=1920&q=85',
  ];
  const [bgIdx, setBgIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setBgIdx(i => (i + 1) % BG_IMAGES.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ position: 'relative' }}>

      {/* ── 交叉淡入背景层（与首页一致）── */}
      {BG_IMAGES.map((src, i) => (
        <div key={i} style={{
          position: 'fixed', inset: 0, zIndex: 0,
          backgroundImage: `url(${src})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: i === bgIdx ? 1 : 0,
          transition: 'opacity 1.4s cubic-bezier(0.4,0,0.2,1)',
          willChange: 'opacity',
        }} />
      ))}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, background: 'linear-gradient(160deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.6) 100%)' }} />

      {/* ── 左侧品牌区 ── */}
      <div className="hidden lg:flex" style={{
        position: 'relative', zIndex: 2, flex: 1,
        flexDirection: 'column', justifyContent: 'center',
        padding: '60px 72px',
        animation: 'authEnter 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s both',
      }}>
        {/* 小标签 */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.22)', borderRadius: 99,
          padding: '6px 16px', marginBottom: 36,
          fontSize: '0.68rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)',
          letterSpacing: '0.1em', textTransform: 'uppercase', width: 'fit-content',
          fontFamily: 'Inter, sans-serif',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block', boxShadow: '0 0 6px #4ade80' }} />
          迹刻 waylog &nbsp;·&nbsp; Travel Explorer
        </div>

        {/* Apple 风格大标题 */}
        <h1 style={{
          fontFamily: 'Inter, -apple-system, sans-serif',
          fontSize: 'clamp(3rem, 5vw, 5.5rem)',
          fontWeight: 800, color: '#fff',
          lineHeight: 1.0, letterSpacing: '-0.05em',
          marginBottom: 20,
          textShadow: '0 4px 32px rgba(0,0,0,0.2)',
        }}>
          Record<br />
          <span style={{
            background: 'linear-gradient(90deg, #fbbf24, #f97316)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Every Trip.</span>
        </h1>

        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '1.1rem', fontWeight: 300,
          color: 'rgba(255,255,255,0.7)',
          lineHeight: 1.7, maxWidth: 380, marginBottom: 48,
          letterSpacing: '-0.01em',
        }}>
          200+ 景区与高校 · 智能路线规划<br />旅行日记社区，与世界同行
        </p>

        {/* 统计数字 */}
        <div style={{ display: 'flex', gap: 32 }}>
          {[['200+', 'Destinations'], ['AI', 'Route Plan'], ['8+', 'Diaries']].map(([val, label]) => (
            <div key={label}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '1.8rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>{val}</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 右侧登录卡片 ── */}
      <div style={{
        position: 'relative', zIndex: 2,
        width: '100%', maxWidth: 420,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '32px 28px',
        background: 'rgba(10,10,20,0.45)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        borderLeft: '1px solid rgba(255,255,255,0.1)',
        animation: 'authEnter 0.65s cubic-bezier(0.16,1,0.3,1) 0.2s both',
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>

          {/* 品牌 */}
          <div style={{ marginBottom: 32 }}>
            <div style={{
              fontFamily: 'Inter, sans-serif', fontSize: '1.8rem', fontWeight: 800,
              color: '#fff', letterSpacing: '-0.04em', lineHeight: 1,
            }}>
              迹刻
              <span style={{ fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginLeft: 10, verticalAlign: 'middle' }}>waylog</span>
            </div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', fontWeight: 300, color: 'rgba(255,255,255,0.5)', marginTop: 6, letterSpacing: '0.01em' }}>
              {tab === 'login' ? 'Welcome back. Continue your journey.' : 'Create an account. Start exploring.'}
            </p>
          </div>

          {/* Tab 切换 */}
          <div style={{
            display: 'flex', background: 'rgba(255,255,255,0.07)', borderRadius: 10,
            padding: 3, marginBottom: 24, border: '1px solid rgba(255,255,255,0.1)',
          }}>
            {[['login', 'Sign In'], ['register', 'Sign Up']].map(([val, label]) => (
              <button key={val} onClick={() => handleTabChange(val)} style={{
                flex: 1, padding: '9px 0', borderRadius: 8,
                fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', fontWeight: 600,
                letterSpacing: '0.02em', cursor: 'pointer', border: 'none',
                transition: 'all 0.25s ease',
                background: tab === val ? 'rgba(255,255,255,0.88)' : 'transparent',
                color: tab === val ? '#111' : 'rgba(255,255,255,0.4)',
                boxShadow: tab === val ? '0 2px 12px rgba(0,0,0,0.2)' : 'none',
              }}>{label}</button>
            ))}
          </div>

          {/* 注册：头像选择器 */}
          {tab === 'register' && (
            <div style={{ marginBottom: 20, padding: '14px 16px', background: 'rgba(255,255,255,0.06)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Avatar</div>
              <AvatarPicker value={avatar} onChange={setAvatar} />
            </div>
          )}

          {/* 表单 */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { id: 'username', label: 'Traveler ID', type: 'text',     val: username, setter: e => { setUsername(e.target.value); clearMsg(); }, ph: '输入用户名', ac: 'username' },
              { id: 'password', label: 'Password',    type: 'password', val: password, setter: e => setPassword(e.target.value),                 ph: '任意输入（演示模式）', ac: 'current-password' },
            ].map(({ id, label, type, val, setter, ph, ac }) => (
              <div key={id}>
                <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 7 }}>{label}</label>
                <input
                  type={type} value={val} onChange={setter} placeholder={ph} autoComplete={ac}
                  onFocus={() => setFocusField(id)} onBlur={() => setFocusField('none')}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: 10, outline: 'none',
                    fontFamily: 'Inter, sans-serif', fontSize: '0.9rem',
                    background: focusField === id ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.1)',
                    border: `1px solid ${focusField === id ? 'rgba(251,191,36,0.7)' : 'rgba(255,255,255,0.15)'}`,
                    color: focusField === id ? '#111' : '#fff',
                    boxShadow: focusField === id ? '0 0 0 3px rgba(251,191,36,0.15)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                />
              </div>
            ))}

            {error && (
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', padding: '9px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', animation: 'authShake 0.35s ease' }}>
                ⚠️ {error}
              </div>
            )}
            {success && (
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', padding: '9px 14px', borderRadius: 8, background: 'rgba(74,222,128,0.15)', color: '#86efac', border: '1px solid rgba(74,222,128,0.3)' }}>
                ✓ Connected. Entering...
              </div>
            )}

            <button type="submit" disabled={loading || success} style={{
              width: '100%', padding: '13px',
              borderRadius: 10, border: 'none', cursor: loading || success ? 'not-allowed' : 'pointer',
              fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.02em',
              background: success ? 'rgba(74,222,128,0.7)' : 'linear-gradient(135deg, #fbbf24, #f97316)',
              color: '#fff', opacity: loading ? 0.75 : 1,
              boxShadow: loading || success ? 'none' : '0 4px 20px rgba(249,115,22,0.45)',
              transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
            }}
              onMouseEnter={e => { if (!loading && !success) { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(249,115,22,0.6)'; }}}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(249,115,22,0.45)'; }}
            >
              {loading ? 'Connecting…' : success ? '✓ Connected' : tab === 'login' ? 'Start Exploring →' : 'Create Account →'}
            </button>
          </form>

          {/* 分隔线 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 14px' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', fontWeight: 500, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Quick Access</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          </div>

          {/* 演示账号 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7, marginBottom: 10 }}>
            {DEMO_USERS.map(u => (
              <button key={u.username}
                onClick={() => { setUsername(u.username); setTab('login'); clearMsg(); }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  padding: '10px 6px', borderRadius: 10, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.transform = 'translateY(-3px) scale(1.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              >
                <span style={{ fontSize: '1.25rem' }}>{u.emoji}</span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{u.label}</span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)' }}>{u.city}</span>
              </button>
            ))}
          </div>

          {/* 访客入口 */}
          <button onClick={() => { enterAsGuest(); navigate('/'); }} style={{
            width: '100%', padding: '11px',
            borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
            fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', fontWeight: 500,
            background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)',
            cursor: 'pointer', letterSpacing: '0.02em',
            transition: 'all 0.2s ease',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          >
            Continue as Guest →
          </button>
        </div>
      </div>

      <style>{`
        @keyframes authEnter {
          from { opacity: 0; transform: translateY(24px); }
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
