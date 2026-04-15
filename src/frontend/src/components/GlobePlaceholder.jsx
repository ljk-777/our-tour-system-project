import { useEffect, useRef, useState } from 'react';

/**
 * GlobePlaceholder — 地球占位 / 模拟渲染组件
 *
 * ─── 升级路线 ────────────────────────────────────────────────
 * Phase 1.5 (当前): Canvas 2D 模拟地球
 *   · 接入真实 spots 数据（TopK 景点作为地球热点）
 *   · 鼠标拖拽旋转 + 松手惯性衰减
 *   · hover tooltip 显示景点名
 *   · 点击热点触发 onSpotClick 回调
 *   · 修复光晕 rgba 渲染
 * Phase 2: 替换为 React Three Fiber + three-globe
 *   npm install three @react-three/fiber @react-three/drei
 *   只需替换此文件，Props 接口完全保持不变
 * Phase 3: 替换为 CesiumJS 真实地理地球
 *   npm install cesium resium
 * ─────────────────────────────────────────────────────────────
 *
 * Props（Phase 2/3 替换时保持不变）：
 * @param {Array}    spots        后端景点数据（含 id/name/city/rating）
 * @param {function} onSpotClick  点击热点回调 (spotId) => void
 * @param {number[]} highlightIds 高亮景点 ID 列表
 * @param {boolean}  autoRotate   是否自动旋转
 * @param {string}   className    容器 className
 * @param {object}   style        容器 style
 */

// ── 中国主要城市虚拟球面坐标
// lat: 极角，0=北极 → π=南极；lon: 经度弧度（东向正）
const CITY_POS = {
  '北京':    { lat: 0.87, lon: 2.03 },
  '上海':    { lat: 1.09, lon: 2.14 },
  '杭州':    { lat: 1.10, lon: 2.10 },
  '成都':    { lat: 1.05, lon: 1.83 },
  '西安':    { lat: 0.97, lon: 1.88 },
  '广州':    { lat: 1.16, lon: 1.97 },
  '深圳':    { lat: 1.18, lon: 1.98 },
  '昆明':    { lat: 1.13, lon: 1.78 },
  '丽江':    { lat: 1.08, lon: 1.75 },
  '大理':    { lat: 1.11, lon: 1.75 },
  '拉萨':    { lat: 1.01, lon: 1.56 },
  '西藏':    { lat: 1.01, lon: 1.56 },
  '张家界':  { lat: 1.07, lon: 1.94 },
  '武汉':    { lat: 1.05, lon: 1.99 },
  '南京':    { lat: 1.02, lon: 2.08 },
  '苏州':    { lat: 1.06, lon: 2.10 },
  '厦门':    { lat: 1.14, lon: 2.06 },
  '福州':    { lat: 1.10, lon: 2.10 },
  '青岛':    { lat: 0.93, lon: 2.10 },
  '哈尔滨':  { lat: 0.77, lon: 2.22 },
  '沈阳':    { lat: 0.80, lon: 2.14 },
  '三亚':    { lat: 1.23, lon: 1.91 },
  '海口':    { lat: 1.19, lon: 1.90 },
  '桂林':    { lat: 1.13, lon: 1.90 },
  '重庆':    { lat: 1.04, lon: 1.85 },
  '贵阳':    { lat: 1.09, lon: 1.87 },
  '长沙':    { lat: 1.06, lon: 1.97 },
  '南昌':    { lat: 1.04, lon: 2.00 },
  '郑州':    { lat: 0.98, lon: 1.97 },
  '济南':    { lat: 0.93, lon: 2.08 },
  '太原':    { lat: 0.91, lon: 1.96 },
  '合肥':    { lat: 1.01, lon: 2.04 },
  '石家庄':  { lat: 0.89, lon: 1.99 },
  '山西':    { lat: 0.91, lon: 1.96 },
  '平遥':    { lat: 0.91, lon: 1.96 },
  '云南':    { lat: 1.11, lon: 1.78 },
  '西宁':    { lat: 0.95, lon: 1.79 },
  '兰州':    { lat: 0.92, lon: 1.82 },
  '乌鲁木齐':{ lat: 0.77, lon: 1.50 },
};

// 热点颜色列表（与 QUICK_ACTIONS 色调协调）
const SPOT_COLORS = [
  '#38bdf8', '#34d399', '#a78bfa', '#fbbf24',
  '#fb923c', '#f472b6', '#60a5fa', '#4ade80',
  '#f97316', '#e879f9',
];

// 字符串哈希 → 确定性数值（未知城市的位置回退）
function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// 十六进制颜色 → { r, g, b }
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

// spots 为空时的默认热点（覆盖全球主要区域）
const DEFAULT_HOTSPOTS = [
  { lat: 0.87, lon: 2.03,  label: '北京', color: '#38bdf8', id: null },
  { lat: 1.09, lon: 2.14,  label: '上海', color: '#34d399', id: null },
  { lat: 1.10, lon: 2.10,  label: '杭州', color: '#a78bfa', id: null },
  { lat: 0.55, lon: 0.57,  label: '欧洲', color: '#fbbf24', id: null },
  { lat: 0.40, lon: -0.28, label: '美东', color: '#fb923c', id: null },
  { lat: 0.25, lon: -0.70, label: '巴西', color: '#f472b6', id: null },
];

export default function GlobePlaceholder({
  spots        = [],
  onSpotClick,
  highlightIds = [],
  autoRotate   = true,
  className    = '',
  style,
}) {
  const canvasRef  = useRef(null);
  const rafRef     = useRef(null);
  const stateRef   = useRef({ angle: 0, dragging: false, lastX: 0, dragVelocity: 0 });
  const hitsRef    = useRef([]); // 每帧更新：[{ sx, sy, hitR, id, label, vis }]
  const [tooltip,  setTooltip]  = useState(null);  // { x, y, label }
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // ── 响应式尺寸
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width  = rect.width  * dpr;
      canvas.height = rect.height * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // ── 构建热点列表（从真实 spots 或默认数据）
    const hotspots = spots.length > 0
      ? spots.map((s, i) => {
          const key = s.city || s.name || '';
          const pos = CITY_POS[key] ?? (() => {
            const h = hashCode(key);
            // 哈希映射到中国区域（lat 0.7~1.3, lon 1.5~2.3）
            return { lat: 0.7 + (h % 600) / 1000, lon: 1.5 + (h % 800) / 1000 };
          })();
          return {
            lat:         pos.lat,
            lon:         pos.lon,
            label:       s.name || s.city,
            color:       SPOT_COLORS[i % SPOT_COLORS.length],
            id:          s.id,
            highlighted: highlightIds.includes(s.id),
          };
        })
      : DEFAULT_HOTSPOTS;

    // ── 主绘制函数
    function draw(timestamp) {
      const W  = canvas.width,  H  = canvas.height;
      const cx = W / 2,         cy = H / 2;
      const R  = Math.min(W, H) * 0.42;
      const t  = timestamp || 0;
      const angle = stateRef.current.angle;

      ctx.clearRect(0, 0, W, H);

      // 1. 大气光晕（外圈）
      const glow = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.5);
      glow.addColorStop(0,   'rgba(56,189,248,0.18)');
      glow.addColorStop(0.5, 'rgba(14,116,144,0.06)');
      glow.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.5, 0, Math.PI * 2); ctx.fill();

      // 2. 球体基底渐变
      const sph = ctx.createRadialGradient(cx - R * 0.32, cy - R * 0.32, R * 0.05, cx, cy, R);
      sph.addColorStop(0,    '#1e3f6e');
      sph.addColorStop(0.35, '#0d2545');
      sph.addColorStop(0.7,  '#071728');
      sph.addColorStop(1,    '#020810');
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = sph; ctx.fill();

      // 3. 经纬线（裁剪到球体内）
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();

      for (let i = 0; i < 12; i++) {
        const phi  = (i / 12) * Math.PI + angle;
        const cosP = Math.cos(phi);
        const rx   = R * Math.abs(cosP);
        if (rx < 0.5) continue;
        ctx.strokeStyle = `rgba(56,189,248,${(0.12 + 0.10 * Math.abs(cosP)).toFixed(2)})`;
        ctx.lineWidth = 0.8 / dpr;
        ctx.beginPath(); ctx.ellipse(cx, cy, rx, R, 0, 0, Math.PI * 2); ctx.stroke();
      }
      for (let i = 1; i < 7; i++) {
        const lat = (i / 7) * Math.PI;
        const y   = cy - R * Math.cos(lat);
        const rr  = R * Math.sin(lat);
        ctx.strokeStyle = 'rgba(56,189,248,0.10)';
        ctx.lineWidth = 0.6 / dpr;
        ctx.beginPath(); ctx.ellipse(cx, y, rr, rr * 0.14, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();

      // 4. 大气环边缘
      const atmo = ctx.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.06);
      atmo.addColorStop(0,   'rgba(56,189,248,0.45)');
      atmo.addColorStop(0.5, 'rgba(56,189,248,0.12)');
      atmo.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.06, 0, Math.PI * 2);
      ctx.fillStyle = atmo; ctx.fill();

      // 5. 高光
      const spec = ctx.createRadialGradient(
        cx - R * 0.38, cy - R * 0.38, 0,
        cx - R * 0.38, cy - R * 0.38, R * 0.55
      );
      spec.addColorStop(0, 'rgba(255,255,255,0.10)');
      spec.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = spec; ctx.fill();

      // 6. 景点热点
      const newHits = [];
      hotspots.forEach(({ lat, lon, color, id, label, highlighted }) => {
        const adjLon = lon + angle * 1.8;
        const x3 = R * Math.sin(lat) * Math.cos(adjLon);
        const y3 = R * Math.cos(lat);
        const z3 = R * Math.sin(lat) * Math.sin(adjLon);

        if (z3 <= -R * 0.1) return; // 背面不渲染

        const sx    = cx + x3;
        const sy    = cy - y3;
        const vis   = Math.max(0, (z3 + R * 0.1) / (R * 1.1)); // 0~1 可见度
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.0015 + lon * 4);
        const dotR  = (highlighted ? 3.8 : 2.8 + pulse * 1.8) * dpr;

        const { r, g, b } = hexToRgb(color);

        // 光晕（正确 rgba 渐变）
        const haloGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, dotR * 4.5);
        haloGrad.addColorStop(0, `rgba(${r},${g},${b},${(vis * 0.50).toFixed(2)})`);
        haloGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.globalAlpha = 1;
        ctx.fillStyle   = haloGrad;
        ctx.beginPath(); ctx.arc(sx, sy, dotR * 4.5, 0, Math.PI * 2); ctx.fill();

        // 核心点
        ctx.globalAlpha = vis;
        ctx.fillStyle   = highlighted ? '#ffffff' : color;
        ctx.beginPath(); ctx.arc(sx, sy, highlighted ? dotR * 1.1 : dotR * 0.75, 0, Math.PI * 2); ctx.fill();

        // highlighted：外圈彩色环
        if (highlighted) {
          ctx.strokeStyle = color;
          ctx.lineWidth   = 1.5;
          ctx.globalAlpha = vis * 0.65;
          ctx.beginPath(); ctx.arc(sx, sy, dotR * 1.7, 0, Math.PI * 2); ctx.stroke();
        }

        // 脉冲扩散环
        const pulseR = dotR * (2.0 + pulse * 2.5);
        ctx.strokeStyle = color;
        ctx.lineWidth   = highlighted ? 1.5 : 1;
        ctx.globalAlpha = vis * (1 - pulse) * 0.75;
        ctx.beginPath(); ctx.arc(sx, sy, pulseR, 0, Math.PI * 2); ctx.stroke();

        ctx.globalAlpha = 1;

        // 记录命中区域（转回 CSS 像素供事件检测使用）
        newHits.push({ sx: sx / dpr, sy: sy / dpr, hitR: dotR * 3.5 / dpr, id, label, vis });
      });
      hitsRef.current = newHits;
    }

    // ── 动画循环
    let lastTs = 0;
    function animate(ts) {
      const st = stateRef.current;
      if (!st.dragging) {
        const dt = ts - lastTs;
        if (Math.abs(st.dragVelocity) > 0.0002) {
          // 松手后惯性衰减
          st.angle        += st.dragVelocity;
          st.dragVelocity *= 0.93;
        } else if (autoRotate) {
          st.angle += (dt / 1000) * 0.35;
        }
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
  }, [autoRotate, spots, highlightIds]);

  // ── 鼠标拖拽旋转
  const handleMouseDown = (e) => {
    stateRef.current.dragging     = true;
    stateRef.current.lastX        = e.clientX;
    stateRef.current.dragVelocity = 0;
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    const st = stateRef.current;
    if (st.dragging) {
      const dx       = e.clientX - st.lastX;
      st.angle      += dx * 0.007;
      st.dragVelocity = dx * 0.007;
      st.lastX       = e.clientX;
    }

    // hover：检测是否悬浮在热点上
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const my   = e.clientY - rect.top;
    const hit  = hitsRef.current.find(p => {
      const dx = mx - p.sx, dy = my - p.sy;
      return Math.hypot(dx, dy) < p.hitR && p.vis > 0.15;
    });
    setTooltip(hit ? { x: hit.sx, y: hit.sy, label: hit.label } : null);
  };

  const handleMouseUp = () => {
    stateRef.current.dragging = false;
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    stateRef.current.dragging = false;
    setIsDragging(false);
    setTooltip(null);
  };

  // ── 点击热点
  const handleClick = (e) => {
    if (!onSpotClick) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const my   = e.clientY - rect.top;
    const hit  = hitsRef.current.find(p => {
      const dx = mx - p.sx, dy = my - p.sy;
      return Math.hypot(dx, dy) < p.hitR && p.vis > 0.15;
    });
    if (hit?.id) onSpotClick(hit.id);
  };

  const cursor = isDragging ? 'grabbing' : (onSpotClick ? 'grab' : 'default');

  return (
    <div className={`relative select-none ${className}`} style={style}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ cursor }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />

      {/* hover tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-10"
          style={{ left: tooltip.x, top: tooltip.y - 42, transform: 'translateX(-50%)' }}
        >
          <div style={{
            padding: '4px 10px',
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.04em',
            color: 'rgba(255,255,255,0.92)',
            background: 'rgba(5,12,32,0.90)',
            border: '1px solid rgba(56,189,248,0.40)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 20px rgba(0,0,0,0.50)',
          }}>
            {tooltip.label}
          </div>
          {/* 指示小箭头 */}
          <div style={{
            width: 6, height: 6,
            margin: '-3px auto 0',
            background: 'rgba(5,12,32,0.90)',
            borderRight: '1px solid rgba(56,189,248,0.40)',
            borderBottom: '1px solid rgba(56,189,248,0.40)',
            transform: 'rotate(45deg)',
          }} />
        </div>
      )}
    </div>
  );
}
