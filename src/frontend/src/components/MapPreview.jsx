import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/* ── 随机但固定的地图点位（模拟地图坐标）────────────────── */
const MAP_PINS = [
  { id: 1, name: '故宫博物院',   x: 52, y: 38, type: 'scenic',  rating: 4.9, color: '#ea4335' },
  { id: 2, name: '北海公园',     x: 44, y: 44, type: 'scenic',  rating: 4.7, color: '#34a853' },
  { id: 3, name: '天安门广场',   x: 51, y: 46, type: 'scenic',  rating: 4.8, color: '#ea4335' },
  { id: 4, name: '颐和园',       x: 32, y: 36, type: 'scenic',  rating: 4.8, color: '#ea4335' },
  { id: 5, name: '圆明园',       x: 30, y: 30, type: 'scenic',  rating: 4.5, color: '#fbbc04' },
  { id: 6, name: '北京大学',     x: 34, y: 28, type: 'campus',  rating: 4.9, color: '#1a73e8' },
  { id: 7, name: '清华大学',     x: 38, y: 26, type: 'campus',  rating: 4.9, color: '#1a73e8' },
  { id: 8, name: '天坛公园',     x: 55, y: 56, type: 'scenic',  rating: 4.7, color: '#34a853' },
  { id: 9, name: '王府井',       x: 57, y: 43, type: 'food',    rating: 4.6, color: '#ff6d00' },
  { id: 10, name: '后海',        x: 48, y: 40, type: 'scenic',  rating: 4.6, color: '#34a853' },
  { id: 11, name: '南锣鼓巷',    x: 54, y: 37, type: 'food',    rating: 4.5, color: '#ff6d00' },
  { id: 12, name: '鸟巢',        x: 58, y: 26, type: 'scenic',  rating: 4.7, color: '#ea4335' },
  { id: 13, name: '中国国家博物馆', x: 53, y: 45, type: 'scenic', rating: 4.8, color: '#9c27b0' },
  { id: 14, name: '三里屯',      x: 60, y: 38, type: 'food',    rating: 4.4, color: '#ff6d00' },
  { id: 15, name: '什刹海',      x: 48, y: 38, type: 'scenic',  rating: 4.6, color: '#34a853' },
];

const TYPE_LABELS = { scenic: '景区', campus: '高校', food: '美食' };
const TYPE_COLORS = { scenic: '#34a853', campus: '#1a73e8', food: '#ff6d00' };

export default function MapPreview({ spots = [] }) {
  const [active, setActive]   = useState(null);
  const [hovered, setHovered] = useState(null);
  const [filter, setFilter]   = useState('all');
  const navigate = useNavigate();

  const pins = filter === 'all' ? MAP_PINS : MAP_PINS.filter(p => p.type === filter);
  const listItems = [...MAP_PINS].sort((a, b) => b.rating - a.rating).slice(0, 6);

  return (
    <div className="map-preview-root">

      {/* ── 顶部搜索栏（Google Maps 风格）─────────── */}
      <div className="map-search-bar">
        <div className="map-search-inner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}>
            <circle cx="11" cy="11" r="7" stroke="#5f6368" strokeWidth="2"/>
            <path d="M16.5 16.5L21 21" stroke="#5f6368" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span style={{color:'#9aa0a6', fontSize:'14px', flex:1}}>搜索北京景点、高校、美食...</span>
          <div className="map-search-filters">
            {['all','scenic','campus','food'].map(f => (
              <button key={f}
                className={`map-filter-chip ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? '全部' : TYPE_LABELS[f]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 主体：左侧列表 + 右侧地图 ─────────────── */}
      <div className="map-body">

        {/* 左侧列表 */}
        <div className="map-sidebar">
          <div className="map-sidebar-header">
            <span style={{fontWeight:600, fontSize:'13px', color:'#202124'}}>热门景点</span>
            <span style={{fontSize:'12px', color:'#1a73e8', cursor:'pointer'}}
              onClick={() => navigate('/spots')}>查看全部 →</span>
          </div>
          <div className="map-list">
            {listItems.map((pin, i) => (
              <div key={pin.id}
                className={`map-list-item ${active?.id === pin.id ? 'active' : ''}`}
                onClick={() => setActive(active?.id === pin.id ? null : pin)}
                onMouseEnter={() => setHovered(pin.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <div className="map-list-rank">{i + 1}</div>
                <div className="map-list-info">
                  <div className="map-list-name">{pin.name}</div>
                  <div className="map-list-meta">
                    <span className="map-list-tag" style={{background: TYPE_COLORS[pin.type]+'15', color: TYPE_COLORS[pin.type]}}>
                      {TYPE_LABELS[pin.type]}
                    </span>
                    <span style={{color:'#fbbc04', fontSize:'11px'}}>★</span>
                    <span style={{fontSize:'11px', color:'#5f6368'}}>{pin.rating}</span>
                  </div>
                </div>
                <div className="map-list-pin-dot" style={{background: pin.color}} />
              </div>
            ))}
          </div>
          <button className="map-route-btn" onClick={() => navigate('/route')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M3 12h18M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            规划路线
          </button>
        </div>

        {/* 右侧地图 */}
        <div className="map-area">
          {/* 地图背景（CSS 模拟地图瓦片）*/}
          <div className="map-tiles">
            {/* 道路网格 */}
            <div className="map-roads-h" />
            <div className="map-roads-v" />
            {/* 公园/水域色块 */}
            <div className="map-park" style={{left:'28%',top:'22%',width:'8%',height:'12%',borderRadius:'40%'}} />
            <div className="map-water" style={{left:'44%',top:'40%',width:'5%',height:'4%',borderRadius:'50%'}} />
            <div className="map-park" style={{left:'50%',top:'52%',width:'7%',height:'8%',borderRadius:'30%'}} />
            <div className="map-park" style={{left:'30%',top:'32%',width:'5%',height:'6%',borderRadius:'50%'}} />
          </div>

          {/* 图钉 */}
          {pins.map(pin => (
            <div key={pin.id}
              className={`map-pin-wrapper ${hovered === pin.id || active?.id === pin.id ? 'elevated' : ''}`}
              style={{left:`${pin.x}%`, top:`${pin.y}%`}}
              onClick={() => setActive(active?.id === pin.id ? null : pin)}
              onMouseEnter={() => setHovered(pin.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="map-pin" style={{background: pin.color}}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              </div>
              <div className="map-pin-tail" style={{borderTopColor: pin.color}} />
              {/* 气泡 */}
              {(hovered === pin.id || active?.id === pin.id) && (
                <div className="map-bubble">
                  <div style={{fontWeight:600, fontSize:'12px', color:'#202124', whiteSpace:'nowrap'}}>{pin.name}</div>
                  <div style={{fontSize:'11px', color:'#5f6368', marginTop:'2px'}}>
                    <span style={{color:'#fbbc04'}}>★</span> {pin.rating} · {TYPE_LABELS[pin.type]}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* 地图控件 */}
          <div className="map-controls">
            <button className="map-ctrl-btn" title="放大">＋</button>
            <div className="map-ctrl-divider" />
            <button className="map-ctrl-btn" title="缩小">－</button>
          </div>

          {/* 地图右下角 logo 风格 */}
          <div className="map-watermark">迹刻地图</div>
        </div>
      </div>
    </div>
  );
}
