/**
 * 算法单元测试 + 性能基准
 * 覆盖四个算法模块，输出 Markdown 格式报告
 */
const path = require('path');
const { dijkstra, shortestPath, multiPointPath, buildGraph } = require(
  path.join(__dirname, '../../../src/backend/src/algorithms/dijkstra')
);
const { MinHeap, topK } = require(
  path.join(__dirname, '../../../src/backend/src/algorithms/heap')
);
const { kmpSearch, buildNext, highlightMatch, searchInItems } = require(
  path.join(__dirname, '../../../src/backend/src/algorithms/kmp')
);
const { Trie, FullTextIndex, editDistance, tokenize } = require(
  path.join(__dirname, '../../../src/backend/src/algorithms/trie')
);

let totalPassed = 0, totalFailed = 0;
const benchRows = [];

// ── 工具 ──────────────────────────────────────────────────

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function test(label, fn) {
  try {
    fn();
    process.stdout.write(`  ✅ ${label}\n`);
    totalPassed++;
  } catch (e) {
    process.stdout.write(`  ❌ ${label}: ${e.message}\n`);
    totalFailed++;
  }
}

function bench(label, fn, rounds = 3) {
  const times = [];
  let memBefore, memAfter;
  for (let i = 0; i < rounds; i++) {
    if (i === 0) memBefore = process.memoryUsage().heapUsed;
    const start = Date.now();
    fn();
    times.push(Date.now() - start);
    if (i === rounds - 1) memAfter = process.memoryUsage().heapUsed;
  }
  const avg = (times.reduce((a, b) => a + b, 0) / rounds).toFixed(1);
  const mem = Math.max(0, ((memAfter - memBefore) / 1024)).toFixed(0);
  benchRows.push({ label, avg: `${avg}ms`, mem: `${mem}KB` });
  process.stdout.write(`  ⏱  ${label}: ${avg}ms avg / ${mem}KB\n`);
}

// 生成线性图（保证连通）
function linearEdges(n) {
  return Array.from({ length: n - 1 }, (_, i) => ({
    from: i + 1, to: i + 2, dist: 1, time: 1, transport: 'walk'
  }));
}

// 生成随机图
function randomEdges(n, m) {
  return Array.from({ length: m }, () => ({
    from: Math.floor(Math.random() * n) + 1,
    to: Math.floor(Math.random() * n) + 1,
    dist: Math.random() * 100 + 1,
    time: Math.random() * 60 + 1,
    transport: 'walk',
  }));
}

// ── MinHeap 单元测试 ──────────────────────────────────────
console.log('\n=== MinHeap 单元测试 ===');

test('push/pop 保持最小堆性质', () => {
  const h = new MinHeap();
  [5, 3, 8, 1, 4].forEach(v => h.push({ dist: v }));
  let last = -Infinity;
  while (!h.isEmpty()) {
    const v = h.pop().dist;
    assert(v >= last, `堆序被破坏: ${v} < ${last}`);
    last = v;
  }
});

test('自定义比较函数', () => {
  const h = new MinHeap((a, b) => a.score - b.score);
  h.push({ score: 10 }); h.push({ score: 2 }); h.push({ score: 7 });
  assert(h.pop().score === 2, '最小分应先弹出');
});

test('peek 不移除元素', () => {
  const h = new MinHeap();
  h.push({ dist: 3 }); h.push({ dist: 1 });
  assert(h.peek().dist === 1, 'peek应返回最小值');
  assert(h.size === 2, 'peek后size不变');
});

// ── TopK 单元测试 ─────────────────────────────────────────
console.log('\n=== TopK 单元测试 ===');

test('k=3 正确返回最高3个', () => {
  const items = [4, 1, 5, 3, 2].map(r => ({ rating: r }));
  const r = topK(items, 3);
  assert(r[0].rating === 5 && r[1].rating === 4 && r[2].rating === 3, 'TopK 顺序错误');
});

test('自定义 keyFn', () => {
  const items = [{ views: 100 }, { views: 300 }, { views: 200 }];
  const r = topK(items, 2, x => x.views);
  assert(r[0].views === 300, '自定义keyFn最大值错误');
});

test('k=1 返回最大值', () => {
  const items = Array.from({ length: 100 }, (_, i) => ({ rating: i }));
  const r = topK(items, 1);
  assert(r[0].rating === 99, 'k=1 应返回最大值');
});

// ── Dijkstra 单元测试 ─────────────────────────────────────
console.log('\n=== Dijkstra 单元测试 ===');

test('简单三节点图最短路', () => {
  const edges = [
    { from: 1, to: 2, dist: 4, time: 2, transport: 'walk' },
    { from: 1, to: 3, dist: 2, time: 3, transport: 'walk' },
    { from: 3, to: 2, dist: 1, time: 1, transport: 'walk' },
  ];
  const r = shortestPath([], edges, 1, 2);
  assert(r.reachable, '应可达');
  assert(r.totalDist === 3, `最短距离应为3，得到 ${r.totalDist}`);
  assert(r.path.join('-') === '1-3-2', `路径应为1-3-2，得到 ${r.path.join('-')}`);
});

test('time 模式选最短时间路径', () => {
  const edges = [
    { from: 1, to: 2, dist: 1, time: 10, transport: 'walk' },
    { from: 1, to: 3, dist: 10, time: 1, transport: 'drive' },
    { from: 3, to: 2, dist: 10, time: 1, transport: 'drive' },
  ];
  const r = shortestPath([], edges, 1, 2, 'time');
  assert(r.path.includes(3), 'time模式应选经过3的路径');
});

test('多点路径经过所有途经点', () => {
  const edges = linearEdges(10);
  const r = multiPointPath([], edges, [1, 5, 10]);
  assert(r.path.includes(1) && r.path.includes(10), '路径应包含起终点');
});

test('链式图100节点最短路正确', () => {
  const edges = linearEdges(100);
  const r = shortestPath([], edges, 1, 100);
  assert(r.reachable, '链式图应可达');
  assert(r.totalDist === 99, `链式图1→100距离应为99，得到 ${r.totalDist}`);
});

// ── KMP 单元测试 ──────────────────────────────────────────
console.log('\n=== KMP 单元测试 ===');

test('buildNext 正确构建失败函数', () => {
  const next = buildNext('ababc');
  assert(next.join(',') === '0,0,1,2,0', `next数组错误: ${next}`);
});

test('重叠匹配位置正确', () => {
  const r = kmpSearch('aaaa', 'aa');
  assert(r.length === 2 && r[0] === 0 && r[1] === 2, `重叠匹配位置错误: ${r}`);
});

test('中文字符匹配位置正确', () => {
  const r = kmpSearch('西湖断桥西湖雷峰', '西湖');
  assert(r.length === 2, `中文应匹配2次，得到 ${r.length}`);
});

test('searchInItems 多字段搜索', () => {
  const items = [
    { id: 1, title: '西湖游记', content: '断桥风景' },
    { id: 2, title: '故宫一日', content: '皇家建筑' },
  ];
  const r = searchInItems(items, '西湖');
  assert(r.length === 1 && r[0].id === 1, 'searchInItems应只匹配id=1');
});

// ── Trie 单元测试 ─────────────────────────────────────────
console.log('\n=== Trie 单元测试 ===');

test('前缀搜索返回正确结果', () => {
  const trie = new Trie();
  ['西湖', '西藏', '西安'].forEach((name, i) =>
    trie.insert(name, { id: i + 1, name, city: '', tags: [] })
  );
  const r = trie.searchByPrefix('西');
  assert(r.length === 3, `前缀"西"应匹配3个，得到 ${r.length}`);
});

test('倒排索引精确查找', () => {
  const trie = new Trie();
  trie.insert('西湖', { id: 1, name: '西湖', city: '杭州', tags: ['湖泊', '世界遗产'] });
  const r = trie.searchByKeyword('杭州');
  assert(r.length > 0, '倒排索引应找到杭州景点');
});

test('模糊搜索编辑距离1', () => {
  const trie = new Trie();
  const items = [{ id: 1, name: '西湖', city: '杭州', tags: [] }];
  const r = trie.fuzzySearch('西河', items, 1);
  assert(r.length === 1, '编辑距离1内应找到西湖');
});

test('editDistance 三角不等式', () => {
  const ab = editDistance('苹果', '桃子');
  const ac = editDistance('苹果', '西瓜');
  const bc = editDistance('桃子', '西瓜');
  assert(ab <= ac + bc, '编辑距离应满足三角不等式');
});

test('FullTextIndex AND 查询', () => {
  const idx = new FullTextIndex();
  idx.add({ id: 1, name: '西湖断桥', city: '杭州', description: '美丽的湖光山色', tags: ['湖泊'] });
  idx.add({ id: 2, name: '故宫博物院', city: '北京', description: '皇家建筑群', tags: ['历史'] });
  const r = idx.search('西湖');
  assert(r.some(x => x.id === 1), 'AND查询应找到id=1');
  assert(!r.some(x => x.id === 2), 'AND查询不应返回id=2');
});

// ── 性能基准 ──────────────────────────────────────────────
console.log('\n=== 性能基准 ===');

bench('TopK k=10 from n=100',   () => topK(Array.from({ length: 100 },   (_, i) => ({ rating: Math.random() * 5 })), 10));
bench('TopK k=10 from n=1000',  () => topK(Array.from({ length: 1000 },  (_, i) => ({ rating: Math.random() * 5 })), 10));
bench('TopK k=10 from n=10000', () => topK(Array.from({ length: 10000 }, (_, i) => ({ rating: Math.random() * 5 })), 10));
bench('Dijkstra 50-node graph',  () => shortestPath([], randomEdges(50, 100), 1, 50));
bench('Dijkstra 200-node graph', () => shortestPath([], randomEdges(200, 500), 1, 200));
bench('KMP text=10k pattern=5',  () => kmpSearch('a'.repeat(10000) + 'hello', 'hello'));
bench('KMP text=100k pattern=5', () => kmpSearch('a'.repeat(100000) + 'hello', 'hello'));
bench('FullTextIndex 1000 docs',  () => {
  const idx = new FullTextIndex();
  for (let i = 0; i < 1000; i++) idx.add({ id: i, name: `景点${i}`, city: '杭州', description: `美丽的景点${i}`, tags: ['旅游'] });
  idx.search('美丽景点');
});

// ── 报告 ──────────────────────────────────────────────────
console.log('\n=== 单元测试汇总 ===');
console.log(`✅ 通过: ${totalPassed} | ❌ 失败: ${totalFailed}`);

console.log('\n=== 性能基准报告（Markdown）===');
console.log('| 测试项 | 平均耗时 | 内存增量 |');
console.log('|--------|---------|---------|');
benchRows.forEach(r => console.log(`| ${r.label} | ${r.avg} | ${r.mem} |`));

if (totalFailed > 0) process.exit(1);
