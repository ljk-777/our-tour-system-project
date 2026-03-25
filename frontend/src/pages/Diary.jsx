import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDiaries, searchDiaries, createDiary, likeDiary } from '../api/index.js';
import { AuthGuard, useRequireAuth } from '../components/AuthGuard.jsx';
import { PERMISSIONS } from '../context/AuthContext.jsx';

const WEATHER_ICON = { '晴':'☀️', '多云':'⛅', '阴':'🌥️', '雨':'🌧️', '雪':'❄️', '多云转晴':'🌤️' };
const MOOD_ICON = { '愉悦':'😊', '激动':'🤩', '满足':'😌', '宁静':'😶', '震撼':'😲', '感动':'🥹', '自由':'🤸', '虔诚':'🙏' };

function DiaryCard({ diary, onLike, requireAuth }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = diary.content?.length > 120;

  return (
    <div className="card p-5 transition-all">
      <div className="flex items-start gap-3">
        {/* 头像 */}
        <div className="shrink-0">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-xl">
            {diary.userAvatar}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {/* 标题 + 评分 */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 text-base leading-snug">{diary.title}</h3>
            {diary.rating && (
              <div className="flex items-center gap-0.5 shrink-0">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={`text-sm ${i < diary.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                ))}
              </div>
            )}
          </div>

          {/* 元信息 */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mb-3">
            <span className="font-medium text-gray-600">{diary.userName}</span>
            {diary.spotName && (
              <span className="flex items-center gap-0.5">
                <span>📍</span>
                <span className="text-blue-500 hover:underline cursor-pointer">{diary.spotName}</span>
              </span>
            )}
            <span>{diary.visitDate}</span>
            {diary.weather && <span>{WEATHER_ICON[diary.weather] || '🌤️'} {diary.weather}</span>}
            {diary.mood && <span>{MOOD_ICON[diary.mood] || '😊'} {diary.mood}</span>}
          </div>

          {/* 正文 */}
          {diary._highlights?.content ? (
            <p className="text-sm text-gray-600 mb-2 bg-yellow-50 px-3 py-2 rounded-lg border-l-2 border-yellow-300"
               dangerouslySetInnerHTML={{ __html: diary._highlights.content.slice(0, 200) + (diary._highlights.content.length > 200 ? '...' : '') }} />
          ) : (
            <div className="mb-2">
              <p className={`text-sm text-gray-600 leading-relaxed ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
                {diary.content}
              </p>
              {isLong && (
                <button onClick={() => setExpanded(!expanded)}
                  className="text-xs text-blue-500 hover:text-blue-700 mt-1 font-medium">
                  {expanded ? '收起 ▲' : '展开全文 ▼'}
                </button>
              )}
            </div>
          )}

          {/* 标签 */}
          {diary.tags && diary.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {diary.tags.map(tag => (
                <Link key={tag} to={`/spots?q=${tag}`}
                  className="text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-500 px-2 py-0.5 rounded-full transition-colors">
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {/* 操作栏 */}
          <div className="flex items-center gap-4 pt-2 border-t border-gray-50">
            <button onClick={() => requireAuth(PERMISSIONS.LIKE, () => onLike(diary.id))}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors">
              <span>❤️</span> <span className="font-medium">{diary.likes}</span>
            </button>
            <span className="flex items-center gap-1.5 text-sm text-gray-400">
              <span>💬</span>
              <span>{Array.isArray(diary.comments) ? diary.comments.length : (diary.comments || 0)} 评论</span>
            </span>
            <span className="flex items-center gap-1.5 text-sm text-gray-400">
              <span>👁️</span> <span>{diary.views}</span>
            </span>
            <span className="ml-auto text-xs text-gray-300">{diary.createdAt?.slice(0, 10)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Diary() {
  const requireAuth = useRequireAuth();
  const [diaries, setDiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [searchMode, setSearchMode] = useState('kmp');
  const [sortBy, setSortBy] = useState('likes');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '', content: '', spotName: '', tags: '',
    weather: '晴', mood: '愉悦', rating: 5,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAll();
  }, [sortBy]);

  const loadAll = () => {
    setLoading(true);
    getDiaries({ sortBy, order: 'desc' })
      .then(res => setDiaries(res.data.data || []))
      .finally(() => setLoading(false));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQ.trim()) { loadAll(); return; }
    setLoading(true);
    try {
      const res = await searchDiaries({ q: searchQ, mode: searchMode });
      setDiaries(res.data.data || []);
    } finally { setLoading(false); }
  };

  const handleLike = async (id) => {
    await likeDiary(id);
    setDiaries(prev => prev.map(d => d.id === id ? { ...d, likes: d.likes + 1 } : d));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.content) return;
    setSubmitting(true);
    try {
      const tagList = form.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean);
      const res = await createDiary({
        ...form, tags: tagList, userId: 1,
        userName: '演示用户', userAvatar: '🧭',
        visitDate: new Date().toISOString().slice(0, 10),
      });
      setDiaries(prev => [res.data.data, ...prev]);
      setShowCreate(false);
      setForm({ title: '', content: '', spotName: '', tags: '', weather: '晴', mood: '愉悦', rating: 5 });
    } finally { setSubmitting(false); }
  };

  const totalLikes = diaries.reduce((s, d) => s + (d.likes || 0), 0);
  const totalViews = diaries.reduce((s, d) => s + (d.views || 0), 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 页头 */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="section-title">旅行日记</h1>
          <p className="section-sub">
            {diaries.length} 篇日记 · ❤️ {totalLikes} 获赞 · 👁️ {totalViews} 浏览
          </p>
        </div>
        <AuthGuard permission={PERMISSIONS.PUBLISH_DIARY}
          fallback={
            <button onClick={() => requireAuth(PERMISSIONS.PUBLISH_DIARY, () => {})}
              className="btn-primary text-sm shrink-0">
              ✏️ 写日记
            </button>
          }>
          <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-sm shrink-0">
            ✏️ 写日记
          </button>
        </AuthGuard>
      </div>

      {/* 算法说明 */}
      <div className="flex items-center gap-2 text-xs text-purple-600 bg-purple-50 px-4 py-2.5 rounded-xl mb-5">
        <span>🔬</span>
        <span>搜索算法：<b>KMP</b> 精确字符串匹配 / <b>倒排索引</b>全文检索，标题+正文+地点全字段搜索</span>
      </div>

      {/* 发布日记表单 */}
      {showCreate && (
        <form onSubmit={handleSubmit} className="card p-6 mb-6 animate-slide-up">
          <h2 className="text-lg font-semibold mb-4">✏️ 发布新日记</h2>
          <div className="space-y-3">
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="日记标题 *" required className="input-base" />
            <input value={form.spotName} onChange={e => setForm({ ...form, spotName: e.target.value })}
              placeholder="旅游地点名称（选填）" className="input-base" />
            <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
              placeholder="写下你的旅行故事... *" required rows={5} className="input-base resize-none" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
                placeholder="标签（逗号分隔）" className="input-base" />
              <select value={form.weather} onChange={e => setForm({ ...form, weather: e.target.value })} className="input-base">
                {['晴','多云','阴','雨','雪'].map(w => <option key={w}>{w}</option>)}
              </select>
              <select value={form.mood} onChange={e => setForm({ ...form, mood: e.target.value })} className="input-base">
                {['愉悦','激动','满足','宁静','震撼','感动'].map(m => <option key={m}>{m}</option>)}
              </select>
              <select value={form.rating} onChange={e => setForm({ ...form, rating: +e.target.value })} className="input-base">
                {[5,4,3,2,1].map(r => <option key={r} value={r}>{r} 星</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={submitting} className="btn-primary text-sm">
                {submitting ? '发布中...' : '发布日记'}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-outline text-sm">取消</button>
            </div>
          </div>
        </form>
      )}

      {/* 搜索 + 排序栏 */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="搜索日记标题、内容、地点..."
            className="input-base flex-1" />
          <select value={searchMode} onChange={e => setSearchMode(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none shrink-0">
            <option value="kmp">KMP 精确</option>
            <option value="fulltext">全文检索</option>
          </select>
          <button className="btn-primary text-sm shrink-0">搜索</button>
          {searchQ && (
            <button type="button" onClick={() => { setSearchQ(''); loadAll(); }}
              className="btn-outline text-sm shrink-0">清除</button>
          )}
        </form>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-400">排序：</span>
          {[['likes','最多点赞'],['views','最多浏览'],['createdAt','最新发布']].map(([k, l]) => (
            <button key={k} onClick={() => setSortBy(k)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                sortBy === k ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>{l}</button>
          ))}
        </div>
      </div>

      {/* 日记列表 */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-36 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : diaries.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-3">📖</div>
          <p>暂无日记{searchQ ? `（"${searchQ}" 无匹配结果）` : ''}</p>
          {searchQ && (
            <button onClick={() => { setSearchQ(''); loadAll(); }}
              className="btn-outline text-sm mt-4">查看全部日记</button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {diaries.map(d => (
            <DiaryCard key={d.id} diary={d} onLike={handleLike} requireAuth={requireAuth} />
          ))}
        </div>
      )}
    </div>
  );
}
