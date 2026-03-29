import { useEffect, useRef } from 'react';

/**
 * CosmosBackground — 深空宇宙背景层
 *
 * 独立可替换组件，不包含任何业务逻辑。
 * 升级路线:
 *   Phase 1 (当前): Canvas 2D 星点 + 低频流星 + 星云光斑
 *   Phase 2:        Three.js 粒子系统，加入视差层
 *   Phase 3:        真实星图数据 + WebGL 着色器
 *
 * @param {string} className  额外类名（通常 "absolute inset-0"）
 */
export default function CosmosBackground({ className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let W, H, raf;
    const stars   = [];
    const meteors  = [];
    let lastMeteorTs = 0;
    let nextMeteorDelay = 12000 + Math.random() * 10000; // 12~22 秒首次

    /* ── 初始化 ─────────────────────────────────────────────── */
    const init = () => {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
      stars.length = 0;

      // 三层星点：远(暗小) / 中 / 近(亮大)
      const layers = [
        { count: 200, rMin: 0.12, rMax: 0.45, aMax: 0.30, daScale: 0.5 },
        { count: 120, rMin: 0.30, rMax: 0.80, aMax: 0.55, daScale: 0.8 },
        { count:  60, rMin: 0.60, rMax: 1.30, aMax: 0.80, daScale: 1.2 },
      ];
      layers.forEach(l => {
        for (let i = 0; i < l.count; i++) {
          stars.push({
            x:  Math.random() * W,
            y:  Math.random() * H,
            r:  l.rMin + Math.random() * (l.rMax - l.rMin),
            a:  Math.random() * l.aMax,
            aMax: l.aMax,
            da: (Math.random() - 0.5) * 0.003 * l.daScale,
          });
        }
      });
    };

    /* ── 主循环 ─────────────────────────────────────────────── */
    const draw = (ts) => {
      // 深空底色
      ctx.fillStyle = '#070b18';
      ctx.fillRect(0, 0, W, H);

      // 星云光斑（柔和径向渐变，位置固定）
      [
        { x: W * 0.20, y: H * 0.28, r: Math.min(W, H) * 0.40, c: 'rgba(14,165,233,0.032)' },
        { x: W * 0.78, y: H * 0.68, r: Math.min(W, H) * 0.45, c: 'rgba(20,184,166,0.025)' },
        { x: W * 0.50, y: H * 0.08, r: Math.min(W, H) * 0.30, c: 'rgba(99,102,241,0.022)' },
        { x: W * 0.88, y: H * 0.22, r: Math.min(W, H) * 0.22, c: 'rgba(56,189,248,0.018)' },
      ].forEach(g => {
        const grd = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.r);
        grd.addColorStop(0, g.c);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);
      });

      // 星点
      stars.forEach(s => {
        s.a += s.da;
        if (s.a <= 0.02)    { s.a = 0.02;     s.da = Math.abs(s.da); }
        if (s.a >= s.aMax)  { s.a = s.aMax;   s.da = -Math.abs(s.da); }
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(210,228,255,${s.a})`;
        ctx.fill();
      });

      // 流星（低频：每 12~22 秒一颗）
      if (!lastMeteorTs) lastMeteorTs = ts;
      if (ts - lastMeteorTs >= nextMeteorDelay) {
        lastMeteorTs = ts;
        nextMeteorDelay = 12000 + Math.random() * 10000;
        meteors.push({
          x:    Math.random() * W * 0.65,
          y:    Math.random() * H * 0.45,
          vx:   2.8 + Math.random() * 2.5,
          vy:   1.0 + Math.random() * 1.4,
          life: 1,
          tail: 70 + Math.random() * 50,
        });
      }

      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        const tailX = m.x - m.vx * (m.tail / 5);
        const tailY = m.y - m.vy * (m.tail / 5);
        const grd = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
        grd.addColorStop(0, `rgba(210,235,255,${m.life * 0.75})`);
        grd.addColorStop(1, 'rgba(210,235,255,0)');
        ctx.strokeStyle = grd;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        m.x    += m.vx;
        m.y    += m.vy;
        m.life -= 0.016;
        if (m.life <= 0 || m.x > W + 100 || m.y > H + 100) meteors.splice(i, 1);
      }

      raf = requestAnimationFrame(draw);
    };

    const onResize = () => init();
    window.addEventListener('resize', onResize);
    init();
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className={`pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
}
