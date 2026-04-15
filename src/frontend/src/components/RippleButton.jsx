/**
 * RippleButton — Google Material Design 水波纹按钮
 * 点击时从点击位置扩散出圆形水波，松开后消失
 */
export default function RippleButton({
  children,
  className = '',
  style = {},
  onClick,
  rippleColor = 'rgba(255,255,255,0.45)',
  disabled = false,
  type = 'button',
  ...props
}) {
  const handleClick = (e) => {
    if (disabled) return;

    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.8;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top  - size / 2;

    const span = document.createElement('span');
    span.className = 'ripple-span';
    span.style.cssText = `
      width:${size}px;
      height:${size}px;
      left:${x}px;
      top:${y}px;
      background:${rippleColor};
    `;
    btn.appendChild(span);
    span.addEventListener('animationend', () => span.remove(), { once: true });

    onClick && onClick(e);
  };

  return (
    <button
      type={type}
      className={className}
      style={{ position: 'relative', overflow: 'hidden', userSelect: 'none', ...style }}
      onClick={handleClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
