const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const groupRepo = require('../repositories/groupRepository');

router.use(requireAuth);

// Create group
router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: '群组名称不能为空' });
    if (name.length > 100) return res.status(400).json({ success: false, message: '群组名称不能超过100个字符' });
    const group = await groupRepo.create(name.trim(), req.user.id);
    res.json({ success: true, data: group, message: '群组创建成功' });
  } catch (error) {
    if (error.message.includes('群组码')) return res.status(500).json({ success: false, message: error.message });
    next(error);
  }
});

// Join by code
router.post('/join', async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code || !code.trim()) return res.status(400).json({ success: false, message: '请输入群组码' });
    const group = await groupRepo.findByCode(code.trim().toUpperCase());
    if (!group) return res.status(404).json({ success: false, message: '群组码无效，未找到该群组' });
    const added = await groupRepo.addMember(group.id, req.user.id);
    if (!added) return res.status(409).json({ success: false, message: '你已经是该群组成员' });
    // Add system message
    const user = await (require('../repositories/userRepository')).findById(req.user.id);
    await groupRepo.addMessage(group.id, null, 'system', `${user.nickname || user.username} 加入了群组`);
    res.json({ success: true, data: group, message: '加入群组成功' });
  } catch (error) {
    next(error);
  }
});

// List my groups
router.get('/', async (req, res, next) => {
  try {
    const groups = await groupRepo.findByUserId(req.user.id);
    res.json({ success: true, data: groups });
  } catch (error) {
    next(error);
  }
});

// Group detail
router.get('/:id', async (req, res, next) => {
  try {
    const group = await groupRepo.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: '群组不存在' });
    const members = await groupRepo.getMembers(req.params.id);
    res.json({ success: true, data: { ...group, members } });
  } catch (error) {
    next(error);
  }
});

// Delete group (admin only)
router.delete('/:id', async (req, res, next) => {
  try {
    const members = await groupRepo.getMembers(req.params.id);
    const me = members.find(m => m.user.id === req.user.id);
    if (!me || me.role !== 'admin') return res.status(403).json({ success: false, message: '只有群组管理员才能删除' });
    const deleted = await groupRepo.remove(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: '群组不存在' });
    res.json({ success: true, message: '群组已删除' });
  } catch (error) {
    next(error);
  }
});

// Get trip
router.get('/:id/trips', async (req, res, next) => {
  try {
    const trip = await groupRepo.getTrip(req.params.id);
    res.json({ success: true, data: trip });
  } catch (error) {
    next(error);
  }
});

// Save trip
router.post('/:id/trips', async (req, res, next) => {
  try {
    if (!req.body.destination) return res.status(400).json({ success: false, message: '目的地不能为空' });
    const trip = await groupRepo.upsertTrip(req.params.id, { ...req.body, createdBy: req.user.id });
    res.json({ success: true, data: trip, message: '行程已保存' });
  } catch (error) {
    next(error);
  }
});

// Get messages
router.get('/:id/messages', async (req, res, next) => {
  try {
    const { before, limit = 50 } = req.query;
    const messages = await groupRepo.getMessages(req.params.id, before, limit);
    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
});

// Send message
router.post('/:id/messages', async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ success: false, message: '消息不能为空' });
    if (content.length > 2000) return res.status(400).json({ success: false, message: '消息不能超过2000个字符' });
    const msg = await groupRepo.addMessage(req.params.id, req.user.id, 'text', content.trim());
    res.json({ success: true, data: msg, message: '发送成功' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
