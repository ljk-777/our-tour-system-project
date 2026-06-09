import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getDiaries, searchDiaries, createDiary, generateDiaryDraft, likeDiary, unlikeDiary, commentDiary } from '../api/index.js';
import { PERMISSIONS, useAuth } from '../context/AuthContext.jsx';
import { useRequireAuth } from '../components/AuthGuard.jsx';

const WEATHER_ICON = { '晴':'☀️','多云':'⛅','阴':'🌥️','雨':'🌧️','雪':'❄️','多云转晴':'🌤️' };
const MOOD_ICON    = { '愉悦':'😊','激动':'🤩','满足':'😌','宁静':'😶','震撼':'😲','感动':'🥹','自由':'🤸','虔诚':'🙏' };

function formatLocalDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${`${date.getMonth()+1}`.padStart(2,'0')}-${`${date.getDate()}`.padStart(2,'0')}`;
}
function formatDiaryDate(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return formatLocalDate(value);
}

function compressImage(file, size = 600) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const ratio = Math.min(size / img.width, size / img.height, 1);
      const w = Math.round(img.width * ratio), h = Math.round(img.height * ratio);
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

/* ── KMP 高亮渲染（将 <mark>xxx</mark> 字符串安全渲染为 JSX）── */
function HL({ html, style }) {
  if (!html || !html.includes('<mark>')) return <span style={style}>{html}</span>;
  return <span style={style} dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ── 单条日记行（可点击进入详情页） ──────────────────────────── */
function DiaryRow({ diary, index, currentUser, likedDiaryIdsSet, requireAuth }) {
  const [expanded,     setExpanded]     = useState(false);
  const [liked,        setLiked]        = useState(() => likedDiaryIdsSet?.has(diary.id) || false);
  const [likes,        setLikes]        = useState(diary.likes || 0);
  const [likeAnim,     setLikeAnim]     = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments,     setComments]     = useState(
    Array.isArray(diary.comments) ? diary.comments : []
  );
  const [commentText,  setCommentText]  = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const isLong = (diary.content?.length || 0) > 140;
  const likeTimerRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(likeTimerRef.current);
  }, []);

  useEffect(() => {
    setLiked(likedDiaryIdsSet?.has(diary.id) || false);
  }, [likedDiaryIdsSet, diary.id]);

  const handleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (liked) {
      setLiked(false); setLikes(l => Math.max(0, l - 1));
      try { await unlikeDiary(diary.id); } catch {}
      return;
    }
    clearTimeout(likeTimerRef.current);
    setLikeAnim(true);
    likeTimerRef.current = setTimeout(() => setLikeAnim(false), 500);
    setLiked(true); setLikes(l => l + 1);
    try { await likeDiary(diary.id); } catch {}
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      await commentDiary(diary.id, {
        userId: currentUser?.id,
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
    <Link to={`/diary/${diary.id}`} style={{
      textDecoration: 'none',
      color: 'inherit',
      display: 'block',
      padding: '32px 0',
      borderBottom: '1px solid rgba(0,0,0,0.07)',
      position: 'relative',
    }}>
      {/* 浮动爱心特效 */}
      {likeAnim && (
        <span style={{ position:'absolute', left:0, bottom:52, fontSize:'1.4rem', pointerEvents:'none', zIndex:99, animation:'itemSlideIn 0.5s ease both' }}>❤️</span>
      )}

      {/* 主体行：左内容 + 右序号 */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:32, alignItems:'start' }}>
        <div>
          {/* 作者信息 */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <Link to={`/profile/${diary.userId}`} style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:10 }}
              onClick={e => e.stopPropagation()}>
              <span style={{ fontSize:'1.2rem' }}>{diary.userAvatar}</span>
              <span style={{ fontSize:'0.82rem', fontWeight:600, color:'#1d1d1f', fontFamily:'Inter, sans-serif' }}>{diary.userName}</span>
            </Link>
            {diary.spotName && (
              <span style={{ fontSize:'0.75rem', color:'#aeaeb2', fontFamily:'Inter, sans-serif' }}>
                · 📍 {diary.spotName}
              </span>
            )}
            {diary.weather && (
              <span style={{ fontSize:'0.75rem', color:'#aeaeb2' }}>{WEATHER_ICON[diary.weather] || '🌤️'} {diary.weather}</span>
            )}
            {diary.mood && (
              <span style={{ fontSize:'0.75rem', color:'#aeaeb2' }}>{MOOD_ICON[diary.mood] || '😊'} {diary.mood}</span>
            )}
          </div>

          {/* 封面图 */}
          {diary.coverImage && (
            <img src={diary.coverImage} alt="封面"
              style={{ width:'100%', maxHeight:200, objectFit:'cover', borderRadius:12, marginBottom:14 }} />
          )}

          {/* 视频 */}
          {diary.videoUrl && (
            <video src={diary.videoUrl} controls
              style={{ width:'100%', borderRadius:12, marginBottom:14, maxHeight:200 }} />
          )}

          {/* 标题（KMP搜索时高亮匹配词）*/}
          <h3 style={{
            fontFamily:'Inter, sans-serif', fontSize:'1.15rem', fontWeight:700,
            color:'#1d1d1f', letterSpacing:'-0.02em', lineHeight:1.3, marginBottom:8,
          }}>
            <HL html={diary._highlights?.title || diary.title} />
          </h3>

          {/* 正文摘要（KMP搜索时高亮匹配词）*/}
          <p style={{
            fontSize:'0.875rem', color:'#6e6e73', lineHeight:1.7, wordBreak:'break-word',
            display: !expanded && isLong ? '-webkit-box' : 'block',
            WebkitLineClamp: !expanded && isLong ? 3 : undefined,
            WebkitBoxOrient: 'vertical',
            overflow: !expanded && isLong ? 'hidden' : 'visible',
          }}>
            <HL html={diary._highlights?.content || diary.content} />
          </p>
          {isLong && (
            <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} style={{
              fontSize:'0.75rem', color:'#1a73e8', background:'none', border:'none',
              cursor:'pointer', padding:'4px 0', fontFamily:'Inter, sans-serif', fontWeight:500,
            }}>{expanded ? '收起 ▲' : '展开全文 ▼'}</button>
          )}

          {/* 标签 */}
          {diary.tags?.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:10 }}>
              {diary.tags.map(tag => (
                <span key={tag} style={{
                  fontSize:'0.7rem', color:'#aeaeb2', fontFamily:'Inter, sans-serif',
                }}>#{tag}</span>
              ))}
            </div>
          )}

          {/* 操作栏 */}
          <div style={{ display:'flex', alignItems:'center', gap:20, marginTop:16, paddingTop:14, borderTop:'1px solid rgba(0,0,0,0.06)' }}>
            <button onClick={(e) => requireAuth(PERMISSIONS.LIKE, () => handleLike(e))} style={{
              display:'flex', alignItems:'center', gap:6, fontSize:'0.82rem',
              color: liked ? '#ef4444' : '#aeaeb2', background:'none', border:'none',
              cursor:'pointer', fontFamily:'Inter, sans-serif', fontWeight:500,
              transition:'color 0.2s ease',
            }}>
              <span style={{ fontSize:'1rem', display:'inline-block', transform: likeAnim ? 'scale(1.4)' : 'scale(1)', transition:'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}>
                {liked ? '❤️' : '🤍'}
              </span>
              {likes}
            </button>

            <button onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); }} style={{
              display:'flex', alignItems:'center', gap:6, fontSize:'0.82rem',
              color:'#aeaeb2', background:'none', border:'none', cursor:'pointer',
              fontFamily:'Inter, sans-serif',
            }}>
              <span>💬</span> {comments.length}
            </button>

            <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.82rem', color:'#aeaeb2', fontFamily:'Inter, sans-serif' }}>
              <span>👁️</span> {diary.views || 0}
            </span>

            {diary.rating && (
              <span style={{ marginLeft:'auto', fontSize:'0.72rem', color:'#fbbf24', letterSpacing:'0.02em' }}>
                {'★'.repeat(diary.rating)}{'☆'.repeat(5 - diary.rating)}
              </span>
            )}
            <span style={{ fontSize:'0.72rem', color:'#c7c7cc', fontFamily:'Inter, sans-serif', marginLeft: diary.rating ? 0 : 'auto' }}>
              {formatDiaryDate(diary.visitDate || diary.createdAt)}
            </span>
          </div>

          {/* 评论区 */}
          {showComments && (
            <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid rgba(0,0,0,0.06)' }}
              onClick={e => e.stopPropagation()}>
              {comments.length > 0 && (
                <div style={{ marginBottom:12, display:'flex', flexDirection:'column', gap:8 }}>
                  {comments.map((c, i) => (
                    <div key={c.id || i} style={{ display:'flex', gap:8, fontSize:'0.82rem' }}>
                      <span style={{ fontWeight:600, color:'#1d1d1f', flexShrink:0, fontFamily:'Inter, sans-serif' }}>{c.userName}：</span>
                      <span style={{ color:'#6e6e73' }}>{c.content}</span>
                    </div>
                  ))}
                </div>
              )}
              <form onSubmit={(e) => requireAuth(PERMISSIONS.COMMENT, () => handleComment(e))} style={{ display:'flex', gap:8 }}>
                <input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="写下你的评论..."
                  style={{
                    flex:1, fontSize:'0.85rem', border:'1px solid rgba(0,0,0,0.12)',
                    borderRadius:10, padding:'8px 14px', outline:'none',
                    fontFamily:'Inter, sans-serif', color:'#1d1d1f', background:'#fff',
                  }}
                  maxLength={200}
                />
                <button type="submit" disabled={submitting || !commentText.trim()} style={{
                  flexShrink:0, padding:'8px 18px',
                  background: 'transparent',
                  color: submitting || !commentText.trim() ? '#c7c7cc' : '#f97316',
                  border: `1px solid ${submitting || !commentText.trim() ? 'rgba(0,0,0,0.08)' : 'rgba(249,115,22,0.4)'}`,
                  borderRadius:10, fontSize:'0.82rem', fontWeight:600,
                  cursor: submitting || !commentText.trim() ? 'not-allowed' : 'pointer',
                  fontFamily:'Inter, sans-serif', transition:'all 0.2s ease',
                }}>
                  {submitting ? '...' : '发送'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* 右侧序号 */}
        <div style={{ paddingTop:4, flexShrink:0 }}>
          <span style={{
            fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.1em',
            textTransform:'uppercase', color:'#c7c7cc', fontFamily:'Inter, sans-serif',
          }}>No.{String(index + 1).padStart(2, '0')}</span>
        </div>
      </div>
    </Link>
  );
}

/* ── 主页面 ───────────────────────────────────────────── */
export default function Diary() {
  const { user, likedDiaryIds } = useAuth();
  const requireAuth = useRequireAuth();
  const [diaries,    setDiaries]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [searchQ,    setSearchQ]    = useState('');
  const [searchMode, setSearchMode] = useState('kmp');
  const [sortBy,     setSortBy]     = useState('likes');
  const [showCreate, setShowCreate] = useState(false);
  const [form,       setForm]       = useState({
    title:'', content:'', spotName:'', tags:'',
    weather:'晴', mood:'愉悦', rating:5, coverImage:'', videoUrl:'',
  });
  const [imgPreview,  setImgPreview]  = useState('');
  const [videoPreview, setVideoPreview] = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [generating,  setGenerating]  = useState(false);
  const [aiDraft,     setAiDraft]     = useState('');
  const fileRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => { loadAll(); }, [sortBy]);

  const loadAll = () => {
    setLoading(true);
    getDiaries({ sortBy, order:'desc' })
      .then(res => setDiaries(res.data.data || []))
      .catch(() => setDiaries([]))
      .finally(() => setLoading(false));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQ.trim()) { loadAll(); return; }
    setLoading(true);
    try {
      const res = await searchDiaries({ q:searchQ, mode:searchMode });
      setDiaries(res.data.data || []);
    } catch {
      setDiaries([]);
    } finally { setLoading(false); }
  };

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

  const handleVideoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) { alert('请选择视频文件'); return; }
    if (file.size > 100 * 1024 * 1024) { alert('视频文件请控制在 100MB 以内'); return; }
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
    setForm(f => ({ ...f, videoUrl: url }));
    e.target.value = '';
  };

  const handleGenerateDraft = async () => {
    if (!form.title.trim() && !form.spotName.trim() && !form.content.trim()) {
      alert('请先填写标题、地点或一些旅行素材');
      return;
    }
    setGenerating(true);
    try {
      const res = await generateDiaryDraft({ ...form, notes: form.content });
      const content = res.data?.data?.content;
      if (content) setAiDraft(content);
    } catch (error) {
      alert(error?.response?.data?.message || '日记文案生成失败，请稍后重试');
    } finally { setGenerating(false); }
  };

  const handleUseAiDraft = () => {
    if (!aiDraft) return;
    setForm(f => ({ ...f, content: aiDraft }));
    setAiDraft('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.content) return;
    setSubmitting(true);
    try {
      const tagList = form.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean);
      const res = await createDiary({
        ...form, tags: tagList,
        userId: user?.id,
        userName: user?.nickname || user?.username || '旅行者',
        userAvatar: user?.avatar || '🧭',
        visitDate: formatLocalDate(),
      });
      const createdDiary = res.data?.data;
      if (createdDiary) {
        setDiaries(prev => [createdDiary, ...prev.filter(Boolean)]);
      } else {
        loadAll();
      }
      setShowCreate(false);
      setForm({ title:'', content:'', spotName:'', tags:'', weather:'晴', mood:'愉悦', rating:5, coverImage:'', videoUrl:'' });
      setAiDraft('');
      setImgPreview('');
      setVideoPreview('');
    } catch {
      alert('发布失败，请稍后重试');
    } finally { setSubmitting(false); }
  };

  const visibleDiaries = diaries.filter(Boolean);
  const totalLikes = visibleDiaries.reduce((s, d) => s + (d.likes || 0), 0);
  const totalViews = visibleDiaries.reduce((s, d) => s + (d.views || 0), 0);

  /* ── 共用 input 样式 */
  const inputStyle = {
    width:'100%', fontSize:'0.88rem', border:'1px solid rgba(0,0,0,0.12)',
    borderRadius:10, padding:'10px 14px', outline:'none',
    fontFamily:'Inter, sans-serif', color:'#1d1d1f', background:'#fff',
    boxSizing:'border-box',
  };

  return (
    <div className="glass-bg">
      <div style={{ maxWidth:860, margin:'0 auto', padding:'56px 32px', position:'relative', zIndex:1 }}>

        {/* ── 页头 */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:48 }}>
          <div>
            <div style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#aeaeb2', marginBottom:12, fontFamily:'Inter, sans-serif' }}>
              Travel Stories
            </div>
            <h1 style={{ fontFamily:'Inter, sans-serif', fontSize:'clamp(2rem, 4vw, 2.8rem)', fontWeight:800, color:'#1d1d1f', letterSpacing:'-0.04em', lineHeight:1.05, marginBottom:10 }}>
              旅行日记
            </h1>
            <p style={{ fontSize:'0.82rem', color:'#aeaeb2', fontFamily:'Inter, sans-serif' }}>
              {visibleDiaries.length} 篇 · ❤️ {totalLikes} 获赞 · 👁️ {totalViews} 浏览
            </p>
          </div>
          <button onClick={() => requireAuth(PERMISSIONS.PUBLISH_DIARY, () => setShowCreate(!showCreate))} style={{
            display:'flex', alignItems:'center', gap:8,
            background:'transparent', color:'#1d1d1f',
            border:'1.5px solid rgba(0,0,0,0.18)',
            borderRadius:12, padding:'10px 22px', fontSize:'0.88rem',
            fontWeight:600, cursor:'pointer', fontFamily:'Inter, sans-serif',
            transition:'all 0.2s ease', flexShrink:0,
          }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor='rgba(0,0,0,0.28)'; }}
            onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='rgba(0,0,0,0.18)'; }}
          >
            ✏️ 写日记
          </button>
        </div>

        {/* ── 算法标注 */}
        <div style={{
          display:'inline-flex', alignItems:'center', gap:8,
          fontSize:'0.72rem', color:'#aeaeb2',
          fontFamily:'SF Mono, Fira Code, monospace', letterSpacing:'0.03em',
          marginBottom:36,
        }}>
          <span style={{ color:'#c7c7cc' }}>KMP 精确匹配</span>
          <span>·</span>
          <span style={{ color:'#c7c7cc' }}>倒排索引全文检索</span>
        </div>

        {/* ── 发布日记表单（白底，无盒子，用细线分隔）*/}
        {showCreate && (
          <div style={{ borderTop:'1px solid rgba(0,0,0,0.12)', borderBottom:'1px solid rgba(0,0,0,0.08)', padding:'36px 0', marginBottom:48 }}>
            <div style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#aeaeb2', marginBottom:24, fontFamily:'Inter, sans-serif' }}>
              New Entry
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <input value={form.title} onChange={e => setForm({...form, title:e.target.value})}
                  placeholder="日记标题 *" required style={inputStyle} />
                <input value={form.spotName} onChange={e => setForm({...form, spotName:e.target.value})}
                  placeholder="旅游地点（选填）" style={inputStyle} />
                <div>
                  <textarea value={form.content}
                    onChange={e => { setForm(f=>({...f, content:e.target.value})); if(aiDraft) setAiDraft(''); }}
                    placeholder="写下几个关键词、路线、感受，例如：傍晚去了沙河校园，风很舒服... *"
                    required rows={5}
                    style={{ ...inputStyle, resize:'none', lineHeight:1.7 }} />
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:10 }}>
                    <button type="button" onClick={handleGenerateDraft} disabled={generating} style={{
                      padding:'7px 16px', borderRadius:8, fontSize:'0.78rem', fontWeight:600,
                      border:'1px solid rgba(0,0,0,0.15)', background:'#fff', color:'#1d1d1f',
                      cursor: generating ? 'not-allowed' : 'pointer', fontFamily:'Inter, sans-serif',
                      opacity: generating ? 0.5 : 1, transition:'opacity 0.2s',
                    }}>
                      {generating ? '正在润色...' : 'AI 润色正文'}
                    </button>
                    <span style={{ fontSize:'0.75rem', color:'#c7c7cc', fontFamily:'Inter, sans-serif' }}>根据标题、地点、心情自动润色</span>
                  </div>
                  {aiDraft && (
                    <div style={{ marginTop:14, padding:'18px 20px', borderLeft:'3px solid #f97316', background:'rgba(249,115,22,0.03)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                        <span style={{ fontSize:'0.72rem', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#f97316', fontFamily:'Inter, sans-serif' }}>润色结果</span>
                        <button type="button" onClick={() => setAiDraft('')} style={{ fontSize:'0.75rem', color:'#aeaeb2', background:'none', border:'none', cursor:'pointer' }}>保留原文</button>
                      </div>
                      <p style={{ fontSize:'0.85rem', color:'#6e6e73', lineHeight:1.75, whiteSpace:'pre-wrap' }}>{aiDraft}</p>
                      <div style={{ display:'flex', gap:10, marginTop:14 }}>
                        <button type="button" onClick={handleUseAiDraft} style={{
                          padding:'7px 16px', borderRadius:8, fontSize:'0.78rem', fontWeight:600,
                          background:'linear-gradient(135deg, #f59e0b, #f97316)', color:'#fff',
                          border:'none', cursor:'pointer', fontFamily:'Inter, sans-serif',
                        }}>使用润色结果</button>
                        <button type="button" onClick={handleGenerateDraft} disabled={generating} style={{
                          padding:'7px 16px', borderRadius:8, fontSize:'0.78rem', fontWeight:600,
                          border:'1px solid rgba(0,0,0,0.15)', background:'#fff', color:'#1d1d1f',
                          cursor: generating ? 'not-allowed' : 'pointer', fontFamily:'Inter, sans-serif',
                        }}>{generating ? '正在润色...' : '重新润色'}</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 图片上传 */}
                <div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleImageSelect} />
                  <input ref={videoRef} type="file" accept="video/*" style={{ display:'none' }} onChange={handleVideoSelect} />
                  <button type="button" onClick={() => fileRef.current?.click()} style={{
                    display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%',
                    padding:'10px', borderRadius:10, fontSize:'0.82rem', fontFamily:'Inter, sans-serif',
                    border:'1px dashed rgba(0,0,0,0.15)', background:'transparent', color:'#aeaeb2',
                    cursor:'pointer', transition:'all 0.2s ease',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(0,0,0,0.3)'; e.currentTarget.style.color='#1d1d1f'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(0,0,0,0.15)'; e.currentTarget.style.color='#aeaeb2'; }}
                  >
                    📷 {imgPreview ? '重新选择封面图' : '添加封面图（选填）'}
                  </button>
                  {imgPreview && (
                    <div style={{ position:'relative', marginTop:10 }}>
                      <img src={imgPreview} alt="预览" style={{ width:'100%', maxHeight:200, objectFit:'cover', borderRadius:10 }} />
                      <button type="button" onClick={() => { setImgPreview(''); setForm(f=>({...f,coverImage:''})); }} style={{
                        position:'absolute', top:8, right:8, width:24, height:24,
                        background:'rgba(0,0,0,0.5)', color:'#fff', border:'none',
                        borderRadius:'50%', fontSize:'0.7rem', cursor:'pointer',
                        display:'flex', alignItems:'center', justifyContent:'center',
                      }}>✕</button>
                    </div>
                  )}
                </div>

                {/* 视频上传 */}
                <div>
                  <button type="button" onClick={() => videoRef.current?.click()} style={{
                    display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%',
                    padding:'10px', borderRadius:10, fontSize:'0.82rem', fontFamily:'Inter, sans-serif',
                    border:'1px dashed rgba(0,0,0,0.15)', background:'transparent', color:'#aeaeb2',
                    cursor:'pointer', transition:'all 0.2s ease',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(0,0,0,0.3)'; e.currentTarget.style.color='#1d1d1f'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(0,0,0,0.15)'; e.currentTarget.style.color='#aeaeb2'; }}
                  >
                    🎬 {videoPreview ? '重新选择视频' : '添加视频（选填，≤100MB）'}
                  </button>
                  {videoPreview && (
                    <div style={{ position:'relative', marginTop:10 }}>
                      <video src={videoPreview} controls style={{ width:'100%', borderRadius:10, maxHeight:200 }} />
                      <button type="button" onClick={() => { setVideoPreview(''); setForm(f=>({...f,videoUrl:''})); }} style={{
                        position:'absolute', top:8, right:8, width:24, height:24,
                        background:'rgba(0,0,0,0.5)', color:'#fff', border:'none',
                        borderRadius:'50%', fontSize:'0.7rem', cursor:'pointer',
                        display:'flex', alignItems:'center', justifyContent:'center',
                      }}>✕</button>
                    </div>
                  )}
                </div>

                {/* 元数据行 */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10 }}>
                  <input value={form.tags} onChange={e => setForm({...form,tags:e.target.value})}
                    placeholder="标签（逗号分隔）" style={inputStyle} />
                  <select value={form.weather} onChange={e => setForm({...form,weather:e.target.value})} style={inputStyle}>
                    {['晴','多云','阴','雨','雪'].map(w => <option key={w}>{w}</option>)}
                  </select>
                  <select value={form.mood} onChange={e => setForm({...form,mood:e.target.value})} style={inputStyle}>
                    {['愉悦','激动','满足','宁静','震撼','感动'].map(m => <option key={m}>{m}</option>)}
                  </select>
                  <select value={form.rating} onChange={e => setForm({...form,rating:+e.target.value})} style={inputStyle}>
                    {[5,4,3,2,1].map(r => <option key={r} value={r}>{r} 星</option>)}
                  </select>
                </div>

                <div style={{ display:'flex', gap:10, paddingTop:4 }}>
                  <button type="submit" disabled={submitting} style={{
                    padding:'10px 24px', borderRadius:10, fontSize:'0.88rem', fontWeight:600,
                    background:'linear-gradient(135deg, #f59e0b, #f97316)', color:'#fff', border:'none',
                    cursor: submitting ? 'not-allowed' : 'pointer', fontFamily:'Inter, sans-serif',
                    opacity: submitting ? 0.6 : 1, transition:'opacity 0.2s',
                    boxShadow:'0 2px 12px rgba(249,115,22,0.3)',
                  }}>
                    {submitting ? '发布中...' : '发布日记'}
                  </button>
                  <button type="button" onClick={() => { setShowCreate(false); setImgPreview(''); setAiDraft(''); }} style={{
                    padding:'10px 24px', borderRadius:10, fontSize:'0.88rem', fontWeight:600,
                    background:'transparent', color:'#aeaeb2', border:'1px solid rgba(0,0,0,0.12)',
                    cursor:'pointer', fontFamily:'Inter, sans-serif',
                  }}>取消</button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ── 搜索 + 排序 */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:12, alignItems:'center', marginBottom:32 }}>
          <form onSubmit={handleSearch} style={{ display:'flex', gap:8, flex:'1 1 300px' }}>
            <div style={{
              flex:1, display:'flex', alignItems:'center', gap:10,
              border:'1px solid rgba(0,0,0,0.12)', borderRadius:10, padding:'0 14px',
              background:'#fff',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0, opacity:0.3 }}>
                <circle cx="11" cy="11" r="7" stroke="#000" strokeWidth="2.2"/>
                <path d="M16.5 16.5L21 21" stroke="#000" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="搜索标题、内容、地点..."
                style={{ flex:1, border:'none', outline:'none', fontSize:'0.88rem', color:'#1d1d1f', padding:'10px 0', background:'transparent', fontFamily:'Inter, sans-serif' }} />
            </div>
            <select value={searchMode} onChange={e => setSearchMode(e.target.value)} style={{
              border:'1px solid rgba(0,0,0,0.12)', borderRadius:10, padding:'0 12px',
              fontSize:'0.78rem', color:'#1d1d1f', background:'#fff', outline:'none',
              fontFamily:'Inter, sans-serif', flexShrink:0,
            }}>
              <option value="kmp">KMP 精确</option>
              <option value="fulltext">全文检索</option>
            </select>
            <button style={{
              padding:'0 18px', background:'linear-gradient(135deg, #f59e0b, #f97316)',
              color:'#fff', border:'none', borderRadius:10, fontSize:'0.82rem',
              fontWeight:600, cursor:'pointer', fontFamily:'Inter, sans-serif', flexShrink:0,
              boxShadow:'0 2px 10px rgba(249,115,22,0.3)',
            }}>搜索</button>
            {searchQ && (
              <button type="button" onClick={() => { setSearchQ(''); loadAll(); }} style={{
                padding:'0 14px', background:'transparent', color:'#aeaeb2',
                border:'1px solid rgba(0,0,0,0.1)', borderRadius:10, fontSize:'0.82rem',
                cursor:'pointer', fontFamily:'Inter, sans-serif', flexShrink:0,
              transition:'all 0.2s ease',
              }}>清除</button>
            )}
          </form>

          {/* 排序 tab */}
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <span style={{ fontSize:'0.72rem', color:'#c7c7cc', fontFamily:'Inter, sans-serif' }}>排序</span>
            {[['likes','最多点赞'],['views','最多浏览'],['createdAt','最新发布']].map(([k,l]) => (
              <button key={k} onClick={() => setSortBy(k)} style={{
                padding:'5px 12px', borderRadius:8, fontSize:'0.75rem', fontWeight:500,
                cursor:'pointer', fontFamily:'Inter, sans-serif',
                border: sortBy===k ? '1px solid rgba(249,115,22,0.35)' : '1px solid rgba(0,0,0,0.08)',
                background: sortBy===k ? 'rgba(249,115,22,0.08)' : '#fff',
                color: sortBy===k ? '#f97316' : '#86868b',
                transition:'all 0.2s ease',
              }}>{l}</button>
            ))}
          </div>
        </div>

        {/* ── 日记列表 */}
        {loading ? (
          <div style={{ borderTop:'1px solid rgba(0,0,0,0.08)' }}>
            {[...Array(4)].map((_,i) => (
              <div key={i} style={{ padding:'32px 0', borderBottom:'1px solid rgba(0,0,0,0.07)' }}>
                <div style={{ height:16, background:'rgba(0,0,0,0.06)', borderRadius:6, marginBottom:12, width:'60%', animation:'pulse 1.5s ease-in-out infinite' }} />
                <div style={{ height:12, background:'rgba(0,0,0,0.04)', borderRadius:6, width:'40%', animation:'pulse 1.5s ease-in-out infinite' }} />
              </div>
            ))}
          </div>
        ) : visibleDiaries.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 0', color:'#aeaeb2' }}>
            <div style={{ fontSize:'3rem', marginBottom:16 }}>📖</div>
            <p style={{ fontSize:'0.9rem', fontFamily:'Inter, sans-serif' }}>
              {searchQ ? `"${searchQ}" 无匹配结果` : '暂无日记，来写第一篇吧'}
            </p>
            {searchQ && (
              <button onClick={() => { setSearchQ(''); loadAll(); }} style={{
                marginTop:16, padding:'8px 20px', borderRadius:10, fontSize:'0.82rem',
                border:'1px solid rgba(0,0,0,0.12)', background:'#fff', color:'#6e6e73',
                cursor:'pointer', fontFamily:'Inter, sans-serif',
              }}>查看全部日记</button>
            )}
          </div>
        ) : (
          <div style={{ borderTop:'1px solid rgba(0,0,0,0.08)' }}>
            {visibleDiaries.map((d, i) => (
              <div key={d.id} style={{ animation:`itemSlideIn 0.45s cubic-bezier(0.16,1,0.3,1) ${Math.min(i,6)*60}ms both` }}>
                <DiaryRow diary={d} index={i} currentUser={user} likedDiaryIdsSet={likedDiaryIds} requireAuth={requireAuth} />
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
