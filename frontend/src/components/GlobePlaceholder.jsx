import { useEffect, useRef } from 'react';

/**
 * GlobePlaceholder — 地球占位 / 模拟渲染组件
 *
 * ─── 升级路线 ────────────────────────────────────────────────
 * Phase 1 (当前): Canvas 2D 模拟旋转地球，零依赖
 * Phase 2:        替换为 React Three Fiber + three-globe
 *                 npm install three @react-three/fiber @react-three/drei
 *                 只需替换此文件，Props 接口保持不变
 * Phase 3:        替换为 CesiumJS 真实地理地球
 *                 npm install cesium resium
 * ─────────────────────────────────────────────────────────────
 *
 * @param {function} onSpotClick   点击地球上的光点时回调 (spotId) => void
 * @param {number[]}  highlightIds  高亮显示的景点 ID 列表
 * @param {boolean}   autoRotate   是否自动旋转
 * @param {string}    className    容器 className
 */
export default function GlobePlaceholder({
  onSpotClick,
  highlightIds = [],
  autoRotate = true,
  className = '',
}) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const stateRef  = useRef({ angle: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx  = canvas.getContext('2d');
    const dpr  = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width  = rect.width  * dpr;
      canvas.height = rect.height * dpr;
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // 虚拟城市热点（lat/lon 单位：弧度）
    const HOTSPOTS = [
      { lat: 0.68, lon: 1.02, label: '北京',   color: '#38bdf8' },
      { lat: 0.54, lon: 1.07, label: '上海',   color: '#34d399' },
      { lat: 0.54, lon: 1.19, label: '杭州',   color: '#a78bfa' },
      { lat: 0.55, lon: 0.57, label: '欧洲',   color: '#fbbf24' },
      { lat: 0.40, lon: -0.28, label: '美东', color: '#fb923c' },
      { lat: 0.25, lon: -0.70, label: '巴西', color: '#f472b6' },
    ];

    function draw(timestamp) {
      const W  = canvas.width;
      const H  = canvas.height;
      const cx = W / 2;
      const cy = H / 2;
      const R  = Math.min(W, H) * 0.42;
      const t  = timestamp || 0;

      ctx.clearRect(0, 0, W, H);

      // ── 1. 星空背景 ──────────────────────────────────────────
      // (在外层做，此处只画地球区域)

      // ── 2. 大气光晕 ──────────────────────────────────────────
      const glow = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.5);
      glow.addColorStop(0,   'rgba(56, 189, 248, 0.18)');
      glow.addColorStop(0.5, 'rgba(14, 116, 144, 0.06)');
      glow.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // ── 3. 球体基底 ──────────────────────────────────────────
      const sph = ctx.createRadialGradient(
        cx - R * 0.32, cy - R * 0.32, R * 0.05,
        cx, cy, R
      );
      sph.addColorStop(0,   '#1e3f6e');
      sph.addColorStop(0.35,'#0d2545');
      sph.addColorStop(0.7, '#071728');
      sph.addColorStop(1,   '#020810');
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = sph;
      ctx.fill();

      // ── 4. 经纬线（裁剪到球体内）──────────────────────────────
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();

      const angle = stateRef.current.angle;

      // 经线（纵向，随旋转角变化）
      const lonCount = 12;
      for (let i = 0; i < lonCount; i++) {
        const phi = (i / lonCount) * Math.PI + angle;
        const cosP = Math.cos(phi);
        const rx = R * Math.abs(cosP);
        if (rx < 0.5) continue;

        const alpha = 0.12 + 0.10 * Math.abs(cosP);
        ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
        ctx.lineWidth = 0.8 / dpr;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, R, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 纬线（横向）
      const latCount = 7;
      for (let i = 1; i < latCount; i++) {
        const lat = (i / latCount) * Math.PI;
        const y   = cy - R * Math.cos(lat);
        const rr  = R * Math.sin(lat);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.10)';
        ctx.lineWidth = 0.6 / dpr;
        ctx.beginPath();
        ctx.ellipse(cx, y, rr, rr * 0.14, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();

      // ── 5. 大气环边缘 ─────────────────────────────────────────
      const atmo = ctx.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.06);
      atmo.addColorStop(0,   'rgba(56, 189, 248, 0.45)');
      atmo.addColorStop(0.5, 'rgba(56, 189, 248, 0.12)');
      atmo.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.06, 0, Math.PI * 2);
      ctx.fillStyle = atmo;
      ctx.fill();

      // ── 6. 高光 ───────────────────────────────────────────────
      const spec = ctx.createRadialGradient(
        cx - R * 0.38, cy - R * 0.38, 0,
        cx - R * 0.38, cy - R * 0.38, R * 0.55
      );
      spec.addColorStop(0, 'rgba(255,255,255,0.10)');
      spec.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = spec;
      ctx.fill();

      // ── 7. 城市热点 ───────────────────────────────────────────
      HOTSPOTS.forEach(({ lat, lon, color }) => {
        const adjLon = lon + angle * 1.8;
        const sinLat = Math.sin(lat);
        const cosLat = Math.cos(lat);
        const x3 = R * sinLat * Math.cos(adjLon);
        const y3 = R * cosLat;
        const z3 = R * sinLat * Math.sin(adjLon);

        if (z3 <= -R * 0.1) return; // 背面不渲染

        const sx = cx + x3;
        const sy = cy - y3;
        const vis = Math.max(0, (z3 + R * 0.1) / (R * 1.1)); // 0~1 可见度

        const pulse = 0.5 + 0.5 * Math.sin(t * 0.0015 + lon * 4);
        const dotR  = (2.5 + pulse * 2.5) * dpr;

        // 光晕
        const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, dotR * 3.5);
        halo.addColorStop(0, color.replace(')', `, ${vis * 0.7})`).replace('rgb', 'rgba').replace('#', 'rgba(') );
        halo.addColorStop(1, 'rgba(0,0,0,0)');
        // 简单实现：直接用透明色
        ctx.globalAlpha = vis;
        ctx.fillStyle = color + '33';
        ctx.beginPath();
        ctx.arc(sx, sy, dotR * 3.5, 0, Math.PI * 2);
        ctx.fill();

        // 核心点
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(sx, sy, dotR * 0.7, 0, Math.PI * 2);
        ctx.fill();

        // 脉冲环
        const pulseR = dotR * (1.5 + pulse * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = vis * (1 - pulse) * 0.7;
        ctx.beginPath();
        ctx.arc(sx, sy, pulseR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 1;
      });
    }

    let lastTs = 0;
    function animate(ts) {
      if (autoRotate) {
        const dt = ts - lastTs;
        stateRef.current.angle += (dt / 1000) * 0.35; // 每秒转 0.35 弧度
      }
      lastTs = ts;
      draw(ts);
      rafRef.current = requestAnimationFrame(animate);
    }

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [autoRotate]);

  return (
    <div className={`relative select-none ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ cursor: onSpotClick ? 'pointer' : 'default' }}
      />
      {/* Phase 标注 — 开发时可见，生产可删 */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-sky-400/30 font-mono pointer-events-none whitespace-nowrap">
        GLOBE · Phase 1 Canvas  →  Phase 2 Three.js  →  Phase 3 CesiumJS
      </div>
    </div>
  );
}
