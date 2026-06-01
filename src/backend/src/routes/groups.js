const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const groupRepo = require('../repositories/groupRepository');
const userRepo = require('../repositories/userRepository');
const spotRepo = require('../repositories/spotRepository');
const { generateGroupTripSuggestion, analyzeGroupConflictWithAi, generateGroupChatReply } = require('../services/diaryAiService');
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
    const [actor, target] = await Promise.all([
      userRepo.findById(req.user.id),
      userRepo.findById(req.params.userId),
    ]);
    const roleLabel = { admin: '管理员', editor: '编辑者', member: '成员' }[role] || role;
    await groupRepo.addMessage(
      req.params.id,
      null,
      'system',
      `${actor?.nickname || actor?.username || '管理员'} 将 ${target?.nickname || target?.username || '成员'} 的角色调整为${roleLabel}`
    );
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
    const { waypointIds, waypoints, mode = 'smart' } = req.body;
    const rawWaypoints = Array.isArray(waypoints)
      ? waypoints
      : (Array.isArray(waypointIds) ? waypointIds.map((spotId) => ({ spotId })) : []);
    if (rawWaypoints.length < 2) {
      return res.status(400).json({ success: false, message: '至少需要 2 个带名称或 spotId 的活动' });
    }
    const orderedSpots = await resolveOrderedRouteSpots(rawWaypoints);
    const weatherProfile = await getRouteWeatherProfile(req.group, await groupRepo.getTrip(req.params.id));
    const segments = [];
    let totalDistance = 0;
    let totalDuration = 0;
    const polyline = [];
    const routeAdvice = [];

    for (let index = 0; index < orderedSpots.length - 1; index += 1) {
      const from = orderedSpots[index];
      const to = orderedSpots[index + 1];
      const straightDistance = distanceMeters(from, to);
      if (straightDistance < 8) {
        segments.push({
          from: from.id,
          to: to.id,
          fromName: from.name,
          toName: to.name,
          mode: 'walking',
          distance: 0,
          duration: 0,
          steps: [{ instruction: '同一地点附近活动，无需额外导航', distance: 0, duration: 0 }],
          polyline: [],
        });
        continue;
      }
      const segmentMode = chooseRouteMode(mode, straightDistance, weatherProfile);
      if (mode === 'smart' && segmentMode !== 'walking') {
        routeAdvice.push(`${from.name} 到 ${to.name} 直线距离约 ${formatKm(straightDistance)}，${weatherProfile.reason || '距离较远'}，不建议步行，已改用${routeModeLabel(segmentMode)}。`);
      }
      await sleep(260);
      const route = await amapService.route({
        originLng: from.lng,
        originLat: from.lat,
        destLng: to.lng,
        destLat: to.lat,
        mode: segmentMode,
      });
      totalDistance += Number(route.distance || 0);
      totalDuration += Number(route.duration || 0);
      polyline.push(...(route.polyline || []));
      segments.push({
        from: from.id,
        to: to.id,
        fromName: from.name,
        toName: to.name,
        mode: segmentMode,
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
        effectiveMode: summarizeEffectiveMode(segments),
        routeAdvice,
        weatherRouteHint: weatherProfile.hint,
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
    const user = await userRepo.findById(req.user.id);
    await groupRepo.addMessage(
      req.params.id,
      null,
      'system',
      `${user?.nickname || user?.username || '成员'} 更新了旅行偏好`
    );
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

router.get('/:id/weather-advisory', requireGroupMember, async (req, res, next) => {
  try {
    const trip = await groupRepo.getTrip(req.params.id);
    const city = inferWeatherCity(trip, req.group);
    const weather = await amapService.weather(city);
    const advisory = buildWeatherAdvisory(weather, trip, city);
    await maybePushWeatherSystemMessage(req.params.id, advisory);
    res.json({ success: true, data: advisory });
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
    const text = content.trim();
    const msg = await groupRepo.addMessage(req.params.id, req.user.id, 'text', text);
    const aiMessage = mentionsGroupAi(text)
      ? await createGroupAiReply(req.params.id, req.group, req.user, text)
      : null;
    res.json({ success: true, data: msg, aiMessage, message: '发送成功' });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/polls', requireGroupMember, async (req, res, next) => {
  try {
    const polls = await groupRepo.getPolls(req.params.id);
    res.json({ success: true, data: polls });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/polls', requireGroupMember, async (req, res, next) => {
  try {
    const { title, options } = req.body;
    if (!title?.trim()) return res.status(400).json({ success: false, message: '投票标题不能为空' });
    const poll = await groupRepo.createPoll(req.params.id, req.user.id, { title, options });
    await groupRepo.addMessage(req.params.id, req.user.id, 'poll', JSON.stringify({ pollId: poll.id }));
    const user = await userRepo.findById(req.user.id);
    await groupRepo.addMessage(req.params.id, null, 'system', `${user?.nickname || user?.username || '成员'} 发起了投票：${poll.title}`);
    res.status(201).json({ success: true, data: poll, message: '投票已创建' });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/polls/:pollId/vote', requireGroupMember, async (req, res, next) => {
  try {
    const poll = await groupRepo.votePoll(req.params.id, req.params.pollId, req.user.id, req.body.optionIndex);
    if (!poll) return res.status(404).json({ success: false, message: '投票不存在' });
    await maybeCreatePollDecisionAction(req.params.id, poll);
    res.json({ success: true, data: poll, message: '投票已记录' });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/ai-actions/:messageId/apply', requireGroupMember, async (req, res, next) => {
  try {
    if (!canEditGroupTrip(req.groupMember)) {
      return res.status(403).json({ success: false, message: '只有管理员或编辑者可以应用 AI 行程修改' });
    }
    const message = await groupRepo.getMessageById(req.params.id, req.params.messageId);
    if (!message || message.type !== 'ai_action') {
      return res.status(404).json({ success: false, message: 'AI 操作卡片不存在' });
    }
    const action = parseAiAction(message.content);
    const trip = await groupRepo.getTrip(req.params.id);
    if (!trip) return res.status(400).json({ success: false, message: '请先创建行程' });
    const nextTrip = applyAiActionToTrip(trip, action, req.user.id);
    const updated = await groupRepo.upsertTrip(req.params.id, {
      ...nextTrip,
      dailyPlan: normalizeDailyPlan(nextTrip.dailyPlan),
      createdBy: nextTrip.createdBy || req.user.id,
    });
    const user = await userRepo.findById(req.user.id);
    await groupRepo.addMessage(req.params.id, null, 'system', `${user?.nickname || user?.username || '成员'} 应用了 AI 建议：${action.title}`);
    res.json({ success: true, data: updated, message: action.successMessage || '已应用 AI 建议' });
  } catch (error) {
    next(error);
  }
});

function canEditGroupTrip(member) {
  return ['admin', 'editor'].includes(member?.role);
}

async function maybeCreatePollDecisionAction(groupId, poll) {
  const decision = getPollDecision(poll);
  if (!decision) return null;
  const recentMessages = await groupRepo.getMessages(groupId, null, 40);
  const exists = recentMessages.some((message) => {
    if (message.type !== 'ai_action') return false;
    try {
      const action = JSON.parse(message.content);
      return Number(action.source?.pollId) === poll.id && action.source?.option === decision.option;
    } catch {
      return false;
    }
  });
  if (exists) return null;
  const action = buildPollDecisionAction(poll, decision);
  if (!action) return null;
  await groupRepo.addMessage(groupId, null, 'ai_action', JSON.stringify(action));
  await groupRepo.addMessage(groupId, null, 'system', `投票“${poll.title}”当前由“${decision.option}”领先，已生成可应用的行程变更卡片`);
  return action;
}

function getPollDecision(poll) {
  const counts = poll.counts || [];
  const totalVotes = Number(poll.totalVotes || 0);
  if (totalVotes <= 0 || counts.length === 0) return null;
  const maxCount = Math.max(...counts);
  const leaders = counts.map((count, index) => ({ count, index })).filter((item) => item.count === maxCount);
  if (leaders.length !== 1) return null;
  const memberCount = Math.max(totalVotes, 1);
  const overHalf = maxCount >= Math.floor(memberCount / 2) + 1;
  const clearLead = totalVotes >= 2 && maxCount > Math.max(0, ...counts.filter((count) => count !== maxCount));
  if (!overHalf && !clearLead) return null;
  const index = leaders[0].index;
  return { optionIndex: index, option: poll.options[index], count: maxCount, totalVotes };
}

function buildPollDecisionAction(poll, decision) {
  const text = `${poll.title} ${decision.option}`;
  const source = { pollId: poll.id, option: decision.option, votes: decision.count };
  if (/打车|驾车|出租|网约车/.test(text)) {
    return buildTransportAction(poll, decision, '打车', source);
  }
  if (/公交|地铁|公共交通/.test(text)) {
    return buildTransportAction(poll, decision, '公交/地铁', source);
  }
  if (/步行/.test(text)) {
    return buildTransportAction(poll, decision, '步行', source);
  }
  if (/休息|室内|加入|新增/.test(text)) {
    return {
      action: 'insert_rest_activity',
      title: '根据投票新增休息活动',
      description: `投票“${poll.title}”中“${decision.option}”领先，建议加入室内休息/补给安排。`,
      successMessage: '已根据投票新增休息活动',
      source,
      payload: {
        day: 1,
        time: '12:30',
        type: '休息',
        name: '投票决定：室内休息与补给',
        description: `根据投票“${poll.title}”的结果新增，当前领先选项：${decision.option}。`,
        status: '待定',
      },
    };
  }
  return {
    action: 'append_trip_note',
    title: '根据投票记录行程决策',
    description: `投票“${poll.title}”中“${decision.option}”领先，建议写入行程备注。`,
    successMessage: '已根据投票写入行程备注',
    source,
    payload: { note: `投票决策：${poll.title} -> ${decision.option}（${decision.count}/${decision.totalVotes} 票）` },
  };
}

function buildTransportAction(poll, decision, transport, source) {
  const isReturn = /返程|返回|回去|回程/.test(`${poll.title} ${decision.option}`);
  return {
    action: 'update_transport_activity',
    title: `根据投票调整${isReturn ? '返程' : '交通'}方式`,
    description: `投票“${poll.title}”中“${decision.option}”领先，建议将${isReturn ? '返程' : '相关'}交通调整为${transport}。`,
    successMessage: `已根据投票调整交通方式为${transport}`,
    source,
    payload: {
      keyword: isReturn ? '返回' : '交通',
      transport,
      note: `根据投票“${poll.title}”调整，领先选项：${decision.option}。`,
    },
  };
}

function mentionsGroupAi(content) {
  return /@(?:ai|小迹|助手)(?=$|\s|[，,。.!！?？:：])/i.test(`${content || ''}`);
}

function stripAiMention(content) {
  return `${content || ''}`.replace(/@(?:ai|小迹|助手)(?=$|\s|[，,。.!！?？:：])/ig, '').trim();
}

async function createGroupAiReply(groupId, group, user, content) {
  try {
    const [trip, preferences, recentMessages] = await Promise.all([
      groupRepo.getTrip(groupId),
      groupRepo.getPreferences(groupId),
      groupRepo.getMessages(groupId, null, 16),
    ]);
    let weatherSummary = '';
    try {
      const city = inferWeatherCity(trip, group);
      const weather = await amapService.weather(city);
      const advisory = buildWeatherAdvisory(weather, trip, city);
      weatherSummary = [
        advisory.summary,
        `提醒：${advisory.reminders[0]}`,
        `穿衣：${advisory.clothing[0]}`,
        `行程：${advisory.optimizations[0]}`,
      ].join('；');
    } catch {
      weatherSummary = '';
    }

    const sender = await userRepo.findById(user.id);
    const reply = await generateGroupChatReply({
      groupName: group?.name,
      senderName: sender?.nickname || sender?.username || user.username,
      message: stripAiMention(content) || content,
      trip,
      preferences,
      messages: recentMessages,
      weatherSummary,
    });
    const aiMessage = await groupRepo.addMessage(groupId, null, 'ai', reply);
    const action = buildAiActionCard(content, reply, weatherSummary);
    if (action) await groupRepo.addMessage(groupId, null, 'ai_action', JSON.stringify(action));
    return aiMessage;
  } catch (error) {
    const fallback = '小迹 AI 暂时没连上智能服务，但我已经收到 @。可以先把问题说得更具体一点，比如路线、天气、预算或集合安排。';
    return groupRepo.addMessage(groupId, null, 'ai', fallback);
  }
}

function parseAiAction(content) {
  try {
    return JSON.parse(content);
  } catch {
    const error = new Error('AI 操作卡片格式无效');
    error.statusCode = 400;
    throw error;
  }
}

function buildAiActionCard(userMessage, aiReply, weatherSummary) {
  const text = `${userMessage || ''} ${aiReply || ''}`;
  if (!/(热|雨|风|天气|优化|调整|安排|休息|室内|路线|行程)/.test(text)) return null;
  const note = [
    trimActionText(aiReply, 180),
    weatherSummary ? `参考天气：${trimActionText(weatherSummary, 120)}` : '',
  ].filter(Boolean).join(' ');
  if (/(休息|室内|中午|午餐|热|暴晒|避暑)/.test(text)) {
    return {
      action: 'insert_rest_activity',
      title: '新增室内休息活动',
      description: '在第 1 天中午加入一段室内休息/补给时间，应用后会真实修改行程。',
      successMessage: '已新增室内休息活动',
      payload: {
        day: 1,
        time: '12:30',
        type: '休息',
        name: '室内休息与补给',
        description: note,
        status: '待定',
      },
    };
  }
  return {
    action: 'append_trip_note',
    title: '应用到行程备注',
    description: trimActionText(aiReply, 120),
    successMessage: '已应用到行程备注',
    payload: { note },
  };
}

function trimActionText(value, maxLength) {
  return `${value || ''}`.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function applyAiActionToTrip(trip, action, userId) {
  if (action.action === 'append_trip_note') return applyAiTripNote(trip, action, userId);
  if (action.action === 'insert_rest_activity') return applyAiRestActivity(trip, action, userId);
  if (action.action === 'update_transport_activity') return applyAiTransportActivity(trip, action, userId);
  const error = new Error('暂不支持该 AI 操作');
  error.statusCode = 400;
  throw error;
}

function applyAiTripNote(trip, action, userId) {
  const existingNotes = `${trip.notes || ''}`.trim();
  const note = `${action.payload?.note || action.description || ''}`.trim();
  if (!note) {
    const error = new Error('操作卡片缺少可应用内容');
    error.statusCode = 400;
    throw error;
  }
  return {
    ...trip,
    notes: existingNotes.includes(note)
      ? existingNotes
      : [existingNotes, `AI协作建议：${note}`].filter(Boolean).join('\n'),
    createdBy: trip.createdBy || userId,
  };
}

function applyAiRestActivity(trip, action, userId) {
  const payload = action.payload || {};
  const dayNumber = Number(payload.day || 1);
  const dailyPlan = normalizeDailyPlan(trip.dailyPlan);
  let targetIndex = dailyPlan.findIndex((day) => Number(day.day) === dayNumber);
  if (targetIndex < 0) {
    dailyPlan.push({ day: dayNumber, date: '', activities: [] });
    targetIndex = dailyPlan.length - 1;
  }
  const targetDay = dailyPlan[targetIndex];
  const activity = {
    id: `ai-rest-${Date.now()}`,
    time: payload.time || '12:30',
    type: payload.type || '休息',
    name: payload.name || '室内休息与补给',
    description: payload.description || action.description || '',
    cost: payload.cost || '',
    ownerId: payload.ownerId || '',
    status: payload.status || '待定',
    notes: payload.notes || '由 AI 操作卡片应用',
  };
  const exists = (targetDay.activities || []).some((item) => item.name === activity.name && item.time === activity.time);
  const activities = exists
    ? targetDay.activities
    : [...(targetDay.activities || []), activity].sort((a, b) => `${a.time || '99:99'}`.localeCompare(`${b.time || '99:99'}`));
  dailyPlan[targetIndex] = { ...targetDay, activities };
  dailyPlan.sort((a, b) => Number(a.day || 0) - Number(b.day || 0));
  return {
    ...trip,
    dailyPlan,
    createdBy: trip.createdBy || userId,
  };
}

function applyAiTransportActivity(trip, action, userId) {
  const payload = action.payload || {};
  const keyword = `${payload.keyword || '交通'}`;
  const transport = `${payload.transport || '交通'}`;
  const dailyPlan = normalizeDailyPlan(trip.dailyPlan);
  let updated = false;
  const nextPlan = dailyPlan.map((day) => ({
    ...day,
    activities: (day.activities || []).map((activity) => {
      const haystack = `${activity.type || ''} ${activity.name || ''} ${activity.description || ''}`;
      const matches = /交通/.test(`${activity.type || ''}`) && (haystack.includes(keyword) || (keyword === '交通' && !updated));
      if (!matches || updated) return activity;
      updated = true;
      const suffix = `（${transport}）`;
      const name = `${activity.name || '交通安排'}`.includes(transport) ? activity.name : `${activity.name || '交通安排'}${suffix}`;
      const description = `${activity.description || ''}`.includes(payload.note || '')
        ? activity.description
        : [activity.description, payload.note || `根据投票调整为${transport}`].filter(Boolean).join(' ');
      return {
        ...activity,
        name,
        description,
        notes: [activity.notes, `交通方式：${transport}`].filter(Boolean).join('；'),
      };
    }),
  }));
  if (!updated) return applyAiTripNote(trip, {
    payload: { note: payload.note || `根据投票将交通方式调整为${transport}` },
  }, userId);
  return {
    ...trip,
    dailyPlan: nextPlan,
    createdBy: trip.createdBy || userId,
  };
}

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

  const resolved = [];
  for (const item of items) {
    const spotId = Number(item.spotId);
    const dbSpot = Number.isFinite(spotId) ? spotMap.get(spotId) : null;
    const base = dbSpot || {
      id: `amap-${item.index}`,
      name: item.name || `途经点${item.index + 1}`,
      city: normalizeAmapCity(item.city),
      lat: item.lat,
      lng: item.lng,
    };
    resolved.push(await resolveAmapWaypoint(base, item, resolved.at(-1)));
  }
  return resolved;
}

async function resolveAmapWaypoint(base, item, previous) {
  const next = { ...base, originalName: item.name || base.name };
  if (Number.isFinite(Number(next.lng)) && Number.isFinite(Number(next.lat))) return next;
  if (previous && isNearbyActivityName(item.name || next.name)) {
    return {
      ...next,
      name: `${previous.name}附近`,
      correctedName: previous.name,
      lng: previous.lng,
      lat: previous.lat,
      fallbackReason: 'Nearby/rest/meal activity reused previous resolved point',
    };
  }

  const candidates = buildAmapNameCandidates(item.name || next.name, previous?.name);
  for (const keyword of candidates) {
    const geocoded = await geocodeSafely(keyword, next.city);
    if (geocoded?.location) {
      const candidate = {
        lat: geocoded.location.lat,
        lng: geocoded.location.lng,
      };
      if (previous && !item.spotId && distanceMeters(previous, candidate) > 80000) continue;
      return {
        ...next,
        name: geocoded.name || keyword,
        correctedName: keyword,
        formattedAddress: geocoded.formattedAddress,
        city: geocoded.city || next.city,
        lng: geocoded.location.lng,
        lat: geocoded.location.lat,
      };
    }
  }

  if (previous) {
    return {
      ...next,
      name: `${previous.name}附近`,
      correctedName: previous.name,
      lng: previous.lng,
      lat: previous.lat,
      fallbackReason: 'AMap geocode failed, reused previous resolved point',
    };
  }

  const error = new Error(`高德未找到可用地点：${item.name || item.spotId || next.name}`);
  error.statusCode = 400;
  throw error;
}

async function geocodeSafely(keyword, city) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await sleep(attempt === 0 ? 180 : 520);
      return await amapService.geocode(keyword, city);
    } catch (error) {
      if (!`${error.message || ''}`.includes('CUQPS')) return null;
    }
  }
  return null;
}

function buildAmapNameCandidates(name, previousName) {
  const raw = `${name || ''}`.trim();
  const hasTripWords = /从|返回|前往|出发|附近|周边|午餐|晚餐|早餐|用餐|休息|自由活动/.test(raw);
  const cleaned = raw
    .replace(/^从/, '')
    .replace(/出发$/, '')
    .replace(/^返回/, '')
    .replace(/^前往/, '')
    .replace(/附近.*$/, '')
    .replace(/周边.*$/, '')
    .replace(/内休息$/, '')
    .replace(/休息$/, '')
    .replace(/午餐|晚餐|早餐|用餐|自由活动/g, '')
    .trim();
  const parts = raw.split(/[\/／,，、|]/).map((part) => part.trim()).filter(Boolean);
  const candidates = hasTripWords
    ? [cleaned, previousName, ...parts, raw]
    : [raw, cleaned, ...parts, previousName];
  return [...new Set(candidates.filter((item) => item && item.length >= 2))];
}

function normalizeAmapCity(city) {
  const value = `${city || ''}`.trim();
  if (!value) return '';
  if (/北京|上海|天津|重庆|.+市$|.+省$|.+自治区$/.test(value)) return value;
  return '';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNearbyActivityName(name) {
  return /附近|周边|午餐|晚餐|早餐|用餐|休息|自由活动/.test(`${name || ''}`);
}

function distanceMeters(a, b) {
  const lat1 = Number(a.lat);
  const lng1 = Number(a.lng);
  const lat2 = Number(b.lat);
  const lng2 = Number(b.lng);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return Infinity;
  const toRad = (value) => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const p1 = toRad(lat1);
  const p2 = toRad(lat2);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

async function getRouteWeatherProfile(group, trip) {
  try {
    const city = inferWeatherCity(trip, group);
    const weather = await amapService.weather(city);
    const temp = Number(weather?.temperature);
    const condition = `${weather?.weather || ''}`;
    const windLevel = Number((`${weather?.windPower || ''}`.match(/\d+/) || [0])[0]);
    const harsh = /雨|雪|雷|暴雨|阵雨|雾|霾|沙尘/.test(condition) || temp >= 28 || temp <= 5 || windLevel >= 4;
    const reason = /雨|雪|雷|暴雨|阵雨/.test(condition)
      ? '天气有降水'
      : temp >= 28
        ? '天气偏热'
        : windLevel >= 4
          ? '风力偏大'
          : temp <= 5
            ? '气温较低'
            : harsh
              ? '天气不适合长时间步行'
              : '距离较远';
    return {
      harsh,
      reason,
      hint: `${city}${condition || '天气'}${Number.isFinite(temp) ? `，${temp}℃` : ''}${windLevel ? `，风力${windLevel}级` : ''}`,
    };
  } catch {
    return { harsh: false, reason: '距离较远', hint: '' };
  }
}

function chooseRouteMode(requestedMode, straightDistance, weatherProfile = {}) {
  if (requestedMode && requestedMode !== 'smart') return requestedMode;
  const walkingLimit = weatherProfile.harsh ? 700 : 1200;
  const cyclingLimit = weatherProfile.harsh ? 3000 : 5000;
  if (straightDistance <= walkingLimit) return 'walking';
  if (straightDistance <= cyclingLimit) return 'cycling';
  return 'driving';
}

function summarizeEffectiveMode(segments) {
  const modes = [...new Set((segments || []).map((segment) => segment.mode).filter(Boolean))];
  if (modes.length === 0) return 'walking';
  return modes.length === 1 ? modes[0] : 'mixed';
}

function routeModeLabel(mode) {
  return ({ walking: '步行', cycling: '骑行', driving: '驾车', transit: '公交', mixed: '混合交通' })[mode] || mode;
}

function formatKm(meters) {
  return `${(Number(meters || 0) / 1000).toFixed(1)} km`;
}

function inferWeatherCity(trip, group) {
  const text = [
    trip?.destination,
    trip?.departure,
    group?.name,
    ...(trip?.dailyPlan || []).flatMap((day) => (day.activities || []).map((act) => act.name)),
  ].filter(Boolean).join(' ');
  const directCity = text.match(/(北京|上海|天津|重庆|广州|深圳|杭州|南京|成都|武汉|西安|苏州|青岛|厦门|长沙|郑州|济南|福州|昆明|三亚|哈尔滨|沈阳|大连)/);
  if (directCity) return directCity[1];
  const citySuffix = text.match(/([\u4e00-\u9fa5]{2,8}市)/);
  if (citySuffix) return citySuffix[1];
  return '北京';
}

function buildWeatherAdvisory(weather, trip, city) {
  const temp = Number(weather?.temperature);
  const windPower = `${weather?.windPower || ''}`;
  const condition = `${weather?.weather || ''}`;
  const reminders = [];
  const clothing = [];
  const optimizations = [];

  if (/雨|雪|雷|阵雨|暴雨/.test(condition)) {
    reminders.push('可能有降水，出门前确认雨具和防滑鞋。');
    optimizations.push('把露天拍照点改到天气窗口期，室内展馆和餐饮点提前排入备选。');
  }
  if (/雾|霾|沙尘/.test(condition)) {
    reminders.push('能见度或空气质量可能受影响，长距离步行建议减少。');
    optimizations.push('减少户外停留，把集合点设在交通便利、可避风的地点。');
  }
  if (Number.isFinite(temp)) {
    if (temp <= 5) clothing.push('气温较低，建议羽绒服/厚外套、围巾和保暖鞋。');
    else if (temp <= 12) clothing.push('建议穿外套或冲锋衣，早晚注意保暖。');
    else if (temp <= 22) clothing.push('适合分层穿搭，薄外套方便根据体感增减。');
    else if (temp >= 28) {
      clothing.push('天气偏热，建议短袖透气衣物、防晒帽和补水。');
      reminders.push('注意防晒和补水，避免连续暴晒。');
      optimizations.push('中午安排室内休息或餐饮，把高强度步行放到上午/傍晚。');
    } else {
      clothing.push('体感较舒适，轻便衣物加薄外套即可。');
    }
  }
  const windLevel = Number((windPower.match(/\d+/) || [0])[0]);
  if (windLevel >= 4) {
    reminders.push(`当前风力约 ${windPower} 级，注意帽子、伞具和高处拍照安全。`);
    clothing.push('建议选择防风外套，避免过于宽松的衣物。');
  }
  if (reminders.length === 0) reminders.push('天气整体可控，按原计划出行即可，仍建议出发前复查实时天气。');
  if (optimizations.length === 0) optimizations.push('保持当前路线，给集合、排队和拍照预留 15-20 分钟弹性时间。');

  return {
    city,
    weather,
    reminders,
    clothing,
    optimizations,
    summary: `${city}${condition || '天气'}，${Number.isFinite(temp) ? `${temp}℃，` : ''}${weather?.windDirection || ''}${windPower ? `${windPower}级` : ''}`,
    signature: `${city}|${condition}|${weather?.temperature}|${windPower}|${weather?.reportTime || ''}`,
    tripDestination: trip?.destination || '',
  };
}

async function maybePushWeatherSystemMessage(groupId, advisory) {
  const recentMessages = await groupRepo.getMessages(groupId, null, 30);
  const marker = `天气提醒｜${advisory.summary}`;
  if (recentMessages.some((message) => message.type === 'system' && message.content?.includes(marker))) return;
  const content = `${marker}。提醒：${advisory.reminders[0]} 穿衣：${advisory.clothing[0]} 行程：${advisory.optimizations[0]}`;
  await groupRepo.addMessage(groupId, null, 'system', content);
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
