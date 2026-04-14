const express = require('express');
const router = express.Router();
const spotRepo = require('../repositories/spotRepository');
const { topK } = require('../algorithms/heap');
const { Trie, FullTextIndex } = require('../algorithms/trie');

// 初始化搜索索引（Trie + 倒排索引）
const trie = new Trie();
const ftIndex = new FullTextIndex();
spotRepo.getAll().forEach(s => {
  trie.insert(s.name, s);
  if (s.city) trie.insert(s.city, s);
  ftIndex.add(s);
});

// GET /api/spots — 获取景点列表（支持 type/city/province 过滤 + 分页）
router.get('/', (req, res) => {
  const { type, city, province, limit = 20, offset = 0 } = req.query;
  const { data, total } = spotRepo.findAll({ type, city, province, limit, offset });
  res.json({ success: true, data, total, offset: Number(offset), limit: Number(limit) });
});

// GET /api/spots/topk?k=10&type=scenic — TopK 推荐（小顶堆算法）
router.get('/topk', (req, res) => {
  const { k = 10, type, city } = req.query;
  let pool = spotRepo.getAll();
  if (type) pool = pool.filter(s => s.type === type);
  if (city) pool = pool.filter(s => s.city === city);
  const result = topK(pool, Number(k));
  res.json({ success: true, data: result, algorithm: 'MinHeap-TopK', k: Number(k) });
});

// GET /api/spots/search?q=西湖&mode=prefix|fulltext|fuzzy — 搜索
router.get('/search', (req, res) => {
  const { q, mode = 'prefix' } = req.query;
  if (!q) return res.json({ success: true, data: [] });

  let result = [];
  if (mode === 'fulltext') {
    result = ftIndex.search(q);          // 倒排索引全文检索
  } else if (mode === 'fuzzy') {
    result = trie.fuzzySearch(q, spotRepo.getAll(), 1); // Trie + 编辑距离
  } else {
    result = trie.searchByPrefix(q);     // Trie 前缀搜索
    if (result.length === 0) result = trie.searchByKeyword(q);
  }
  res.json({ success: true, data: result.slice(0, 20), mode, query: q });
});

// GET /api/spots/autocomplete?q=故 — 自动补全
router.get('/autocomplete', (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ success: true, data: [] });
  const result = trie.searchByPrefix(q).slice(0, 8).map(s => ({
    id: s.id, name: s.name, city: s.city, type: s.type,
  }));
  res.json({ success: true, data: result });
});

// GET /api/spots/recommend?city=北京&tags=历史 — 综合推荐
router.get('/recommend', (req, res) => {
  const { city, tags, type = 'scenic', limit = 8 } = req.query;
  let pool = spotRepo.getAll().filter(s => s.type === type || s.type === 'campus');
  if (city) pool = pool.filter(s => s.city === city);
  if (tags) {
    const tagList = tags.split(',');
    pool = pool.filter(s => s.tags && tagList.some(t => s.tags.includes(t)));
  }
  const result = topK(pool, Number(limit));
  res.json({ success: true, data: result });
});

// GET /api/spots/:id — 景点详情
router.get('/:id', (req, res) => {
  const spot = spotRepo.findById(req.params.id);
  if (!spot) return res.status(404).json({ success: false, message: '景点不存在' });
  res.json({ success: true, data: spot });
});

module.exports = router;
