const express = require('express');
const router = express.Router();
const diaryRepo = require('../repositories/diaryRepository');
const { searchInItems } = require('../algorithms/kmp');
const { FullTextIndex } = require('../algorithms/trie');

async function buildDiaryIndex() {
  const allDiaries = await diaryRepo.getAll();
  const ftIndex = new FullTextIndex();
  allDiaries.forEach((diary) => ftIndex.add(diary));
  return { allDiaries, ftIndex };
}

router.get('/', async (req, res, next) => {
  try {
    const { userId, spotId, tag, sortBy = 'createdAt', order = 'desc', limit = 10, offset = 0 } = req.query;
    let { data: result, total } = await diaryRepo.findAll({ userId, spotId, limit: 9999, offset: 0 });

    if (tag) result = result.filter((diary) => diary.tags && diary.tags.includes(tag));

    result.sort((a, b) => {
      if (sortBy === 'likes') return order === 'desc' ? b.likes - a.likes : a.likes - b.likes;
      if (sortBy === 'views') return order === 'desc' ? b.views - a.views : a.views - b.views;
      return order === 'desc'
        ? new Date(b.createdAt) - new Date(a.createdAt)
        : new Date(a.createdAt) - new Date(b.createdAt);
    });

    total = result.length;
    result = result.slice(Number(offset), Number(offset) + Number(limit));
    res.json({ success: true, data: result, total });
  } catch (error) {
    next(error);
  }
});

router.get('/search', async (req, res, next) => {
  try {
    const { q, mode = 'kmp' } = req.query;
    if (!q) return res.json({ success: true, data: [] });

    const { allDiaries, ftIndex } = await buildDiaryIndex();
    const result = mode === 'kmp'
      ? searchInItems(allDiaries, q, ['title', 'content', 'spotName'])
      : ftIndex.search(q);

    res.json({
      success: true,
      data: result,
      mode,
      query: q,
      algorithm: mode === 'kmp' ? 'KMP' : 'InvertedIndex',
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const diary = await diaryRepo.findById(req.params.id);
    if (!diary) return res.status(404).json({ success: false, message: '日记不存在' });
    res.json({ success: true, data: diary });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { userId, userName, userAvatar, title, content, spotId, spotName, tags, rating, visitDate } = req.body;
    if (!title || !content) return res.status(400).json({ success: false, message: '标题和内容不能为空' });

    const diary = await diaryRepo.create({
      userId,
      userName,
      userAvatar,
      title,
      content,
      spotId,
      spotName,
      tags,
      rating,
      visitDate,
    });

    res.json({ success: true, data: diary, message: '日记发布成功' });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/like', async (req, res, next) => {
  try {
    const diary = await diaryRepo.like(req.params.id);
    if (!diary) return res.status(404).json({ success: false, message: '日记不存在' });
    res.json({ success: true, likes: diary.likes });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/comment', async (req, res, next) => {
  try {
    const { userId, userName, content } = req.body;
    if (!content) return res.status(400).json({ success: false, message: '评论不能为空' });

    const diary = await diaryRepo.addComment(req.params.id, { userId, userName, content });
    if (!diary) return res.status(404).json({ success: false, message: '日记不存在' });
    res.json({ success: true, data: diary });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
