const express = require('express');
const router = express.Router();
const diaryRepo = require('../repositories/diaryRepository');
const { searchInItems } = require('../algorithms/kmp');
const { FullTextIndex } = require('../algorithms/trie');

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
  const { userId, userName, userAvatar, title, content, spotId, spotName, tags, rating, visitDate } = req.body;
  if (!title || !content) return res.status(400).json({ success: false, message: '标题和内容不能为空' });

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
  if (!content) return res.status(400).json({ success: false, message: '评论不能为空' });
  const diary = diaryRepo.addComment(req.params.id, { userId, userName, content });
  if (!diary) return res.status(404).json({ success: false, message: '日记不存在' });
  res.json({ success: true, data: diary });
});

module.exports = router;
