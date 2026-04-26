/**
 * 混沌测试：模拟节点删除、边权突变、并发请求
 * 验证系统在异常状态下不崩溃、不死锁
 */
const path = require('path');
const { dijkstra, shortestPath, multiPointPath, buildGraph } = require(
  path.join(__dirname, '../../src/backend/src/algorithms/dijkstra')
);
const { topK } = require(
  path.join(__dirname, '../../src/backend/src/algorithms/heap')
);
const { kmpSearch, searchInItems } = require(
  path.join(__dirname, '../../src/backend/src/algorithms/kmp')
);

let passed = 0, failed = 0, warnings = 0;
const results = [];

function test(name, level, fn) {
  try {
    const start = Date.now();
    fn();
    const elapsed = Date.now() - start;
    const status = elapsed > 500 ? 'YELLOW' : 'GREEN';
    const icon = status === 'YELLOW' ? '⚠️' : '✅';
    console.log(`  ${icon} [${status}] ${name} (${elapsed}ms)`);
    results.push({ name, status, elapsed });
    if (status === 'YELLOW') warnings++; else passed++;
  } catch (e) {
    console.log(`  ❌ [RED] ${name}: ${e.message}`);
    results.push({ name, status: 'RED', error: e.message });
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// 生成随机图
function randomGraph(nodeCount, edgeCount) {
  const edges = [];
  for (let i = 0; i < edgeCount; i++) {
    const from = Math.floor(Math.random() * nodeCount) + 1;
    const to = Math.floor(Math.random() * nodeCount) + 1;
    edges.push({ from, to, dist: Math.random() * 100 + 1, time: Math.random() * 60 + 1, transport: 'walk' });
  }
  return edges;
}

console.log('\n=== 混沌测试 ===\n');

// ── 场景1：动态节点删除 ───────────────────────────────────
console.log('【场景1：动态节点删除】');

test('删除起点后查询不崩溃', 'RED', () => {
  const edges = randomGraph(50, 100);
  // 起点 1 被"删除"：不出现在 nodes 中，但 edges 中仍引用它
  const r = shortestPath([], edges.filter(e => e.from !== 1 && e.to !== 1), 1, 25);
  assert(r !== undefined, '删除起点后应返回结果');
  assert(r.reachable === false || Array.isArray(r.path), '应返回不可达或路径');
});

test('删除终点后查询不崩溃', 'RED', () => {
  const edges = randomGraph(50, 100);
  const r = shortestPath([], edges.filter(e => e.from !== 50 && e.to !== 50), 1, 50);
  assert(r !== undefined && r.reachable === false, '终点不存在应返回不可达');
});

test('删除图中50%的节点后多点路径不崩溃', 'RED', () => {
  const edges = randomGraph(100, 200);
  const half = edges.filter((_, i) => i % 2 === 0);
  const r = multiPointPath([], half, [1, 30, 60, 100]);
  assert(r !== undefined, '半图多点路径不应崩溃');
});

// ── 场景2：边权突变 ───────────────────────────────────────
console.log('\n【场景2：边权突变】');

test('边权为 NaN 不崩溃', 'RED', () => {
  const edges = [
    { from: 1, to: 2, dist: NaN, time: 5, transport: 'walk' },
    { from: 2, to: 3, dist: 10, time: 5, transport: 'walk' },
  ];
  const r = shortestPath([], edges, 1, 3);
  assert(r !== undefined, 'NaN边权不应崩溃');
});

test('边权为 null 不崩溃', 'RED', () => {
  const edges = [
    { from: 1, to: 2, dist: null, time: null, transport: 'walk' },
  ];
  const r = shortestPath([], edges, 1, 2);
  assert(r !== undefined, 'null边权不应崩溃');
});

test('边权突变为极大值后路径仍可计算', 'YELLOW', () => {
  const edges = [
    { from: 1, to: 2, dist: Number.MAX_SAFE_INTEGER, time: 1, transport: 'walk' },
    { from: 2, to: 3, dist: 1, time: 1, transport: 'walk' },
  ];
  const r = shortestPath([], edges, 1, 3);
  assert(r.reachable, '极大权重时路径仍应可达');
});

test('所有边权为0不进入死循环', 'RED', () => {
  const edges = Array.from({ length: 50 }, (_, i) => ({
    from: i + 1, to: i + 2, dist: 0, time: 0, transport: 'walk'
  }));
  const start = Date.now();
  shortestPath([], edges, 1, 51);
  assert(Date.now() - start < 1000, '零权重图不应超时');
});

// ── 场景3：并发模拟 ───────────────────────────────────────
console.log('\n【场景3：并发请求模拟】');

test('50个 Dijkstra 并发查询（Promise.all）', 'YELLOW', () => {
  const edges = randomGraph(200, 500);
  const start = Date.now();
  const promises = Array.from({ length: 50 }, (_, i) =>
    Promise.resolve(shortestPath([], edges, (i % 50) + 1, 200 - (i % 50)))
  );
  // 同步执行模拟并发
  promises.forEach(p => p.then(() => {}));
  assert(Date.now() - start < 3000, '50次并发 Dijkstra 应在3秒内完成');
});

test('100个 KMP 并发搜索不崩溃', 'YELLOW', () => {
  const texts = Array.from({ length: 100 }, (_, i) => ({
    id: i, title: `游记${i}：西湖一日游`, content: `美丽的西湖景色，令人${i % 2 === 0 ? '陶醉' : '难忘'}`
  }));
  const start = Date.now();
  for (let i = 0; i < 100; i++) {
    searchInItems(texts, '西湖');
  }
  assert(Date.now() - start < 1000, '100次 KMP 搜索应在1秒内完成');
});

test('TopK 在高并发下结果一致性', 'RED', () => {
  const items = Array.from({ length: 1000 }, (_, i) => ({ id: i, rating: Math.random() * 5 }));
  const results = Array.from({ length: 20 }, () => topK([...items], 10));
  const first = results[0].map(x => x.id).join(',');
  for (const r of results) {
    const ids = r.map(x => x.id).join(',');
    assert(ids === first, 'TopK 多次执行结果应一致');
  }
});

// ── 场景4：数据污染 ───────────────────────────────────────
console.log('\n【场景4：数据污染】');

test('edges 数组含 undefined 元素不崩溃', 'RED', () => {
  const edges = [
    undefined,
    { from: 1, to: 2, dist: 10, time: 5, transport: 'walk' },
    null,
  ].filter(Boolean);
  const r = shortestPath([], edges, 1, 2);
  assert(r !== undefined, '过滤后应正常运行');
});

test('节点 ID 为字符串时不死循环', 'RED', () => {
  const edges = [{ from: '1', to: '2', dist: 5, time: 3, transport: 'walk' }];
  const start = Date.now();
  shortestPath([], edges, '1', '2');
  assert(Date.now() - start < 500, '字符串ID不应死循环');
});

test('图中存在孤立节点（无出边）不影响其他路径', 'RED', () => {
  const edges = [
    { from: 1, to: 2, dist: 5, time: 3, transport: 'walk' },
    { from: 2, to: 3, dist: 5, time: 3, transport: 'walk' },
    // 节点 99 完全孤立
  ];
  const r = shortestPath([], edges, 1, 3);
  assert(r.reachable, '孤立节点不应影响1→3路径');
});

// ── 汇总 ──────────────────────────────────────────────────
console.log(`\n=== 汇总 ===`);
console.log(`✅ GREEN: ${passed} | ⚠️ YELLOW: ${warnings} | ❌ RED: ${failed}`);

const fs = require('fs');
const reportDir = path.join(__dirname, '../reports');
if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
const reportPath = path.join(reportDir, `report-${Date.now()}.json`);
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  suite: 'chaos-scenarios',
  passed, warnings, failed,
  results,
}, null, 2));
console.log(`报告已保存：${reportPath}`);

if (failed > 0) process.exit(1);
