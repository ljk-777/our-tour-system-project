import { useId } from 'react';

/**
 * BrandIcon — 迹刻 waylog 品牌图标
 *
 * 设计语言：极简罗盘玫瑰（Compass Rose）
 *   · 四个菱形指针：北指针最长最亮，南次之，东西两侧更短更淡
 *   · 中心小圆点 + 细外环：体现「定位」概念
 *   · 双渐变配色，自适应明暗背景
 *
 * @param {number}           size     图标边长（px），默认 32
 * @param {'light'|'dark'}   variant  light = 浅色渐变（用于深色背景），dark = 深蓝渐变（用于浅色背景）
 * @param {string}           className
 * @param {object}           style
 */
export default function BrandIcon({ size = 32, variant = 'dark', className = '', style }) {
  // useId 保证同一页面多次挂载时 gradient id 不冲突
  const uid = useId().replace(/:/g, '_');

  const [c1, c2] =
    variant === 'light'
      ? ['#38bdf8', '#2dd4bf']   // sky → teal（深色背景使用）
      : ['#0071e3', '#0ea5e9'];  // Apple blue → sky（浅色背景使用）

  const gN  = `bN${uid}`;  // 北-南渐变
  const gS  = `bS${uid}`;  // 南（反向）
  const gEW = `bW${uid}`;  // 东-西渐变

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <defs>
        {/* 北→南（主色调） */}
        <linearGradient id={gN} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%"   stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
        {/* 南指针（稍淡） */}
        <linearGradient id={gS} x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0%"   stopColor={c2} stopOpacity="0.75" />
          <stop offset="100%" stopColor={c1} stopOpacity="0.55" />
        </linearGradient>
        {/* 东西（横向） */}
        <linearGradient id={gEW} x1="0" y1="0.5" x2="1" y2="0.5">
          <stop offset="0%"   stopColor={c1} stopOpacity="0.55" />
          <stop offset="100%" stopColor={c2} stopOpacity="0.75" />
        </linearGradient>
      </defs>

      {/* ── 外环（极淡，营造边界感）── */}
      <circle cx="20" cy="20" r="18" stroke={c1} strokeWidth="0.8" opacity="0.18" />

      {/* ── 北指针（最长，最亮）── */}
      <polygon points="20,2  22.8,17.5  20,15.5  17.2,17.5" fill={`url(#${gN})`} />

      {/* ── 南指针 ── */}
      <polygon points="20,38 17.2,22.5  20,24.5  22.8,22.5" fill={`url(#${gS})`} />

      {/* ── 东指针 ── */}
      <polygon points="38,20  22.5,17.2  24.5,20  22.5,22.8" fill={`url(#${gEW})`} opacity="0.82" />

      {/* ── 西指针 ── */}
      <polygon points="2,20   17.5,22.8  15.5,20  17.5,17.2" fill={`url(#${gEW})`} opacity="0.58" />

      {/* ── 中心圆（实心主色）── */}
      <circle cx="20" cy="20" r="4.2" fill={`url(#${gN})`} />

      {/* ── 中心白点（高光）── */}
      <circle cx="20" cy="20" r="1.8" fill="white" opacity="0.90" />
    </svg>
  );
}
