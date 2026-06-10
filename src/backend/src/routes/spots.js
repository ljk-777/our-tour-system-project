const express = require('express');
const router = express.Router();
const spotRepo = require('../repositories/spotRepository');
const favRepo  = require('../repositories/favoritesRepository');
const { topK } = require('../algorithms/heap');
const { Trie, FullTextIndex } = require('../algorithms/trie');
const { requireAuth } = require('../middleware/auth');

async function buildSpotIndexes() {
  const allSpots = await spotRepo.getAll();
  const trie = new Trie();
  const ftIndex = new FullTextIndex();

  allSpots.forEach((spot) => {
    trie.insert(spot.name, spot);
    if (spot.city) trie.insert(spot.city, spot);
    ftIndex.add(spot);
  });

  return { allSpots, trie, ftIndex };
}

router.get('/', async (req, res, next) => {
  try {
    const { type, city, province, limit = 20, offset = 0 } = req.query;
    const { data, total } = await spotRepo.findAll({ type, city, province, limit, offset });
    res.json({ success: true, data, total, offset: Number(offset), limit: Number(limit) });
  } catch (error) {
    next(error);
  }
});

router.get('/topk', async (req, res, next) => {
  try {
    const { k = 10, type, city } = req.query;
    let pool = await spotRepo.getAll();
    if (type) pool = pool.filter((spot) => spot.type === type);
    if (city) pool = pool.filter((spot) => spot.city === city);
    const result = topK(pool, Number(k));
    res.json({ success: true, data: result, algorithm: 'MinHeap-TopK', k: Number(k) });
  } catch (error) {
    next(error);
  }
});

router.get('/search', async (req, res, next) => {
  try {
    const { q, mode = 'prefix' } = req.query;
    if (!q) return res.json({ success: true, data: [] });

    const { allSpots, trie, ftIndex } = await buildSpotIndexes();
    let result = [];

    if (mode === 'fulltext') {
      result = ftIndex.search(q);
    } else if (mode === 'fuzzy') {
      result = trie.fuzzySearch(q, allSpots, 1);
    } else {
      result = trie.searchByPrefix(q);
      if (result.length === 0) result = trie.searchByKeyword(q);
    }

    res.json({ success: true, data: result.slice(0, 20), mode, query: q });
  } catch (error) {
    next(error);
  }
});

router.get('/autocomplete', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: true, data: [] });

    const { trie } = await buildSpotIndexes();
    const result = trie.searchByPrefix(q).slice(0, 8).map((spot) => ({
      id: spot.id,
      name: spot.name,
      city: spot.city,
      type: spot.type,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/recommend', async (req, res, next) => {
  try {
    const { city, tags, type = 'scenic', limit = 8 } = req.query;
    let pool = (await spotRepo.getAll()).filter((spot) => spot.type === type || spot.type === 'campus');
    if (city) pool = pool.filter((spot) => spot.city === city);
    if (tags) {
      const tagList = tags.split(',');
      pool = pool.filter((spot) => spot.tags && tagList.some((tag) => spot.tags.includes(tag)));
    }
    const result = topK(pool, Number(limit));
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// ── 个人兴趣推荐：基于用户收藏画像的 TopK 推荐 ──────────────
router.get('/for-you', requireAuth, async (req, res, next) => {
  try {
    const { limit = 8 } = req.query;
    const favIds = await favRepo.getUserFavoriteIds(req.user.id);
    const allSpots = await spotRepo.getAll();

    if (favIds.length === 0) {
      // 冷启动：无收藏记录时退回通用 TopK 推荐
      const pool = allSpots.filter((s) => s.type === 'scenic' || s.type === 'campus');
      const result = topK(pool, Number(limit));
      return res.json({
        success: true,
        data: result,
        algorithm: 'MinHeap-TopK（冷启动回退，暂无收藏记录）',
        personalized: false,
      });
    }

    const favSet = new Set(favIds);
    const favSpots = allSpots.filter((s) => favSet.has(s.id));

    // 统计收藏景点的标签/类型偏好频次
    const tagCount = new Map();
    const typeCount = new Map();
    for (const spot of favSpots) {
      typeCount.set(spot.type, (typeCount.get(spot.type) || 0) + 1);
      for (const tag of spot.tags || []) {
        tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
      }
    }
    const preferredTags = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
    const preferredTypes = [...typeCount.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);

    // 候选池：未收藏且与偏好标签/类型有重叠的景点
    let pool = allSpots.filter((spot) => {
      if (favSet.has(spot.id)) return false;
      const tagMatch = (spot.tags || []).some((tag) => preferredTags.includes(tag));
      const typeMatch = preferredTypes.includes(spot.type);
      return tagMatch || typeMatch;
    });
    if (pool.length === 0) pool = allSpots.filter((spot) => !favSet.has(spot.id));

    // 按偏好匹配度（标签命中数 * 2 + 类型命中 + 评分权重）打分后 TopK
    const scored = pool.map((spot) => {
      const tagScore = (spot.tags || []).filter((tag) => preferredTags.includes(tag)).length;
      const typeScore = preferredTypes.includes(spot.type) ? 1 : 0;
      return { spot, score: tagScore * 2 + typeScore + (spot.rating || 0) / 10 };
    });
    const result = topK(scored, Number(limit), (s) => s.score).map((s) => s.spot);

    res.json({
      success: true,
      data: result,
      algorithm: 'MinHeap-TopK + 个人偏好画像（基于收藏标签/类型）',
      personalized: true,
      preferredTags: preferredTags.slice(0, 5),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const spot = await spotRepo.findById(req.params.id);
    if (!spot) return res.status(404).json({ success: false, message: '景点不存在' });
    res.json({ success: true, data: spot });
  } catch (error) {
    next(error);
  }
});

// ── 收藏功能 ──────────────────────────────────────────────
router.post('/:id/favorite', requireAuth, async (req, res, next) => {
  try {
    await favRepo.addFavorite(req.user.id, req.params.id);
    res.json({ success: true, message: '已收藏' });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/favorite', requireAuth, async (req, res, next) => {
  try {
    await favRepo.removeFavorite(req.user.id, req.params.id);
    res.json({ success: true, message: '已取消收藏' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
