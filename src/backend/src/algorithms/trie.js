/**
 * 算法模块：Trie 前缀树 + 模糊搜索
 * 课程设计知识点：倒排索引、前缀搜索、编辑距离
 * 用途：景点名称自动补全、模糊搜索
 */

class TrieNode {
  constructor() {
    this.children = new Map(); // 子节点
    this.isEnd = false;        // 是否为单词结尾
    this.items = [];           // 该前缀对应的景点列表
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
    this.invertedIndex = new Map(); // 倒排索引: word -> [itemId]
  }

  /**
   * 插入一个景点到 Trie 中
   * @param {string} text - 景点名称（或关键词）
   * @param {object} item - 景点对象
   */
  insert(text, item) {
    // 对中文按字插入，对英文按字符插入
    const chars = [...text]; // 支持中文字符
    let node = this.root;
    for (const ch of chars) {
      if (!node.children.has(ch)) {
        node.children.set(ch, new TrieNode());
      }
      node = node.children.get(ch);
      // 每个前缀节点都存储该前缀下的景点（限制最多 20 个，节省内存）
      if (!node.items.some(i => i.id === item.id)) {
        if (node.items.length < 20) node.items.push(item);
      }
    }
    node.isEnd = true;

    // 同时建立倒排索引（拆分 tags 和 description 中的词）
    this._buildInvertedIndex(item);
  }

  // 构建倒排索引
  _buildInvertedIndex(item) {
    const words = [item.name, item.city, ...(item.tags || [])].filter(Boolean);
    for (const word of words) {
      if (!this.invertedIndex.has(word)) {
        this.invertedIndex.set(word, []);
      }
      if (!this.invertedIndex.get(word).some(i => i.id === item.id)) {
        this.invertedIndex.get(word).push(item);
      }
    }
  }

  /**
   * 前缀搜索
   * @param {string} prefix - 搜索前缀
   * @returns {Array} 匹配景点列表
   */
  searchByPrefix(prefix) {
    const chars = [...prefix];
    let node = this.root;
    for (const ch of chars) {
      if (!node.children.has(ch)) return [];
      node = node.children.get(ch);
    }
    return node.items;
  }

  /**
   * 倒排索引精确查找
   */
  searchByKeyword(keyword) {
    return this.invertedIndex.get(keyword) || [];
  }

  /**
   * 模糊搜索（编辑距离 <= maxDist）
   * 课程设计知识点：BK-Tree 思想 + 编辑距离
   * @param {string} query
   * @param {Array} allItems
   * @param {number} maxDist
   */
  fuzzySearch(query, allItems, maxDist = 1) {
    return allItems.filter(item => {
      const minED = Math.min(
        editDistance(query, item.name),
        editDistance(query, item.city || ''),
        ...(item.tags || []).map(t => editDistance(query, t))
      );
      return minED <= maxDist;
    }).slice(0, 20);
  }
}

/**
 * 编辑距离（Levenshtein Distance）
 * 课程设计知识点：动态规划
 */
function editDistance(s1, s2) {
  const m = s1.length, n = s2.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i-1] === s2[j-1]) dp[i][j] = dp[i-1][j-1];
      else dp[i][j] = 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

/**
 * 全文检索引擎
 * 课程设计知识点：倒排索引 + HashMap
 */
class FullTextIndex {
  constructor() {
    this.index = new Map(); // token -> [{ id, item, positions }]
  }

  // 向索引添加文档
  add(item) {
    const text = `${item.name} ${item.city || ''} ${item.description || ''} ${(item.tags || []).join(' ')}`;
    const tokens = tokenize(text);
    for (const [pos, token] of tokens.entries()) {
      if (!this.index.has(token)) this.index.set(token, []);
      const existing = this.index.get(token).find(e => e.id === item.id);
      if (existing) {
        existing.positions.push(pos);
      } else {
        this.index.get(token).push({ id: item.id, item, positions: [pos] });
      }
    }
  }

  // 全文检索（支持多词 AND 查询）
  search(query) {
    const tokens = tokenize(query);
    if (tokens.length === 0) return [];
    let result = null;
    for (const token of tokens) {
      const matches = new Set((this.index.get(token) || []).map(e => e.id));
      result = result === null ? matches : new Set([...result].filter(id => matches.has(id)));
    }
    if (!result) return [];
    // 返回匹配的景点，按相关度排序（出现次数多的优先）
    const scored = [];
    for (const id of result) {
      let score = 0;
      for (const token of tokens) {
        const entry = (this.index.get(token) || []).find(e => e.id === id);
        if (entry) score += entry.positions.length;
      }
      const item = (this.index.get(tokens[0]) || []).find(e => e.id === id)?.item;
      if (item) scored.push({ item, score });
    }
    return scored.sort((a, b) => b.score - a.score).map(s => s.item);
  }
}

// 分词（中文按字，英文按词）
function tokenize(text) {
  if (!text) return [];
  return [...text].filter(c => c.trim() && c !== ' ');
}

module.exports = { Trie, FullTextIndex, editDistance, tokenize };
