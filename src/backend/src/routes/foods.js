const express = require('express');
const router = express.Router();

const spotRepo = require('../repositories/spotRepository');
const { MinHeap } = require('../algorithms/heap');
const { Trie, FullTextIndex, editDistance } = require('../algorithms/trie');
const { kmpSearch } = require('../algorithms/kmp');
const { nearestDistance } = require('../algorithms/geo');

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 30;
const SORTS = new Set(['popularity', 'rating', 'distance']);

function parseIds(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((id) => Number(id.trim()))
    .filter(Number.isFinite);
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function clampLimit(value) {
  const n = Number(value || DEFAULT_LIMIT);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(n), MAX_LIMIT);
}

function hasCuisine(restaurant, cuisine) {
  if (!cuisine || cuisine === '全部') return true;
  return (restaurant.tags || []).some((tag) => normalizeText(tag) === normalizeText(cuisine));
}

function getPopularityScore(restaurant) {
  const tags = new Set(restaurant.tags || []);
  let score = Number(restaurant.rating || 0) * 20;
  if (tags.has('必吃')) score += 10;
  if (tags.has('老字号')) score += 8;
  if (tags.has('北京烤鸭')) score += 6;
  if (tags.has('北京菜')) score += 5;
  if (tags.has('清真')) score += 3;
  return score;
}

function getSortValue(restaurant, sortBy) {
  if (sortBy === 'distance') {
    return restaurant.distanceKm === null ? Number.NEGATIVE_INFINITY : -restaurant.distanceKm;
  }
  if (sortBy === 'rating') return Number(restaurant.rating || 0);
  return getPopularityScore(restaurant);
}

function compareForDisplay(a, b, sortBy) {
  if (sortBy === 'distance') {
    const ad = a.distanceKm ?? Number.POSITIVE_INFINITY;
    const bd = b.distanceKm ?? Number.POSITIVE_INFINITY;
    if (ad !== bd) return ad - bd;
  } else {
    const diff = getSortValue(b, sortBy) - getSortValue(a, sortBy);
    if (diff !== 0) return diff;
  }
  return Number(b.rating || 0) - Number(a.rating || 0);
}

/**
 * Select top K items with a min-heap instead of fully sorting all candidates.
 * Time complexity: O(N log K), where N is candidate count and K is limit.
 */
function selectTopK(items, limit, sortBy) {
  const heap = new MinHeap((a, b) => getSortValue(a, sortBy) - getSortValue(b, sortBy));
  for (const item of items) {
    if (heap.size < limit) {
      heap.push(item);
    } else if (getSortValue(item, sortBy) > getSortValue(heap.peek(), sortBy)) {
      heap.pop();
      heap.push(item);
    }
  }
  return heap.data.sort((a, b) => compareForDisplay(a, b, sortBy));
}

function buildRankedResult(items, limit, sortBy, includeAll) {
  const topItems = selectTopK(items, limit, sortBy).map((item, index) => ({
    ...item,
    topRank: index + 1,
    isTopRecommendation: true,
  }));

  if (!includeAll) return topItems;

  const topIds = new Set(topItems.map((item) => item.id));
  const rest = items
    .filter((item) => !topIds.has(item.id))
    .map((item) => ({
      ...item,
      topRank: null,
      isTopRecommendation: false,
    }));

  return [...topItems, ...rest];
}

async function getOrigins(originIds) {
  if (originIds.length === 0) return [];
  const spots = await spotRepo.findByIds(originIds);
  return spots.filter((spot) => Number.isFinite(spot.lat) && Number.isFinite(spot.lng));
}

async function getRestaurants({ originIds = [], cuisine } = {}) {
  const [allSpots, origins] = await Promise.all([spotRepo.getAll(), getOrigins(originIds)]);
  return allSpots
    .filter((spot) => spot.type === 'restaurant')
    .filter((spot) => hasCuisine(spot, cuisine))
    .map((restaurant) => ({
      ...restaurant,
      distanceKm: origins.length ? nearestDistance(restaurant, origins) : null,
      popularityScore: getPopularityScore(restaurant),
    }));
}

function buildFoodIndexes(restaurants) {
  const trie = new Trie();
  const ftIndex = new FullTextIndex();

  for (const restaurant of restaurants) {
    trie.insert(restaurant.name, restaurant);
    for (const tag of restaurant.tags || []) trie.insert(tag, restaurant);
    if (restaurant.city) trie.insert(restaurant.city, restaurant);
    ftIndex.add(restaurant);
  }

  return { trie, ftIndex };
}

function scoreContentMatch(restaurant, query) {
  const q = normalizeText(query);
  const fields = [
    restaurant.name,
    restaurant.city,
    restaurant.province,
    restaurant.description,
    restaurant.openHours,
    ...(restaurant.tags || []),
  ].filter(Boolean);

  let score = 0;
  for (const field of fields) {
    const text = normalizeText(field);
    if (!text) continue;
    if (kmpSearch(text, q).length > 0) score += field === restaurant.name ? 8 : 4;
    const dist = editDistance(q, text.slice(0, Math.max(q.length, 1)));
    if (q.length > 1 && dist <= 1) score += 2;
  }
  return score;
}

function searchRestaurants(restaurants, query) {
  if (!query) return restaurants;
  const { trie, ftIndex } = buildFoodIndexes(restaurants);
  const byId = new Map();

  for (const item of trie.searchByPrefix(query)) byId.set(item.id, item);
  for (const item of trie.searchByKeyword(query)) byId.set(item.id, item);
  for (const item of ftIndex.search(query)) byId.set(item.id, item);

  for (const restaurant of restaurants) {
    if (scoreContentMatch(restaurant, query) > 0) byId.set(restaurant.id, restaurant);
  }

  return [...byId.values()]
    .map((restaurant) => ({ ...restaurant, matchScore: scoreContentMatch(restaurant, query) }))
    .filter((restaurant) => restaurant.matchScore > 0 || byId.has(restaurant.id));
}

function serializeRestaurant(restaurant) {
  return {
    ...restaurant,
    distanceKm:
      restaurant.distanceKm === null || restaurant.distanceKm === undefined
        ? null
        : Number(restaurant.distanceKm.toFixed(2)),
    popularityScore: Number((restaurant.popularityScore || 0).toFixed(1)),
  };
}

router.get('/recommend', async (req, res, next) => {
  try {
    const originIds = parseIds(req.query.originIds);
    const sortBy = SORTS.has(req.query.sortBy) ? req.query.sortBy : 'popularity';
    const limit = clampLimit(req.query.limit);
    const includeAll = req.query.includeAll === 'true';
    const restaurants = await getRestaurants({ originIds, cuisine: req.query.cuisine });
    const data = buildRankedResult(restaurants, limit, sortBy, includeAll).map(serializeRestaurant);

    res.json({
      success: true,
      algorithm: 'MinHeap TopK O(N log K)',
      sortBy,
      cuisine: req.query.cuisine || '全部',
      originIds,
      totalCandidates: restaurants.length,
      rankedCount: Math.min(limit, restaurants.length),
      data,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/search', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    const originIds = parseIds(req.query.originIds);
    const sortBy = SORTS.has(req.query.sortBy) ? req.query.sortBy : 'popularity';
    const limit = clampLimit(req.query.limit);
    const includeAll = req.query.includeAll === 'true';
    const restaurants = await getRestaurants({ originIds, cuisine: req.query.cuisine });
    const matched = searchRestaurants(restaurants, q);
    const data = buildRankedResult(matched, limit, sortBy, includeAll).map(serializeRestaurant);

    res.json({
      success: true,
      algorithm: 'Trie/FullText/KMP fuzzy search + MinHeap TopK O(N log K)',
      query: q,
      sortBy,
      cuisine: req.query.cuisine || '全部',
      originIds,
      totalCandidates: restaurants.length,
      totalMatches: matched.length,
      rankedCount: Math.min(limit, matched.length),
      data,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
