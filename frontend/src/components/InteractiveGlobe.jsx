/**
 * InteractiveGlobe.jsx — 旅游系统核心互动角色
 *
 * 独立可替换组件，不含业务逻辑。
 * 升级路线：
 *   Phase 1 (当前): Canvas 2D 水晶地球精灵
 *   Phase 2:        React Three Fiber 3D 地球，接口不变
 *   Phase 3:        CesiumJS + AI 表情系统
 *
 * Props:
 *   mouseX, mouseY  — 鼠标屏幕坐标 (px)，组件内部归一化
 *   focusField      — 'none' | 'username' | 'password'
 *   size            — canvas 边长 (px)
 *   bounceSignal    — number，递增触发弹跳
 *   className
 */
import { useEffect, useRef } from 'react';

// ── 轨道环 ────────────────────────────────────────────────────────────────
const ORBIT_TILT  = -Math.PI / 5.5;
const ORBIT_SCALE = 0.30;

// ── 城市灯光（暗侧）────────────────────────────────────────────────────────
const CITY_LIGHTS = [
  { phi: 0.90, theta: 0.35 }, { phi: 0.88, theta: 2.01 }, { phi: 0.82, theta: -1.57 },
  { phi: 0.98, theta: 1.10 }, { phi: 1.05, theta: -0.52 }, { phi: 0.70, theta: 2.50 },
  { phi: 0.75, theta: 1.40 }, { phi: 0.60, theta: 0.10 }, { phi: 0.65, theta: -2.30 },
  { phi: 1.20, theta: -1.20 }, { phi: 1.15, theta: 3.00 }, { phi: 0.55, theta: 1.80 },
  { phi: 0.80, theta: -0.80 }, { phi: 1.30, theta: 0.50 }, { phi: 0.72, theta: -3.10 },
  { phi: 0.95, theta: 2.80 }, { phi: 1.08, theta: -2.10 }, { phi: 0.50, theta: 0.80 },
  { phi: 0.62, theta: -1.00 }, { phi: 1.18, theta: 1.60 }, { phi: 0.85, theta: -0.20 },
  { phi: 1.00, theta: 2.20 }, { phi: 0.78, theta: 0.60 }, { phi: 0.68, theta: -1.80 },
  { phi: 1.12, theta: -2.60 }, { phi: 0.58, theta: 2.90 }, { phi: 0.92, theta: -0.90 },
  { phi: 1.25, theta: 1.90 }, { phi: 0.72, theta: 3.10 }, { phi: 1.02, theta: -1.40 },
];

// ── 待机动作表 ────────────────────────────────────────────────────────────
const IDLE_LIST = [
  { name: 'lookLeft',  w: 20, durMin: 2200, durMax: 3000 },
  { name: 'lookRight', w: 20, durMin: 2200, durMax: 3000 },
  { name: 'winkLeft',  w: 11, durMin: 1000, durMax: 1400 },
  { name: 'winkRight', w: 11, durMin: 1000, durMax: 1400 },
  { name: 'bounce',    w: 12, durMin: 1400, durMax: 1900 },
  { name: 'tap',       w:  9, durMin: 2000, durMax: 2800 },
  { name: 'sleep',     w:  8, durMin: 5000, durMax: 9000 },
  { name: 'climbForm', w:  9, durMin: 4000, durMax: 5500 },
];
const IDLE_DELAY = 4000;

const pickIdle = () => {
  const total = IDLE_LIST.reduce((s, a) => s + a.w, 0);
  let r = Math.random() * total;
  for (const a of IDLE_LIST) { r -= a.w; if (r <= 0) return { ...a, dur: a.durMin + Math.random() * (a.durMax - a.durMin) }; }
  return { ...IDLE_LIST[0], dur: 2500 };
};

// ── 弹簧 ──────────────────────────────────────────────────────────────────
const sp = (arr, target, k = 0.10, d = 0.76) => {
  arr[1] = arr[1] * d + (target - arr[0]) * k;
  arr[0] += arr[1];
};
const spEye = (arr, target) => {
  arr[1] = arr[1] * 0.60 + (target - arr[0]) * 0.17;
  arr[0] += arr[1];
  if (arr[0] < 0) { arr[0] = -arr[0] * 0.18; arr[1] = -arr[1] * 0.18; }
  if (arr[0] > 1) { arr[0] = 2 - arr[0];     arr[1] = -arr[1] * 0.10; }
  return Math.max(0, Math.min(1, arr[0]));
};

// ── 轨道粒子预设（在 effect 内实例化）──────────────────────────────────────
const makeOrbitalParts = () => Array.from({ length: 11 }, (_, i) => ({
  angle:    (i / 11) * Math.PI * 2 + (i % 3) * 0.45,
  speed:    (0.00022 + (i % 4) * 0.00008) * (i % 2 ? 1 : -1),
  orbitMul: 1.16 + (i % 5) * 0.055,
  size:     0.9 + (i % 3) * 0.55,
  alpha:    0.16 + (i % 5) * 0.045,
  type:     i % 3, // 0=sky 1=amber 2=violet
}));

// ── 大气粒子（漂浮尘埃）────────────────────────────────────────────────────
const makeAtmoParts = () => Array.from({ length: 28 }, (_, i) => ({
  x: Math.random(), y: Math.random(),
  vx: (Math.random() - 0.5) * 0.00018,
  vy: (Math.random() - 0.5) * 0.00014,
  r:  0.5 + Math.random() * 1.2,
  a:  0.06 + Math.random() * 0.12,
  phase: Math.random() * Math.PI * 2,
}));

// ── 组件 ──────────────────────────────────────────────────────────────────
export default function InteractiveGlobe({
  mouseX       = window.innerWidth  / 2,
  mouseY       = window.innerHeight / 2,
  focusField   = 'none',
  size         = 260,
  bounceSignal = 0,
  className    = '',
}) {
  const canvasRef = useRef(null);
  const wrapRef   = useRef(null);
  const mxRef     = useRef(mouseX);
  const myRef     = useRef(mouseY);
  const focusRef  = useRef(focusField);
  const signalRef = useRef(bounceSignal);

  useEffect(() => { mxRef.current    = mouseX;       }, [mouseX]);
  useEffect(() => { myRef.current    = mouseY;       }, [mouseY]);
  useEffect(() => { focusRef.current = focusField;   }, [focusField]);
  useEffect(() => { signalRef.current = bounceSignal; }, [bounceSignal]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    let raf;
    let prevSignal = signalRef.current;

    // ── 完整动画状态（effect 生命周期内唯一一份）──────────────────────────
    const st = {
      leanX:  [0, 0], leanY:  [0, 0],
      lookX:  [0, 0], lookY:  [0, 0],
      eoL:    [1, 0], eoR:    [1, 0],
      smile:  [0.42, 0], floatY: [0, 0], blush: [0.16, 0],
      breathe:[1, 0],  // 呼吸缩放弹簧
      blink:  { timer: 0, phase: 'open' },
      blinkO: [1, 0],
      rot: 0,
      idle: {
        lastRawMx: mxRef.current, lastRawMy: myRef.current,
        lastMoveTs: null,
        cooldown: 0,
        action: null,
        zzz: [],
        lastZzzTs: 0,
      },
      orbParts: makeOrbitalParts(),
      atmoParts: makeAtmoParts(),
    };

    // ── 水晶/玻璃球体渐变（同时作眼睑填充，保持颜色连续）───────────────────
    const makeBodyGrd = (cx, cy, r, lx, ly, isPass) => {
      const hx = cx - r * 0.28 + lx * 0.12;
      const hy = cy - r * 0.32 + ly * 0.12;
      const g  = ctx.createRadialGradient(hx, hy, 0, cx + lx * 0.06, cy + ly * 0.06, r);
      if (isPass) {
        g.addColorStop(0,    'rgba(160,255,210,0.92)');
        g.addColorStop(0.20, 'rgba(40,220,170,0.88)');
        g.addColorStop(0.45, 'rgba(4,140,100,0.92)');
        g.addColorStop(0.72, 'rgba(1,55,42,0.96)');
        g.addColorStop(1,    'rgba(0,12,10,0.99)');
      } else {
        g.addColorStop(0,    'rgba(200,235,255,0.92)');
        g.addColorStop(0.20, 'rgba(70,175,255,0.88)');
        g.addColorStop(0.45, 'rgba(8,88,200,0.92)');
        g.addColorStop(0.72, 'rgba(2,22,80,0.96)');
        g.addColorStop(1,    'rgba(0,4,22,0.99)');
      }
      return g;
    };

    // ── 轨道弧 ───────────────────────────────────────────────────────────
    const drawOrbitArc = (cx, cy, r, from, to, alpha, dOff) => {
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(ORBIT_TILT); ctx.scale(1, ORBIT_SCALE);
      ctx.beginPath(); ctx.arc(0, 0, r, from, to);
      ctx.strokeStyle = `rgba(56,189,248,${alpha})`;
      ctx.lineWidth = 1.3 / ORBIT_SCALE;
      ctx.setLineDash([5, 11]); ctx.lineDashOffset = dOff;
      ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    };

    // ── 眼睛（全面重做：宝石虹膜 + 自然眼睑贝塞尔曲线）──────────────────────
    const drawEye = (ex, ey, ew, eh, openness, pdx, pdy, cx, cy, bR, lx, ly, isPass, isSleep) => {
      // 1. 眼眶阴影（在球面上挖出深度感）
      const sockR = Math.max(ew, eh) * 1.20;
      const sockGrd = ctx.createRadialGradient(ex, ey, sockR * 0.55, ex, ey, sockR);
      sockGrd.addColorStop(0, 'rgba(0,0,0,0)');
      sockGrd.addColorStop(1, 'rgba(0,0,0,0.38)');
      ctx.beginPath(); ctx.ellipse(ex, ey, sockR, sockR * (eh / ew) * 0.92, 0, 0, Math.PI * 2);
      ctx.fillStyle = sockGrd; ctx.fill();

      // 2. 裁切到眼眶
      ctx.save();
      ctx.beginPath(); ctx.ellipse(ex, ey, ew, eh, 0, 0, Math.PI * 2); ctx.clip();

      // 深空底色
      const bg = ctx.createRadialGradient(ex, ey, 0, ex, ey, ew * 1.1);
      if (isPass) { bg.addColorStop(0, 'rgba(8,200,130,0.20)'); bg.addColorStop(1, 'rgba(0,0,0,0.65)'); }
      else        { bg.addColorStop(0, 'rgba(40,150,255,0.18)'); bg.addColorStop(1, 'rgba(0,0,0,0.65)'); }
      ctx.fillStyle = bg; ctx.fillRect(ex - ew * 1.5, ey - eh * 1.5, ew * 3, eh * 3);

      // 虹膜（宝石多层渐变：高光中心 → 主色 → 暗边 → 瞳孔环）
      const irX  = ex + pdx * ew * 0.20;
      const irY  = ey + pdy * eh * 0.20;
      const irR  = ew * 0.54;
      const irRh = irR * (eh / ew); // 椭圆虹膜高度

      // 瞳孔环（limbal ring）
      ctx.beginPath(); ctx.ellipse(irX, irY, irR, irRh, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,5,0.92)'; ctx.fill();

      // 虹膜主体
      const iris = ctx.createRadialGradient(irX - irR * 0.10, irY - irRh * 0.12, 0, irX, irY, irR * 0.90);
      if (isPass) {
        iris.addColorStop(0,    'rgba(200,255,230,0.96)');
        iris.addColorStop(0.18, 'rgba(60,240,170,0.94)');
        iris.addColorStop(0.42, 'rgba(0,185,115,0.90)');
        iris.addColorStop(0.68, 'rgba(0,80,55,0.94)');
        iris.addColorStop(0.88, 'rgba(0,25,18,0.96)');
        iris.addColorStop(1,    'rgba(0,0,0,0)');
      } else {
        iris.addColorStop(0,    'rgba(220,245,255,0.96)');
        iris.addColorStop(0.18, 'rgba(100,210,255,0.94)');
        iris.addColorStop(0.42, 'rgba(22,130,248,0.90)');
        iris.addColorStop(0.68, 'rgba(4,45,160,0.94)');
        iris.addColorStop(0.88, 'rgba(1,10,50,0.96)');
        iris.addColorStop(1,    'rgba(0,0,0,0)');
      }
      ctx.beginPath(); ctx.ellipse(irX, irY, irR * 0.90, irRh * 0.90, 0, 0, Math.PI * 2);
      ctx.fillStyle = iris; ctx.fill();

      // 纹理细节环（虹膜纤维感，极细）
      ctx.beginPath(); ctx.ellipse(irX, irY, irR * 0.66, irRh * 0.66, 0, 0, Math.PI * 2);
      ctx.strokeStyle = isPass ? 'rgba(0,255,160,0.07)' : 'rgba(100,200,255,0.07)';
      ctx.lineWidth = 0.8; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(irX, irY, irR * 0.44, irRh * 0.44, 0, 0, Math.PI * 2);
      ctx.strokeStyle = isPass ? 'rgba(0,255,160,0.05)' : 'rgba(100,200,255,0.05)';
      ctx.stroke();

      // 瞳孔
      const pupX = ex + pdx * ew * 0.22, pupY = ey + pdy * eh * 0.22;
      const pupR = irR * 0.36;
      ctx.beginPath(); ctx.ellipse(pupX, pupY, pupR, pupR * (eh / ew), 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.94)'; ctx.fill();

      // 多重高光（宝石晶莹感）
      const hlX = ex + pdx * ew * 0.08 - ew * 0.20;
      const hlY = ey + pdy * eh * 0.08 - eh * 0.26;
      // 主高光（柔和大白点）
      const hl1 = ctx.createRadialGradient(hlX, hlY, 0, hlX, hlY, ew * 0.14);
      hl1.addColorStop(0, 'rgba(255,255,255,0.92)');
      hl1.addColorStop(0.4, 'rgba(255,255,255,0.40)');
      hl1.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.ellipse(hlX, hlY, ew * 0.14, eh * 0.14, 0, 0, Math.PI * 2);
      ctx.fillStyle = hl1; ctx.fill();
      // 次高光（更亮的核心针点）
      ctx.beginPath(); ctx.ellipse(hlX, hlY, ew * 0.05, eh * 0.05, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.98)'; ctx.fill();
      // 第二高光（右下偏）
      const hl2x = ex + pdx * ew * 0.12 + ew * 0.10, hl2y = ey + pdy * eh * 0.12 - eh * 0.12;
      const hl2 = ctx.createRadialGradient(hl2x, hl2y, 0, hl2x, hl2y, ew * 0.065);
      hl2.addColorStop(0, 'rgba(255,255,255,0.55)');
      hl2.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.ellipse(hl2x, hl2y, ew * 0.065, eh * 0.065, 0, 0, Math.PI * 2);
      ctx.fillStyle = hl2; ctx.fill();
      // 第三高光（彩色折射点）
      const hl3x = ex + ew * 0.22, hl3y = ey + eh * 0.22;
      ctx.beginPath(); ctx.ellipse(hl3x, hl3y, ew * 0.030, eh * 0.030, 0, 0, Math.PI * 2);
      ctx.fillStyle = isPass ? 'rgba(120,255,200,0.40)' : 'rgba(120,220,255,0.40)'; ctx.fill();

      ctx.restore();

      // 3. 眼睑（贝塞尔自然眼睑轮廓）
      const lidProg = 1 - openness;
      if (lidProg > 0.01) {
        const midY = ey - eh + eh * 2 * lidProg; // 眼睑下沿Y

        ctx.save();
        ctx.beginPath(); ctx.ellipse(ex, ey, ew * 1.02, eh * 1.02, 0, 0, Math.PI * 2); ctx.clip();

        // 上眼睑填充（自然弧线轮廓）
        ctx.beginPath();
        ctx.moveTo(ex - ew * 1.3, ey - eh * 1.5);
        ctx.lineTo(ex + ew * 1.3, ey - eh * 1.5);
        ctx.lineTo(ex + ew * 1.3, midY + eh * 0.10 * lidProg);
        ctx.bezierCurveTo(
          ex + ew * 0.55, midY - eh * 0.07 * lidProg,
          ex - ew * 0.55, midY - eh * 0.07 * lidProg,
          ex - ew * 1.3,  midY + eh * 0.10 * lidProg,
        );
        ctx.closePath();
        ctx.fillStyle = makeBodyGrd(cx, cy, bR, lx, ly, isPass);
        ctx.fill();
        ctx.restore();

        // 睫毛线（沿上眼睑底部弧线）
        if (lidProg > 0.06) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(ex - ew * 0.88, midY + eh * 0.10 * lidProg);
          ctx.bezierCurveTo(
            ex - ew * 0.28, midY - eh * 0.07 * lidProg,
            ex + ew * 0.28, midY - eh * 0.07 * lidProg,
            ex + ew * 0.88, midY + eh * 0.10 * lidProg,
          );
          ctx.strokeStyle = isPass
            ? `rgba(0,50,30,${Math.min(1, lidProg * 1.4) * 0.60})`
            : `rgba(0,20,60,${Math.min(1, lidProg * 1.4) * 0.60})`;
          ctx.lineWidth = 1.8 + lidProg * 1.2;
          ctx.lineCap = 'round'; ctx.stroke();
          ctx.restore();
        }
      }

      // 下眼睑（46% 行程）
      const loProg = lidProg * 0.46;
      if (loProg > 0.01) {
        const loY = ey + eh - eh * 2 * loProg;
        ctx.save();
        ctx.beginPath(); ctx.ellipse(ex, ey, ew * 1.02, eh * 1.02, 0, 0, Math.PI * 2); ctx.clip();
        ctx.beginPath();
        ctx.moveTo(ex - ew * 1.3, ey + eh * 1.5);
        ctx.lineTo(ex + ew * 1.3, ey + eh * 1.5);
        ctx.lineTo(ex + ew * 1.3, loY - eh * 0.05 * loProg);
        ctx.bezierCurveTo(
          ex + ew * 0.55, loY + eh * 0.04 * loProg,
          ex - ew * 0.55, loY + eh * 0.04 * loProg,
          ex - ew * 1.3,  loY - eh * 0.05 * loProg,
        );
        ctx.closePath();
        ctx.fillStyle = makeBodyGrd(cx, cy, bR, lx, ly, isPass);
        ctx.fill();
        ctx.restore();
      }

      // 4. 完全闭合时画萌弧线（^ 或 ~）
      if (openness < 0.08) {
        ctx.save();
        ctx.beginPath(); ctx.ellipse(ex, ey, ew * 1.04, eh * 1.04, 0, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = makeBodyGrd(cx, cy, bR, lx, ly, isPass);
        ctx.fillRect(ex - ew * 2, ey - eh * 2, ew * 4, eh * 4);
        ctx.restore();
        ctx.save();
        ctx.lineWidth = 3.2; ctx.lineCap = 'round';
        ctx.strokeStyle = isPass ? 'rgba(0,50,30,0.72)' : 'rgba(0,20,60,0.72)';
        ctx.beginPath();
        if (isSleep) {
          ctx.moveTo(ex - ew * 0.72, ey + eh * 0.05);
          ctx.bezierCurveTo(ex - ew * 0.30, ey - eh * 0.50, ex + ew * 0.05, ey + eh * 0.50, ex + ew * 0.38, ey - eh * 0.22);
          ctx.bezierCurveTo(ex + ew * 0.55, ey - eh * 0.48, ex + ew * 0.62, ey - eh * 0.08, ex + ew * 0.72, ey - eh * 0.18);
        } else {
          ctx.moveTo(ex - ew * 0.76, ey + eh * 0.22);
          ctx.bezierCurveTo(ex - ew * 0.36, ey - eh * 0.65, ex + ew * 0.36, ey - eh * 0.65, ex + ew * 0.76, ey + eh * 0.22);
        }
        ctx.stroke();
        if (!isSleep) {
          [-0.50, -0.15, 0.15, 0.50].forEach(t => {
            const lx3   = ex + ew * t;
            const archY = ey - eh * 0.65 * (1 - (t / 0.76) ** 2);
            ctx.beginPath(); ctx.moveTo(lx3, archY);
            ctx.lineTo(lx3 + (t < 0 ? -1 : 1) * ew * 0.10, archY - eh * 0.38);
            ctx.lineWidth = 1.7; ctx.stroke();
          });
        }
        ctx.restore();
      }

      // 5. 眼眶高光圈
      ctx.save(); ctx.beginPath(); ctx.ellipse(ex, ey, ew, eh, 0, 0, Math.PI * 2);
      ctx.strokeStyle = isPass ? 'rgba(0,255,150,0.18)' : 'rgba(56,189,248,0.18)';
      ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore();
    };

    // ── ZZZ 气泡 ─────────────────────────────────────────────────────────
    const drawZzz = (z) => {
      ctx.save();
      ctx.globalAlpha = z.alpha;
      ctx.translate(z.x, z.y); ctx.rotate(z.rot); ctx.scale(z.scale, z.scale);
      ctx.beginPath(); ctx.ellipse(0, 0, z.fs * 0.78, z.fs * 0.78, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(15,50,110,0.55)'; ctx.fill();
      ctx.strokeStyle = 'rgba(100,180,255,0.35)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = 'rgba(190,225,255,0.96)';
      ctx.font = `bold ${Math.round(z.fs * 0.78)}px system-ui`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('z', 0, 0);
      ctx.restore();
    };

    // ══════════════════════════════════════════════════════════════════════
    // RENDER LOOP
    // ══════════════════════════════════════════════════════════════════════
    const draw = (ts) => {
      const dpr = window.devicePixelRatio || 1;
      const S   = size;
      if (canvas.width !== Math.round(S * dpr) || canvas.height !== Math.round(S * dpr)) {
        canvas.width  = Math.round(S * dpr);
        canvas.height = Math.round(S * dpr);
        canvas.style.width  = `${S}px`;
        canvas.style.height = `${S}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, S, S);

      const idle  = st.idle;
      const rawMx = mxRef.current;
      const rawMy = myRef.current;
      const focus = focusRef.current;
      const mx    = rawMx / window.innerWidth;
      const my    = rawMy / window.innerHeight;

      if (idle.lastMoveTs === null) idle.lastMoveTs = ts;

      // bounceSignal
      const curSig = signalRef.current;
      if (curSig !== prevSignal) {
        prevSignal = curSig;
        if (idle.action?.name !== 'sleep' && idle.action?.name !== 'wakeUp') {
          idle.action = { name: 'bounce', dur: 480 + Math.random() * 220, elapsed: 0 };
          idle.cooldown = 0;
        }
      }

      // 鼠标移动
      const moved = Math.hypot(rawMx - idle.lastRawMx, rawMy - idle.lastRawMy) > 3;
      if (moved) {
        idle.lastRawMx = rawMx; idle.lastRawMy = rawMy; idle.lastMoveTs = ts;
        if      (idle.action?.name === 'sleep')  { idle.action = { name: 'wakeUp', dur: 700, elapsed: 0 }; }
        else if (idle.action?.name !== 'wakeUp') { idle.action = null; }
      }

      // 待机状态机
      if (idle.action) {
        idle.action.elapsed += 16.67;
        if (idle.action.elapsed >= idle.action.dur) {
          const was = idle.action.name;
          idle.action = null;
          idle.cooldown = 1800 + Math.random() * 2200;
          if (was === 'sleep') { idle.action = { name: 'wakeUp', dur: 700, elapsed: 0 }; idle.cooldown = 2000; }
        }
      } else if (idle.cooldown > 0) {
        idle.cooldown -= 16.67;
      } else if (ts - idle.lastMoveTs > IDLE_DELAY) {
        idle.action = { ...pickIdle(), elapsed: 0 }; idle.lastZzzTs = 0;
      }

      // 目标计算
      const isPass = focus === 'password';
      const isUser = focus === 'username';
      let lookTX = (mx - 0.5) * 2, lookTY = (my - 0.5) * 2;
      let leanTX = (mx - 0.5) * 0.26 + Math.sin(ts * 0.00045 + 0.5) * 0.008; // 微漂移
      let leanTY = (my - 0.5) * 0.18;
      let eyeTL  = 1, eyeTR = 1;
      let isSleep = false;
      let smileTarget = isUser ? 0.76 : isPass ? 0.14 : 0.42;

      if (isPass) { eyeTL = 0; eyeTR = 0; lookTX = 0; lookTY = 0.25; }

      const act = idle.action;
      if (act) {
        const p  = Math.min(1, act.elapsed / act.dur);
        const pe = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
        const fade = (p0, p1) => p < p0 ? p / p0 : p > p1 ? (1 - p) / (1 - p1) : 1;
        switch (act.name) {
          case 'lookLeft':  lookTX = -0.90 * fade(0.15, 0.85); lookTY = (my - 0.5) * 0.4; break;
          case 'lookRight': lookTX =  0.90 * fade(0.15, 0.85); lookTY = (my - 0.5) * 0.4; break;
          case 'winkLeft':  eyeTL = 1 - Math.sin(p * Math.PI) * 0.95; break;
          case 'winkRight': eyeTR = 1 - Math.sin(p * Math.PI) * 0.95; break;
          case 'sleep':
            isSleep = true;
            eyeTL = eyeTR = 1 - Math.min(1, p / 0.18);
            lookTX = Math.sin(p * 0.5) * 0.08; lookTY = 0.35 + Math.sin(p * 0.9) * 0.08;
            break;
          case 'wakeUp': isSleep = true; eyeTL = eyeTR = pe; break;
          case 'climbForm': {
            const t = fade(0.14, 0.86);
            leanTX = 0.42 * t; leanTY = -0.06 * t;
            lookTX = 0.85 * t; lookTY = -0.20 * t;
            smileTarget = 0.86;
            break;
          }
          default: break;
        }
      }

      // 自动眨眼
      const bl = st.blink;
      if (eyeTL > 0.5 && !isPass) {
        bl.timer += 16.67;
        if      (bl.phase === 'open'    && bl.timer > 2600 + Math.random() * 2200) { bl.phase = 'closing'; bl.timer = 0; }
        else if (bl.phase === 'closing' && bl.timer > 75)  { bl.phase = 'opening'; bl.timer = 0; }
        else if (bl.phase === 'opening' && bl.timer > 100) { bl.phase = 'open';    bl.timer = 0; }
        const bt = (bl.phase === 'closing' || bl.phase === 'opening') && bl.timer < 55 ? 0 : 1;
        spEye(st.blinkO, bt);
        eyeTL = Math.min(eyeTL, st.blinkO[0]);
        eyeTR = Math.min(eyeTR, st.blinkO[0]);
      } else { st.blinkO[0] = 1; st.blinkO[1] = 0; }

      // 推进弹簧
      sp(st.leanX,   leanTX,                                        0.06, 0.80);
      sp(st.leanY,   leanTY,                                        0.06, 0.80);
      sp(st.lookX,   lookTX * 0.28,                                 0.10, 0.74);
      sp(st.lookY,   lookTY * 0.20,                                 0.10, 0.74);
      const eoL = spEye(st.eoL, eyeTL);
      const eoR = spEye(st.eoR, eyeTR);
      sp(st.smile,   smileTarget,                                   0.07, 0.82);
      // 复合浮动（多频叠加，有机感）
      const floatTarget =
        Math.sin(ts * 0.00088)         * 0.052 +
        Math.sin(ts * 0.00152 + 1.31) * 0.020 +
        Math.sin(ts * 0.00071 + 2.84) * 0.011;
      sp(st.floatY,  floatTarget,  0.035, 0.92);
      // 呼吸缩放
      const breatheTarget = 1 + Math.sin(ts * 0.00062) * 0.016;
      sp(st.breathe, breatheTarget, 0.030, 0.94);
      sp(st.blush,   isPass ? 0.76 : isUser ? 0.52 : 0.16, 0.06, 0.84);
      st.rot += 0.0013;

      // CSS 3D 惯性倾斜
      wrap.style.transform = `perspective(600px) rotateY(${st.leanX[0] * 10}deg) rotateX(${-st.leanY[0] * 7}deg)`;

      // 几何参数
      const cx    = S / 2;
      let   cy    = S / 2 + st.floatY[0] * S * 0.034;
      if (act?.name === 'bounce') cy += Math.sin((act.elapsed / act.dur) * Math.PI * 3) * S * 0.075;
      if (act?.name === 'climbForm') cy -= Math.sin((act.elapsed / act.dur) * Math.PI) * S * 0.038;

      const bR     = S * 0.350 * st.breathe[0]; // 呼吸缩放作用于半径
      const lx     = st.leanX[0];
      const ly     = st.leanY[0];
      const pdx    = st.lookX[0] / 0.28;
      const pdy    = st.lookY[0] / 0.20;
      const orbitR = S * 0.350 * 1.44; // 轨道不参与呼吸缩放，保持稳定
      const dashOff = -ts * 0.018;

      // 卫星
      const sA       = ts * 0.00085;
      const sXL      = orbitR * Math.cos(sA);
      const sYL      = orbitR * Math.sin(sA) * ORBIT_SCALE;
      const satX     = cx + sXL * Math.cos(ORBIT_TILT) - sYL * Math.sin(ORBIT_TILT);
      const satY     = cy + sXL * Math.sin(ORBIT_TILT) + sYL * Math.cos(ORBIT_TILT);
      const satFront = Math.sin(sA) > 0;

      // ═══════ 漂浮粒子（大气尘埃）═══════
      st.atmoParts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0;
        const px = p.x * S, py = p.y * S;
        const alpha = p.a * (0.6 + Math.sin(ts * 0.001 + p.phase) * 0.4);
        const gr = ctx.createRadialGradient(px, py, 0, px, py, p.r * 2.2);
        gr.addColorStop(0, `rgba(150,210,255,${alpha})`);
        gr.addColorStop(1, 'rgba(150,210,255,0)');
        ctx.beginPath(); ctx.arc(px, py, p.r * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = gr; ctx.fill();
      });

      // ═══════ 轨道后半弧 ═══════
      drawOrbitArc(cx, cy, orbitR, Math.PI, Math.PI * 2, 0.12, dashOff);

      // ═══════ 卫星（后方）═══════
      if (!satFront) {
        ctx.beginPath(); ctx.arc(satX, satY, S * 0.028, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56,189,248,0.40)'; ctx.fill();
        ctx.beginPath(); ctx.arc(satX, satY, S * 0.013, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200,240,255,0.80)'; ctx.fill();
      }

      // ═══════ 大气光晕（外层，宽） ═══════
      const outerHalo = ctx.createRadialGradient(cx, cy, bR * 0.85, cx, cy, bR * 1.45);
      outerHalo.addColorStop(0,   isPass ? 'rgba(0,255,160,0.06)' : 'rgba(30,140,255,0.06)');
      outerHalo.addColorStop(0.4, isPass ? 'rgba(0,200,120,0.03)' : 'rgba(20,100,255,0.03)');
      outerHalo.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(cx, cy, bR * 1.45, 0, Math.PI * 2);
      ctx.fillStyle = outerHalo; ctx.fill();

      // ═══════ 大气光晕（近层，中等） ═══════
      const atmo = ctx.createRadialGradient(cx, cy, bR * 0.93, cx, cy, bR * 1.18);
      atmo.addColorStop(0,   isPass ? 'rgba(0,255,160,0.12)' : 'rgba(56,189,248,0.12)');
      atmo.addColorStop(0.5, isPass ? 'rgba(0,200,120,0.04)' : 'rgba(56,189,248,0.04)');
      atmo.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(cx, cy, bR * 1.18, 0, Math.PI * 2);
      ctx.fillStyle = atmo; ctx.fill();

      // ═══════ 阴影 ═══════
      const shd = ctx.createRadialGradient(cx + bR * 0.18, cy + bR * 0.22, 0, cx + bR * 0.10, cy + bR * 0.14, bR * 0.75);
      shd.addColorStop(0, 'rgba(0,0,0,0.22)'); shd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(cx, cy, bR, 0, Math.PI * 2); ctx.fillStyle = shd; ctx.fill();

      // ═══════════════════════════════
      // 玻璃球体：多层渐变叠加
      // ═══════════════════════════════

      // A. 基础球体（深色）
      ctx.beginPath(); ctx.arc(cx, cy, bR, 0, Math.PI * 2);
      ctx.fillStyle = makeBodyGrd(cx, cy, bR, lx, ly, isPass); ctx.fill();

      // B. 球体内层（所有内容裁切到球内）
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, bR, 0, Math.PI * 2); ctx.clip();

      // 次表面散射：模拟光在玻璃内部的扩散
      const hx = cx - bR * 0.28 + lx * bR * 0.12;
      const hy = cy - bR * 0.32 + ly * bR * 0.12;
      const sss = ctx.createRadialGradient(hx, hy, 0, hx, hy, bR * 0.72);
      if (isPass) {
        sss.addColorStop(0,   'rgba(140,255,210,0.22)');
        sss.addColorStop(0.4, 'rgba(0,220,150,0.08)');
        sss.addColorStop(1,   'rgba(0,0,0,0)');
      } else {
        sss.addColorStop(0,   'rgba(180,230,255,0.22)');
        sss.addColorStop(0.4, 'rgba(40,150,255,0.08)');
        sss.addColorStop(1,   'rgba(0,0,0,0)');
      }
      ctx.fillStyle = sss; ctx.fillRect(cx - bR, cy - bR, bR * 2, bR * 2);

      // 经纬网格
      for (let lat = -3; lat <= 3; lat++) {
        if (!lat) continue;
        const lY = cy + (lat / 3.5) * bR;
        const lR = Math.sqrt(Math.max(0, bR * bR - (lY - cy) ** 2));
        if (lR < 1) continue;
        ctx.beginPath(); ctx.ellipse(cx + lx * bR * 0.05, lY + ly * bR * 0.03, lR * 0.97, lR * 0.24, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.035)'; ctx.lineWidth = 0.5; ctx.stroke();
      }
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI + st.rot * 0.5;
        ctx.beginPath(); ctx.ellipse(cx + lx * bR * 0.05, cy + ly * bR * 0.03, bR * Math.abs(Math.cos(a)) * 0.95, bR * 0.95, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.018)'; ctx.lineWidth = 0.4; ctx.stroke();
      }

      // 城市灯光（暗侧）
      CITY_LIGHTS.forEach(c => {
        const sp2 = Math.sin(c.phi);
        const x3  = sp2 * Math.cos(c.theta + st.rot);
        const y3  = Math.cos(c.phi);
        const z3  = sp2 * Math.sin(c.theta + st.rot);
        if (z3 > 0.10) return;
        const px = cx + x3 * bR * 0.91 + lx * bR * 0.05;
        const py = cy - y3 * bR * 0.91 + ly * bR * 0.03;
        const al = 0.16 + Math.sin(ts * 0.002 + c.theta) * 0.07;
        const lg = ctx.createRadialGradient(px, py, 0, px, py, S * 0.016);
        lg.addColorStop(0, `rgba(255,238,155,${al})`); lg.addColorStop(1, 'rgba(255,238,155,0)');
        ctx.beginPath(); ctx.arc(px, py, S * 0.016, 0, Math.PI * 2); ctx.fillStyle = lg; ctx.fill();
      });

      // 极光带
      const aY = cy - bR * 0.26 + Math.sin(ts * 0.0005) * bR * 0.04;
      const aG = ctx.createLinearGradient(cx - bR, aY, cx + bR, aY + bR * 0.20);
      aG.addColorStop(0, 'rgba(0,0,0,0)');
      aG.addColorStop(0.25, isPass ? 'rgba(0,255,140,0.060)' : 'rgba(56,189,248,0.060)');
      aG.addColorStop(0.50, isPass ? 'rgba(0,200,110,0.095)' : 'rgba(80,200,240,0.095)');
      aG.addColorStop(0.75, isPass ? 'rgba(0,255,140,0.060)' : 'rgba(56,189,248,0.060)');
      aG.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = aG; ctx.fillRect(cx - bR, aY, bR * 2, bR * 0.20);

      // 玻璃内部反射弧（底部区域亮斑，玻璃球特征）
      const refGrd = ctx.createRadialGradient(cx + bR * 0.24, cy + bR * 0.30, 0, cx + bR * 0.24, cy + bR * 0.30, bR * 0.44);
      refGrd.addColorStop(0,   isPass ? 'rgba(80,255,190,0.11)' : 'rgba(100,210,255,0.11)');
      refGrd.addColorStop(0.4, isPass ? 'rgba(40,200,140,0.05)' : 'rgba(60,170,255,0.05)');
      refGrd.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = refGrd; ctx.fillRect(cx - bR, cy - bR, bR * 2, bR * 2);

      ctx.restore(); // end globe clip

      // C. 玻璃边缘效果（球体外层，覆盖在球面上）

      // Fresnel 边缘光（高折射率玻璃特征）
      const fresnel = ctx.createRadialGradient(cx, cy, bR * 0.56, cx, cy, bR);
      fresnel.addColorStop(0,    'rgba(0,0,0,0)');
      fresnel.addColorStop(0.75, 'rgba(0,0,0,0)');
      fresnel.addColorStop(0.88, isPass ? 'rgba(0,255,180,0.06)' : 'rgba(56,189,248,0.06)');
      fresnel.addColorStop(0.95, isPass ? 'rgba(40,255,200,0.14)' : 'rgba(100,210,255,0.14)');
      fresnel.addColorStop(1,    isPass ? 'rgba(80,255,220,0.28)' : 'rgba(160,230,255,0.28)');
      ctx.beginPath(); ctx.arc(cx, cy, bR, 0, Math.PI * 2);
      ctx.fillStyle = fresnel; ctx.fill();

      // 玻璃边缘暗环（玻璃厚度边缘）
      ctx.beginPath(); ctx.arc(cx, cy, bR * 0.987, 0, Math.PI * 2);
      const edgeDark = ctx.createLinearGradient(cx - bR, cy, cx + bR, cy);
      edgeDark.addColorStop(0, 'rgba(0,0,0,0.20)');
      edgeDark.addColorStop(0.5, 'rgba(0,0,0,0)');
      edgeDark.addColorStop(1, 'rgba(0,0,0,0.12)');
      ctx.strokeStyle = edgeDark; ctx.lineWidth = bR * 0.025; ctx.stroke();

      // D. 主高光（宽柔和，拉开高级感）
      const specPrimary = ctx.createRadialGradient(
        cx - bR * 0.30 + lx * bR * 0.14, cy - bR * 0.36 + ly * bR * 0.14, 0,
        cx - bR * 0.18 + lx * bR * 0.10, cy - bR * 0.22 + ly * bR * 0.10, bR * 0.50,
      );
      specPrimary.addColorStop(0,   'rgba(255,255,255,0.28)');
      specPrimary.addColorStop(0.35, 'rgba(255,255,255,0.10)');
      specPrimary.addColorStop(0.70, 'rgba(255,255,255,0.03)');
      specPrimary.addColorStop(1,   'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.arc(cx, cy, bR, 0, Math.PI * 2);
      ctx.fillStyle = specPrimary; ctx.fill();

      // E. 次高光（色散偏移，蓝/绿色调）
      const specSx = cx - bR * 0.22 + lx * bR * 0.12;
      const specSy = cy - bR * 0.28 + ly * bR * 0.12;
      const specSecondary = ctx.createRadialGradient(specSx - bR * 0.06, specSy + bR * 0.04, 0, specSx, specSy, bR * 0.28);
      specSecondary.addColorStop(0,   isPass ? 'rgba(120,255,210,0.18)' : 'rgba(100,210,255,0.18)');
      specSecondary.addColorStop(0.5, isPass ? 'rgba(60,255,180,0.07)'  : 'rgba(60,180,255,0.07)');
      specSecondary.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(cx, cy, bR, 0, Math.PI * 2);
      ctx.fillStyle = specSecondary; ctx.fill();

      // F. 针点闪光（极亮微小点，玻璃质感标志）
      const glintX = cx - bR * 0.34 + lx * bR * 0.14;
      const glintY = cy - bR * 0.40 + ly * bR * 0.14;
      const glint = ctx.createRadialGradient(glintX, glintY, 0, glintX, glintY, bR * 0.055);
      glint.addColorStop(0, 'rgba(255,255,255,0.95)');
      glint.addColorStop(0.3, 'rgba(255,255,255,0.50)');
      glint.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.arc(glintX, glintY, bR * 0.055, 0, Math.PI * 2);
      ctx.fillStyle = glint; ctx.fill();

      // ═══════ 能量丝线（环绕玻璃球表面，轻微流动）═══════
      for (let w = 0; w < 3; w++) {
        const wPhase = ts * (0.00028 + w * 0.00009) + w * 2.1;
        const wStartA = Math.sin(wPhase) * Math.PI * 0.3 - Math.PI * 0.2 + w * Math.PI * 0.6;
        const wEndA   = wStartA + Math.PI * (0.44 + Math.sin(wPhase * 0.7) * 0.12);
        const wR      = bR * (1.002 + w * 0.006);
        const wAlpha  = 0.040 + w * 0.012;
        const wGrd    = ctx.createLinearGradient(
          cx + Math.cos(wStartA) * wR, cy + Math.sin(wStartA) * wR,
          cx + Math.cos(wEndA)   * wR, cy + Math.sin(wEndA)   * wR,
        );
        wGrd.addColorStop(0, 'rgba(0,0,0,0)');
        wGrd.addColorStop(0.5, isPass ? `rgba(0,255,170,${wAlpha})` : `rgba(56,189,248,${wAlpha})`);
        wGrd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath(); ctx.arc(cx, cy, wR, wStartA, wEndA);
        ctx.strokeStyle = wGrd; ctx.lineWidth = 1.1; ctx.stroke();
      }

      // ═══════ 轨道前半弧 ═══════
      drawOrbitArc(cx, cy, orbitR, 0, Math.PI, 0.26, dashOff);

      // ═══════ 卫星（前方）═══════
      if (satFront) {
        ctx.beginPath(); ctx.arc(satX, satY, S * 0.033, 0, Math.PI * 2);
        ctx.fillStyle = isPass ? 'rgba(0,220,145,0.58)' : 'rgba(56,189,248,0.58)'; ctx.fill();
        ctx.beginPath(); ctx.arc(satX, satY, S * 0.016, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(220,245,255,0.92)'; ctx.fill();
      }

      // ═══════ 轨道粒子（环绕漂浮，强化宇宙感）═══════
      const PART_COLORS = [[56, 189, 248], [251, 146, 60], [167, 139, 250]];
      st.orbParts.forEach(p => {
        p.angle += p.speed;
        const pr   = p.orbitMul * bR;
        const px   = cx + Math.cos(p.angle) * pr;
        const py   = cy + Math.sin(p.angle) * pr * 0.65;
        const [r, g, b] = PART_COLORS[p.type];
        const twinkle = 0.7 + Math.sin(ts * 0.003 + p.angle * 3) * 0.3;
        const gr = ctx.createRadialGradient(px, py, 0, px, py, p.size * 3);
        gr.addColorStop(0, `rgba(${r},${g},${b},${p.alpha * twinkle * 1.6})`);
        gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.beginPath(); ctx.arc(px, py, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = gr; ctx.fill();
        ctx.beginPath(); ctx.arc(px, py, p.size * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha * twinkle * 2.8})`; ctx.fill();
      });

      // ═══════ 面部 ═══════
      const eSpread = bR * 0.336;
      const eRise   = bR * 0.118;
      const avgEo   = (eoL + eoR) / 2;
      const sqX     = 1 + (1 - avgEo) * 0.20;
      const sqY     = 1 - (1 - avgEo) * 0.10;
      const ewB     = bR * 0.252 * sqX; // 眼睛更大（宝石质感需要空间）
      const ehB     = bR * 0.204 * sqY;

      // 腮红
      const ba = st.blush[0] * 0.24;
      [-1, 1].forEach(s => {
        const bx  = cx + s * eSpread * 1.60;
        const bcy = cy - eRise + ehB * 0.60;
        const bg  = ctx.createRadialGradient(bx, bcy, 0, bx, bcy, bR * 0.24);
        bg.addColorStop(0, `rgba(255,110,140,${ba})`); bg.addColorStop(1, 'rgba(255,110,140,0)');
        ctx.fillStyle = bg; ctx.fillRect(bx - bR * 0.24, bcy - bR * 0.15, bR * 0.48, bR * 0.30);
      });

      drawEye(cx - eSpread, cy - eRise, ewB, ehB, eoL, pdx, pdy, cx, cy, bR, lx, ly, isPass, isSleep);
      drawEye(cx + eSpread, cy - eRise, ewB, ehB, eoR, pdx, pdy, cx, cy, bR, lx, ly, isPass, isSleep);

      // 鼻点
      ctx.beginPath(); ctx.arc(cx + pdx * bR * 0.05, cy - eRise + ehB * 1.12 + pdy * bR * 0.04, S * 0.011, 0, Math.PI * 2);
      ctx.fillStyle = isPass ? 'rgba(0,130,80,0.36)' : 'rgba(50,135,200,0.36)'; ctx.fill();

      // 眉毛（更柔和，有表情）
      const browY  = cy - eRise - ehB * 1.24;
      const browUp = isUser ? -bR * 0.040 : 0;
      [-1, 1].forEach(s => {
        const bx   = cx + s * eSpread;
        const tilt = isUser ? s * 0.075 : isPass ? -s * 0.12 : 0;
        ctx.save(); ctx.translate(bx, browY + browUp); ctx.rotate(tilt);
        // 眉毛阴影（深度）
        ctx.beginPath();
        ctx.moveTo(-ewB * 0.60, 0);
        ctx.bezierCurveTo(-ewB * 0.18, -ehB * 0.40, ewB * 0.18, -ehB * 0.40, ewB * 0.60, 0);
        ctx.strokeStyle = isPass ? 'rgba(0,80,50,0.30)' : 'rgba(0,30,80,0.30)';
        ctx.lineWidth = 4.5; ctx.lineCap = 'round'; ctx.stroke();
        // 眉毛主线（更粗，有存在感）
        ctx.beginPath();
        ctx.moveTo(-ewB * 0.60, 0);
        ctx.bezierCurveTo(-ewB * 0.18, -ehB * 0.40, ewB * 0.18, -ehB * 0.40, ewB * 0.60, 0);
        ctx.strokeStyle = isPass ? 'rgba(0,190,120,0.68)' : 'rgba(80,195,255,0.68)';
        ctx.lineWidth = 3.0; ctx.stroke();
        ctx.restore();
      });

      // 嘴巴（更有弧度，自然可爱但克制）
      const smA = st.smile[0];
      const mX  = cx + pdx * bR * 0.04;
      const mY  = cy - eRise + ehB * 2.18 + pdy * bR * 0.04;
      const mW  = bR * 0.262;
      const mH  = smA * bR * 0.130;
      // 嘴巴阴影
      ctx.beginPath();
      ctx.moveTo(mX - mW * 0.50, mY);
      ctx.bezierCurveTo(mX - mW * 0.14, mY + mH + 1, mX + mW * 0.14, mY + mH + 1, mX + mW * 0.50, mY);
      ctx.strokeStyle = isPass ? 'rgba(0,80,50,0.30)' : 'rgba(0,30,80,0.30)';
      ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.stroke();
      // 嘴巴主线
      ctx.beginPath();
      ctx.moveTo(mX - mW * 0.50, mY);
      ctx.bezierCurveTo(mX - mW * 0.14, mY + mH, mX + mW * 0.14, mY + mH, mX + mW * 0.50, mY);
      ctx.strokeStyle = isPass ? 'rgba(0,218,138,0.65)' : 'rgba(100,198,255,0.65)';
      ctx.lineWidth = 2.5; ctx.stroke();
      // 微笑牙齿
      if (smA > 0.50) {
        ctx.save(); ctx.beginPath();
        ctx.moveTo(mX - mW * 0.34, mY + mH * 0.14);
        ctx.bezierCurveTo(mX - mW * 0.08, mY + mH * 0.84, mX + mW * 0.08, mY + mH * 0.84, mX + mW * 0.34, mY + mH * 0.14);
        ctx.closePath();
        ctx.fillStyle = `rgba(255,255,255,${(smA - 0.50) * 0.46})`; ctx.fill(); ctx.restore();
      }

      // ═══════ 待机动画 ═══════

      // 敲屏
      if (act?.name === 'tap') {
        const p      = act.elapsed / act.dur;
        const ext    = Math.min(1, p / 0.20), ret = p > 0.82 ? (p - 0.82) / 0.18 : 0;
        const armLen = bR * 0.70 * ext * (1 - ret);
        const tapC   = p > 0.20 && p < 0.82 ? (Math.sin(((p - 0.20) / 0.62) * Math.PI * 6) + 1) / 2 : 0;
        const ax0 = cx + bR * 0.88, ay0 = cy + bR * 0.08;
        const ax1 = ax0 + armLen + tapC * bR * 0.10, ay1 = ay0 + armLen * 0.26;
        ctx.beginPath(); ctx.moveTo(ax0, ay0);
        ctx.quadraticCurveTo(ax0 + armLen * 0.5, ay0 - bR * 0.10, ax1, ay1);
        ctx.strokeStyle = isPass ? 'rgba(0,215,145,0.68)' : 'rgba(56,189,248,0.68)';
        ctx.lineWidth = S * 0.018; ctx.lineCap = 'round'; ctx.stroke();
        ctx.beginPath(); ctx.arc(ax1, ay1, S * 0.026, 0, Math.PI * 2);
        ctx.fillStyle = isPass ? 'rgba(0,235,175,0.86)' : 'rgba(100,208,255,0.86)'; ctx.fill();
        if (tapC > 0.55 && armLen > bR * 0.28) {
          ctx.beginPath(); ctx.arc(ax1 + bR * 0.07, ay1, S * 0.048 * tapC, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(56,189,248,${(1 - tapC) * 0.42})`; ctx.lineWidth = 1.4; ctx.stroke();
        }
      }

      // 爬上登录框
      if (act?.name === 'climbForm') {
        const p      = act.elapsed / act.dur;
        const armT   = p < 0.14 ? p / 0.14 : p > 0.86 ? (1 - p) / 0.14 : 1;
        const armLen = bR * 0.80 * armT;
        const wave   = Math.sin(ts * 0.006) * bR * 0.10;
        const arm1x0 = cx + bR * 0.82, arm1y0 = cy - bR * 0.18;
        const arm1x1 = arm1x0 + armLen, arm1y1 = arm1y0 - bR * 0.08 + wave;
        ctx.beginPath(); ctx.moveTo(arm1x0, arm1y0);
        ctx.quadraticCurveTo(arm1x0 + armLen * 0.45, arm1y0 - bR * 0.22 + wave * 0.5, arm1x1, arm1y1);
        ctx.strokeStyle = 'rgba(56,189,248,0.70)'; ctx.lineWidth = S * 0.018; ctx.lineCap = 'round'; ctx.stroke();
        ctx.beginPath(); ctx.arc(arm1x1, arm1y1, S * 0.024, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(100,210,255,0.88)'; ctx.fill();
        const wave2  = Math.sin(ts * 0.006 + 1.2) * bR * 0.10;
        const arm2x0 = cx + bR * 0.85, arm2y0 = cy + bR * 0.20;
        const arm2x1 = arm2x0 + armLen * 0.80, arm2y1 = arm2y0 + bR * 0.05 + wave2;
        ctx.beginPath(); ctx.moveTo(arm2x0, arm2y0);
        ctx.quadraticCurveTo(arm2x0 + armLen * 0.40, arm2y0 + bR * 0.18 + wave2 * 0.5, arm2x1, arm2y1);
        ctx.strokeStyle = 'rgba(56,189,248,0.55)'; ctx.lineWidth = S * 0.016; ctx.lineCap = 'round'; ctx.stroke();
        ctx.beginPath(); ctx.arc(arm2x1, arm2y1, S * 0.020, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(100,210,255,0.75)'; ctx.fill();
        if (armT > 0.5) {
          const pa = (Math.sin(ts * 0.008) + 1) / 2 * 0.38;
          ctx.beginPath(); ctx.arc(arm1x1, arm1y1, S * 0.042, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(56,189,248,${pa})`; ctx.lineWidth = 1.2; ctx.stroke();
        }
      }

      // ZZZ 气泡
      if (act?.name === 'sleep' || act?.name === 'wakeUp') {
        if (act.name === 'sleep' && (!idle.lastZzzTs || ts - idle.lastZzzTs > 920)) {
          idle.lastZzzTs = ts;
          const i = idle.zzz.length % 3;
          idle.zzz.push({
            x: cx + bR * (0.16 + Math.random() * 0.46), y: cy - bR * 0.55,
            vx: (Math.random() - 0.40) * 0.36, vy: -(0.55 + Math.random() * 0.42),
            alpha: 0.90, scale: 0.60 + Math.random() * 0.44,
            rot: (Math.random() - 0.5) * 0.38, fs: 11 + i * 4,
          });
        }
        for (let i = idle.zzz.length - 1; i >= 0; i--) {
          const z = idle.zzz[i];
          z.x += z.vx; z.y += z.vy * 0.78; z.alpha -= 0.0055; z.rot += 0.011;
          if (z.alpha <= 0) { idle.zzz.splice(i, 1); continue; }
          drawZzz(z);
        }
      } else {
        for (let i = idle.zzz.length - 1; i >= 0; i--) {
          const z = idle.zzz[i];
          z.y -= 0.36; z.alpha -= 0.022;
          if (z.alpha <= 0) { idle.zzz.splice(i, 1); continue; }
          drawZzz(z);
        }
      }

      // 导航定位针
      const pinA = ts * 0.00058 + Math.PI * 0.25;
      const pinX = cx + Math.cos(pinA) * bR * 1.10;
      const pinY = cy + Math.sin(pinA) * bR * 1.10 * 0.58;
      const pg   = ctx.createRadialGradient(pinX, pinY, 0, pinX, pinY, S * 0.016);
      pg.addColorStop(0, 'rgba(251,146,60,0.88)'); pg.addColorStop(1, 'rgba(251,146,60,0)');
      ctx.beginPath(); ctx.arc(pinX, pinY, S * 0.016, 0, Math.PI * 2); ctx.fillStyle = pg; ctx.fill();
      ctx.beginPath(); ctx.arc(pinX, pinY, S * 0.009, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,198,95,0.92)'; ctx.fill();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return (
    <div
      ref={wrapRef}
      className={`relative select-none ${className}`}
      style={{ width: size, height: size, transformStyle: 'preserve-3d' }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
}
