import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDiaries, likeDiary, getSpots } from '../api/index.js';
import { AuthGuard, useRequireAuth } from '../components/AuthGuard.jsx';
import { PERMISSIONS } from '../context/AuthContext.jsx';

const MOODS = { 愉悦:'😊', 激动:'🤩', 满足:'😌', 宁静:'😇', 震撼:'😲', 感动:'🥺' };
const WEATHERS = { 晴:'☀️', 多云:'⛅', 阴:'☁️', 雨:'🌧️', 雪:'❄️' };

const TABS = [
  { key: 'hot', label: '🔥 热门' },
  { key: 'new', label: '✨ 最新' },
  { key: 'near', label: '📍 附近（Phase 2）' },
];

const TRENDING_TAGS = ['北京','历史','成都','美食','徒步','穷游','自然','西藏','古城','摄影'];

export default function Plaza() {
  const requireAuth = useRequireAuth();
  const [activeTab, setActiveTab] = useState('hot');
  const [posts, setPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [featuredSpots, setFeaturedSpots] = useState([]);
  const [showPost, setShowPost] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', spotName: '', weather: '晴', mood: '愉悦' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const sortBy = activeTab === 'hot' ? 'likes' : 'createdAt';
    setLoading(true);
    Promise.all([
      getDiaries({ sortBy, order: 'desc', limit: 12 }),
      getSpots({ type: 'scenic', limit: 6 }),
    ]).then(([r1, r2]) => {
      setPosts(r1.data.data || []);
      setFeaturedSpots(r2.data.data || []);
    }).finally(() => setLoading(false));
  }, [activeTab]);

  const handleLike = async (id) => {
    if (likedPosts.has(id)) {
      // 取消点赞
      setLikedPosts(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setPosts(prev => prev.map(p => p.id === id ? { ...p, likes: Math.max(0, p.likes - 1) } : p));
    } else {
      // 点赞
      const res = await likeDiary(id);
      setLikedPosts(prev => new Set([...prev, id]));
      setPosts(prev => prev.map(p => p.id === id ? { ...p, likes: res.data.likes } : p));
    }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!form.title || !form.content) return;
    setSubmitting(true);
    try {
      const { createDiary } = await import('../api/index.js');
      const res = await createDiary({ ...form, userId: 1, userName: '我', userAvatar: '🧭', tags: [] });
      setPosts(prev => [res.data.data, ...prev]);
      setShowPost(false);
      setForm({ title: '', content: '', spotName: '', weather: '晴', mood: '愉悦' });
    } finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 页头 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">旅行动态广场</h1>
          <p className="text-gray-500 text-sm mt-0.5">分享你的旅途故事，发现有趣的旅行者</p>
        </div>
        <AuthGuard permission={PERMISSIONS.PUBLISH_POST}
          fallback={
            <button onClick={() => requireAuth(PERMISSIONS.PUBLISH_POST, () => {})}
              className="btn-primary text-sm">
              ✏️ 发动态
            </button>
          }>
          <button onClick={() => setShowPost(!showPost)} className="btn-primary text-sm">
            ✏️ 发动态
          </button>
        </AuthGuard>
      </div>

      {/* 发布框 */}
      {showPost && (
        <form onSubmit={handlePost} className="card p-5 mb-6 animate-slide-up border-2 border-blue-100">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🧭</span>
            <div>
              <div className="font-semibold text-gray-900">我</div>
              <div className="text-xs text-gray-400">正在分享旅行动态</div>
            </div>
          </div>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="标题（必填）" required
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
            placeholder="分享你的旅行故事、见闻、心情..." required rows={4}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
          <div className="flex flex-wrap gap-3 mb-4">
            <input value={form.spotName} onChange={e => setForm({ ...form, spotName: e.target.value })}
              placeholder="📍 旅游地点"
              className="flex-1 min-w-[120px] border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
            <select value={form.weather} onChange={e => setForm({ ...form, weather: e.target.value })}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
              {Object.keys(WEATHERS).map(w => <option key={w}>{w}</option>)}
            </select>
            <select value={form.mood} onChange={e => setForm({ ...form, mood: e.target.value })}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
              {Object.keys(MOODS).map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary text-sm">
              {submitting ? '发布中...' : '🚀 发布'}
            </button>
            <button type="button" onClick={() => setShowPost(false)} className="btn-outline text-sm">取消</button>
          </div>
        </form>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 主内容 */}
        <div className="lg:col-span-2">
          {/* Tab */}
          <div className="flex gap-2 mb-5">
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* 附近 Tab 提示 */}
          {activeTab === 'near' && (
            <div className="card p-8 text-center text-gray-400 mb-4">
              <div className="text-4xl mb-3">📍</div>
              <div className="font-medium text-gray-600 mb-1">附近旅行者（Phase 2）</div>
              <p className="text-sm">此功能将在 Phase 2 集成 Geolocation API 后开放，<br/>届时可发现 5km 内的旅行动态。</p>
            </div>
          )}

          {/* 动态列表 */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card h-36 animate-pulse bg-gray-100" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-3">🌏</div>
              <p>暂无动态，快来发第一条吧</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map(post => (
                <div key={post.id} className="card p-5 hover:shadow-md transition-shadow">
                  {/* 用户信息 */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl w-10 h-10 flex items-center justify-center bg-gradient-to-br from-blue-100 to-teal-100 rounded-full">
                      {post.userAvatar}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-gray-900">{post.userName}</span>
                        {post.spotName && (
                          <span className="text-xs text-gray-400">📍 {post.spotName}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-2">
                        <span>{post.visitDate || post.createdAt?.slice(0, 10)}</span>
                        {post.weather && <span>{WEATHERS[post.weather] || post.weather}</span>}
                        {post.mood && <span>{MOODS[post.mood] || post.mood} {post.mood}</span>}
                      </div>
                    </div>
                    {post.rating && (
                      <div className="text-yellow-500 text-sm">{'⭐'.repeat(Math.min(post.rating, 5))}</div>
                    )}
                  </div>

                  {/* 标题 */}
                  <h3 className="font-semibold text-gray-900 mb-2">{post.title}</h3>

                  {/* 内容 */}
                  <p className="text-gray-600 text-sm leading-relaxed line-clamp-3 mb-3">{post.content}</p>

                  {/* 标签 */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {post.tags.map(tag => (
                        <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full">#{tag}</span>
                      ))}
                    </div>
                  )}

                  {/* 互动栏 */}
                  <div className="flex items-center gap-4 pt-3 border-t border-gray-50">
                    <button onClick={() => requireAuth(PERMISSIONS.LIKE, () => handleLike(post.id))}
                      className={`flex items-center gap-1.5 transition-colors text-sm ${likedPosts.has(post.id) ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}>
                      <span>{likedPosts.has(post.id) ? '❤️' : '🤍'}</span>
                      <span>{post.likes || 0}</span>
                    </button>
                    <span className="flex items-center gap-1.5 text-gray-400 text-sm">
                      <span>💬</span>
                      <span>{typeof post.comments === 'number' ? post.comments : (post.comments?.length || 0)}</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-gray-400 text-sm">
                      <span>👁️</span>
                      <span>{post.views || 0}</span>
                    </span>
                    <Link to={`/diary`} className="ml-auto text-xs text-blue-500 hover:underline">
                      查看详情 →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 侧边栏 */}
        <div className="space-y-5">
          {/* 热门景点 */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>🏆</span> 热门景点
            </h3>
            <div className="space-y-3">
              {featuredSpots.map((spot, i) => (
                <Link key={spot.id} to={`/spots/${spot.id}`}
                  className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-xl transition-colors group">
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                    i === 0 ? 'bg-yellow-400 text-white' :
                    i === 1 ? 'bg-gray-300 text-white' :
                    i === 2 ? 'bg-orange-400 text-white' :
                    'bg-gray-100 text-gray-500'
                  }`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">{spot.name}</div>
                    <div className="text-xs text-gray-400">{spot.city} · ⭐{spot.rating}</div>
                  </div>
                </Link>
              ))}
            </div>
            <Link to="/spots" className="block text-center text-xs text-blue-500 hover:underline mt-4">
              查看全部景点 →
            </Link>
          </div>

          {/* 快速导航 */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>🧭</span> 快速入口
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { to: '/spots', icon: '🗺️', label: '发现景点' },
                { to: '/route', icon: '🛤️', label: '路线规划' },
                { to: '/diary', icon: '📖', label: '日记社区' },
                { to: '/profile', icon: '👥', label: '旅行者' },
              ].map(item => (
                <Link key={item.to} to={item.to}
                  className="flex flex-col items-center gap-1.5 p-3 bg-gray-50 hover:bg-blue-50 rounded-xl transition-colors group">
                  <span className="text-xl group-hover:scale-110 transition-transform">{item.icon}</span>
                  <span className="text-xs text-gray-600 group-hover:text-blue-600">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* 热门标签 */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span>🏷️</span> 热门标签
            </h3>
            <div className="flex flex-wrap gap-2">
              {TRENDING_TAGS.map((tag, i) => (
                <Link key={tag} to={`/spots?q=${tag}`}
                  className="text-xs px-3 py-1.5 rounded-full transition-colors bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-700 font-medium">
                  #{tag}
                  <span className="ml-1 text-gray-400">{Math.max(8 - i, 1)}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* 系统数据 */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span>📊</span> 系统数据
            </h3>
            <div className="space-y-2 text-sm">
              {[
                { label: '景区 + 高校', value: '200+', color: 'text-blue-600' },
                { label: '旅行日记', value: `${posts.length}+`, color: 'text-purple-600' },
                { label: '道路图边数', value: '240+', color: 'text-teal-600' },
                { label: '注册用户', value: '10+', color: 'text-orange-600' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-gray-500">{item.label}</span>
                  <span className={`font-semibold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
