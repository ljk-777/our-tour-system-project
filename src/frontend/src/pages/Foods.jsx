import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getFoods } from '../api/index.js';

const CITIES = ['全部', '北京', '上海', '杭州', '成都', '西安'];
const CUISINES = ['全部', '北京烤鸭', '杭帮菜', '西餐', '川菜', '陕西菜'];

export default function Foods() {
  const [searchParams] = useSearchParams();
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState(searchParams.get('city') || '全部');
  const [cuisine, setCuisine] = useState('全部');

  useEffect(() => {
    loadFoods();
  }, [city, cuisine]);

  const loadFoods = async () => {
    setLoading(true);
    try {
      const params = { limit: 20 };
      if (city !== '全部') params.city = city;
      if (cuisine !== '全部') params.cuisine = cuisine;
      const res = await getFoods(params);
      setFoods(res.data.data || []);
    } catch (err) {
      console.error('加载美食失败:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 页头 */}
      <div className="mb-6">
        <h1 className="section-title">🍜 美食推荐</h1>
        <p className="section-sub">发现各地特色美食，品味旅行中的味道</p>
      </div>

      {/* 筛选栏 */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* 城市筛选 */}
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-2 block">🏙️ 城市</label>
            <div className="flex flex-wrap gap-2">
              {CITIES.map(c => (
                <button key={c} onClick={() => setCity(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    city === c ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* 菜系筛选 */}
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-2 block">🍽️ 菜系</label>
            <div className="flex flex-wrap gap-2">
              {CUISINES.map(c => (
                <button key={c} onClick={() => setCuisine(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    cuisine === c ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 算法说明 */}
      <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 px-4 py-2.5 rounded-xl mb-5">
        <span>🔬</span>
        <span>推荐算法：<b>小顶堆 TopK</b> 按评分排序，支持城市和菜系过滤</span>
      </div>

      {/* 美食列表 */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card h-40 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : foods.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">🍜</div>
          <p>暂无匹配的美食推荐</p>
          <button onClick={() => { setCity('全部'); setCuisine('全部'); }}
            className="btn-outline text-sm mt-4">查看全部</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {foods.map((food, i) => (
            <Link key={food.id} to={`/spots/${food.id}`}
              className="card p-4 hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                      i === 0 ? 'bg-yellow-400 text-white' :
                      i === 1 ? 'bg-gray-300 text-white' :
                      i === 2 ? 'bg-orange-400 text-white' :
                      'bg-gray-100 text-gray-500'
                    }`}>{i + 1}</span>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {food.name}
                    </h3>
                  </div>
                  <div className="text-xs text-gray-400 flex items-center gap-2">
                    <span>📍 {food.city}</span>
                    <span>·</span>
                    <span className="text-yellow-500">⭐ {food.rating}</span>
                  </div>
                </div>
              </div>

              {food.description && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">{food.description}</p>
              )}

              {food.tags && food.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {food.tags.map(tag => (
                    <span key={tag} className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
                <span>{food.entranceFee > 0 ? `人均 ¥${food.entranceFee}` : '价格面议'}</span>
                <span className="text-blue-500 group-hover:underline">查看详情 →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
