const express = require('express');
const router = express.Router();
const diaryRepo = require('../repositories/diaryRepository');
const { searchInItems } = require('../algorithms/kmp');
const { FullTextIndex } = require('../algorithms/trie');

// 输入验证
const validateDiary = (body) => {
  if (!body.title || typeof body.title !== 'string') return '标题不能为空';
  if (body.title.length > 100) return '标题长度不能超过100个字符';
  if (!body.content || typeof body.content !== 'string') return '内容不能为空';
  if (body.content.length > 5000) return '内容长度不能超过5000个字符';
  if (body.rating && (body.rating < 1 || body.rating > 5)) return '评分需在1-5之间';
  return null;
};

// 初始化全文索引（倒排索引）
const ftIndex = new FullTextIndex();
diaryRepo.getAll().forEach(d => ftIndex.add(d));

// GET /api/diaries — 日记列表（支持过滤 + 排序 + 分页）
router.get('/', (req, res) => {
  const { userId, spotId, tag, sortBy = 'createdAt', order = 'desc', limit = 10, offset = 0 } = req.query;
  let { data: result, total } = diaryRepo.findAll({ userId, spotId, limit: 9999, offset: 0 });

  if (tag) result = result.filter(d => d.tags && d.tags.includes(tag));

  result.sort((a, b) => {
    if (sortBy === 'likes')   return order === 'desc' ? b.likes - a.likes : a.likes - b.likes;
    if (sortBy === 'views')   return order === 'desc' ? b.views - a.views : a.views - b.views;
    return order === 'desc'
      ? new Date(b.createdAt) - new Date(a.createdAt)
      : new Date(a.createdAt) - new Date(b.createdAt);
  });

  total = result.length;
  result = result.slice(Number(offset), Number(offset) + Number(limit));
  res.json({ success: true, data: result, total });
});

// GET /api/diaries/search?q=西湖&mode=kmp|fulltext — 日记搜索
router.get('/search', (req, res) => {
  const { q, mode = 'kmp' } = req.query;
  if (!q) return res.json({ success: true, data: [] });

  let result;
  if (mode === 'kmp') {
    result = searchInItems(diaryRepo.getAll(), q, ['title', 'content', 'spotName']);
  } else {
    result = ftIndex.search(q);
  }
  res.json({ success: true, data: result, mode, query: q, algorithm: mode === 'kmp' ? 'KMP' : 'InvertedIndex' });
});

// GET /api/diaries/:id — 日记详情
router.get('/:id', (req, res) => {
  const diary = diaryRepo.findById(req.params.id);
  if (!diary) return res.status(404).json({ success: false, message: '日记不存在' });
  res.json({ success: true, data: diary });
});

// POST /api/diaries — 发布日记
router.post('/', (req, res) => {
  const error = validateDiary(req.body);
  if (error) return res.status(400).json({ success: false, message: error });
  
  const { userId, userName, userAvatar, title, content, spotId, spotName, tags, rating, visitDate } = req.body;
  const diary = diaryRepo.create({ userId, userName, userAvatar, title, content, spotId, spotName, tags, rating, visitDate });
  ftIndex.add(diary);
  res.json({ success: true, data: diary, message: '日记发布成功' });
});

// POST /api/diaries/:id/like — 点赞
router.post('/:id/like', (req, res) => {
  const diary = diaryRepo.like(req.params.id);
  if (!diary) return res.status(404).json({ success: false, message: '日记不存在' });
  res.json({ success: true, likes: diary.likes });
});

// POST /api/diaries/:id/comment — 评论
router.post('/:id/comment', (req, res) => {
  const { userId, userName, content } = req.body;
  if (!content || typeof content !== 'string') return res.status(400).json({ success: false, message: '评论不能为空' });
  if (content.length > 500) return res.status(400).json({ success: false, message: '评论长度不能超过500个字符' });
  const diary = diaryRepo.addComment(req.params.id, { userId, userName, content });
  if (!diary) return res.status(404).json({ success: false, message: '日记不存在' });
  res.json({ success: true, data: diary });
});

// DELETE /api/diaries/:id — 删除日记
router.delete('/:id', (req, res) => {
  const deleted = diaryRepo.delete(req.params.id);
  if (!deleted) return res.status(404).json({ success: false, message: '日记不存在' });
  res.json({ success: true, message: '日记已删除' });
});

// PUT /api/diaries/:id — 更新日记
router.put('/:id', (req, res) => {
  const { title, content, tags, rating } = req.body;
  const diary = diaryRepo.update(req.params.id, { title, content, tags, rating });
  if (!diary) return res.status(404).json({ success: false, message: '日记不存在' });
  res.json({ success: true, data: diary, message: '日记更新成功' });
});

module.exports = router;
