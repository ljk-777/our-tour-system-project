/**
 * GlassPanel — 玻璃拟态基础面板
 *
 * 升级路线:
 *   Phase 2: 支持 glow 颜色变体、动画边框
 *   Phase 3: 集成地球信息弹窗样式
 *
 * @param {string}  className   额外样式
 * @param {boolean} hover       是否响应 hover
 * @param {boolean} active      激活态（亮边框）
 * @param {string}  variant     样式变体: 'dark'(默认) | 'dim' | 'accent'
 * @param {string}  as          根元素标签，默认 'div'
 */
export default function GlassPanel({
  children,
  className = '',
  hover     = false,
  active    = false,
  variant   = 'dark',
  as: Tag   = 'div',
  onClick,
  style,
}) {
  const base = {
    dark:   { bg: 'rgba(13,22,48,0.75)',  border: 'rgba(255,255,255,0.09)' },
    dim:    { bg: 'rgba(7,11,24,0.60)',   border: 'rgba(255,255,255,0.07)' },
    accent: { bg: 'rgba(14,165,233,0.08)', border: 'rgba(14,165,233,0.25)' },
  }[variant] || {};

  const borderColor = active ? 'rgba(14,165,233,0.45)' : base.border;

  return (
    <Tag
      onClick={onClick}
      className={['backdrop-blur-xl', hover ? 'cursor-pointer transition-all duration-200' : '', className].filter(Boolean).join(' ')}
      style={{
        background: base.bg,
        border: `1px solid ${borderColor}`,
        WebkitBackdropFilter: 'blur(20px)',
        ...style,
      }}
      onMouseEnter={hover ? (e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
      }) : undefined}
      onMouseLeave={hover ? (e => {
        e.currentTarget.style.background = base.bg;
        e.currentTarget.style.borderColor = borderColor;
      }) : undefined}
    >
      {children}
    </Tag>
  );
}
