const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-chat';

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

async function requestCompletion({ apiKey, baseUrl, model }, prompt, temperature = 0.75) {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: '你是一位擅长中文旅行日记写作的助手，必须严格依据用户提供的素材写作。' },
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

module.exports = { generateDiaryDraft };
