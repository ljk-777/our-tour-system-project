const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const groupRepo = require('../repositories/groupRepository');
const userRepo = require('../repositories/userRepository');
const spotRepo = require('../repositories/spotRepository');
const { generateGroupTripSuggestion, analyzeGroupConflictWithAi } = require('../services/diaryAiService');
const amapService = require('../services/amapService');

router.use(requireAuth);

async function requireGroupMember(req, res, next) {
  try {
    const group = await groupRepo.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: '群组不存在' });
    const member = await groupRepo.getMember(req.params.id, req.user.id);
    if (!member) return res.status(403).json({ success: false, message: '你不是该群组成员' });
    req.group = group;
    req.groupMember = member;
    next();
  } catch (error) {
    next(error);
  }
}

function requireAdmin(req, res, next) {
  if (req.groupMember?.role !== 'admin') {
    return res.status(403).json({ success: false, message: '只有群组管理员可以执行该操作' });
  }
  next();
}

function normalizeActivity(activity, index) {
  return {
    id: activity.id || `a${Date.now()}-${index}`,
    time: activity.time || '',
    type: activity.type || '景点',
    name: activity.name || '',
    spotId: activity.spotId ? Number(activity.spotId) : null,
    cost: activity.cost || '',
    ownerId: activity.ownerId ? Number(activity.ownerId) : null,
    status: activity.status || '待定',
    description: activity.description || '',
    notes: activity.notes || '',
  };
}

function normalizeDailyPlan(plan) {
  return (Array.isArray(plan) ? plan : []).map((day, dayIndex) => ({
    day: Number(day.day || dayIndex + 1),
    date: day.date || '',
    activities: (Array.isArray(day.activities) ? day.activities : []).map(normalizeActivity),
  }));
}

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
    const user = await userRepo.findById(req.user.id);
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
router.get('/:id', requireGroupMember, async (req, res, next) => {
  try {
    const members = await groupRepo.getMembers(req.params.id);
    res.json({ success: true, data: { ...req.group, members } });
  } catch (error) {
    next(error);
  }
});

// Delete group (admin only)
router.delete('/:id', requireGroupMember, requireAdmin, async (req, res, next) => {
  try {
    const deleted = await groupRepo.remove(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: '群组不存在' });
    res.json({ success: true, message: '群组已删除' });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/leave', requireGroupMember, async (req, res, next) => {
  try {
    if (req.groupMember.role === 'admin' && await groupRepo.countAdmins(req.params.id) <= 1) {
      return res.status(400).json({ success: false, message: '最后一位管理员不能直接退出，请先转让管理员' });
    }
    await groupRepo.removeMember(req.params.id, req.user.id);
    const user = await userRepo.findById(req.user.id);
    await groupRepo.addMessage(req.params.id, null, 'system', `${user.nickname || user.username} 退出了群组`);
    res.json({ success: true, message: '已退出群组' });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/members/:userId', requireGroupMember, requireAdmin, async (req, res, next) => {
  try {
    const targetId = Number(req.params.userId);
    if (targetId === req.user.id) return res.status(400).json({ success: false, message: '请使用退出群组操作' });
    const removed = await groupRepo.removeMember(req.params.id, targetId);
    if (!removed) return res.status(404).json({ success: false, message: '成员不存在' });
    const user = await userRepo.findById(targetId);
    await groupRepo.addMessage(req.params.id, null, 'system', `${user?.nickname || user?.username || '成员'} 被移出群组`);
    res.json({ success: true, message: '成员已移除' });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/members/:userId/role', requireGroupMember, requireAdmin, async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['admin', 'editor', 'member'].includes(role)) {
      return res.status(400).json({ success: false, message: '角色必须是 admin/editor/member' });
    }
    if (Number(req.params.userId) === req.user.id && role !== 'admin' && await groupRepo.countAdmins(req.params.id) <= 1) {
      return res.status(400).json({ success: false, message: '至少需要保留一位管理员' });
    }
    const updated = await groupRepo.updateMemberRole(req.params.id, req.params.userId, role);
    if (!updated) return res.status(404).json({ success: false, message: '成员不存在' });
    res.json({ success: true, data: updated, message: '角色已更新' });
  } catch (error) {
    next(error);
  }
});

// Get trip
router.get('/:id/trips', requireGroupMember, async (req, res, next) => {
  try {
    const trip = await groupRepo.getTrip(req.params.id);
    res.json({ success: true, data: trip });
  } catch (error) {
    next(error);
  }
});

// Save trip
router.post('/:id/trips', requireGroupMember, async (req, res, next) => {
  try {
    if (!req.body.destination) return res.status(400).json({ success: false, message: '目的地不能为空' });
    const user = await userRepo.findById(req.user.id);
    const trip = await groupRepo.upsertTrip(req.params.id, {
      ...req.body,
      dailyPlan: normalizeDailyPlan(req.body.dailyPlan),
      createdBy: req.user.id,
    });
    await groupRepo.addMessage(req.params.id, null, 'system', `${user.nickname || user.username} 更新了群行程`);
    res.json({ success: true, data: trip, message: '行程已保存' });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/trips/ai-generate', requireGroupMember, async (req, res, next) => {
  try {
    const members = await groupRepo.getMembers(req.params.id);
    const preferences = await groupRepo.getPreferences(req.params.id);
    const input = { ...req.body, members: members.map(m => m.user), preferences };
    let suggestion;
    try {
      suggestion = await generateGroupTripSuggestion(input);
    } catch {
      suggestion = buildFallbackTrip(input);
    }
    suggestion.dailyPlan = normalizeDailyPlan(suggestion.dailyPlan);
    res.json({ success: true, data: suggestion });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/trips/route-preview', requireGroupMember, async (req, res, next) => {
  try {
    const { waypointIds, waypoints, mode = 'walking' } = req.body;
    const rawWaypoints = Array.isArray(waypoints)
      ? waypoints
      : (Array.isArray(waypointIds) ? waypointIds.map((spotId) => ({ spotId })) : []);
    if (rawWaypoints.length < 2) {
      return res.status(400).json({ success: false, message: '至少需要 2 个带名称或 spotId 的活动' });
    }
    const orderedSpots = await resolveOrderedRouteSpots(rawWaypoints);
    const segments = [];
    let totalDistance = 0;
    let totalDuration = 0;
    const polyline = [];

    for (let index = 0; index < orderedSpots.length - 1; index += 1) {
      const from = orderedSpots[index];
      const to = orderedSpots[index + 1];
      const route = await amapService.route({
        originLng: from.lng,
        originLat: from.lat,
        destLng: to.lng,
        destLat: to.lat,
        mode,
      });
      totalDistance += Number(route.distance || 0);
      totalDuration += Number(route.duration || 0);
      polyline.push(...(route.polyline || []));
      segments.push({
        from: from.id,
        to: to.id,
        fromName: from.name,
        toName: to.name,
        distance: Number(route.distance || 0),
        duration: Number(route.duration || 0),
        steps: route.steps || [],
        polyline: route.polyline || [],
      });
    }

    res.json({
      success: true,
      data: {
        path: orderedSpots.map((spot) => spot.id),
        order: orderedSpots.map((spot) => spot.id),
        pathSpots: orderedSpots,
        orderSpots: orderedSpots,
        totalCost: totalDistance,
        totalDistance,
        totalDuration,
        segments,
        polyline,
        mode,
        algorithm: 'AMap Web API',
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/preferences', requireGroupMember, async (req, res, next) => {
  try {
    const preferences = await groupRepo.getPreferences(req.params.id);
    res.json({ success: true, data: preferences });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/preferences/me', requireGroupMember, async (req, res, next) => {
  try {
    const preference = await groupRepo.upsertPreference(req.params.id, req.user.id, req.body);
    res.json({ success: true, data: preference, message: '偏好已保存' });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/conflict-analysis', requireGroupMember, async (req, res, next) => {
  try {
    const preferences = await groupRepo.getPreferences(req.params.id);
    const trip = await groupRepo.getTrip(req.params.id);
    const base = buildRuleConflictAnalysis(preferences, trip);
    let ai = null;
    try {
      ai = await analyzeGroupConflictWithAi({
        preferences,
        destination: trip?.destination,
        notes: trip?.notes,
      });
    } catch {
      ai = null;
    }
    res.json({ success: true, data: { ...base, ai } });
  } catch (error) {
    next(error);
  }
});

// Get messages
router.get('/:id/messages', requireGroupMember, async (req, res, next) => {
  try {
    const { before, limit = 50 } = req.query;
    const messages = await groupRepo.getMessages(req.params.id, before, limit);
    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
});

// Send message
router.post('/:id/messages', requireGroupMember, async (req, res, next) => {
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

function buildFallbackTrip(input) {
  const destination = input.destination || '目的地';
  const days = inferDays(input.startDate, input.endDate);
  return {
    title: `${destination}群组旅行计划`,
    notes: '已根据成员偏好生成基础方案，可继续调整活动顺序和负责人。',
    dailyPlan: Array.from({ length: days }, (_, index) => ({
      day: index + 1,
      date: '',
      activities: [
        { time: '09:00', type: '景点', name: `${destination}核心景点`, description: '安排轻松游览，照顾不同体力成员。', cost: '', status: '待定' },
        { time: '12:00', type: '美食', name: '本地特色餐厅', description: '优先选择多菜系、方便协商的餐厅。', cost: '', status: '待定' },
        { time: '15:00', type: '休息', name: '自由活动与休整', description: '给拍照、购物和休息留出弹性时间。', cost: '', status: '待定' },
      ],
    })),
  };
}

async function resolveOrderedRouteSpots(waypoints) {
  const items = waypoints.map((item, index) => (typeof item === 'object' ? { ...item, index } : { spotId: item, index }));
  const ids = items.map((item) => Number(item.spotId)).filter(Number.isFinite);
  const uniqueIds = [...new Set(ids)];
  const spots = await spotRepo.findByIds(uniqueIds);
  const spotMap = new Map(spots.map((spot) => [spot.id, spot]));
  const ordered = items.map((item) => {
    const spotId = Number(item.spotId);
    if (Number.isFinite(spotId)) return spotMap.get(spotId);
    return {
      id: `amap-${item.index}`,
      name: item.name || `途经点${item.index + 1}`,
      city: item.city || '',
      lat: item.lat,
      lng: item.lng,
    };
  });

  const resolved = [];
  for (const [index, spot] of ordered.entries()) {
    if (!spot) {
      const error = new Error(`景点不存在：${items[index].spotId}`);
      error.statusCode = 400;
      throw error;
    }
    let next = { ...spot };
    if (!Number.isFinite(Number(next.lng)) || !Number.isFinite(Number(next.lat))) {
      const geocoded = await amapService.geocode(`${next.city || ''}${next.name}`, next.city);
      if (geocoded?.location) {
        next.lng = geocoded.location.lng;
        next.lat = geocoded.location.lat;
      }
    }
    if (!Number.isFinite(Number(next.lng)) || !Number.isFinite(Number(next.lat))) {
      const error = new Error(`景点缺少经纬度，无法调用高德路线：${next.name}`);
      error.statusCode = 400;
      throw error;
    }
    resolved.push(next);
  }
  return resolved;
}

function inferDays(startDate, endDate) {
  if (!startDate || !endDate) return 2;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1;
  return Math.max(1, Math.min(7, Number.isFinite(diff) ? diff : 2));
}

function buildRuleConflictAnalysis(preferences, trip) {
  const dimensions = [
    ['budgetLevel', '预算'],
    ['staminaLevel', '体力'],
    ['paceLevel', '节奏'],
    ['photoLevel', '拍照'],
  ].map(([key, label]) => {
    const values = preferences.map(p => Number(p[key] || 3));
    const min = values.length ? Math.min(...values) : 3;
    const max = values.length ? Math.max(...values) : 3;
    const avg = values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 3;
    return { key, label, min, max, avg: Number(avg.toFixed(1)), conflict: max - min };
  });
  const maxConflict = Math.max(0, ...dimensions.map(item => item.conflict));
  const riskLevel = maxConflict >= 3 ? '高' : maxConflict >= 2 ? '中' : '低';
  const suggestions = [];
  if (dimensions.find(d => d.key === 'budgetLevel')?.conflict >= 2) suggestions.push('预算差异较大，建议保留免费景点，并把付费项目设为可选活动。');
  if (dimensions.find(d => d.key === 'staminaLevel')?.conflict >= 2) suggestions.push('体力差异较大，建议上午集中游玩，下午安排休息点或自由活动。');
  if (dimensions.find(d => d.key === 'paceLevel')?.conflict >= 2) suggestions.push('节奏偏好不一致，建议设置固定集合点，允许部分成员短时分流。');
  if (dimensions.find(d => d.key === 'photoLevel')?.conflict >= 2) suggestions.push('拍照偏好不同，建议为热门机位预留 20-30 分钟，不影响主路线推进。');
  const diets = new Set(preferences.map(p => `${p.foodPreference || ''}${p.dietaryRestrictions || ''}`).filter(Boolean));
  if (diets.size >= 3) suggestions.push('饮食偏好多样，建议优先选择美食街、商圈或多菜系餐厅。');
  if (suggestions.length === 0) suggestions.push('当前偏好较一致，可以直接围绕共同目标优化路线顺序。');
  return {
    riskLevel,
    consistencyScore: Math.max(0, 100 - maxConflict * 22 - Math.max(0, diets.size - 1) * 5),
    dimensions,
    suggestions,
    splitPlan: riskLevel === '高' ? '建议安排 1 个分流时段：高体力成员探索延伸景点，轻松成员休息或拍照，晚餐前汇合。' : '暂不需要明显分流，保留弹性休息时间即可。',
    destination: trip?.destination || '',
  };
}

module.exports = router;
