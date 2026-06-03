import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BrandIcon from './BrandIcon.jsx';

const typeLabels = {
  scenic:'景区', campus:'高校', building:'建筑',
  restaurant:'餐厅', hotel:'酒店', hospital:'医院',
  mall:'商场', parking:'停车', toilet:'卫生间',
  atm:'ATM', pharmacy:'药店', souvenir:'纪念品',
  tourist_center:'游客中心', first_aid:'急救', bank:'银行',
  post_office:'邮局', gas_station:'加油', convenience:'便利店',
};

const cityGradients = {
  北京:  ['#1a1a2e','#16213e','#0f3460'],
  上海:  ['#0f2027','#203a43','#2c5364'],
  杭州:  ['#134e5e','#71b280'],
  成都:  ['#4e342e','#6a1b4d'],
  西安:  ['#5d4037','#8d6e63'],
  云南:  ['#004d40','#00695c'],
  桂林:  ['#1b5e20','#2e7d32'],
  张家界:['#212121','#37474f'],
  西藏:  ['#01579b','#0277bd'],
  default:['#1a237e','#283593'],
};

const cityIcons = {
  北京:'🏯', 上海:'🌆', 杭州:'🌊', 成都:'🐼', 西安:'🏛️',
  云南:'🏔️', 桂林:'⛰️', 张家界:'🌲', 西藏:'🗻', default:'🌏',
};

const typeAccentColor = {
  scenic:'#60a5fa', campus:'#c084fc', restaurant:'#fb923c',
  hotel:'#fbbf24', hospital:'#f87171', mall:'#f472b6', default:'#94a3b8',
};

/* ── Bento 尺寸模式循环 ───────────────────────────────── */
// 每 6 个一组：大(2x2) 小 小 宽(2x1) 小 小
const BENTO_PATTERN = ['large','small','small','wide','small','small'];

export default function SpotCard({ spot, animDelay = 0, index = 0 }) {
  const size   = BENTO_PATTERN[index % BENTO_PATTERN.length];
  const [c1, c2, c3] = (cityGradients[spot.city] || cityGradients.default).concat(['#1a237e']);
  const icon   = cityIcons[spot.city] || cityIcons.default;
  const label  = typeLabels[spot.type] || spot.type;
  const accent = typeAccentColor[spot.type] || typeAccentColor.default;
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = Boolean(spot.imageUrl);
  const showFallbackIcon = !hasImage || imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [spot.imageUrl]);

  const isLarge = size === 'large';
  const isWide  = size === 'wide';

  const gridStyle = {
    large: { gridColumn: 'span 2', gridRow: 'span 2' },
    wide:  { gridColumn: 'span 2', gridRow: 'span 1' },
    small: { gridColumn: 'span 1', gridRow: 'span 1' },
  }[size];

  return (
    <Link
      to={`/spots/${spot.id}`}
      style={{
        ...gridStyle,
        display: 'block',
        position: 'relative',
        borderRadius: 20,
        overflow: 'hidden',
        background: `linear-gradient(145deg, ${c1}, ${c2}${c3 ? ', ' + c3 : ''})`,
        animationDelay: `${animDelay}ms`,
        textDecoration: 'none',
        transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease',
        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px) scale(1.01)';
        e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.28)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.18)';
      }}
      className="animate-item-in"
    >
      {/* 噪点质感叠层 */}
      <div style={{
        position:'absolute', inset:0, opacity:0.04,
        backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize:'200px',
      }} />

      {/* 真实图片（渐显 + 懒加载），失败隐藏退回渐变+emoji */}
      {hasImage && !imageFailed && (
        <img
          src={spot.imageUrl}
          alt={spot.name}
          loading="lazy"
          style={{
            position:'absolute', inset:0, width:'100%', height:'100%',
            objectFit:'cover', opacity:0,
            transition:'opacity 0.35s ease',
          }}
          onLoad={e => { e.target.style.opacity = '1'; }}
          onError={() => { setImageFailed(true); }}
        />
      )}

      {/* 渐变遮罩让底部文字更清晰 */}
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 45%, transparent 100%)' }} />

      {/* 品牌回退 — 图片不存在或加载失败时显示 waylog 罗盘 */}
      {showFallbackIcon && (
        <div style={{
          position:'absolute', top:'50%', left:'50%',
          transform:'translate(-50%,-50%)',
          display:'flex', flexDirection:'column', alignItems:'center', gap: 4,
          userSelect:'none', pointerEvents:'none',
        }}>
          <BrandIcon size={isLarge ? 48 : isWide ? 36 : 28} variant="light" />
          <span style={{
            fontSize: isLarge ? '0.68rem' : '0.58rem',
            fontWeight: 500, color: 'rgba(255,255,255,0.25)',
            letterSpacing: '0.06em',
          }}>waylog</span>
        </div>
      )}

      {/* 类型标签 */}
      <div style={{ position:'absolute', top:14, left:14 }}>
        <span style={{
          fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase',
          padding:'3px 10px', borderRadius:99,
          background:'rgba(255,255,255,0.12)', backdropFilter:'blur(8px)',
          color: accent, border:`1px solid ${accent}40`,
        }}>
          {label}
        </span>
      </div>

      {/* 评分 */}
      {spot.rating && (
        <div style={{ position:'absolute', top:14, right:14, display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ fontSize:'0.72rem', fontWeight:700, color:'#fbbf24' }}>★ {spot.rating}</span>
        </div>
      )}

      {/* 底部内容 */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, padding: isLarge ? '20px 20px 18px' : '14px 14px 12px' }}>
        <h3 style={{
          fontFamily:'Inter, sans-serif',
          fontSize: isLarge ? '1.35rem' : isWide ? '1.05rem' : '0.9rem',
          fontWeight: 800, color:'#fff', letterSpacing:'-0.02em',
          lineHeight:1.2, marginBottom: isLarge ? 6 : 4,
          textShadow:'0 2px 8px rgba(0,0,0,0.4)',
        }}>
          {spot.name}
        </h3>

        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.6)', fontFamily:'Inter, sans-serif' }}>
            📍 {spot.city}
          </span>
          {spot.entranceFee === 0 ? (
            <span style={{ fontSize:'0.65rem', fontWeight:700, color:'#4ade80', marginLeft:'auto' }}>免费</span>
          ) : spot.entranceFee ? (
            <span style={{ fontSize:'0.65rem', fontWeight:700, color:'#fbbf24', marginLeft:'auto' }}>¥{spot.entranceFee}</span>
          ) : null}
        </div>

        {/* 大/宽卡片显示描述和标签 */}
        {(isLarge || isWide) && spot.description && (
          <p style={{
            fontSize:'0.75rem', color:'rgba(255,255,255,0.6)', marginTop:6,
            lineHeight:1.5, display:'-webkit-box', WebkitLineClamp: isLarge ? 2 : 1,
            WebkitBoxOrient:'vertical', overflow:'hidden',
          }}>
            {spot.description}
          </p>
        )}

        {isLarge && (spot.tags||[]).length > 0 && (
          <div style={{ display:'flex', gap:5, marginTop:10, flexWrap:'wrap' }}>
            {(spot.tags||[]).slice(0,3).map(tag => (
              <span key={tag} style={{
                fontSize:'0.62rem', padding:'2px 8px', borderRadius:99,
                background:'rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.75)',
              }}>#{tag}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
