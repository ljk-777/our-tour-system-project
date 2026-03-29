const express = require('express');
const router = express.Router();
const userRepo = require('../repositories/userRepository');
const diaryRepo = require('../repositories/diaryRepository');

// 输入验证工具
const validate = {
  username: (name) => {
    if (!name || typeof name !== 'string') return '用户名不能为空';
    if (name.length < 2 || name.length > 20) return '用户名长度需在2-20个字符之间';
    if (!/^[\w\u4e00-\u9fa5]+$/.test(name)) return '用户名只能包含字母、数字、下划线和中文';
    return null;
  },
  content: (text, field = '内容', maxLen = 2000) => {
    if (!text || typeof text !== 'string') return `${field}不能为空`;
    if (text.length > maxLen) return `${field}长度不能超过${maxLen}个字符`;
    return null;
  },
};

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
  const error = validate.username(username);
  if (error) return res.status(400).json({ success: false, message: error });
  
  const user = userRepo.findByUsername(username);
  if (!user) return res.status(401).json({ success: false, message: '用户不存在' });
  res.json({ success: true, data: user, token: `mock-token-${user.id}`, message: '登录成功' });
});

// POST /api/users — 注册
router.post('/', (req, res) => {
  const { username, email, avatar, nickname } = req.body;
  const error = validate.username(username);
  if (error) return res.status(400).json({ success: false, message: error });
  if (userRepo.findByUsername(username)) {
    return res.status(409).json({ success: false, message: '用户名已存在' });
  }
  const user = userRepo.create({ username, nickname: nickname || username, email, avatar: avatar || '🧭', joinDate: new Date().toISOString() });
  res.json({ success: true, data: user, message: '注册成功' });
});

// PUT /api/users/:id — 更新用户信息
router.put('/:id', (req, res) => {
  const { nickname, avatar, city, bio } = req.body;
  const user = userRepo.update(req.params.id, { nickname, avatar, city, bio });
  if (!user) return res.status(404).json({ success: false, message: '用户不存在' });
  res.json({ success: true, data: user, message: '用户信息更新成功' });
});

// DELETE /api/users/:id — 删除用户
router.delete('/:id', (req, res) => {
  const idx = userRepo.findAll().findIndex(u => u.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: '用户不存在' });
  userRepo.findAll().splice(idx, 1);
  res.json({ success: true, message: '用户已删除' });
});

module.exports = router;
