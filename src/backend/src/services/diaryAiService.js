const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-chat';
const DEFAULT_AIGC_MODEL = 'gpt-5.5';

function getConfig() {
  const apiKey = process.env.DIARY_AI_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error('日记 AI 生成服务未配置，请设置 DIARY_AI_API_KEY');
    error.statusCode = 503;
    throw error;
  }

  return {
    apiKey,
    baseUrl: process.env.DIARY_AI_BASE_URL || DEFAULT_BASE_URL,
    model: process.env.DIARY_AI_MODEL || DEFAULT_MODEL,
  };
}

function trimText(value, maxLength) {
  return `${value || ''}`.trim().slice(0, maxLength);
}

function buildPrompt(input) {
  const title = trimText(input.title, 80);
  const spotName = trimText(input.spotName, 80);
  const notes = trimText(input.notes || input.content, 1000);
  const tags = Array.isArray(input.tags) ? input.tags.join('、') : trimText(input.tags, 120);

  return [
    '请根据用户当前输入的旅行草稿，润色并适度扩写成一篇适合发布在旅游系统里的中文旅行日记正文。',
    '要求：',
    '1. 只输出正文，不要输出标题、Markdown 标记或解释。',
    '2. 以“用户输入”为主体进行润色，保留原意和关键细节，可以补充自然衔接、感受和画面描写。',
    '3. 结合标题、地点、天气、心情和评分来调整语气，但不要把它们写成表格或清单。',
    '4. 如果填写了地点，正文必须自然出现该地点，并围绕该地点展开，不要改成其他景区或城市。',
    '5. 不要编造具体票价、交通时间、店铺、演出、河流、船只等用户没有提供的事实。',
    '6. 如果用户输入很短，可以适度扩写；如果用户输入已经完整，以润色语句和增强表达为主。',
    '7. 控制在 180 到 320 个中文字符之间，分 2 到 3 个自然段。',
    '',
    `标题：${title || '未填写'}`,
    `地点：${spotName || '未填写'}`,
    `天气：${trimText(input.weather, 20) || '未填写'}`,
    `心情：${trimText(input.mood, 20) || '未填写'}`,
    `评分：${input.rating || '未填写'} 星`,
    `标签：${tags || '未填写'}`,
    `用户输入：${notes || '未填写'}`,
  ].join('\n');
}

function getAigcConfig() {
  const apiKey = process.env.AIGC_API_KEY
    || process.env.DIARY_AIGC_API_KEY
    || process.env.DIARY_AI_API_KEY
    || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error('AIGC 短片脚本服务未配置，请设置 AIGC_API_KEY');
    error.statusCode = 503;
    throw error;
  }

  return {
    apiKey,
    baseUrl: process.env.AIGC_BASE_URL || process.env.DIARY_AI_BASE_URL || DEFAULT_BASE_URL,
    model: process.env.AIGC_MODEL || process.env.DIARY_AIGC_MODEL || DEFAULT_AIGC_MODEL,
    wireApi: process.env.AIGC_WIRE_API || 'responses',
    disableStorage: `${process.env.AIGC_DISABLE_RESPONSE_STORAGE || ''}`.toLowerCase() === 'true',
  };
}

async function requestCompletion({ apiKey, baseUrl, model }, prompt, temperature = 0.75, systemContent) {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemContent || '你是一位擅长中文旅行日记写作的助手，必须严格依据用户提供的素材写作。' },
        { role: 'user', content: prompt },
      ],
      temperature,
      max_tokens: 600,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const error = new Error(`日记 AI 生成失败：${response.status}${detail ? ` ${detail.slice(0, 160)}` : ''}`);
    error.statusCode = 502;
    throw error;
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    const error = new Error('日记 AI 未返回有效文案');
    error.statusCode = 502;
    throw error;
  }

  return content;
}

function missesRequiredSpot(content, input) {
  const spotName = trimText(input.spotName, 80);
  return Boolean(spotName && content && !content.includes(spotName));
}

async function generateDiaryDraft(input) {
  const { apiKey, baseUrl, model } = getConfig();
  const config = { apiKey, baseUrl, model };
  const prompt = buildPrompt(input);
  const content = await requestCompletion(config, prompt);

  if (!missesRequiredSpot(content, input)) {
    return content;
  }

  const spotName = trimText(input.spotName, 80);
  return requestCompletion(
    config,
    `${prompt}\n\n上一版没有围绕“${spotName}”写作，不合格。请重写，正文必须自然出现“${spotName}”，且不要出现其他未提供的景点或城市。`,
    0.25,
  );
}

function getApiUrl(baseUrl, path) {
  const normalized = baseUrl.replace(/\/$/, '');
  if (normalized.endsWith('/v1')) return `${normalized}${path}`;
  return `${normalized}/v1${path}`;
}

function extractResponsesText(payload) {
  if (payload?.output_text) return payload.output_text.trim();
  const parts = [];
  (payload?.output || []).forEach((item) => {
    (item?.content || []).forEach((content) => {
      if (content?.text) parts.push(content.text);
      if (content?.type === 'output_text' && content?.text) parts.push(content.text);
    });
  });
  return parts.join('\n').trim();
}

async function requestResponses(config, prompt, images = []) {
  const content = [
    { type: 'input_text', text: prompt },
    ...images.slice(0, 6).map((image) => ({ type: 'input_image', image_url: image })),
  ];

  const body = {
    model: config.model,
    input: [{ role: 'user', content }],
    temperature: 0.45,
    max_output_tokens: 1400,
  };
  if (config.disableStorage) body.store = false;

  const response = await fetch(getApiUrl(config.baseUrl, '/responses'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const error = new Error(`AIGC 脚本生成失败：${response.status}${detail ? ` ${detail.slice(0, 180)}` : ''}`);
    error.statusCode = 502;
    throw error;
  }

  const payload = await response.json();
  const text = extractResponsesText(payload);
  if (!text) {
    const error = new Error('AIGC 模型未返回有效脚本');
    error.statusCode = 502;
    throw error;
  }
  return text;
}

function buildVideoScriptPrompt(input) {
  const imageCount = Math.max(1, Math.min(Number(input.imageCount) || 1, 9));
  return [
    '你是旅游短片 AIGC 导演。请根据日记信息和上传图片，生成适合本地 Canvas 短片生成器使用的中文 JSON 分镜脚本。',
    '只输出 JSON，不要 Markdown，不要解释。',
    'JSON 格式必须为：',
    '{"title":"...","style":"campus|landscape|architecture|night","intro":"...","outro":"...","voiceover":"...","shots":[{"caption":"...","motion":"push|pull|panLeft|panRight|tiltUp|float","prompt":"...","visualTags":["..."]}]}',
    `shots 数量必须正好是 ${imageCount} 个，每个 caption 控制在 12 到 28 个中文字符。`,
    'style 必须从 campus、landscape、architecture、night 中选择一个。',
    'motion 只能从 push、pull、panLeft、panRight、tiltUp、float 中选择。',
    '如果图片可见，请结合图片主体生成字幕；如果无法识图，则严格依据日记文字生成，不要编造具体事实。',
    'prompt 用英文，面向后续真实图生视频模型，突出场景、镜头、光线和氛围。',
    '',
    `标题：${trimText(input.title, 80) || '未填写'}`,
    `地点：${trimText(input.spotName, 80) || '未填写'}`,
    `天气：${trimText(input.weather, 20) || '未填写'}`,
    `心情：${trimText(input.mood, 20) || '未填写'}`,
    `正文：${trimText(input.content, 1200) || '未填写'}`,
  ].join('\n');
}

function normalizeVideoScript(script, input) {
  const imageCount = Math.max(1, Math.min(Number(input.imageCount) || 1, 9));
  const allowedStyles = new Set(['campus', 'landscape', 'architecture', 'night']);
  const allowedMotions = new Set(['push', 'pull', 'panLeft', 'panRight', 'tiltUp', 'float']);
  const fallbackTitle = trimText(input.title, 80) || trimText(input.spotName, 80) || '旅行日记';
  const rawShots = Array.isArray(script?.shots) ? script.shots : [];
  const shots = Array.from({ length: imageCount }, (_, index) => {
    const raw = rawShots[index] || {};
    return {
      caption: trimText(raw.caption, 42) || `${fallbackTitle}的第 ${index + 1} 个瞬间`,
      motion: allowedMotions.has(raw.motion) ? raw.motion : ['push', 'panRight', 'float', 'tiltUp'][index % 4],
      prompt: trimText(raw.prompt, 500),
      visualTags: Array.isArray(raw.visualTags) ? raw.visualTags.slice(0, 6).map(tag => trimText(tag, 32)).filter(Boolean) : [],
    };
  });

  return {
    title: trimText(script?.title, 80) || fallbackTitle,
    style: allowedStyles.has(script?.style) ? script.style : 'campus',
    intro: trimText(script?.intro, 80) || [trimText(input.spotName, 80), trimText(input.weather, 20), trimText(input.mood, 20)].filter(Boolean).join(' · '),
    outro: trimText(script?.outro, 80) || '把下一站，也写进日记',
    voiceover: trimText(script?.voiceover, 500),
    shots,
  };
}

async function generateDiaryVideoScript(input) {
  const config = getAigcConfig();
  const images = Array.isArray(input.images) ? input.images.filter(Boolean) : [];
  const prompt = buildVideoScriptPrompt({ ...input, imageCount: input.imageCount || images.length || 1 });
  const content = config.wireApi === 'responses'
    ? await requestResponses(config, prompt, images)
    : await requestCompletion(config, prompt, 0.45, '你是旅游短片 AIGC 导演，输出必须是可解析 JSON。');
  return normalizeVideoScript(parseJsonObject(content), { ...input, imageCount: input.imageCount || images.length || 1 });
}

function buildGroupTripPrompt(input) {
  const members = (input.members || []).map((member) => member.nickname || member.username).join('、') || '未填写';
  const preferences = JSON.stringify(input.preferences || [], null, 2);
  return [
    '请为一个多人旅行群组生成结构化中文行程。',
    '只输出 JSON，不要 Markdown，不要解释。',
    'JSON 格式必须为：{"title":"...","notes":"...","dailyPlan":[{"day":1,"date":"","activities":[{"id":"a1","time":"09:00","type":"景点","name":"...","description":"...","cost":"0","status":"待定","ownerId":null,"notes":"..."}]}]}',
    '活动类型只能使用：景点、美食、交通、住宿、休息。',
    '状态只能使用：待定、已确认、已取消。',
    '不要编造非常具体的门票价格；费用可用区间或估计。',
    '',
    `目的地：${trimText(input.destination, 80) || '未填写'}`,
    `出发地：${trimText(input.departure, 80) || '未填写'}`,
    `开始日期：${trimText(input.startDate, 30) || '未填写'}`,
    `结束日期：${trimText(input.endDate, 30) || '未填写'}`,
    `预算：${trimText(input.budget, 40) || '未填写'}`,
    `成员：${members}`,
    `成员偏好 JSON：${preferences}`,
  ].join('\n');
}

function buildConflictPrompt(input) {
  return [
    '请根据多人旅行偏好做冲突协调分析。',
    '只输出 JSON，不要 Markdown，不要解释。',
    'JSON 格式必须为：{"summary":"...","suggestions":["..."],"splitPlan":"...","riskLevel":"低|中|高"}',
    '建议要可执行，适合直接展示在群组旅行协作页面。',
    '',
    `目的地：${trimText(input.destination, 80) || '未填写'}`,
    `行程备注：${trimText(input.notes, 500) || '未填写'}`,
    `成员偏好 JSON：${JSON.stringify(input.preferences || [], null, 2)}`,
  ].join('\n');
}

function buildGroupChatPrompt(input) {
  const trip = input.trip || {};
  const recentMessages = (input.messages || [])
    .slice(-12)
    .map((message) => {
      const speaker = message.type === 'ai'
        ? 'AI助手'
        : (message.senderName || (message.type === 'system' ? '系统' : '成员'));
      return `${speaker}：${trimText(message.content, 180)}`;
    })
    .join('\n') || '暂无聊天记录';
  const preferences = (input.preferences || [])
    .slice(0, 8)
    .map((preference) => `${preference.userName || '成员'}：预算${preference.budgetLevel}/体力${preference.staminaLevel}/节奏${preference.paceLevel}/拍照${preference.photoLevel}，饮食${preference.foodPreference || '未填'}，忌口${preference.dietaryRestrictions || '无'}`)
    .join('\n') || '暂无成员偏好';

  return [
    '你是群组旅行空间里的 AI 协作助手，名字叫“小迹 AI”。',
    '请回复用户在群聊中 @ai 的消息，像一个实时旅行中枢助手一样给出简洁、具体、能直接执行的建议。',
    '要求：',
    '1. 用中文回复，语气自然友好，不要输出 Markdown 表格。',
    '2. 回复控制在 80 到 180 个中文字符之间，除非用户明确要求详细方案。',
    '3. 优先结合当前行程、群成员偏好、天气和最近聊天上下文。',
    '4. 不要假装已经修改行程或发送通知；如果需要成员确认，请明确说“建议”。',
    '5. 如果用户只是闲聊，可以轻松回应，但仍尽量和旅行协作相关。',
    '',
    `群组：${trimText(input.groupName, 80) || '未命名群组'}`,
    `当前用户：${trimText(input.senderName, 80) || '成员'}`,
    `用户消息：${trimText(input.message, 1000)}`,
    `行程标题：${trimText(trip.title, 80) || '未创建'}`,
    `出发地：${trimText(trip.departure, 80) || '未填写'}`,
    `目的地：${trimText(trip.destination, 80) || '未填写'}`,
    `日期：${trimText(trip.startDate, 30) || '未填'} 至 ${trimText(trip.endDate, 30) || '未填'}`,
    `行程备注：${trimText(trip.notes, 500) || '无'}`,
    `天气建议：${trimText(input.weatherSummary, 300) || '暂无'}`,
    `成员偏好：\n${preferences}`,
    `最近聊天：\n${recentMessages}`,
  ].join('\n');
}

function parseJsonObject(text) {
  const raw = `${text || ''}`.trim();
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf('{');
    if (start >= 0) {
      let depth = 0;
      let inString = false;
      let escaped = false;
      for (let index = start; index < raw.length; index += 1) {
        const char = raw[index];
        if (inString) {
          if (escaped) {
            escaped = false;
          } else if (char === '\\') {
            escaped = true;
          } else if (char === '"') {
            inString = false;
          }
          continue;
        }
        if (char === '"') inString = true;
        if (char === '{') depth += 1;
        if (char === '}') depth -= 1;
        if (depth === 0) {
          return JSON.parse(raw.slice(start, index + 1));
        }
      }
    }
    throw new Error('AI 返回内容不是合法 JSON');
  }
}

async function generateGroupTripSuggestion(input) {
  const config = getConfig();
  const content = await requestCompletion(
    config,
    buildGroupTripPrompt(input),
    0.55,
    '你是一位中文多人旅行规划助手，输出必须是可解析 JSON。',
  );
  return parseJsonObject(content);
}

async function analyzeGroupConflictWithAi(input) {
  const config = getConfig();
  const content = await requestCompletion(
    config,
    buildConflictPrompt(input),
    0.35,
    '你是一位中文旅行冲突协调助手，输出必须是可解析 JSON。',
  );
  return parseJsonObject(content);
}

async function generateGroupChatReply(input) {
  const config = getConfig();
  return requestCompletion(
    config,
    buildGroupChatPrompt(input),
    0.55,
    '你是“小迹 AI”，一个嵌入多人旅行群聊的中文旅行协作助手。回复要短、准、可执行。',
  );
}

module.exports = {
  generateDiaryDraft,
  generateDiaryVideoScript,
  generateGroupTripSuggestion,
  analyzeGroupConflictWithAi,
  generateGroupChatReply,
};
