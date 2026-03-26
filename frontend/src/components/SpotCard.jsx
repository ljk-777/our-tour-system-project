import { Link } from 'react-router-dom';

const typeLabels = {
  scenic: '景区', campus: '高校', building: '建筑',
  restaurant: '餐厅', hotel: '酒店', hospital: '医院',
  mall: '商场', parking: '停车', toilet: '卫生间',
  atm: 'ATM', pharmacy: '药店', souvenir: '纪念品',
  tourist_center: '游客中心', first_aid: '急救', bank: '银行',
  post_office: '邮局', gas_station: '加油', convenience: '便利店',
};

const cityGradients = {
  北京: ['#ffecd2', '#fcb69f'],
  上海: ['#a1c4fd', '#c2e9fb'],
  杭州: ['#84fab0', '#8fd3f4'],
  成都: ['#fccb90', '#d57eeb'],
  西安: ['#f9d29d', '#ffd3a5'],
  云南: ['#a8edea', '#fed6e3'],
  桂林: ['#b8f8d0', '#8efcad'],
  张家界: ['#d4e09b', '#b7e4c7'],
  西藏: ['#c3cfe2', '#e0eafc'],
  default: ['#a1c4fd', '#c2e9fb'],
};

const cityIcons = {
  北京: '🏯', 上海: '🌆', 杭州: '🌊', 成都: '🐼', 西安: '🏛️',
  云南: '🏔️', 桂林: '⛰️', 张家界: '🌲', 西藏: '🗻', default: '🌏',
};

const typeAccent = {
  scenic:    { bg: '#e8f1fc', text: '#0071e3' },
  campus:    { bg: '#f5ecfd', text: '#af52de' },
  building:  { bg: '#f5ecfd', text: '#af52de' },
  restaurant:{ bg: '#fff1ec', text: '#ff6b35' },
  hotel:     { bg: '#fff6e5', text: '#ff9500' },
  hospital:  { bg: '#fff1f0', text: '#ff3b30' },
  mall:      { bg: '#fff0f9', text: '#ff2d55' },
};

export default function SpotCard({ spot, animDelay = 0 }) {
  const [from, to] = cityGradients[spot.city] || cityGradients.default;
  const icon  = cityIcons[spot.city] || cityIcons.default;
  const acc   = typeAccent[spot.type] || { bg: '#f5f5f7', text: '#86868b' };
  const label = typeLabels[spot.type] || spot.type;

  return (
    <Link
      to={`/spots/${spot.id}`}
      className="block rounded-2xl overflow-hidden group animate-item-in"
      style={{
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.08)',
        transition: 'box-shadow 0.28s cubic-bezier(0.4,0,0.2,1), transform 0.28s cubic-bezier(0.34,1.56,0.64,1)',
        animationDelay: `${animDelay}ms`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 12px 36px rgba(0,0,0,0.14)';
        e.currentTarget.style.transform = 'translateY(-5px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      onMouseDown={e => {
        e.currentTarget.style.transform = 'translateY(-2px) scale(0.98)';
      }}
      onMouseUp={e => {
        e.currentTarget.style.transform = 'translateY(-5px)';
      }}
    >
      {/* 封面 — overflow:hidden 让 emoji 缩放不溢出 */}
      <div
        className="h-36 relative overflow-hidden flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      >
        {/* emoji 在 hover 时放大（靠父元素 group） */}
        <span
          className="text-5xl select-none"
          style={{
            transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            display: 'inline-block',
          }}
          ref={el => {
            if (!el) return;
            const card = el.closest('a');
            const enter = () => { el.style.transform = 'scale(1.22) rotate(-4deg)'; };
            const leave = () => { el.style.transform = 'scale(1) rotate(0deg)'; };
            card.addEventListener('mouseenter', enter);
            card.addEventListener('mouseleave', leave);
          }}
        >
          {icon}
        </span>

        {/* 类型徽章 */}
        <div className="absolute top-2.5 right-2.5">
          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.88)', color: acc.text }}>
            {label}
          </span>
        </div>

        {/* 评分 */}
        {spot.rating && (
          <div className="absolute bottom-2 left-2.5 flex items-center gap-1 text-xs rounded-full px-2 py-0.5"
            style={{ background: 'rgba(255,255,255,0.88)', color: '#1d1d1f' }}>
            ⭐ {spot.rating}
          </div>
        )}
      </div>

      {/* 内容 */}
      <div className="p-4">
        <h3 className="font-semibold text-sm truncate mb-1" style={{ color: '#1d1d1f' }}>
          {spot.name}
        </h3>
        <p className="text-xs mb-2" style={{ color: '#aeaeb2' }}>
          📍 {spot.city} · {spot.province}
        </p>
        {spot.description && (
          <p className="text-xs line-clamp-2 mb-3" style={{ color: '#86868b' }}>
            {spot.description}
          </p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {(spot.tags || []).slice(0, 2).map(tag => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: '#f5f5f7', color: '#86868b' }}>
                {tag}
              </span>
            ))}
          </div>
          {spot.entranceFee === 0 ? (
            <span className="text-xs font-semibold" style={{ color: '#34c759' }}>免费</span>
          ) : spot.entranceFee ? (
            <span className="text-xs font-semibold" style={{ color: '#ff6b35' }}>¥{spot.entranceFee}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
