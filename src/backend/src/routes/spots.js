const express = require('express');
const router = express.Router();
const spotRepo = require('../repositories/spotRepository');
const { topK } = require('../algorithms/heap');
const { Trie, FullTextIndex } = require('../algorithms/trie');

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

router.get('/:id', async (req, res, next) => {
  try {
    const spot = await spotRepo.findById(req.params.id);
    if (!spot) return res.status(404).json({ success: false, message: '景点不存在' });
    res.json({ success: true, data: spot });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
