const express = require('express');
const router = express.Router();
const spotRepo = require('../repositories/spotRepository');
const favRepo  = require('../repositories/favoritesRepository');
const { MinHeap, topK } = require('../algorithms/heap');
const { Trie, FullTextIndex } = require('../algorithms/trie');
const { requireAuth } = require('../middleware/auth');

const RECOMMEND_TYPES = new Set(['all', 'scenic', 'campus']);
const RECOMMEND_SORTS = new Set(['popularity', 'rating', 'interest']);
const DEFAULT_RECOMMEND_LIMIT = 10;
const MAX_RECOMMEND_LIMIT = 30;

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

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function parseCsv(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function clampRecommendLimit(value) {
  const n = Number(value || DEFAULT_RECOMMEND_LIMIT);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_RECOMMEND_LIMIT;
  return Math.min(Math.floor(n), MAX_RECOMMEND_LIMIT);
}

function getPopularityScore(spot) {
  const tags = new Set(spot.tags || []);
  let score = Number(spot.rating || 0) * 20;
  if (spot.type === 'scenic') score += 8;
  if (spot.type === 'campus') score += 6;
  if (tags.has('世界遗产')) score += 12;
  if (tags.has('顶尖学府')) score += 12;
  if (tags.has('历史')) score += 6;
  if (tags.has('文化')) score += 5;
  if (tags.has('自然')) score += 5;
  if (tags.has('美丽校园')) score += 5;
  if (tags.has('地标')) score += 4;
  if (Number(spot.visitTime || 0) >= 3) score += 3;
  if (Number(spot.entranceFee || 0) === 0) score += 2;
  return score;
}

function getInterestScore(spot, interests) {
  if (interests.length === 0) return 0;
  const fields = [
    spot.name,
    spot.type === 'campus' ? '高校 学校 大学 校园' : '景点 景区 旅游',
    spot.city,
    spot.province,
    spot.description,
    ...(spot.tags || []),
  ]
    .filter(Boolean)
    .map(normalizeText);

  return interests.reduce((score, interest) => {
    const needle = normalizeText(interest);
    if (!needle) return score;
    const matched = fields.some((field) => field.includes(needle) || needle.includes(field));
    return score + (matched ? 18 : 0);
  }, 0);
}

function scoreSpot(spot, sortBy, interests) {
  if (sortBy === 'rating') return Number(spot.rating || 0);
  if (sortBy === 'interest') {
    return getInterestScore(spot, interests) + getPopularityScore(spot) * 0.25;
  }
  return getPopularityScore(spot);
}

function compareRecommendations(a, b, sortBy, interests) {
  const diff = scoreSpot(b, sortBy, interests) - scoreSpot(a, sortBy, interests);
  if (diff !== 0) return diff;
  const ratingDiff = Number(b.rating || 0) - Number(a.rating || 0);
  if (ratingDiff !== 0) return ratingDiff;
  return Number(a.id) - Number(b.id);
}

/**
 * Select recommendation TopK with a MinHeap.
 * Time complexity: O(N log K), where N is candidates and K is requested limit.
 */
function selectRecommendationTopK(items, limit, sortBy, interests) {
  const heap = new MinHeap((a, b) => compareRecommendations(b, a, sortBy, interests));
  for (const item of items) {
    if (heap.size < limit) {
      heap.push(item);
    } else if (compareRecommendations(item, heap.peek(), sortBy, interests) < 0) {
      heap.pop();
      heap.push(item);
    }
  }
  return heap.data.sort((a, b) => compareRecommendations(a, b, sortBy, interests));
}

function buildRecommendationResult(items, limit, sortBy, interests, includeAll) {
  const topItems = selectRecommendationTopK(items, limit, sortBy, interests).map((item, index) => ({
    ...item,
    topRank: index + 1,
    isTopRecommendation: true,
    popularityScore: getPopularityScore(item),
    interestScore: getInterestScore(item, interests),
  }));

  if (!includeAll) return topItems;

  const topIds = new Set(topItems.map((item) => item.id));
  const rest = items
    .filter((item) => !topIds.has(item.id))
    .sort((a, b) => compareRecommendations(a, b, sortBy, interests))
    .map((item) => ({
      ...item,
      topRank: null,
      isTopRecommendation: false,
      popularityScore: getPopularityScore(item),
      interestScore: getInterestScore(item, interests),
    }));

  return [...topItems, ...rest];
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
    const type = RECOMMEND_TYPES.has(req.query.type) ? req.query.type : 'all';
    const sortBy = RECOMMEND_SORTS.has(req.query.sortBy) ? req.query.sortBy : 'popularity';
    const interests = parseCsv(req.query.interests || req.query.tags);
    const limit = clampRecommendLimit(req.query.limit);
    const includeAll = req.query.includeAll === 'true';

    let pool = (await spotRepo.getAll()).filter((spot) => ['scenic', 'campus'].includes(spot.type));
    if (type !== 'all') pool = pool.filter((spot) => spot.type === type);
    if (req.query.city) pool = pool.filter((spot) => spot.city === req.query.city);
    if (interests.length > 0 && sortBy === 'interest') {
      pool = pool.filter((spot) => getInterestScore(spot, interests) > 0);
    }

    const data = buildRecommendationResult(pool, limit, sortBy, interests, includeAll);
    res.json({
      success: true,
      algorithm: 'MinHeap TopK O(N log K)',
      sortBy,
      type,
      city: req.query.city || '',
      interests,
      totalCandidates: pool.length,
      rankedCount: Math.min(limit, pool.length),
      data,
    });
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
