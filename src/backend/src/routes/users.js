const express = require('express');
const router = express.Router();
const userRepo = require('../repositories/userRepository');
const diaryRepo = require('../repositories/diaryRepository');

// GET /api/users — 用户列表
router.get('/', (req, res) => {
  const users = userRepo.findAll();
  res.json({ success: true, data: users, total: users.length });
});

// GET /api/users/:id — 用户详情 + 其日记
router.get('/:id', (req, res) => {
  const user = userRepo.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: '用户不存在' });
  const { data: diaries } = diaryRepo.findAll({ userId: user.id, limit: 100 });
  res.json({ success: true, data: { ...user, diaries } });
});

// POST /api/users/login — 模拟登录
router.post('/login', (req, res) => {
  const { username } = req.body;
  const user = userRepo.findByUsername(username);
  if (!user) return res.status(401).json({ success: false, message: '用户不存在' });
  res.json({ success: true, data: user, token: `mock-token-${user.id}`, message: '登录成功' });
});

// POST /api/users — 注册
router.post('/', (req, res) => {
  const { username, email, avatar } = req.body;
  if (!username) return res.status(400).json({ success: false, message: '用户名不能为空' });
  if (userRepo.findByUsername(username)) {
    return res.status(409).json({ success: false, message: '用户名已存在' });
  }
  const user = userRepo.create({ username, email, avatar: avatar || '🧭', joinDate: new Date().toISOString() });
  res.json({ success: true, data: user, message: '注册成功' });
});

module.exports = router;
