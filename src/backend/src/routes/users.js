const express = require('express');
const router = express.Router();
const userRepo = require('../repositories/userRepository');
const diaryRepo = require('../repositories/diaryRepository');
const { auth, requireAuth } = require('../middleware/auth');

router.get('/', async (req, res, next) => {
  try {
    const users = await userRepo.findAll();
    res.json({ success: true, data: users, total: users.length });
  } catch (error) {
    next(error);
  }
});

router.get('/me/liked-diaries', async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: '请先登录' });
    const ids = await diaryRepo.getLikedDiaryIds(req.user.id);
    res.json({ success: true, data: ids });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const user = await userRepo.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: '用户不存在' });
    const { data: diaries } = await diaryRepo.findAll({ userId: user.id, limit: 100 });
    res.json({ success: true, data: { ...user, diaries } });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { username } = req.body;
    const user = await userRepo.findByUsername(username);
    if (!user) return res.status(401).json({ success: false, message: '用户不存在' });
    res.json({ success: true, data: user, token: `mock-token-${user.id}`, message: '登录成功' });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { username, nickname, email, avatar } = req.body;
    if (!username) return res.status(400).json({ success: false, message: '用户名不能为空' });
    if (await userRepo.findByUsername(username)) {
      return res.status(409).json({ success: false, message: '用户名已存在' });
    }

    const user = await userRepo.create({
      username,
      nickname,
      email,
      avatar: avatar || '🧭',
      joinDate: new Date().toISOString(),
    });

    res.json({ success: true, data: user, message: '注册成功' });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    // Only allow users to update their own profile
    if (Number(req.params.id) !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权修改其他用户的资料' });
    }
    const { nickname, avatar, city, bio } = req.body;
    const user = await userRepo.update(req.params.id, { nickname, avatar, city, bio });
    if (!user) return res.status(404).json({ success: false, message: '用户不存在' });
    res.json({ success: true, data: user, message: '资料更新成功' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
