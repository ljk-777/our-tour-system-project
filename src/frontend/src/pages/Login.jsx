import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login as apiLogin, register as apiRegister } from '../api/index.js';
import { useAuth } from '../hooks/useAuth.js';

/* ── 星空画布 ──────────────────────────────────────────────── */
function StarCanvas() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    let W = canvas.width  = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    // 生成随机星星
    const stars = Array.from({ length: 260 }, () => ({
      x:      Math.random() * W,
      y:      Math.random() * H,
      r:      Math.random() * 1.4 + 0.2,
      alpha:  Math.random(),
      speed:  (Math.random() - 0.5) * 0.008,
    }));

    // 流星
    const meteors = [];
    const addMeteor = () => {
      if (Math.random() < 0.003) {
        meteors.push({
          x: Math.random() * W, y: 0,
          vx: 4 + Math.random() * 3,
          vy: 2 + Math.random() * 2,
          len: 60 + Math.random() * 80,
          life: 1,
        });
      }
    };

    let raf;
    const draw = () => {
      ctx.fillStyle = '#02081e';
      ctx.fillRect(0, 0, W, H);

      // 星星
      stars.forEach(s => {
        s.alpha += s.speed;
        if (s.alpha <= 0 || s.alpha >= 1) s.speed *= -1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(210, 230, 255, ${s.alpha})`;
        ctx.fill();
      });

      // 流星
      addMeteor();
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - m.vx * (m.len / 6), m.y - m.vy * (m.len / 6));
        const grad = ctx.createLinearGradient(
          m.x, m.y,
          m.x - m.vx * (m.len / 6), m.y - m.vy * (m.len / 6)
        );
        grad.addColorStop(0, `rgba(200,230,255,${m.life * 0.9})`);
        grad.addColorStop(1, 'rgba(200,230,255,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        m.x += m.vx; m.y += m.vy; m.life -= 0.025;
        if (m.life <= 0 || m.x > W || m.y > H) meteors.splice(i, 1);
      }

      raf = requestAnimationFrame(draw);
    };

    const onResize = () => {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

/* ── 主登录页 ─────────────────────────────────────────────── */
const DEMO_USERS = [
  { username: 'explorer_li',  label: '探险家小李', avatar: '🧭' },
  { username: 'photo_liu',    label: '摄影师刘四', avatar: '📸' },
  { username: 'solo_zheng',   label: '独行侠郑十', avatar: '🎒' },
  { username: 'budget_zhou',  label: '穷游周八',   avatar: '💰' },
  { username: 'hiking_chen',  label: '徒步陈五',   avatar: '🏔️' },
  { username: 'culture_zhao', label: '文化赵六',   avatar: '🏛️' },
];

export default function Login() {
  const [username, setUsername] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const { login, isLoggedIn }   = useAuth();
  const navigate                = useNavigate();

  // 已登录直接跳转
  useEffect(() => {
    if (isLoggedIn) navigate('/explore', { replace: true });
  }, [isLoggedIn, navigate]);

  const doLogin = async (uname) => {
    const name = uname?.trim();
    if (!name) { setError('请输入用户名'); return; }
    setLoading(true); setError('');
    try {
      // 先尝试登录
      let res = await apiLogin({ username: name }).catch(async (err) => {
        // 用户不存在 (401) → 自动注册
        if (err.response?.status === 401) {
          return apiRegister({ username: name, nickname: name });
        }
        throw err;
      });
      login(res.data.data);
      navigate('/explore');
    } catch {
      setError('无法连接后端，请先启动 npm run dev（后端）');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => { e.preventDefault(); doLogin(username); };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#02081e]">

      {/* 星空背景 */}
      <StarCanvas />

      {/* 星云光晕 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/5  w-72 h-72 bg-blue-600/10  rounded-full blur-[80px] animate-pulse" />
        <div className="absolute bottom-1/3 right-1/5 w-96 h-96 bg-teal-600/8  rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1.8s' }} />
        <div className="absolute top-2/3 left-1/2  w-56 h-56 bg-indigo-600/8 rounded-full blur-[70px]  animate-pulse" style={{ animationDelay: '3.2s' }} />
      </div>

      {/* 登录卡片 */}
      <div className="relative z-10 w-full max-w-md px-5">

        {/* 品牌 */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-float inline-block">🧭</div>
          <h1 className="text-4xl font-bold text-white tracking-wide">
            Our{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-teal-400">
              Tour
            </span>
          </h1>
          <p className="text-sky-300/50 text-sm mt-2 tracking-[0.3em] uppercase">
            Explore the World
          </p>
        </div>

        {/* 玻璃卡片 */}
        <div
          className="rounded-3xl p-8 shadow-2xl shadow-black/60 border"
          style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(255,255,255,0.10)',
          }}
        >
          <h2 className="text-white/80 text-base font-semibold text-center mb-6 tracking-wide">
            登录你的旅途
          </h2>

          {/* 手动输入表单 */}
          <form onSubmit={handleSubmit} className="space-y-4 mb-5">
            <div>
              <label className="text-sky-200/50 text-xs mb-1.5 block tracking-wider uppercase">
                用户名
              </label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="随便起个用户名，没有会自动注册"
                className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)',
                }}
                onFocus={e  => { e.target.style.borderColor = 'rgba(56,189,248,0.5)'; }}
                onBlur={e   => { e.target.style.borderColor = 'rgba(255,255,255,0.10)'; }}
              />
            </div>

            {error && (
              <div className="text-red-400 text-xs px-4 py-2.5 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)' }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full font-semibold py-3.5 rounded-xl transition-all text-white text-sm disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #14b8a6)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  登录中...
                </span>
              ) : '开始探索 →'}
            </button>
          </form>

          {/* 分割线 */}
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-white/8" />
            <span className="text-white/20 text-xs">或选择演示角色</span>
            <div className="h-px flex-1 bg-white/8" />
          </div>

          {/* 快速登录网格 */}
          <div className="grid grid-cols-3 gap-2">
            {DEMO_USERS.map(u => (
              <button
                key={u.username}
                onClick={() => doLogin(u.username)}
                disabled={loading}
                className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all group hover:scale-[1.03]"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  borderColor: 'rgba(255,255,255,0.06)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">{u.avatar}</span>
                <span className="text-white/50 text-[11px] text-center leading-tight group-hover:text-white/80 transition-colors">
                  {u.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 底部注释 */}
        <div className="text-center mt-6 space-y-1">
          <p className="text-white/15 text-xs">旅游系统课程设计 · Phase 1</p>
          <Link to="/" className="text-sky-400/40 hover:text-sky-400/70 text-xs transition-colors">
            或直接访问系统首页 →
          </Link>
        </div>
      </div>
    </div>
  );
}
