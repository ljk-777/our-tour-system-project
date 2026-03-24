import { useEffect, useRef } from 'react';

// ── Constants ─────────────────────────────────────────────────────────────
const ORBIT_TILT  = -Math.PI / 5.5;
const ORBIT_SCALE = 0.30;

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

const IDLE_LIST = [
  { name: 'lookLeft',  w: 22, durMin: 2200, durMax: 3000 },
  { name: 'lookRight', w: 22, durMin: 2200, durMax: 3000 },
  { name: 'winkLeft',  w: 12, durMin: 1000, durMax: 1400 },
  { name: 'winkRight', w: 12, durMin: 1000, durMax: 1400 },
  { name: 'bounce',    w: 14, durMin: 1500, durMax: 2000 },
  { name: 'tap',       w: 10, durMin: 2000, durMax: 2800 },
  { name: 'sleep',     w:  8, durMin: 5000, durMax: 9000 },
];
const IDLE_DELAY = 4000;

const pickIdle = () => {
  const total = IDLE_LIST.reduce((s, a) => s + a.w, 0);
  let r = Math.random() * total;
  for (const a of IDLE_LIST) { r -= a.w; if (r <= 0) return { ...a, dur: a.durMin + Math.random() * (a.durMax - a.durMin) }; }
  return { ...IDLE_LIST[0], dur: 2500 };
};

// ── Springs ───────────────────────────────────────────────────────────────
const sp = (arr, target, k = 0.10, d = 0.76) => {
  arr[1] = arr[1] * d + (target - arr[0]) * k;
  arr[0] += arr[1];
};
// Underdamped — bouncy water-drop squish when closing
const spEye = (arr, target) => {
  arr[1] = arr[1] * 0.60 + (target - arr[0]) * 0.17;
  arr[0] += arr[1];
  if (arr[0] < 0) { arr[0] = -arr[0] * 0.18; arr[1] = -arr[1] * 0.18; }
  if (arr[0] > 1) { arr[0] = 2 - arr[0]; arr[1] = -arr[1] * 0.10; }
  return Math.max(0, Math.min(1, arr[0]));
};

// ── Component ─────────────────────────────────────────────────────────────
export default function TravelBeacon({ mouseX = 0.5, mouseY = 0.5, focusField = 'none', size = 260, className = '' }) {
  const canvasRef   = useRef(null);
  const wrapRef     = useRef(null);
  // Use refs for all frequently-changing props to avoid effect re-runs
  const mxRef       = useRef(mouseX);
  const myRef       = useRef(mouseY);
  const focusRef    = useRef(focusField);

  useEffect(() => { mxRef.current    = mouseX;    }, [mouseX]);
  useEffect(() => { myRef.current    = mouseY;    }, [mouseY]);
  useEffect(() => { focusRef.current = focusField; }, [focusField]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    let raf;

    // ── All spring/animation state lives here — never recreated ──
    const st = {
      leanX: [0, 0], leanY: [0, 0],
      lookX: [0, 0], lookY: [0, 0],
      eoL:   [1, 0], eoR:   [1, 0],
      smile: [0.45, 0], floatY: [0, 0], blush: [0.18, 0],
      blink: { timer: 0, phase: 'open' },
      blinkO: [1, 0],
      rot: 0,
      idle: {
        lastMx: mxRef.current, lastMy: myRef.current,
        lastMoveTs: null,   // null = not yet initialized; set to ts on first frame
        cooldown: 0,
        action: null,
        zzz: [],
        lastZzzTs: 0,
      },
    };

    // ── Globe surface gradient (shared with eyelid for seamless close) ──
    const makeBodyGrd = (cx, cy, r, lx, ly, isPass) => {
      const g = ctx.createRadialGradient(
        cx - r * 0.30 + lx * 0.10, cy - r * 0.34 + ly * 0.10, 0,
        cx + lx * 0.08,             cy + ly * 0.08,             r,
      );
      if (isPass) {
        g.addColorStop(0,    'rgba(120,240,190,0.94)');
        g.addColorStop(0.35, 'rgba(20,184,166,0.92)');
        g.addColorStop(0.70, 'rgba(6,88,78,0.96)');
        g.addColorStop(1,    'rgba(1,20,18,0.99)');
      } else {
        g.addColorStop(0,    'rgba(150,205,255,0.93)');
        g.addColorStop(0.35, 'rgba(56,189,248,0.91)');
        g.addColorStop(0.70, 'rgba(8,78,160,0.96)');
        g.addColorStop(1,    'rgba(1,10,38,0.99)');
      }
      return g;
    };

    // ── Orbit ring arc (half) ──
    const drawOrbitArc = (cx, cy, r, from, to, alpha, dOff) => {
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(ORBIT_TILT); ctx.scale(1, ORBIT_SCALE);
      ctx.beginPath(); ctx.arc(0, 0, r, from, to);
      ctx.strokeStyle = `rgba(56,189,248,${alpha})`;
      ctx.lineWidth = 1.4 / ORBIT_SCALE;
      ctx.setLineDash([5, 11]); ctx.lineDashOffset = dOff;
      ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    };

    // ── Single eye ──
    const drawEye = (ex, ey, ew, eh, openness, pdx, pdy, cx, cy, bR, lx, ly, isPass, isSleep) => {
      // Clip to eye socket
      ctx.save();
      ctx.beginPath(); ctx.ellipse(ex, ey, ew, eh, 0, 0, Math.PI * 2); ctx.clip();

      // Nebula backdrop
      const bg = ctx.createRadialGradient(ex, ey, 0, ex, ey, ew);
      if (isPass) {
        bg.addColorStop(0, 'rgba(10,220,140,0.22)'); bg.addColorStop(1, 'rgba(0,0,0,0.60)');
      } else {
        bg.addColorStop(0, 'rgba(80,180,255,0.20)'); bg.addColorStop(1, 'rgba(0,0,0,0.60)');
      }
      ctx.fillStyle = bg; ctx.fillRect(ex - ew * 1.5, ey - eh * 1.5, ew * 3, eh * 3);

      // Iris
      const iris = ctx.createRadialGradient(
        ex + pdx * ew * 0.22, ey + pdy * eh * 0.22, 0,
        ex + pdx * ew * 0.12, ey + pdy * eh * 0.12, ew * 0.52,
      );
      if (isPass) {
        iris.addColorStop(0, '#00f5a0'); iris.addColorStop(0.4, '#00b870'); iris.addColorStop(1, '#001a0e');
      } else {
        iris.addColorStop(0, '#90d8ff'); iris.addColorStop(0.4, '#2a9ef5'); iris.addColorStop(1, '#010b26');
      }
      ctx.beginPath(); ctx.ellipse(ex + pdx * ew * 0.22, ey + pdy * eh * 0.22, ew * 0.50, eh * 0.50, 0, 0, Math.PI * 2);
      ctx.fillStyle = iris; ctx.fill();

      // Pupil
      ctx.beginPath(); ctx.ellipse(ex + pdx * ew * 0.24, ey + pdy * eh * 0.24, ew * 0.22, eh * 0.22, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.90)'; ctx.fill();

      // Highlight dots
      ctx.beginPath(); ctx.ellipse(ex + pdx * ew * 0.10 - ew * 0.18, ey + pdy * eh * 0.10 - eh * 0.22, ew * 0.09, eh * 0.09, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.90)'; ctx.fill();
      ctx.beginPath(); ctx.ellipse(ex + pdx * ew * 0.08 + ew * 0.07, ey + pdy * eh * 0.08 - eh * 0.10, ew * 0.045, eh * 0.045, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();

      ctx.restore();

      // ── Eyelids ──
      if (openness >= 0.08) {
        const grd = makeBodyGrd(cx, cy, bR, lx, ly, isPass);
        // Upper lid
        const uy = ey - eh + eh * 2 * (1 - openness);
        ctx.save(); ctx.beginPath(); ctx.ellipse(ex, ey, ew, eh, 0, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = grd; ctx.fillRect(ex - ew * 1.5, ey - eh * 1.5, ew * 3, Math.max(0, uy - (ey - eh * 1.5)));
        ctx.restore();
        // Lower lid (46% travel)
        const ly2 = ey + eh - eh * 2 * (1 - openness) * 0.46;
        ctx.save(); ctx.beginPath(); ctx.ellipse(ex, ey, ew, eh, 0, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = grd; ctx.fillRect(ex - ew * 1.5, ly2, ew * 3, ew * 1.5);
        ctx.restore();
      } else {
        // Fully closed — cover with body color
        ctx.save(); ctx.beginPath(); ctx.ellipse(ex, ey, ew * 1.04, eh * 1.04, 0, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = makeBodyGrd(cx, cy, bR, lx, ly, isPass);
        ctx.fillRect(ex - ew * 2, ey - eh * 2, ew * 4, eh * 4);
        ctx.restore();
        // Arch line
        ctx.save();
        ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.strokeStyle = isPass ? 'rgba(0,40,25,0.70)' : 'rgba(0,20,55,0.70)';
        ctx.beginPath();
        if (isSleep) {
          // Wavy ~ sleep arch
          ctx.moveTo(ex - ew * 0.72, ey + eh * 0.05);
          ctx.bezierCurveTo(ex - ew * 0.30, ey - eh * 0.50, ex + ew * 0.05, ey + eh * 0.50, ex + ew * 0.38, ey - eh * 0.22);
          ctx.bezierCurveTo(ex + ew * 0.55, ey - eh * 0.48, ex + ew * 0.62, ey - eh * 0.08, ex + ew * 0.72, ey - eh * 0.18);
        } else {
          // Cute ^ arch
          ctx.moveTo(ex - ew * 0.76, ey + eh * 0.22);
          ctx.bezierCurveTo(ex - ew * 0.36, ey - eh * 0.65, ex + ew * 0.36, ey - eh * 0.65, ex + ew * 0.76, ey + eh * 0.22);
        }
        ctx.stroke();
        // Lashes on ^ arch only
        if (!isSleep) {
          [-0.50, -0.15, 0.15, 0.50].forEach(t => {
            const lx3   = ex + ew * t;
            const archY = ey - eh * 0.65 * (1 - (t / 0.76) ** 2);
            ctx.beginPath();
            ctx.moveTo(lx3, archY);
            ctx.lineTo(lx3 + (t < 0 ? -1 : 1) * ew * 0.10, archY - eh * 0.38);
            ctx.lineWidth = 1.6;
            ctx.stroke();
          });
        }
        ctx.restore();
      }

      // Outer glow ring
      ctx.save(); ctx.beginPath(); ctx.ellipse(ex, ey, ew, eh, 0, 0, Math.PI * 2);
      ctx.strokeStyle = isPass ? 'rgba(0,255,140,0.20)' : 'rgba(56,189,248,0.20)';
      ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
    };

    // ── ZZZ bubble ──
    const drawZzz = (z) => {
      ctx.save();
      ctx.globalAlpha = z.alpha;
      ctx.translate(z.x, z.y); ctx.rotate(z.rot); ctx.scale(z.scale, z.scale);
      ctx.beginPath(); ctx.ellipse(0, 0, z.fs * 0.78, z.fs * 0.78, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(15,50,110,0.55)'; ctx.fill();
      ctx.strokeStyle = 'rgba(100,180,255,0.38)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = 'rgba(190,225,255,0.95)';
      ctx.font = `bold ${Math.round(z.fs * 0.78)}px system-ui`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('z', 0, 0);
      ctx.restore();
    };

    // ════════════════════════════════════════════════════
    // RENDER LOOP
    // ════════════════════════════════════════════════════
    const draw = (ts) => {
      const dpr = window.devicePixelRatio || 1;
      const S   = size;

      // Size canvas
      if (canvas.width !== S * dpr || canvas.height !== S * dpr) {
        canvas.width  = S * dpr;
        canvas.height = S * dpr;
        canvas.style.width  = `${S}px`;
        canvas.style.height = `${S}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, S, S);

      const idle  = st.idle;
      const mx    = mxRef.current;
      const my    = myRef.current;
      const focus = focusRef.current;

      // Initialize lastMoveTs on first frame so idle doesn't fire immediately
      if (idle.lastMoveTs === null) idle.lastMoveTs = ts;

      // ── Mouse movement ──
      const moved = Math.hypot(mx - idle.lastMx, my - idle.lastMy) > 0.005;
      if (moved) {
        idle.lastMx = mx; idle.lastMy = my; idle.lastMoveTs = ts;
        if (idle.action?.name === 'sleep') {
          idle.action = { name: 'wakeUp', dur: 700, elapsed: 0 };
        } else if (idle.action?.name !== 'wakeUp') {
          idle.action = null;
        }
      }

      // ── Tick idle ──
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
        idle.action = { ...pickIdle(), elapsed: 0 };
        idle.lastZzzTs = 0;
      }

      // ── Targets ──
      const isPass  = focus === 'password';
      const isUser  = focus === 'username';
      let lookTX    = (mx - 0.5) * 2;
      let lookTY    = (my - 0.5) * 2;
      let eyeTL     = 1, eyeTR = 1;
      let isSleep   = false;

      if (isPass) { eyeTL = 0; eyeTR = 0; lookTX = 0; lookTY = 0.25; }

      const act = idle.action;
      if (act) {
        const p  = Math.min(1, act.elapsed / act.dur);
        const pe = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
        if (act.name === 'lookLeft') {
          const t = p < 0.15 ? p / 0.15 : p > 0.85 ? (1 - p) / 0.15 : 1;
          lookTX = -0.90 * t; lookTY = (my - 0.5) * 0.4;
        } else if (act.name === 'lookRight') {
          const t = p < 0.15 ? p / 0.15 : p > 0.85 ? (1 - p) / 0.15 : 1;
          lookTX = 0.90 * t; lookTY = (my - 0.5) * 0.4;
        } else if (act.name === 'winkLeft')  { eyeTL = 1 - Math.sin(p * Math.PI) * 0.95; }
        else if (act.name === 'winkRight') { eyeTR = 1 - Math.sin(p * Math.PI) * 0.95; }
        else if (act.name === 'sleep')   {
          isSleep = true;
          eyeTL = eyeTR = 1 - Math.min(1, p / 0.18);
          lookTX = Math.sin(p * 0.5) * 0.08; lookTY = 0.35 + Math.sin(p * 0.9) * 0.08;
        } else if (act.name === 'wakeUp') {
          isSleep = true; eyeTL = eyeTR = pe;
        }
      }

      // ── Auto blink ──
      const bl = st.blink;
      if (eyeTL > 0.5 && !isPass) {
        bl.timer += 16.67;
        if      (bl.phase === 'open'    && bl.timer > 2600 + Math.random() * 2000) { bl.phase = 'closing'; bl.timer = 0; }
        else if (bl.phase === 'closing' && bl.timer > 75)  { bl.phase = 'opening'; bl.timer = 0; }
        else if (bl.phase === 'opening' && bl.timer > 100) { bl.phase = 'open'; bl.timer = 0; }
        const bt = (bl.phase === 'closing' || bl.phase === 'opening') && bl.timer < 55 ? 0 : 1;
        spEye(st.blinkO, bt);
        eyeTL = Math.min(eyeTL, st.blinkO[0]);
        eyeTR = Math.min(eyeTR, st.blinkO[0]);
      } else {
        st.blinkO[0] = 1; st.blinkO[1] = 0;
      }

      // ── Advance springs ──
      sp(st.leanX,  (mx - 0.5) * 0.26,   0.06, 0.80);
      sp(st.leanY,  (my - 0.5) * 0.18,   0.06, 0.80);
      sp(st.lookX,  lookTX * 0.28,        0.10, 0.74);
      sp(st.lookY,  lookTY * 0.20,        0.10, 0.74);
      const eoL = spEye(st.eoL, eyeTL);
      const eoR = spEye(st.eoR, eyeTR);
      sp(st.smile,  isUser ? 0.75 : isPass ? 0.15 : 0.42, 0.07, 0.82);
      sp(st.floatY, Math.sin(ts * 0.0012) * 0.055,        0.04, 0.90);
      sp(st.blush,  isPass ? 0.75 : isUser ? 0.52 : 0.16, 0.06, 0.84);
      st.rot += 0.0014;

      // ── CSS 3D tilt ──
      wrap.style.transform = `perspective(600px) rotateY(${st.leanX[0] * 10}deg) rotateX(${-st.leanY[0] * 7}deg)`;

      // ── Geometry ──
      const cx  = S / 2;
      let   cy  = S / 2 + st.floatY[0] * S * 0.032;
      if (act?.name === 'bounce') cy += Math.sin((act.elapsed / act.dur) * Math.PI * 3) * S * 0.075;

      const bR      = S * 0.355;
      const lx      = st.leanX[0];
      const ly      = st.leanY[0];
      const pdx     = st.lookX[0] / 0.28;
      const pdy     = st.lookY[0] / 0.20;
      const orbitR  = bR * 1.44;
      const dashOff = -ts * 0.018;

      // Satellite
      const sA         = ts * 0.00085;
      const sXL        = orbitR * Math.cos(sA);
      const sYL        = orbitR * Math.sin(sA) * ORBIT_SCALE;
      const satX       = cx + sXL * Math.cos(ORBIT_TILT) - sYL * Math.sin(ORBIT_TILT);
      const satY       = cy + sXL * Math.sin(ORBIT_TILT) + sYL * Math.cos(ORBIT_TILT);
      const satFront   = Math.sin(sA) > 0;

      // ════ LAYERS ════

      // 1. Orbit back
      drawOrbitArc(cx, cy, orbitR, Math.PI, Math.PI * 2, 0.13, dashOff);

      // 2. Satellite back
      if (!satFront) {
        ctx.beginPath(); ctx.arc(satX, satY, S * 0.030, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56,189,248,0.45)'; ctx.fill();
        ctx.beginPath(); ctx.arc(satX, satY, S * 0.015, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200,240,255,0.85)'; ctx.fill();
      }

      // 3. Atmosphere
      const atmo = ctx.createRadialGradient(cx, cy, bR * 0.92, cx, cy, bR * 1.18);
      atmo.addColorStop(0,   isPass ? 'rgba(0,220,140,0.13)' : 'rgba(56,189,248,0.13)');
      atmo.addColorStop(0.5, isPass ? 'rgba(0,180,120,0.04)' : 'rgba(56,189,248,0.04)');
      atmo.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(cx, cy, bR * 1.18, 0, Math.PI * 2);
      ctx.fillStyle = atmo; ctx.fill();

      // 4. Shadow
      const shd = ctx.createRadialGradient(cx + bR * 0.18, cy + bR * 0.22, 0, cx + bR * 0.10, cy + bR * 0.14, bR * 0.75);
      shd.addColorStop(0, 'rgba(0,0,0,0.25)'); shd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(cx, cy, bR, 0, Math.PI * 2); ctx.fillStyle = shd; ctx.fill();

      // 5. Globe body
      ctx.beginPath(); ctx.arc(cx, cy, bR, 0, Math.PI * 2);
      ctx.fillStyle = makeBodyGrd(cx, cy, bR, lx, ly, isPass); ctx.fill();

      // 6. Grid lines
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, bR, 0, Math.PI * 2); ctx.clip();
      for (let lat = -3; lat <= 3; lat++) {
        if (!lat) continue;
        const lY = cy + (lat / 3.5) * bR;
        const lR = Math.sqrt(Math.max(0, bR * bR - (lY - cy) ** 2));
        if (lR < 1) continue;
        ctx.beginPath(); ctx.ellipse(cx + lx * bR * 0.05, lY + ly * bR * 0.03, lR * 0.97, lR * 0.24, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 0.5; ctx.stroke();
      }
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI + st.rot * 0.5;
        ctx.beginPath(); ctx.ellipse(cx + lx * bR * 0.05, cy + ly * bR * 0.03, bR * Math.abs(Math.cos(a)) * 0.95, bR * 0.95, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.022)'; ctx.lineWidth = 0.4; ctx.stroke();
      }
      ctx.restore();

      // 7. City lights (dark side)
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, bR, 0, Math.PI * 2); ctx.clip();
      CITY_LIGHTS.forEach(c => {
        const sp2 = Math.sin(c.phi);
        const x3 = sp2 * Math.cos(c.theta + st.rot);
        const y3 = Math.cos(c.phi);
        const z3 = sp2 * Math.sin(c.theta + st.rot);
        if (z3 > 0.10) return;
        const px = cx + x3 * bR * 0.91 + lx * bR * 0.05;
        const py = cy - y3 * bR * 0.91 + ly * bR * 0.03;
        const al = 0.18 + Math.sin(ts * 0.002 + c.theta) * 0.07;
        const lg = ctx.createRadialGradient(px, py, 0, px, py, S * 0.016);
        lg.addColorStop(0, `rgba(255,238,155,${al})`); lg.addColorStop(1, 'rgba(255,238,155,0)');
        ctx.beginPath(); ctx.arc(px, py, S * 0.016, 0, Math.PI * 2); ctx.fillStyle = lg; ctx.fill();
      });
      ctx.restore();

      // 8. Aurora
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, bR, 0, Math.PI * 2); ctx.clip();
      const aY  = cy - bR * 0.26 + Math.sin(ts * 0.0005) * bR * 0.04;
      const aG  = ctx.createLinearGradient(cx - bR, aY, cx + bR, aY + bR * 0.20);
      aG.addColorStop(0, 'rgba(0,0,0,0)');
      aG.addColorStop(0.25, isPass ? 'rgba(0,255,140,0.065)' : 'rgba(56,189,248,0.065)');
      aG.addColorStop(0.50, isPass ? 'rgba(0,200,110,0.10)'  : 'rgba(80,200,240,0.10)');
      aG.addColorStop(0.75, isPass ? 'rgba(0,255,140,0.065)' : 'rgba(56,189,248,0.065)');
      aG.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = aG; ctx.fillRect(cx - bR, aY, bR * 2, bR * 0.20); ctx.restore();

      // 9. Rim
      const rim = ctx.createRadialGradient(cx - bR * 0.30 + lx * bR * 0.08, cy - bR * 0.35 + ly * bR * 0.08, bR * 0.46, cx, cy, bR);
      rim.addColorStop(0.73, 'rgba(0,0,0,0)');
      rim.addColorStop(0.91, isPass ? 'rgba(0,255,160,0.06)' : 'rgba(56,189,248,0.06)');
      rim.addColorStop(1.00, isPass ? 'rgba(0,200,120,0.14)' : 'rgba(56,189,248,0.14)');
      ctx.beginPath(); ctx.arc(cx, cy, bR, 0, Math.PI * 2); ctx.fillStyle = rim; ctx.fill();

      // 10. Specular
      const spec = ctx.createRadialGradient(cx - bR * 0.27 + lx * bR * 0.10, cy - bR * 0.30 + ly * bR * 0.10, 0, cx - bR * 0.18, cy - bR * 0.22, bR * 0.50);
      spec.addColorStop(0, 'rgba(255,255,255,0.13)'); spec.addColorStop(0.5, 'rgba(255,255,255,0.03)'); spec.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.arc(cx, cy, bR, 0, Math.PI * 2); ctx.fillStyle = spec; ctx.fill();

      // 11. Orbit front
      drawOrbitArc(cx, cy, orbitR, 0, Math.PI, 0.27, dashOff);

      // 12. Satellite front
      if (satFront) {
        ctx.beginPath(); ctx.arc(satX, satY, S * 0.034, 0, Math.PI * 2);
        ctx.fillStyle = isPass ? 'rgba(0,220,145,0.58)' : 'rgba(56,189,248,0.58)'; ctx.fill();
        ctx.beginPath(); ctx.arc(satX, satY, S * 0.017, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(220,245,255,0.92)'; ctx.fill();
      }

      // 13. Face
      const eSpread = bR * 0.330;
      const eRise   = bR * 0.115;
      const avgEo   = (eoL + eoR) / 2;
      const sqX     = 1 + (1 - avgEo) * 0.20;
      const sqY     = 1 - (1 - avgEo) * 0.10;
      const ewB     = bR * 0.240 * sqX;
      const ehB     = bR * 0.192 * sqY;

      // Blush
      const ba = st.blush[0] * 0.26;
      [-1, 1].forEach(s => {
        const bx  = cx + s * eSpread * 1.60;
        const bcy = cy - eRise + ehB * 0.60;
        const bg  = ctx.createRadialGradient(bx, bcy, 0, bx, bcy, bR * 0.22);
        bg.addColorStop(0, `rgba(255,110,140,${ba})`); bg.addColorStop(1, 'rgba(255,110,140,0)');
        ctx.fillStyle = bg; ctx.fillRect(bx - bR * 0.22, bcy - bR * 0.14, bR * 0.44, bR * 0.28);
      });

      drawEye(cx - eSpread, cy - eRise, ewB, ehB, eoL, pdx, pdy, cx, cy, bR, lx, ly, isPass, isSleep);
      drawEye(cx + eSpread, cy - eRise, ewB, ehB, eoR, pdx, pdy, cx, cy, bR, lx, ly, isPass, isSleep);

      // Nose
      ctx.beginPath(); ctx.arc(cx + pdx * bR * 0.05, cy - eRise + ehB * 1.10 + pdy * bR * 0.04, S * 0.011, 0, Math.PI * 2);
      ctx.fillStyle = isPass ? 'rgba(0,130,80,0.38)' : 'rgba(50,135,200,0.38)'; ctx.fill();

      // Eyebrows
      const browY  = cy - eRise - ehB * 1.22;
      const browUp = isUser ? -bR * 0.038 : 0;
      [-1, 1].forEach(s => {
        const bx   = cx + s * eSpread;
        const tilt = isUser ? s * 0.07 : isPass ? -s * 0.11 : 0;
        ctx.save(); ctx.translate(bx, browY + browUp); ctx.rotate(tilt);
        ctx.beginPath();
        ctx.moveTo(-ewB * 0.58, 0);
        ctx.bezierCurveTo(-ewB * 0.18, -ehB * 0.36, ewB * 0.18, -ehB * 0.36, ewB * 0.58, 0);
        ctx.strokeStyle = isPass ? 'rgba(0,175,110,0.62)' : 'rgba(90,195,255,0.62)';
        ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore();
      });

      // Mouth
      const smA = st.smile[0];
      const mX  = cx + pdx * bR * 0.04;
      const mY  = cy - eRise + ehB * 2.15 + pdy * bR * 0.04;
      const mW  = bR * 0.270;
      const mH  = smA * bR * 0.135;
      ctx.beginPath();
      ctx.moveTo(mX - mW * 0.5, mY);
      ctx.bezierCurveTo(mX - mW * 0.14, mY + mH, mX + mW * 0.14, mY + mH, mX + mW * 0.5, mY);
      ctx.strokeStyle = isPass ? 'rgba(0,215,135,0.62)' : 'rgba(110,195,255,0.62)';
      ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.stroke();
      if (smA > 0.52) {
        ctx.save(); ctx.beginPath();
        ctx.moveTo(mX - mW * 0.32, mY + mH * 0.14);
        ctx.bezierCurveTo(mX - mW * 0.08, mY + mH * 0.82, mX + mW * 0.08, mY + mH * 0.82, mX + mW * 0.32, mY + mH * 0.14);
        ctx.closePath(); ctx.fillStyle = `rgba(255,255,255,${(smA - 0.52) * 0.48})`; ctx.fill(); ctx.restore();
      }

      // 14. Tap arm
      if (act?.name === 'tap') {
        const p       = act.elapsed / act.dur;
        const ext     = Math.min(1, p / 0.20);
        const ret     = p > 0.82 ? (p - 0.82) / 0.18 : 0;
        const armLen  = bR * 0.70 * ext * (1 - ret);
        const tapC    = p > 0.20 && p < 0.82 ? (Math.sin(((p - 0.20) / 0.62) * Math.PI * 6) + 1) / 2 : 0;
        const ax0 = cx + bR * 0.88, ay0 = cy + bR * 0.08;
        const ax1 = ax0 + armLen + tapC * bR * 0.10;
        const ay1 = ay0 + armLen * 0.26;
        ctx.beginPath(); ctx.moveTo(ax0, ay0);
        ctx.quadraticCurveTo(ax0 + armLen * 0.5, ay0 - bR * 0.10, ax1, ay1);
        ctx.strokeStyle = isPass ? 'rgba(0,215,145,0.68)' : 'rgba(56,189,248,0.68)';
        ctx.lineWidth = S * 0.018; ctx.lineCap = 'round'; ctx.stroke();
        ctx.beginPath(); ctx.arc(ax1, ay1, S * 0.026, 0, Math.PI * 2);
        ctx.fillStyle = isPass ? 'rgba(0,235,175,0.86)' : 'rgba(100,208,255,0.86)'; ctx.fill();
        if (tapC > 0.55 && armLen > bR * 0.28) {
          ctx.beginPath(); ctx.arc(ax1 + bR * 0.07, ay1, S * 0.048 * tapC, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(56,189,248,${(1 - tapC) * 0.45})`; ctx.lineWidth = 1.4; ctx.stroke();
        }
      }

      // 15. ZZZ bubbles
      if (act?.name === 'sleep' || act?.name === 'wakeUp') {
        if (act.name === 'sleep' && (!idle.lastZzzTs || ts - idle.lastZzzTs > 920)) {
          idle.lastZzzTs = ts;
          const i = idle.zzz.length % 3;
          idle.zzz.push({
            x: cx + bR * (0.16 + Math.random() * 0.46),
            y: cy - bR * 0.55,
            vx: (Math.random() - 0.40) * 0.36,
            vy: -(0.55 + Math.random() * 0.42),
            alpha: 0.90, scale: 0.60 + Math.random() * 0.44,
            rot: (Math.random() - 0.5) * 0.38,
            fs: 11 + i * 4,
          });
        }
        for (let i = idle.zzz.length - 1; i >= 0; i--) {
          const z = idle.zzz[i];
          z.x += z.vx; z.y += z.vy * 0.78;
          z.alpha -= 0.0055; z.rot += 0.011;
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

      // 16. Navigation pin (orbits globe surface)
      const pinA = ts * 0.00058 + Math.PI * 0.25;
      const pinX = cx + Math.cos(pinA) * bR * 1.08;
      const pinY = cy + Math.sin(pinA) * bR * 1.08 * 0.58;
      const pg   = ctx.createRadialGradient(pinX, pinY, 0, pinX, pinY, S * 0.016);
      pg.addColorStop(0, 'rgba(251,146,60,0.85)'); pg.addColorStop(1, 'rgba(251,146,60,0)');
      ctx.beginPath(); ctx.arc(pinX, pinY, S * 0.016, 0, Math.PI * 2); ctx.fillStyle = pg; ctx.fill();
      ctx.beginPath(); ctx.arc(pinX, pinY, S * 0.009, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,198,95,0.92)'; ctx.fill();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); };
  }, [size]); // Only re-run if size changes; focusField/mouse use refs

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
