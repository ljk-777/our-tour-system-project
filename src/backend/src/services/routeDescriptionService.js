const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-chat';

function getRouteAiConfig() {
  const apiKey = process.env.ROUTE_AI_API_KEY
    || process.env.DEEPSEEK_API_KEY
    || process.env.OPENAI_API_KEY
    || process.env.DIARY_AI_API_KEY;

  if (!apiKey) return null;

  return {
    apiKey,
    baseUrl: process.env.ROUTE_AI_BASE_URL || process.env.DIARY_AI_BASE_URL || DEFAULT_BASE_URL,
    model: process.env.ROUTE_AI_MODEL || process.env.DIARY_AI_MODEL || DEFAULT_MODEL,
  };
}

function cleanText(value, maxLength = 120) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function normalizeStep(step = {}, index) {
  return {
    order: Number(step.order || index + 1),
    from: cleanText(step.from || step.fromName || '当前位置'),
    to: cleanText(step.to || step.toName || '目标点'),
    floor: cleanText(step.floor || ''),
    transport: cleanText(step.transport || 'walk'),
    distance: Math.max(0, Math.round(Number(step.distance ?? step.dist ?? 0))),
    seconds: Math.max(0, Math.round(Number(step.seconds ?? 0))),
    minutes: Math.max(0, Number(step.minutes ?? step.time ?? 0)),
    note: cleanText(step.note || '', 200),
  };
}

function normalizePayload(input = {}) {
  const steps = Array.isArray(input.steps) ? input.steps.map(normalizeStep).slice(0, 24) : [];
  return {
    scene: cleanText(input.scene || 'outdoor'),
    mapName: cleanText(input.mapName || input.building || '当前地图'),
    strategy: cleanText(input.strategy || '最短路径'),
    start: cleanText(input.start || steps[0]?.from || '当前位置'),
    end: cleanText(input.end || steps.at(-1)?.to || '目标点'),
    distance: Math.max(0, Math.round(Number(input.distance || steps.reduce((sum, step) => sum + step.distance, 0)))),
    seconds: Math.max(0, Math.round(Number(input.seconds || 0))),
    minutes: Math.max(0, Number(input.minutes || input.time || 0)),
    steps,
  };
}

function transportLabel(transport) {
  return ({
    walk: '步行',
    bike: '骑行',
    cart: '电瓶车',
    elevator: '电梯',
    stair: '楼梯',
    indoor: '室内步行',
  })[transport] || transport || '步行';
}

function formatDuration({ seconds, minutes }) {
  if (seconds > 0) {
    if (seconds < 60) return `${seconds}秒`;
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return sec > 0 ? `${min}分${sec}秒` : `${min}分钟`;
  }
  if (minutes > 0 && minutes < 1) return `${Math.round(minutes * 60)}秒`;
  if (minutes > 0) return `${Math.round(minutes)}分钟`;
  return '较短时间';
}

function buildFallbackDescription(route) {
  if (!route.steps.length) {
    return `暂未找到从 ${route.start} 到 ${route.end} 的可达路径，请更换起终点或路线策略。`;
  }

  const lines = [
    `从 ${route.start} 出发，前往 ${route.end}。全程约 ${route.distance} 米，预计 ${formatDuration(route)}，采用${route.strategy}策略。`,
  ];

  route.steps.slice(0, 8).forEach((step, index) => {
    const location = step.floor ? `在 ${step.floor}，` : '';
    const duration = formatDuration(step);
    lines.push(`${index + 1}. ${location}从 ${step.from} 到 ${step.to}，${transportLabel(step.transport)}约 ${step.distance} 米，预计 ${duration}。${step.note || ''}`);
  });

  if (route.steps.length > 8) {
    lines.push(`后续还有 ${route.steps.length - 8} 段，请按地图蓝色路线继续前进。`);
  }

  return lines.join('\n');
}

function buildPrompt(route) {
  return [
    '你是一个校园/景区导航讲解助手。',
    '请只根据给定路径数据生成中文导航说明，不要重新规划路线，不要编造不存在的道路或地点。',
    '输出要求：',
    '1. 口语化、清楚、适合直接展示给用户。',
    '2. 说明起点、终点、总距离、预计时间。',
    '3. 分步骤描述路线，室内路线要明确楼层、楼梯/电梯、房间或设施。',
    '4. 如果步骤 note 写了方向，例如“先向东，再向北一点”，必须优先采用该方向，不要按直线自行推断。',
    '5. 控制在 120 到 260 个中文字符之间。',
    '',
    JSON.stringify(route, null, 2),
  ].join('\n');
}

async function requestRouteAi(route) {
  const config = getRouteAiConfig();
  if (!config) return null;

  const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: '你是严谨的中文路线导航讲解助手，只解释用户给定的路径数据。' },
        { role: 'user', content: buildPrompt(route) },
      ],
      temperature: 0.35,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const error = new Error(`路线描述 API 调用失败：${response.status}${detail ? ` ${detail.slice(0, 160)}` : ''}`);
    error.statusCode = 502;
    throw error;
  }

  const payload = await response.json();
  return payload?.choices?.[0]?.message?.content?.trim() || null;
}

async function describeRoute(input) {
  const route = normalizePayload(input);
  const fallback = buildFallbackDescription(route);

  try {
    const aiText = await requestRouteAi(route);
    return {
      description: aiText || fallback,
      source: aiText ? 'api' : 'template',
      fallback,
    };
  } catch (error) {
    return {
      description: fallback,
      source: 'template',
      warning: error.message,
      fallback,
    };
  }
}

module.exports = {
  describeRoute,
};
