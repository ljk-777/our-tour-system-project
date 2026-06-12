const express = require('express');
const router = express.Router();
const diaryRepo = require('../repositories/diaryRepository');
const { searchInItems } = require('../algorithms/kmp');
const { FullTextIndex } = require('../algorithms/trie');
const { generateDiaryDraft } = require('../services/diaryAiService');
const { generateMemoryVideo } = require('../services/memoryVideoService');
const { auth, requireAuth } = require('../middleware/auth');

router.use(auth);

async function buildDiaryIndex() {
  const allDiaries = await diaryRepo.getAll();
  const ftIndex = new FullTextIndex();
  allDiaries.forEach((diary) => ftIndex.add(diary));
  return { allDiaries, ftIndex };
}

router.get('/', async (req, res, next) => {
  try {
    const { userId, spotId, tag, spotName, sortBy = 'createdAt', order = 'desc', limit = 10, offset = 0 } = req.query;
    let { data: result, total } = await diaryRepo.findAll({ userId, spotId, limit: 9999, offset: 0 });

    if (tag)      result = result.filter((d) => d.tags && d.tags.includes(tag));
    if (spotName) result = result.filter((d) => d.spotName && d.spotName.includes(spotName));

    result.sort((a, b) => {
      if (sortBy === 'likes')   return order === 'desc' ? b.likes - a.likes : a.likes - b.likes;
      if (sortBy === 'views')   return order === 'desc' ? b.views - a.views : a.views - b.views;
      if (sortBy === 'rating')  return order === 'desc' ? (b.rating||0) - (a.rating||0) : (a.rating||0) - (b.rating||0);
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

router.post('/generate', async (req, res, next) => {
  try {
    const { title, content, notes, spotName, tags, weather, mood, rating } = req.body;
    if (!title && !content && !notes && !spotName) {
      return res.status(400).json({ success: false, message: '请先填写标题、地点或旅行素材' });
    }

    const draft = await generateDiaryDraft({
      title,
      content,
      notes,
      spotName,
      tags,
      weather,
      mood,
      rating,
    });

    res.json({ success: true, data: { content: draft } });
  } catch (error) {
    next(error);
  }
});

router.post('/memory-video', async (req, res, next) => {
  try {
    const { diaryIds } = req.body;
    let diaries;
    if (Array.isArray(diaryIds) && diaryIds.length) {
      const found = await Promise.all(diaryIds.map((id) => diaryRepo.findById(id)));
      diaries = found.filter(Boolean);
    } else {
      const { data } = await diaryRepo.findAll({ limit: 5, offset: 0 });
      diaries = data;
    }

    const result = await generateMemoryVideo(diaries);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const diary = await diaryRepo.findById(req.params.id);
    if (!diary) return res.status(404).json({ success: false, message: '日记不存在' });
    // 浏览量 +1（非阻塞）
    diaryRepo.incrementViews(req.params.id).catch(() => {});
    // 附带当前用户的评分（如已登录）
    let myRating = null;
    if (req.user) myRating = await diaryRepo.getMyRating(req.user.id, req.params.id).catch(() => null);
    res.json({ success: true, data: { ...diary, myRating } });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const {
      userName, userAvatar, title, content, spotId, spotName,
      coverImage, videoUrl, tags, rating, visitDate, weather, mood,
    } = req.body;
    if (!title || !content) return res.status(400).json({ success: false, message: '标题和内容不能为空' });

    const diary = await diaryRepo.create({
      userId: req.user.id,  // ← FROM AUTH, NOT FROM BODY
      userName: userName || '旅行者',
      userAvatar,
      title, content, spotId, spotName, coverImage, videoUrl, tags, rating, visitDate, weather, mood,
    });

    res.json({ success: true, data: diary, message: '日记发布成功' });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/like', requireAuth, async (req, res, next) => {
  try {
    const diary = await diaryRepo.like(req.user.id, req.params.id);
    if (!diary) return res.status(404).json({ success: false, message: '日记不存在' });
    res.json({ success: true, likes: diary.likes });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/unlike', requireAuth, async (req, res, next) => {
  try {
    const diary = await diaryRepo.unlike(req.user.id, req.params.id);
    if (!diary) return res.status(404).json({ success: false, message: '日记不存在' });
    res.json({ success: true, likes: diary.likes });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/rate', requireAuth, async (req, res, next) => {
  try {
    const { score } = req.body;
    const s = Number(score);
    if (!s || s < 1 || s > 5) return res.status(400).json({ success: false, message: '评分须为 1-5 分' });
    const diary = await diaryRepo.rate(req.user.id, req.params.id, s);
    if (!diary) return res.status(404).json({ success: false, message: '日记不存在' });
    res.json({ success: true, rating: diary.rating, ratingCount: diary.ratingCount, myRating: s });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/comment', requireAuth, async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ success: false, message: '评论不能为空' });
    if (content.length > 2000) return res.status(400).json({ success: false, message: '评论不能超过2000个字符' });

    const diary = await diaryRepo.addComment(req.params.id, {
      userId: req.user.id,  // ← FROM AUTH
      userName: req.body.userName || '旅行者',
      content,
    });
    if (!diary) return res.status(404).json({ success: false, message: '日记不存在' });
    res.json({ success: true, data: diary });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
