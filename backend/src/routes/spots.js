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

// GET /api/spots/foods?city=北京&cuisine=川菜 — 美食推荐
router.get('/foods', (req, res) => {
  const { city, cuisine, limit = 10 } = req.query;
  let pool = spotRepo.getAll().filter(s => s.type === 'restaurant');
  if (city) pool = pool.filter(s => s.city === city);
  if (cuisine) pool = pool.filter(s => s.tags && s.tags.some(t => t.includes(cuisine)));
  const result = topK(pool, Number(limit));
  res.json({ success: true, data: result, total: pool.length });
});

// GET /api/spots/:id — 景点详情
router.get('/:id', (req, res) => {
  const spot = spotRepo.findById(req.params.id);
  if (!spot) return res.status(404).json({ success: false, message: '景点不存在' });
  res.json({ success: true, data: spot });
});

// POST /api/spots — 创建景点
router.post('/', (req, res) => {
  const { name, type, city, province, lat, lng, description, rating, tags, entranceFee, openHours } = req.body;
  if (!name || !type || !city) return res.status(400).json({ success: false, message: '名称、类型、城市不能为空' });
  const spot = spotRepo.create({ name, type, city, province, lat, lng, description, rating: rating || 4.0, tags: tags || [], entranceFee: entranceFee || 0, openHours: openHours || '全天' });
  res.json({ success: true, data: spot, message: '景点创建成功' });
});

// PUT /api/spots/:id — 更新景点
router.put('/:id', (req, res) => {
  const spot = spotRepo.update(req.params.id, req.body);
  if (!spot) return res.status(404).json({ success: false, message: '景点不存在' });
  res.json({ success: true, data: spot, message: '景点更新成功' });
});

// DELETE /api/spots/:id — 删除景点
router.delete('/:id', (req, res) => {
  const deleted = spotRepo.delete(req.params.id);
  if (!deleted) return res.status(404).json({ success: false, message: '景点不存在' });
  res.json({ success: true, message: '景点已删除' });
});

module.exports = router;
