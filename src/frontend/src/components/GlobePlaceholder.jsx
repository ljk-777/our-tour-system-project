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

function clamp01(v) {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2i(x, y, seed) {
  let h = seed ^ (x * 374761393) ^ (y * 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function valueNoise2D(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const xf = x - x0;
  const yf = y - y0;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);

  const a = hash2i(x0, y0, seed);
  const b = hash2i(x0 + 1, y0, seed);
  const c = hash2i(x0, y0 + 1, seed);
  const d = hash2i(x0 + 1, y0 + 1, seed);

  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

function fbm2D(x, y, seed, octaves = 5) {
  let amp = 0.55;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise2D(x * freq, y * freq, seed + i * 1013);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / (norm || 1);
}

function wrap01(x) {
  const v = x % 1;
  return v < 0 ? v + 1 : v;
}

function mixRGB(a, b, t) {
  return {
    r: Math.round(lerp(a.r, b.r, t)),
    g: Math.round(lerp(a.g, b.g, t)),
    b: Math.round(lerp(a.b, b.b, t)),
  };
}

function buildEarthTexture(seed = 1337, texW = 512, texH = 256) {
  const colors = new Uint8ClampedArray(texW * texH * 4);
  const landMask = new Uint8Array(texW * texH);
  const clouds = new Uint8Array(texW * texH);
  const rand = mulberry32(seed);

  const blobs = [
    { x: 0.23, y: 0.43, r: 0.18, a: 1.15 },
    { x: 0.30, y: 0.63, r: 0.12, a: 0.75 },
    { x: 0.43, y: 0.50, r: 0.10, a: 0.65 },
    { x: 0.52, y: 0.42, r: 0.22, a: 1.25 },
    { x: 0.62, y: 0.55, r: 0.20, a: 0.95 },
    { x: 0.70, y: 0.44, r: 0.16, a: 0.85 },
    { x: 0.78, y: 0.63, r: 0.11, a: 0.70 },
    { x: 0.88, y: 0.72, r: 0.10, a: 0.60 },
  ];

  const seaLevel = 0.55;
  const oceanDeep = hexToRgb('#061b3a');
  const oceanMid = hexToRgb('#0b3a69');
  const oceanShallow = hexToRgb('#117a8b');
  const landGreen = hexToRgb('#2f9e66');
  const landForest = hexToRgb('#1b6b4c');
  const landDesert = hexToRgb('#c7b37a');
  const landRock = hexToRgb('#8b7d6b');
  const landMountain = hexToRgb('#6b6f75');
  const ice = hexToRgb('#eef3f7');
  const sand = hexToRgb('#d7c48a');

  for (let y = 0; y < texH; y++) {
    const v = y / (texH - 1);
    const lat = (0.5 - v) * Math.PI;
    const latAbs = Math.abs(lat) / (Math.PI / 2);

    for (let x = 0; x < texW; x++) {
      const u0 = x / (texW - 1);
      const u = wrap01(u0);

      let blob = 0;
      for (const b of blobs) {
        const dx0 = Math.abs(u - b.x);
        const dx = Math.min(dx0, 1 - dx0);
        const dy = (v - b.y) * 1.15;
        const d2 = (dx * dx + dy * dy) / (b.r * b.r);
        blob += b.a * Math.exp(-d2 * 2.2);
      }

      const base = fbm2D(u * 3.5, v * 3.5, seed, 5);
      const ridge = 1 - Math.abs(2 * fbm2D(u * 7.2 + 19.1, v * 6.7 + 3.7, seed + 77, 4) - 1);
      const elevation = 0.45 * base + 0.55 * blob + 0.25 * ridge;

      const moisture = fbm2D(u * 5.5 + 11.7, v * 5.2 + 5.1, seed + 701, 4);
      const temp = clamp01(1 - latAbs);

      const isLand = elevation > seaLevel;
      landMask[y * texW + x] = isLand ? 1 : 0;

      let rgb;
      if (!isLand) {
        const depth = clamp01((seaLevel - elevation) / 0.35);
        rgb = mixRGB(oceanShallow, oceanDeep, depth);
        const wave = fbm2D(u * 42 + 2.3, v * 36 + 7.9, seed + 999, 3);
        const foam = smoothstep(0.62, 0.82, wave) * 0.10;
        rgb = mixRGB(rgb, { r: 255, g: 255, b: 255 }, foam);
      } else {
        const e = clamp01((elevation - seaLevel) / 0.55);
        const arid = smoothstep(0.40, 0.75, 1 - moisture) * smoothstep(0.25, 0.90, temp);
        const veg = smoothstep(0.20, 0.95, moisture) * smoothstep(0.15, 1.00, temp);
        const lowland = mixRGB(landDesert, landGreen, clamp01(veg * 0.85 + (1 - arid) * 0.2));
        const midland = mixRGB(lowland, landForest, smoothstep(0.05, 0.40, moisture) * 0.55);
        const highland = mixRGB(landRock, landMountain, smoothstep(0.35, 0.95, e));
        rgb = mixRGB(midland, highland, smoothstep(0.25, 0.75, e));

        const coast = smoothstep(0.00, 0.08, e);
        rgb = mixRGB(sand, rgb, coast);

        const snowLine = lerp(0.78, 0.55, temp);
        const snowT = smoothstep(snowLine, 0.98, e) * smoothstep(0.55, 1.00, latAbs);
        rgb = mixRGB(rgb, ice, snowT);

        if (latAbs > 0.92) {
          rgb = mixRGB(rgb, ice, smoothstep(0.92, 1.00, latAbs));
        }
      }

      const cloudN = fbm2D(u * 6.8 + 100.3, v * 6.2 + 200.7, seed + 2027, 5);
      const cloud = smoothstep(0.56, 0.78, cloudN) * smoothstep(0.08, 0.92, 1 - latAbs);
      const cloudAlpha = Math.round(clamp01(cloud) * 255);
      clouds[y * texW + x] = cloudAlpha;

      const i = (y * texW + x) * 4;
      colors[i + 0] = rgb.r;
      colors[i + 1] = rgb.g;
      colors[i + 2] = rgb.b;
      colors[i + 3] = 255;
    }
  }

  for (let i = 0; i < texW * texH; i++) {
    if (clouds[i] > 0 && rand() > 0.75) {
      clouds[i] = Math.min(255, clouds[i] + 55);
    }
  }

  return { texW, texH, colors, landMask, clouds };
}

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
    const earth = buildEarthTexture(1337, 512, 256);
    const light = (() => {
      const lx = -0.38, ly = 0.18, lz = 0.90;
      const ll = Math.hypot(lx, ly, lz) || 1;
      return { x: lx / ll, y: ly / ll, z: lz / ll };
    })();

    const mapRef = { w: 0, h: 0, canvas: null, ctx: null, img: null, data: null };

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

      const mapW = Math.max(260, Math.min(420, Math.floor(R * 1.55)));
      if (!mapRef.canvas || mapRef.w !== mapW) {
        mapRef.w = mapW;
        mapRef.h = mapW;
        mapRef.canvas = document.createElement('canvas');
        mapRef.canvas.width = mapW;
        mapRef.canvas.height = mapW;
        mapRef.ctx = mapRef.canvas.getContext('2d', { willReadFrequently: true });
        mapRef.img = mapRef.ctx.createImageData(mapW, mapW);
        mapRef.data = mapRef.img.data;
      }

      const data = mapRef.data;
      const mw = mapRef.w;
      const mh = mapRef.h;

      const rot = angle;
      const cloudRot = angle * 1.12 + t * 0.00006;

      for (let py = 0; py < mh; py++) {
        const yn = -((py + 0.5) / mh * 2 - 1);
        for (let px = 0; px < mw; px++) {
          const xn = (px + 0.5) / mw * 2 - 1;
          const r2 = xn * xn + yn * yn;
          const di = (py * mw + px) * 4;
          if (r2 > 1) {
            data[di + 3] = 0;
            continue;
          }
          const zn = Math.sqrt(1 - r2);
          const lat = Math.asin(yn);
          const lon = Math.atan2(xn, zn) + rot;
          const u = wrap01(lon / (Math.PI * 2) + 0.5);
          const v = clamp01(0.5 - lat / Math.PI);
          const tx = Math.min(earth.texW - 1, Math.floor(u * earth.texW));
          const ty = Math.min(earth.texH - 1, Math.floor(v * earth.texH));
          const ti = (ty * earth.texW + tx) * 4;
          const mi = ty * earth.texW + tx;

          let rr = earth.colors[ti + 0];
          let gg = earth.colors[ti + 1];
          let bb = earth.colors[ti + 2];

          const ndotl = Math.max(0, xn * light.x + yn * light.y + zn * light.z);
          const ambient = 0.34;
          const diff = 0.86 * ndotl;
          const shade = ambient + diff;
          rr *= shade;
          gg *= shade;
          bb *= shade;

          const edge = smoothstep(0.55, 1.00, Math.sqrt(r2));
          const vignette = 1 - edge * 0.22;
          rr *= vignette;
          gg *= vignette;
          bb *= vignette;

          if (!earth.landMask[mi]) {
            const spec = Math.pow(ndotl, 22) * 0.28;
            rr = rr + (255 - rr) * spec;
            gg = gg + (255 - gg) * spec;
            bb = bb + (255 - bb) * spec;
          }

          const lonC = Math.atan2(xn, zn) + cloudRot;
          const uc = wrap01(lonC / (Math.PI * 2) + 0.5);
          const tcx = Math.min(earth.texW - 1, Math.floor(uc * earth.texW));
          const cmi = ty * earth.texW + tcx;
          const ca = earth.clouds[cmi] / 255;
          if (ca > 0) {
            const c = ca * 0.32 * (0.35 + 0.65 * ndotl);
            rr = rr + (255 - rr) * c;
            gg = gg + (255 - gg) * c;
            bb = bb + (255 - bb) * c;
          }

          data[di + 0] = rr < 0 ? 0 : rr > 255 ? 255 : rr;
          data[di + 1] = gg < 0 ? 0 : gg > 255 ? 255 : gg;
          data[di + 2] = bb < 0 ? 0 : bb > 255 ? 255 : bb;
          data[di + 3] = 255;
        }
      }

      mapRef.ctx.putImageData(mapRef.img, 0, 0);
      ctx.drawImage(mapRef.canvas, cx - R, cy - R, R * 2, R * 2);

      const depth = ctx.createRadialGradient(cx + R * 0.30, cy + R * 0.35, R * 0.18, cx, cy, R * 1.05);
      depth.addColorStop(0, 'rgba(0,0,0,0)');
      depth.addColorStop(0.55, 'rgba(0,0,0,0.05)');
      depth.addColorStop(1, 'rgba(0,0,0,0.42)');
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = depth; ctx.fill();

      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();

      for (let i = 0; i < 10; i++) {
        const phi = (i / 10) * Math.PI + angle * 0.9;
        const cosP = Math.cos(phi);
        const rx = R * Math.abs(cosP);
        if (rx < 0.7) continue;
        ctx.strokeStyle = `rgba(56,189,248,${(0.06 + 0.06 * Math.abs(cosP)).toFixed(2)})`;
        ctx.lineWidth = 0.7 / dpr;
        ctx.beginPath(); ctx.ellipse(cx, cy, rx, R, 0, 0, Math.PI * 2); ctx.stroke();
      }
      for (let i = 1; i < 6; i++) {
        const lat = (i / 6) * Math.PI;
        const y = cy - R * Math.cos(lat);
        const rr2 = R * Math.sin(lat);
        ctx.strokeStyle = 'rgba(56,189,248,0.06)';
        ctx.lineWidth = 0.55 / dpr;
        ctx.beginPath(); ctx.ellipse(cx, y, rr2, rr2 * 0.13, 0, 0, Math.PI * 2); ctx.stroke();
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
        const adjLon = lon + angle;
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
