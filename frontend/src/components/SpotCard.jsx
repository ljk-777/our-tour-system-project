import { Link } from 'react-router-dom';

const typeLabels = {
  scenic: '景区', campus: '高校', building: '建筑',
  restaurant: '餐厅', hotel: '酒店', hospital: '医院',
  mall: '商场', parking: '停车', toilet: '卫生间',
  atm: 'ATM', pharmacy: '药店', souvenir: '纪念品',
  tourist_center: '游客中心', first_aid: '急救', bank: '银行',
  post_office: '邮局', gas_station: '加油', convenience: '便利店',
};

// 城市 → 渐变色 (深色，适合暗主题)
const cityGradients = {
  北京: ['#7f1d1d', '#dc2626'],
  上海: ['#1e3a5f', '#2563eb'],
  杭州: ['#134e4a', '#0d9488'],
  成都: ['#7c2d12', '#ea580c'],
  西安: ['#78350f', '#d97706'],
  云南: ['#14532d', '#16a34a'],
  桂林: ['#064e3b', '#059669'],
  张家界: ['#292524', '#78716c'],
  西藏: ['#1e1b4b', '#4338ca'],
  default: ['#0c4a6e', '#0ea5e9'],
};

const cityIcons = {
  北京: '🏯', 上海: '🌆', 杭州: '🌊', 成都: '🐼', 西安: '🏛️',
  云南: '🏔️', 桂林: '⛰️', 张家界: '🌲', 西藏: '🗻', default: '🌏',
};

const typeAccent = {
  scenic:    { bg: 'rgba(14,165,233,0.12)',  text: '#38bdf8'  },
  campus:    { bg: 'rgba(99,102,241,0.12)',  text: '#818cf8'  },
  building:  { bg: 'rgba(168,85,247,0.12)', text: '#c084fc'  },
  restaurant:{ bg: 'rgba(249,115,22,0.12)', text: '#fb923c'  },
  hotel:     { bg: 'rgba(234,179,8,0.12)',   text: '#fcd34d'  },
  hospital:  { bg: 'rgba(239,68,68,0.12)',   text: '#f87171'  },
  mall:      { bg: 'rgba(236,72,153,0.12)',  text: '#f472b6'  },
};

export default function SpotCard({ spot }) {
  const [from, to] = cityGradients[spot.city] || cityGradients.default;
  const icon   = cityIcons[spot.city] || cityIcons.default;
  const acc    = typeAccent[spot.type] || { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.55)' };
  const label  = typeLabels[spot.type] || spot.type;

  return (
    <Link to={`/spots/${spot.id}`}
      className="block rounded-2xl overflow-hidden transition-all duration-250 hover:scale-[1.03] group"
      style={{ background: 'var(--surf-1)', border: '1px solid rgba(255,255,255,0.07)' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.45)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* 封面 */}
      <div className="h-36 relative overflow-hidden flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
        <span className="text-5xl opacity-80 group-hover:scale-110 transition-transform duration-300 select-none">
          {icon}
        </span>
        {/* 顶部光晕 */}
        <div className="absolute inset-0 opacity-30"
          style={{ background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.25), transparent 60%)` }} />
        {/* 类型徽章 */}
        <div className="absolute top-2.5 right-2.5">
          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full backdrop-blur-sm"
            style={{ background: acc.bg, color: acc.text, border: `1px solid ${acc.text}25` }}>
            {label}
          </span>
        </div>
        {/* 评分 */}
        {spot.rating && (
          <div className="absolute bottom-2 left-2.5 flex items-center gap-1 text-xs rounded-full px-2 py-0.5 backdrop-blur-sm"
            style={{ background: 'rgba(0,0,0,0.45)', color: 'rgba(255,255,255,0.90)' }}>
            ⭐ {spot.rating}
          </div>
        )}
      </div>

      {/* 内容 */}
      <div className="p-4">
        <h3 className="font-semibold text-sm truncate mb-1" style={{ color: 'rgba(255,255,255,0.88)' }}>
          {spot.name}
        </h3>
        <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
          📍 {spot.city} · {spot.province}
        </p>
        {spot.description && (
          <p className="text-xs line-clamp-2 mb-3" style={{ color: 'rgba(255,255,255,0.40)' }}>
            {spot.description}
          </p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {(spot.tags || []).slice(0, 2).map(tag => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.38)' }}>
                {tag}
              </span>
            ))}
          </div>
          {spot.entranceFee === 0 ? (
            <span className="text-xs font-semibold" style={{ color: '#4ade80' }}>免费</span>
          ) : spot.entranceFee ? (
            <span className="text-xs font-semibold" style={{ color: '#fb923c' }}>¥{spot.entranceFee}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
