/**
 * 算法模块：KMP 字符串匹配
 * 课程设计知识点：文本检索、模式匹配
 * 用途：日记全文检索、精确关键词定位
 */

/**
 * KMP 算法
 * @param {string} text - 被搜索文本
 * @param {string} pattern - 搜索模式
 * @returns {Array<number>} 所有匹配位置的起始索引
 */
function kmpSearch(text, pattern) {
  if (!pattern || !text) return [];
  const n = text.length, m = pattern.length;
  const next = buildNext(pattern);
  const result = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    while (j > 0 && text[i] !== pattern[j]) j = next[j - 1];
    if (text[i] === pattern[j]) j++;
    if (j === m) {
      result.push(i - m + 1);
      j = next[j - 1];
    }
  }
  return result;
}

// 构建 KMP 失败函数（next 数组）
function buildNext(pattern) {
  const m = pattern.length;
  const next = new Array(m).fill(0);
  let k = 0;
  for (let i = 1; i < m; i++) {
    while (k > 0 && pattern[i] !== pattern[k]) k = next[k - 1];
    if (pattern[i] === pattern[k]) k++;
    next[i] = k;
  }
  return next;
}

/**
 * 高亮搜索结果：在匹配位置插入标记
 * @param {string} text
 * @param {string} pattern
 * @returns {string} 带高亮标记的文本
 */
function highlightMatch(text, pattern) {
  const positions = kmpSearch(text, pattern);
  if (positions.length === 0) return text;
  let result = '';
  let last = 0;
  for (const pos of positions) {
    result += text.slice(last, pos);
    result += `<mark>${text.slice(pos, pos + pattern.length)}</mark>`;
    last = pos + pattern.length;
  }
  result += text.slice(last);
  return result;
}

/**
 * 从文本列表中检索包含关键词的条目
 * @param {Array} items - 包含文本字段的对象数组
 * @param {string} keyword - 搜索关键词
 * @param {Array<string>} fields - 要搜索的字段名
 */
function searchInItems(items, keyword, fields = ['title', 'content']) {
  return items.filter(item =>
    fields.some(field => {
      const text = item[field] || '';
      return kmpSearch(text, keyword).length > 0;
    })
  ).map(item => ({
    ...item,
    _highlights: fields.reduce((acc, field) => {
      if (item[field]) acc[field] = highlightMatch(item[field], keyword);
      return acc;
    }, {})
  }));
}

module.exports = { kmpSearch, buildNext, highlightMatch, searchInItems };
