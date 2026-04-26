/**
 * 红队测试：搜索算法边界攻击
 * 覆盖 KMP、Trie、FullTextIndex、editDistance 的极端输入
 */
const path = require('path');
const { kmpSearch, buildNext, highlightMatch, searchInItems } = require(
  path.join(__dirname, '../../src/backend/src/algorithms/kmp')
);
const { Trie, FullTextIndex, editDistance, tokenize } = require(
  path.join(__dirname, '../../src/backend/src/algorithms/trie')
);

let passed = 0, failed = 0;
const results = [];

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    results.push({ name, status: 'GREEN' });
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    results.push({ name, status: 'RED', error: e.message });
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

console.log('\n=== 红队测试：搜索算法 ===\n');

// ── KMP 边界 ──────────────────────────────────────────────
console.log('【KMP 边界测试】');

test('空 text 返回空数组', () => {
  assert(kmpSearch('', 'abc').length === 0, '空文本应返回[]');
});

test('空 pattern 返回空数组', () => {
  assert(kmpSearch('hello', '').length === 0, '空模式应返回[]');
});

test('pattern 比 text 长不崩溃', () => {
  const r = kmpSearch('ab', 'abcdefg');
  assert(r.length === 0, '超长模式不应有匹配');
});

test('全相同字符文本（aaaaaa / aaa）正确计数（含重叠）', () => {
  // KMP 返回所有重叠匹配：位置 0/1/2/3 均合法
  const r = kmpSearch('aaaaaa', 'aaa');
  assert(r.length === 4, `期望4处重叠匹配，得到 ${r.length}`);
});

test('pattern 与 text 完全相同', () => {
  const r = kmpSearch('hello', 'hello');
  assert(r.length === 1 && r[0] === 0, '完全相同应匹配索引0');
});

test('中文字符串匹配', () => {
  const r = kmpSearch('西湖风景西湖美', '西湖');
  assert(r.length === 2, `期望2处匹配，得到 ${r.length}`);
});

test('特殊字符不崩溃（SQL 注入模拟）', () => {
  const r = kmpSearch("'; DROP TABLE spots; --", 'spots');
  assert(Array.isArray(r), 'SQL注入字符串应正常处理');
});

test('超长文本（100k 字符）运行时间 < 500ms', () => {
  const text = 'a'.repeat(100000) + 'b';
  const start = Date.now();
  kmpSearch(text, 'aaab');
  assert(Date.now() - start < 500, '超长文本不应超时');
});

test('highlightMatch 无匹配返回原文', () => {
  const r = highlightMatch('西湖', '故宫');
  assert(r === '西湖', '无匹配应原样返回');
});

test('searchInItems 空数组不崩溃', () => {
  const r = searchInItems([], '西湖');
  assert(r.length === 0, '空数组应返回[]');
});

// ── Trie 边界 ─────────────────────────────────────────────
console.log('\n【Trie 边界测试】');

test('空字符串前缀搜索返回空', () => {
  const trie = new Trie();
  trie.insert('西湖', { id: 1, name: '西湖' });
  const r = trie.searchByPrefix('');
  assert(Array.isArray(r), '空前缀应返回数组（可能是空）');
});

test('插入1000个景点后前缀搜索不崩溃', () => {
  const trie = new Trie();
  for (let i = 0; i < 1000; i++) {
    trie.insert(`景点${i}`, { id: i, name: `景点${i}`, city: '杭州', tags: [] });
  }
  const r = trie.searchByPrefix('景点1');
  assert(r.length > 0, '应有匹配结果');
});

test('重复插入同一景点不重复累积', () => {
  const trie = new Trie();
  const item = { id: 1, name: '西湖', city: '杭州', tags: [] };
  trie.insert('西湖', item);
  trie.insert('西湖', item);
  const r = trie.searchByPrefix('西');
  const unique = new Set(r.map(x => x.id));
  assert(unique.size === r.length, '同一景点不应重复出现');
});

test('超长词插入不崩溃', () => {
  const trie = new Trie();
  const longName = '景'.repeat(200);
  trie.insert(longName, { id: 99, name: longName, city: '', tags: [] });
  assert(trie.searchByPrefix('景').length > 0, '超长词应可搜索');
});

// ── editDistance 边界 ─────────────────────────────────────
console.log('\n【editDistance 边界测试】');

test('相同字符串距离为0', () => {
  assert(editDistance('西湖', '西湖') === 0, '相同字符串编辑距离为0');
});

test('空串与任意串距离等于串长', () => {
  assert(editDistance('', 'abc') === 3, '空串与abc距离为3');
  assert(editDistance('abc', '') === 3, 'abc与空串距离为3');
});

test('两个空串距离为0', () => {
  assert(editDistance('', '') === 0, '两个空串距离为0');
});

test('单字符替换距离为1', () => {
  assert(editDistance('西湖', '西河') === 1, '单字符替换距离为1');
});

test('超长字符串（100字符）不超时', () => {
  const s1 = 'a'.repeat(100);
  const s2 = 'b'.repeat(100);
  const start = Date.now();
  editDistance(s1, s2);
  assert(Date.now() - start < 1000, '100字符编辑距离不应超时');
});

// ── FullTextIndex 边界 ────────────────────────────────────
console.log('\n【FullTextIndex 边界测试】');

test('空索引搜索返回空', () => {
  const idx = new FullTextIndex();
  assert(idx.search('西湖').length === 0, '空索引应返回[]');
});

test('搜索空字符串返回空', () => {
  const idx = new FullTextIndex();
  idx.add({ id: 1, name: '西湖', city: '杭州', description: '美丽的湖', tags: [] });
  assert(idx.search('').length === 0, '空查询应返回[]');
});

test('1000篇文档全文检索 < 200ms', () => {
  const idx = new FullTextIndex();
  for (let i = 0; i < 1000; i++) {
    idx.add({ id: i, name: `景点${i}`, city: '杭州', description: `美丽的景点${i}，值得一游`, tags: ['旅游', '自然'] });
  }
  const start = Date.now();
  const r = idx.search('美丽景点');
  assert(Date.now() - start < 200, `1000篇全文检索耗时 ${Date.now() - start}ms，超过200ms`);
});

test('XSS 注入字符串不崩溃', () => {
  const idx = new FullTextIndex();
  idx.add({ id: 1, name: '<script>alert(1)</script>', city: '', description: '', tags: [] });
  const r = idx.search('<script>');
  assert(Array.isArray(r), 'XSS字符串应正常处理');
});

// ── 汇总 ──────────────────────────────────────────────────
console.log(`\n=== 汇总：${passed} 通过 / ${failed} 失败 ===\n`);

const fs = require('fs');
const report = { timestamp: new Date().toISOString(), suite: 'search-attack-cases', passed, failed, results };
const reportDir = path.join(__dirname, '../reports');
if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
const reportPath = path.join(reportDir, `report-${Date.now()}.json`);
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`报告已保存：${reportPath}`);

if (failed > 0) process.exit(1);
