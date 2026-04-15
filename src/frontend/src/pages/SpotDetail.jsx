import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getSpotById, nearbySearch, getDiaries } from '../api/index.js';

const TYPE_LABELS = {
  scenic:'景区', campus:'高校', building:'建筑', restaurant:'餐厅',
  hotel:'酒店', hospital:'医院', parking:'停车场', toilet:'厕所',
  atm:'ATM', pharmacy:'药店', souvenir:'纪念品店', tourist_center:'游客中心',
  first_aid:'急救站', bank:'银行', post_office:'邮局', mall:'商场',
  gas_station:'加油站', convenience:'便利店',
};

const TYPE_ICONS = {
  scenic:'🏛️', campus:'🎓', building:'🏢', restaurant:'🍜',
  hotel:'🏨', hospital:'🏥', parking:'🅿️', toilet:'🚻',
  atm:'💳', pharmacy:'💊', souvenir:'🛍️', tourist_center:'ℹ️',
  first_aid:'🚑', bank:'🏦', post_office:'📮', mall:'🛒',
  gas_station:'⛽', convenience:'🏪',
};

const CITY_BG = {
  北京:'from-red-800 to-red-600', 上海:'from-blue-800 to-blue-600',
  杭州:'from-teal-700 to-teal-500', 成都:'from-orange-700 to-orange-500',
  西安:'from-amber-800 to-amber-600', 云南:'from-emerald-700 to-emerald-500',
  default:'from-blue-800 to-blue-600',
};

export default function SpotDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [spot, setSpot] = useState(null);
  const [nearby, setNearby] = useState([]);
  const [diaries, setDiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getSpotById(id),
      nearbySearch({ spotId: id, maxDist: 8000, limit: 8 }),
      getDiaries({ spotId: id, limit: 5 }),
    ]).then(([r1, r2, r3]) => {
      setSpot(r1.data.data);
      setNearby(r2.data.data || []);
      setDiaries(r3.data.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <div className="text-4xl mb-4 animate-float">🧭</div>
      <div className="text-gray-400">加载中...</div>
    </div>
  );
  if (!spot) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <div className="text-5xl mb-4">😕</div>
      <div className="text-gray-500">景点不存在</div>
      <button onClick={() => navigate(-1)} className="btn-outline mt-4 text-sm">← 返回</button>
    </div>
  );

  const grad = CITY_BG[spot.city] || CITY_BG.default;
  const typeIcon = TYPE_ICONS[spot.type] || '📍';
  const typeLabel = TYPE_LABELS[spot.type] || spot.type;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* 面包屑 */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link to="/" className="hover:text-blue-600">首页</Link>
        <span>/</span>
        <Link to="/spots" className="hover:text-blue-600">发现</Link>
        <span>/</span>
        <span className="text-gray-700">{spot.name}</span>
      </div>

      {/* 主卡片 */}
      <div className="card overflow-hidden mb-6">
        {/* 封面图 */}
        <div className={`h-56 bg-gradient-to-br ${grad} flex items-center justify-center relative`}>
          <span className="text-8xl opacity-75">{typeIcon}</span>
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/60 to-transparent">
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">{spot.name}</h1>
                <p className="text-white/80 text-sm flex items-center gap-2">
                  <span>📍 {spot.city}，{spot.province}</span>
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{typeLabel}</span>
                </p>
              </div>
              {spot.rating && (
                <div className="bg-yellow-400 text-yellow-900 font-bold px-3 py-1.5 rounded-xl text-sm">
                  ⭐ {spot.rating}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab 导航 */}
        <div className="flex border-b border-gray-100">
          {[['info','基本信息'],['nearby','周边场所'],['diary','相关日记']].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`px-5 py-3 text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
              {label}
              {key === 'nearby' && nearby.length > 0 && (
                <span className="ml-1.5 bg-blue-100 text-blue-600 text-xs px-1.5 py-0.5 rounded-full">{nearby.length}</span>
              )}
              {key === 'diary' && diaries.length > 0 && (
                <span className="ml-1.5 bg-purple-100 text-purple-600 text-xs px-1.5 py-0.5 rounded-full">{diaries.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* === 基本信息 Tab === */}
          {activeTab === 'info' && (
            <div>
              <p className="text-gray-700 leading-relaxed mb-6">{spot.description}</p>

              {/* 关键信息卡片 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {spot.rating !== undefined && (
                  <InfoCard icon="⭐" value={`${spot.rating} 分`} label="综合评分" color="yellow" />
                )}
                {spot.entranceFee !== undefined && (
                  <InfoCard icon="🎫" value={spot.entranceFee === 0 ? '免费' : `¥${spot.entranceFee}`} label="门票价格" color="green" />
                )}
                {spot.visitTime && (
                  <InfoCard icon="⏱️" value={`${spot.visitTime} 小时`} label="建议游玩" color="blue" />
                )}
                {spot.openHours && (
                  <InfoCard icon="🕐" value={spot.openHours} label="开放时间" color="purple" />
                )}
              </div>

              {/* 标签 */}
              {spot.tags && spot.tags.length > 0 && (
                <div className="mb-6">
                  <div className="text-sm font-medium text-gray-700 mb-2">景点标签</div>
                  <div className="flex flex-wrap gap-2">
                    {spot.tags.map(tag => (
                      <Link key={tag} to={`/spots?q=${tag}`}
                        className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1 rounded-full text-sm transition-colors">
                        #{tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* 坐标信息 */}
              <div className="bg-gray-50 rounded-xl p-4 text-sm">
                <div className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <span>🗺️</span> 位置信息
                  <span className="text-xs text-gray-400 font-normal ml-1">（后续接入地图 API 后可显示实地地图）</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-gray-600">
                  <div>经度：<span className="font-mono text-gray-800">{spot.lng?.toFixed(4)}</span></div>
                  <div>纬度：<span className="font-mono text-gray-800">{spot.lat?.toFixed(4)}</span></div>
                  <div>城市：<span className="text-gray-800">{spot.city}</span></div>
                  <div>省份：<span className="text-gray-800">{spot.province}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* === 周边场所 Tab === */}
          {activeTab === 'nearby' && (
            <div>
              <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-xl mb-4 flex items-center gap-2">
                <span>🔍</span>
                算法：Dijkstra 最短路，按道路距离排序（非直线距离）
              </p>
              {nearby.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <div className="text-4xl mb-2">🔍</div>
                  <p>该节点在道路图中暂无连通的周边场所</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {nearby.map(n => (
                    <Link key={n.id} to={`/spots/${n.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all group">
                      <span className="text-2xl w-10 h-10 flex items-center justify-center bg-gray-100 rounded-xl group-hover:bg-blue-50 transition-colors">
                        {TYPE_ICONS[n.type] || '📍'}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-900 group-hover:text-blue-600 transition-colors">{n.name}</div>
                        <div className="text-xs text-gray-400">{TYPE_LABELS[n.type] || n.type} · {n.city}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-blue-600">
                          {n.roadDist < 1000 ? `${n.roadDist}m` : `${(n.roadDist/1000).toFixed(1)}km`}
                        </div>
                        <div className="text-xs text-gray-400">道路距离</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* === 相关日记 Tab === */}
          {activeTab === 'diary' && (
            <div>
              {diaries.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <div className="text-4xl mb-2">📖</div>
                  <p>暂无相关日记</p>
                  <Link to="/diary" className="btn-primary text-sm mt-4 inline-block">去写第一篇</Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {diaries.map(d => (
                    <div key={d.id} className="border border-gray-100 rounded-xl p-4 hover:border-blue-100 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{d.userAvatar}</span>
                        <span className="text-sm font-medium text-gray-900">{d.userName}</span>
                        <span className="text-xs text-gray-400">{d.visitDate}</span>
                        {d.weather && <span className="text-xs text-gray-400">{d.weather}</span>}
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">{d.title}</h4>
                      <p className="text-gray-500 text-sm line-clamp-2">{d.content}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>❤️ {d.likes}</span>
                        <span>👁️ {d.views}</span>
                      </div>
                    </div>
                  ))}
                  <Link to="/diary" className="block text-center text-sm text-blue-500 hover:underline mt-2">
                    查看更多日记 →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <Link to={`/route?to=${spot.id}&toName=${encodeURIComponent(spot.name)}`}
          className="btn-primary flex-1 text-center text-sm">
          🧭 以此为终点规划路线
        </Link>
        <Link to={`/route?from=${spot.id}&fromName=${encodeURIComponent(spot.name)}`}
          className="btn-outline flex-1 text-center text-sm">
          📍 从此出发规划路线
        </Link>
        <button onClick={() => navigate(-1)} className="btn-ghost px-4 text-sm">← 返回</button>
      </div>
    </div>
  );
}

function InfoCard({ icon, value, label, color }) {
  const colors = {
    yellow: 'bg-yellow-50 text-yellow-600',
    green:  'bg-green-50 text-green-600',
    blue:   'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className={`${colors[color]} rounded-xl p-4 text-center`}>
      <div className="text-xl mb-1">{icon}</div>
      <div className="font-bold text-sm leading-tight">{value}</div>
      <div className="text-xs opacity-70 mt-0.5">{label}</div>
    </div>
  );
}
