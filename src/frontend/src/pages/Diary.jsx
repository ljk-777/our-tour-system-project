import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getDiaries, searchDiaries, createDiary, generateDiaryDraft, likeDiary, commentDiary } from '../api/index.js';
import { useAuth } from '../context/AuthContext.jsx';

const WEATHER_ICON = { '晴':'☀️','多云':'⛅','阴':'🌥️','雨':'🌧️','雪':'❄️','多云转晴':'🌤️' };
const MOOD_ICON    = { '愉悦':'😊','激动':'🤩','满足':'😌','宁静':'😶','震撼':'😲','感动':'🥹','自由':'🤸','虔诚':'🙏' };

/* ── 图片压缩工具 ─────────────────────────────────────── */
function compressImage(file, size = 600) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const ratio = Math.min(size / img.width, size / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(); };
    img.src = url;
  });
}

/* ── 日记卡片 ─────────────────────────────────────────── */
function DiaryCard({ diary, onLike, onComment, currentUser }) {
  const [expanded,     setExpanded]     = useState(false);
  const [liked,        setLiked]        = useState(() => {
    const saved = JSON.parse(localStorage.getItem('likedDiaries') || '[]');
    return saved.includes(diary.id);
  });
  const [likes,        setLikes]        = useState(diary.likes || 0);
  const [likeAnim,     setLikeAnim]     = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments,     setComments]     = useState(
    Array.isArray(diary.comments) ? diary.comments : []
  );
  const [commentText,  setCommentText]  = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const floatRef = useRef(null);
  const isLong = (diary.content?.length || 0) > 120;

  const handleLike = async () => {
    if (liked) {
      // 取消点赞（仅前端，后端只有加赞接口）
      const saved = JSON.parse(localStorage.getItem('likedDiaries') || '[]');
      localStorage.setItem('likedDiaries', JSON.stringify(saved.filter(id => id !== diary.id)));
      setLiked(false);
      setLikes(l => Math.max(0, l - 1));
      return;
    }
    // 点赞
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 500);
    setLiked(true);
    setLikes(l => l + 1);
    const saved = JSON.parse(localStorage.getItem('likedDiaries') || '[]');
    localStorage.setItem('likedDiaries', JSON.stringify([...saved, diary.id]));
    try { await likeDiary(diary.id); } catch {}
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      await commentDiary(diary.id, {
        userId: currentUser?.id || null,
        userName: currentUser?.nickname || currentUser?.username || '匿名旅行者',
        content: commentText.trim(),
      });
      setComments(prev => [...prev, {
        id: Date.now(),
        userName: currentUser?.nickname || currentUser?.username || '匿名旅行者',
        content: commentText.trim(),
        createdAt: new Date().toISOString(),
      }]);
      setCommentText('');
    } catch {} finally { setSubmitting(false); }
  };

  return (
    <div className="card p-5" style={{ transition: 'box-shadow 0.2s ease', position: 'relative', overflow: 'visible' }}>

      {/* 浮动爱心特效 */}
      {likeAnim && (
        <span className="like-float" style={{
          position: 'absolute', left: 24, bottom: 52,
          fontSize: '1.6rem', pointerEvents: 'none', zIndex: 99,
        }}>❤️</span>
      )}

      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-xl">
          {diary.userAvatar}
        </div>

        <div className="flex-1 min-w-0">
          {/* 标题 + 评分 */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 text-base leading-snug">{diary.title}</h3>
            {diary.rating && (
              <div className="flex items-center gap-0.5 shrink-0">
                {Array.from({length:5}).map((_,i) => (
                  <span key={i} className={`text-sm ${i < diary.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                ))}
              </div>
            )}
          </div>

          {/* 元信息 */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mb-3">
            <span className="font-medium text-gray-600">{diary.userName}</span>
            {diary.spotName && <span>📍 <span className="text-blue-500">{diary.spotName}</span></span>}
            <span>{diary.visitDate}</span>
            {diary.weather && <span>{WEATHER_ICON[diary.weather] || '🌤️'} {diary.weather}</span>}
            {diary.mood && <span>{MOOD_ICON[diary.mood] || '😊'} {diary.mood}</span>}
          </div>

          {/* 封面图 */}
          {diary.coverImage && (
            <img src={diary.coverImage} alt="封面"
              style={{ width:'100%', maxHeight:200, objectFit:'cover', borderRadius:12, marginBottom:10 }} />
          )}

          {/* 正文 */}
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

          {/* 标签 */}
          {diary.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {diary.tags.map(tag => (
                <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">#{tag}</span>
              ))}
            </div>
          )}

          {/* 操作栏 */}
          <div className="flex items-center gap-4 pt-2 border-t border-gray-50">
            {/* 点赞 */}
            <button onClick={handleLike}
              className={`flex items-center gap-1.5 text-sm transition-all select-none ${liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
              style={{ userSelect:'none' }}
            >
              <span className={likeAnim ? 'like-pop' : ''} style={{ display:'inline-block', fontSize:'1.1rem' }}>
                {liked ? '❤️' : '🤍'}
              </span>
              <span className="font-medium">{likes}</span>
            </button>

            {/* 评论 */}
            <button onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-500 transition-colors">
              <span>💬</span>
              <span>{comments.length} 评论</span>
            </button>

            <span className="flex items-center gap-1.5 text-sm text-gray-400">
              <span>👁️</span> <span>{diary.views || 0}</span>
            </span>
            <span className="ml-auto text-xs text-gray-300">{diary.createdAt?.slice(0, 10)}</span>
          </div>

          {/* 评论区 */}
          {showComments && (
            <div className="mt-3 pt-3 border-t border-gray-50">
              {/* 已有评论 */}
              {comments.length > 0 && (
                <div className="space-y-2 mb-3">
                  {comments.map((c, i) => (
                    <div key={c.id || i} className="flex gap-2 text-sm">
                      <span className="font-medium text-gray-700 shrink-0">{c.userName}：</span>
                      <span className="text-gray-600">{c.content}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 评论输入框 */}
              <form onSubmit={handleComment} className="flex gap-2">
                <input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="写下你的评论..."
                  className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                  maxLength={200}
                />
                <button type="submit" disabled={submitting || !commentText.trim()}
                  className="shrink-0 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white text-sm rounded-xl font-medium transition-colors">
                  {submitting ? '...' : '发送'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── 主页面 ───────────────────────────────────────────── */
export default function Diary() {
  const { user } = useAuth();
  const [diaries,    setDiaries]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [searchQ,    setSearchQ]    = useState('');
  const [searchMode, setSearchMode] = useState('kmp');
  const [sortBy,     setSortBy]     = useState('likes');
  const [showCreate, setShowCreate] = useState(false);
  const [form,       setForm]       = useState({
    title:'', content:'', spotName:'', tags:'',
    weather:'晴', mood:'愉悦', rating:5, coverImage:'',
  });
  const [imgPreview,  setImgPreview]  = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [generating,  setGenerating]  = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { loadAll(); }, [sortBy]);

  const loadAll = () => {
    setLoading(true);
    getDiaries({ sortBy, order:'desc' })
      .then(res => setDiaries(res.data.data || []))
      .finally(() => setLoading(false));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQ.trim()) { loadAll(); return; }
    setLoading(true);
    try {
      const res = await searchDiaries({ q:searchQ, mode:searchMode });
      setDiaries(res.data.data || []);
    } finally { setLoading(false); }
  };

  /* 图片选择 */
  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('请选择图片文件'); return; }
    try {
      const b64 = await compressImage(file);
      setImgPreview(b64);
      setForm(f => ({ ...f, coverImage: b64 }));
    } catch { alert('图片处理失败'); }
    e.target.value = '';
  };

  const handleGenerateDraft = async () => {
    if (!form.title.trim() && !form.spotName.trim() && !form.content.trim()) {
      alert('请先填写标题、地点或一些旅行素材');
      return;
    }

    setGenerating(true);
    try {
      const res = await generateDiaryDraft({
        ...form,
        notes: form.content,
      });
      const content = res.data?.data?.content;
      if (content) setForm(f => ({ ...f, content }));
    } catch (error) {
      alert(error?.response?.data?.message || '日记文案生成失败，请稍后重试');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.content) return;
    setSubmitting(true);
    try {
      const tagList = form.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean);
      const res = await createDiary({
        ...form, tags: tagList,
        userId: user?.id || 1,
        userName: user?.nickname || user?.username || '旅行者',
        userAvatar: user?.avatar || '🧭',
        visitDate: new Date().toISOString().slice(0, 10),
      });
      setDiaries(prev => [res.data.data, ...prev]);
      setShowCreate(false);
      setForm({ title:'', content:'', spotName:'', tags:'', weather:'晴', mood:'愉悦', rating:5, coverImage:'' });
      setImgPreview('');
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
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-sm shrink-0">
          ✏️ 写日记
        </button>
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
            <input value={form.title} onChange={e => setForm({...form, title:e.target.value})}
              placeholder="日记标题 *" required className="input-base" />
            <input value={form.spotName} onChange={e => setForm({...form, spotName:e.target.value})}
              placeholder="旅游地点名称（选填）" className="input-base" />
            <div>
              <textarea value={form.content} onChange={e => setForm({...form, content:e.target.value})}
                placeholder="写下几个关键词、路线、感受，或直接输入草稿... *" required rows={5} className="input-base resize-none" />
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
                <button type="button" onClick={handleGenerateDraft} disabled={generating}
                  className="btn-outline text-sm shrink-0">
                  {generating ? '生成中...' : 'AI 生成日记文案'}
                </button>
                <span className="text-xs text-gray-400">根据标题、地点、天气、心情和当前输入自动润色正文</span>
              </div>
            </div>

            {/* 图片上传 */}
            <div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              <button type="button" onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm border border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors text-gray-500 hover:text-blue-600 w-full justify-center">
                📷 {imgPreview ? '重新选择封面图' : '添加封面图（选填）'}
              </button>
              {imgPreview && (
                <div className="relative mt-2">
                  <img src={imgPreview} alt="预览" style={{ width:'100%', maxHeight:200, objectFit:'cover', borderRadius:10 }} />
                  <button type="button" onClick={() => { setImgPreview(''); setForm(f => ({...f, coverImage:''})); }}
                    className="absolute top-2 right-2 w-6 h-6 bg-black/50 text-white rounded-full text-xs flex items-center justify-center hover:bg-black/70">
                    ✕
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input value={form.tags} onChange={e => setForm({...form, tags:e.target.value})}
                placeholder="标签（逗号分隔）" className="input-base" />
              <select value={form.weather} onChange={e => setForm({...form, weather:e.target.value})} className="input-base">
                {['晴','多云','阴','雨','雪'].map(w => <option key={w}>{w}</option>)}
              </select>
              <select value={form.mood} onChange={e => setForm({...form, mood:e.target.value})} className="input-base">
                {['愉悦','激动','满足','宁静','震撼','感动'].map(m => <option key={m}>{m}</option>)}
              </select>
              <select value={form.rating} onChange={e => setForm({...form, rating:+e.target.value})} className="input-base">
                {[5,4,3,2,1].map(r => <option key={r} value={r}>{r} 星</option>)}
              </select>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={submitting} className="btn-primary text-sm">
                {submitting ? '发布中...' : '发布日记'}
              </button>
              <button type="button" onClick={() => { setShowCreate(false); setImgPreview(''); }}
                className="btn-outline text-sm">取消</button>
            </div>
          </div>
        </form>
      )}

      {/* 搜索 + 排序 */}
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
          {[['likes','最多点赞'],['views','最多浏览'],['createdAt','最新发布']].map(([k,l]) => (
            <button key={k} onClick={() => setSortBy(k)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${sortBy===k ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* 日记列表 */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_,i) => <div key={i} className="card h-36 skeleton" />)}
        </div>
      ) : diaries.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-3">📖</div>
          <p>暂无日记{searchQ ? `（"${searchQ}" 无匹配结果）` : ''}</p>
          {searchQ && <button onClick={() => { setSearchQ(''); loadAll(); }} className="btn-outline text-sm mt-4">查看全部日记</button>}
        </div>
      ) : (
        <div className="space-y-4">
          {diaries.map((d, i) => (
            <div key={d.id} style={{ animation:`itemSlideIn 0.45s cubic-bezier(0.16,1,0.3,1) ${Math.min(i,6)*60}ms both` }}>
              <DiaryCard diary={d} currentUser={user} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
