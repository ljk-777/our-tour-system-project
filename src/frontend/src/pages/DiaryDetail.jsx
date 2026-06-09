import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDiaryById, likeDiary, unlikeDiary, commentDiary } from '../api/index.js';
import { useAuth } from '../context/AuthContext.jsx';

const WEATHER_ICON = { '晴':'☀️','多云':'⛅','阴':'🌥️','雨':'🌧️','雪':'❄️','多云转晴':'🌤️' };
const MOOD_ICON    = { '愉悦':'😊','激动':'🤩','满足':'😌','宁静':'😶','震撼':'😲','感动':'🥹','自由':'🤸','虔诚':'🙏' };

export default function DiaryDetail() {
  const { id } = useParams();
  const { user, likedDiaryIds } = useAuth();
  const [diary, setDiary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Compression state
  const [compressResult, setCompressResult] = useState(null);
  const [compressLoading, setCompressLoading] = useState(false);
  const [showCompress, setShowCompress] = useState(true);
  const [expandedAlgo, setExpandedAlgo] = useState(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getDiaryById(id)
      .then(res => {
        const d = res.data?.data;
        if (d) {
          setDiary(d);
          setLikes(d.likes || 0);
          setComments(Array.isArray(d.comments) ? d.comments : []);
          setLiked(likedDiaryIds?.has(d.id) || false);
        }
      })
      .catch(e => setError(e?.response?.data?.message || '加载失败'))
      .finally(() => setLoading(false));
  }, [id, likedDiaryIds]);

  const handleLike = async () => {
    if (liked) {
      setLiked(false); setLikes(l => Math.max(0, l - 1));
      try { await unlikeDiary(id); } catch {}
    } else {
      setLiked(true); setLikes(l => l + 1);
      try { await likeDiary(id); } catch {}
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      await commentDiary(id, { content: commentText.trim() });
      setComments(prev => [...prev, {
        id: Date.now(), userName: user?.nickname || user?.username || '旅行者',
        content: commentText.trim(), createdAt: new Date().toISOString(),
      }]);
      setCommentText('');
    } catch {} finally { setSubmitting(false); }
  };

  const compressCacheRef = useRef({});

  const runCompression = async () => {
    if (!diary?.content) return;
    // Check cache
    if (compressCacheRef.current[diary.id]) {
      setCompressResult(compressCacheRef.current[diary.id]);
      return;
    }
    setCompressLoading(true);
    import('../api/index.js').then(({ default: api }) =>
      api.post('/compression/analyze', { text: diary.content.slice(0, 2000) })
        .then(res => {
          const data = res.data?.data || null;
          compressCacheRef.current[diary.id] = data;
          setCompressResult(data);
        })
        .catch(() => {})
        .finally(() => setCompressLoading(false))
    );
  };

  if (loading) return (
    <div className="glass-bg min-h-screen flex items-center justify-center">
      <div className="text-4xl animate-spin">⏳</div>
    </div>
  );

  if (error || !diary) return (
    <div className="glass-bg min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 text-lg mb-4">{error || '日记不存在'}</p>
        <Link to="/diary" className="text-blue-600 hover:underline">返回日记列表</Link>
      </div>
    </div>
  );

  const formattedDate = diary.visitDate || (diary.createdAt ? new Date(diary.createdAt).toLocaleDateString('zh-CN') : '');

  return (
    <div className="glass-bg">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link to="/diary" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          ← 返回列表
        </Link>

        {/* Author card */}
        <div className="glass-card p-5 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{diary.userAvatar || '🧭'}</span>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-gray-900">{diary.userName || '旅行者'}</h2>
              <p className="text-xs text-gray-400">{diary.city || '未知城市'} · {diary.level || '旅行者'}</p>
            </div>
          </div>
        </div>

        {/* Diary content card */}
        <div className="glass-card p-6 mb-4">
          <h1 className="text-xl font-bold text-gray-900 mb-2">{diary.title}</h1>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mb-4">
            {diary.rating > 0 && <span>{'⭐'.repeat(Math.floor(diary.rating))} {diary.rating}</span>}
            {diary.weather && <span>{WEATHER_ICON[diary.weather] || ''} {diary.weather}</span>}
            {diary.mood && <span>{MOOD_ICON[diary.mood] || ''} {diary.mood}</span>}
            {diary.spotName && <span>📍 {diary.spotName}</span>}
            {formattedDate && <span>📅 {formattedDate}</span>}
          </div>

          {/* 封面视频 */}
          {diary.videoUrl && (
            <video src={diary.videoUrl} controls
              className="w-full rounded-xl mb-4"
              style={{ maxHeight: 260 }} />
          )}

          {/* Full content */}
          <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
            {diary.content}
          </div>

          {/* Tags */}
          {diary.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
              {diary.tags.map(tag => (
                <span key={tag} className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded-full">#{tag}</span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
            <button onClick={handleLike} className={`flex items-center gap-1.5 text-sm font-medium ${liked ? 'text-red-500' : 'text-gray-400'}`}>
              {liked ? '❤️' : '🤍'} {likes}
            </button>
            <span className="flex items-center gap-1.5 text-sm text-gray-400">
              💬 {comments.length}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-gray-400">
              👁️ {diary.views || 0}
            </span>
          </div>
        </div>

        {/* Compressible Toggle */}
        <button
          onClick={() => setShowCompress(!showCompress)}
          className="w-full text-left bg-gray-50 border border-gray-100 rounded-2xl p-3 text-xs text-gray-500 hover:bg-gray-100 transition-colors mb-4"
        >
          {showCompress ? '隐藏' : '显示'}技术信息 (无损压缩分析)
        </button>

        {/* Compression analysis card */}
        {showCompress && (
          <div className="glass-card p-5" style={{ minHeight: 100 }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-800">📦 无损压缩分析</h3>
              <button
                onClick={runCompression}
                disabled={compressLoading || !diary?.content}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {compressLoading ? '分析中...' : '运行压缩分析'}
              </button>
            </div>

            {!compressResult && !compressLoading && (
              <p className="text-xs text-gray-400 text-center py-6">点击「运行压缩分析」查看三种算法的对比结果</p>
            )}

            {compressLoading ? (
              <div className="py-8 text-center text-gray-400 text-sm animate-pulse">正在运行压缩对比...</div>
            ) : compressResult && !compressResult.error ? (
              <div>
                {/* Uncompressible warning */}
                {compressResult.analysis?.compressible === false && (
                  <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-500 text-center mb-4">
                    <div className="text-2xl mb-2">⚠️</div>
                    <p>{compressResult.analysis.reason || '压缩效果不理想——当前日记文本较短或重复度较低，所有算法均未达到正向压缩率。'}</p>
                    <p className="text-xs text-gray-400 mt-2">建议选择更长、重复度更高的文本观察压缩效果</p>
                  </div>
                )}

                {/* Data characteristics */}
                <div className="bg-gray-50 rounded-xl p-3 mb-4 text-xs text-gray-600">
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    <span>原文 <span className="font-mono font-semibold">{compressResult.textLength}</span> 字符</span>
                    <span>不同字符 <span className="font-mono font-semibold">{compressResult.analysis?.uniqueChars}</span> 种</span>
                    {compressResult.analysis?.topRepeats?.length > 0 && (
                      <span>高频词组 <span className="font-mono font-semibold">"{compressResult.analysis.topRepeats[0].word}"</span> ×{compressResult.analysis.topRepeats[0].count}</span>
                    )}
                  </div>
                </div>

                {/* Algorithm comparison — horizontal bar: compressed vs original */}
                {compressResult.analysis?.compressible !== false && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-gray-500 mb-3">压缩前后对比</p>

                  {(() => {
                    const algorithms = [
                      { key: 'huffman', label: 'Huffman 编码' },
                      { key: 'lz77', label: 'LZ77 滑动窗口' },
                      { key: 'bwt', label: 'BWT+MTF+Huffman' },
                    ].map(({ key, label }) => {
                      const d = compressResult[key];
                      if (!d || d.error) return null;
                      const ratio = parseFloat(d.stats.ratio);
                      const isPositive = ratio > 0;
                      const saved = d.stats.originalSize - d.stats.compressedSize;
                      return { key, label, ratio, isPositive, saved, stats: d.stats, verify: compressResult.verification?.[key] };
                    }).filter(Boolean);

                    const bestSaved = Math.max(...algorithms.filter(a => a.isPositive).map(a => a.saved), 0);

                    const origSize = algorithms[0]?.stats.originalSize || 1;
                    const maxBarSize = Math.max(origSize, ...algorithms.map(a => a.stats.compressedSize)); // longest bar = 100% ruler

                    return (
                      <div className="bg-white rounded-xl border border-gray-100 p-5">
                        {/* 原文 — gray bar reference proportional to longest */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-600 w-24 shrink-0">原文</span>
                          <div className="flex-1 h-5">
                            <div className="h-full bg-gray-300 rounded-r" style={{ width: `${(origSize / maxBarSize) * 100}%` }} />
                          </div>
                          <span className="text-xs font-mono text-gray-500 w-20 text-right shrink-0">{origSize}B</span>
                        </div>
                        <div className="text-[10px] text-gray-300 mb-3 ml-[104px]">{compressResult.textLength} 字符</div>

                        {/* Algorithm bars — same style as 原文 */}
                        <div className="space-y-1">
                          {algorithms.map(a => {
                            const barW = Math.max((a.stats.compressedSize / maxBarSize) * 100, 2);
                            const isExpanded = expandedAlgo === a.key;

                            return (
                              <div key={a.key}>
                                <div
                                  onClick={() => setExpandedAlgo(isExpanded ? null : a.key)}
                                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity py-1"
                                >
                                  <span className="text-xs text-gray-600 w-24 shrink-0">{a.label}</span>
                                  <div className="flex-1 h-5">
                                    <div className={`h-full rounded-r transition-all duration-1000 ${
                                      a.isPositive ? 'bg-green-400' : 'bg-red-400'
                                    }`} style={{ width: `${barW}%` }} />
                                  </div>
                                  <span className={`text-xs font-mono font-semibold w-20 text-right shrink-0 ${a.isPositive ? 'text-green-600' : 'text-red-500'}`}>
                                    {a.stats.compressedSize}B
                                    {a.isPositive
                                      ? <span className="ml-1 text-green-500 font-normal">{a.saved > 0 ? `↓${a.saved}B` : ''}</span>
                                      : <span className="ml-1 text-red-400 font-normal">↑{Math.abs(a.saved)}B</span>
                                    }
                                  </span>
                                  {a.isPositive && a.saved === bestSaved && (
                                    <span className="text-amber-500 text-xs">⭐</span>
                                  )}
                                  <span className="text-[10px] text-gray-300 ml-1">{isExpanded ? '▲' : '▼'}</span>
                                </div>
                                {isExpanded && (
                                  <div className="ml-[104px] text-[10px] text-gray-400 space-y-0.5 pb-2">
                                    <div>原文: {a.stats.originalSize}B → 压缩: <span style={{ color: a.isPositive ? '#16a34a' : '#dc2626' }}>{a.stats.compressedSize}B</span></div>
                                    <div>{a.isPositive ? `节省 ${a.saved}B (${a.ratio}%)` : `膨胀 ${Math.abs(a.saved)}B (+${-a.ratio}%)`}</div>
                                    <div>耗时: {a.stats.duration}ms · 验证: {a.verify}</div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Legend row — compact timing + verify */}
                        <div className="mt-3 ml-[104px] flex gap-4 text-[10px] text-gray-400">
                          {algorithms.map(a => (
                            <span key={a.key} className="font-mono">
                              {a.stats.duration}ms
                              <span className="ml-1" style={{ color: a.verify?.includes('✅') ? '#16a34a' : '#ef4444' }}>{a.verify}</span>
                            </span>
                          ))}
                        </div>

                        <p className="text-[10px] text-gray-300 mt-3">灰条 = 原文大小 · 绿条 = 节省 · 红条 = 膨胀 · 统一横条对比</p>
                      </div>
                    );
                  })()}
                </div>
                )}

                {/* Character frequency preview */}
                {compressResult.analysis?.charFrequency?.length > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-xl text-xs">
                    <p className="font-semibold text-blue-800 mb-1.5">📊 字符频率（Huffman 编码依据）</p>
                    <div className="max-h-28 overflow-y-auto flex flex-wrap gap-1.5 mb-1.5">
                      {compressResult.analysis.charFrequency.map((f, i) => (
                        <span key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${i < 3 ? 'bg-blue-200 text-blue-800' : 'bg-white/60 text-gray-600'}`}>
                          <span className="font-mono">"{f.char}"</span>
                          <span className="opacity-60">{f.pct}%</span>
                        </span>
                      ))}
                    </div>
                    <p className="text-blue-600/70 leading-relaxed">Huffman 算法基于字符频率分配最优前缀编码——高频字符用短码，低频字符用长码，实现最小平均编码长度。</p>
                  </div>
                )}

                {/* BWT transform preview */}
                {compressResult.analysis?.bwtPreview && (
                  <div className="mb-4 p-3 bg-purple-50 rounded-xl text-xs">
                    <p className="font-semibold text-purple-800 mb-1.5">🔄 BWT 变换前后对比</p>
                    <p className="text-purple-600/70 mb-1.5 leading-relaxed">BWT 将所有循环移位排序后取最后一列，使重复字符聚集在一起——这是 BWT 流水线压缩率高的根本原因。</p>
                    <div className="space-y-1.5">
                      <div>
                        <span className="text-purple-500 text-[10px]">变换前：</span>
                        <div className="bg-white/80 rounded px-2 py-1 mt-0.5 font-mono text-purple-900 break-all">{compressResult.analysis.bwtPreviewOriginal}</div>
                      </div>
                      <div>
                        <span className="text-purple-500 text-[10px]">变换后：</span>
                        <div className="bg-white/80 rounded px-2 py-1 mt-0.5 font-mono text-purple-900 break-all">{compressResult.analysis.bwtPreview}</div>
                      </div>
                    </div>
                    <p className="text-purple-600/50 text-[10px] mt-1">注：BWT 输出看起来杂乱是因为字符被重新排列——重复字聚集，这是压缩的关键步骤</p>
                  </div>
                )}

                {/* Decision summary */}
                {compressResult.analysis?.decision && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
                    <p className="font-semibold mb-1">💡 我们的思考与抉择</p>
                    <p>{compressResult.analysis.decision}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">无法加载压缩数据</p>
            )}
          </div>
        )}

        {/* Comments section */}
        <div className="glass-card p-5 mb-4">
          <h3 className="text-sm font-bold text-gray-800 mb-4">💬 评论 ({comments.length})</h3>

          {comments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">暂无评论，来说点什么吧</p>
          ) : (
            <div className="space-y-3 mb-4">
              {comments.map((c, i) => (
                <div key={c.id || i} className="flex gap-2">
                  <span className="text-lg shrink-0">💬</span>
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-gray-800">{c.userName}</span>
                    <span className="text-xs text-gray-400 ml-2">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString('zh-CN') : ''}
                    </span>
                    <p className="text-sm text-gray-600 mt-0.5 break-words">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Comment input */}
          <form onSubmit={handleComment} className="flex gap-2">
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="写下你的评论..."
              maxLength={200}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button type="submit" disabled={submitting || !commentText.trim()}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {submitting ? '...' : '发送'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
