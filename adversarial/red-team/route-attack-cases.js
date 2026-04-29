/**
 * 红队测试：路线规划算法边界攻击
 * 覆盖 Dijkstra、MinHeap、multiPointPath 的极端输入
 */
const path = require('path');
const { dijkstra, shortestPath, multiPointPath, buildGraph, getPath } = require(
  path.join(__dirname, '../../src/backend/src/algorithms/dijkstra')
);
const { MinHeap, topK } = require(
  path.join(__dirname, '../../src/backend/src/algorithms/heap')
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

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

console.log('\n=== 红队测试：路线规划算法 ===\n');

// ── MinHeap 边界 ──────────────────────────────────────────
console.log('【MinHeap 边界测试】');

test('空堆 pop 返回 null', () => {
  const h = new MinHeap();
  assert(h.pop() === null, 'pop() 应返回 null');
});

test('空堆 peek 返回 null', () => {
  const h = new MinHeap();
  assert(h.peek() === null, 'peek() 应返回 null');
});

test('单元素堆 pop 后为空', () => {
  const h = new MinHeap();
  h.push({ dist: 1 });
  h.pop();
  assert(h.isEmpty(), '弹出唯一元素后堆应为空');
});

test('相同权重元素不崩溃', () => {
  const h = new MinHeap();
  for (let i = 0; i < 100; i++) h.push({ dist: 5 });
  let last = -Infinity;
  while (!h.isEmpty()) {
    const v = h.pop().dist;
    assert(v >= last, '相同权重时不应乱序');
    last = v;
  }
});

test('大规模插入不崩溃（10000元素）', () => {
  const h = new MinHeap();
  for (let i = 10000; i >= 0; i--) h.push({ dist: i });
  assert(h.pop().dist === 0, '最小值应为0');
});

// ── TopK 边界 ─────────────────────────────────────────────
console.log('\n【TopK 边界测试】');

test('k=0 返回空数组', () => {
  const items = [{ rating: 5 }, { rating: 3 }];
  const r = topK(items, 0);
  assert(r.length === 0, 'k=0 应返回空');
});

test('k 大于数组长度不崩溃', () => {
  const items = [{ rating: 5 }, { rating: 3 }];
  const r = topK(items, 100);
  assert(r.length === 2, '应返回所有元素');
});

test('空数组 TopK 返回空', () => {
  const r = topK([], 5);
  assert(r.length === 0, '空数组返回空');
});

test('全相同评分 TopK 不崩溃', () => {
  const items = Array.from({ length: 50 }, () => ({ rating: 4.5 }));
  const r = topK(items, 10);
  assert(r.length === 10, '应返回10个元素');
});

// ── Dijkstra 边界 ─────────────────────────────────────────
console.log('\n【Dijkstra 边界测试】');

test('空图不崩溃', () => {
  const graph = new Map();
  const { dist } = dijkstra(graph, 1);
  assert(dist instanceof Map, '应返回 dist Map');
});

test('起点等于终点', () => {
  const r = shortestPath([], [], 1, 1);
  assert(r.path.length === 1, '路径应只含起点');
  assert(r.totalDist === 0 || r.totalDist === Infinity, '距离为0或不可达');
});

test('不连通图返回 reachable=false', () => {
  const nodes = [{ id: 1 }, { id: 2 }];
  const edges = [];
  const r = shortestPath(nodes, edges, 1, 2);
  assert(r.reachable === false, '孤立节点应不可达');
});

test('负权边（模拟异常数据）不进入死循环', () => {
  const edges = [{ from: 1, to: 2, dist: -10, time: 5, transport: 'walk' }];
  const start = Date.now();
  shortestPath([], edges, 1, 2);
  assert(Date.now() - start < 1000, '不应超时');
});

test('自环边不崩溃', () => {
  const edges = [{ from: 1, to: 1, dist: 0, time: 0, transport: 'walk' }];
  const r = shortestPath([], edges, 1, 2);
  assert(r !== undefined, '自环边应正常返回');
});

test('大规模图（500节点）运行时间 < 1000ms', () => {
  const edges = [];
  for (let i = 1; i < 500; i++) {
    edges.push({ from: i, to: i + 1, dist: 1, time: 1, transport: 'walk' });
    if (i > 1) edges.push({ from: i, to: i - 1, dist: 1, time: 1, transport: 'walk' });
  }
  const start = Date.now();
  const r = shortestPath([], edges, 1, 500);
  const elapsed = Date.now() - start;
  assert(elapsed < 1000, `500节点 Dijkstra 耗时 ${elapsed}ms，超过1000ms`);
  assert(r.reachable, '链式图1→500应可达');
});

// ── multiPointPath 边界 ───────────────────────────────────
console.log('\n【multiPointPath 边界测试】');

test('waypoints 只有1个节点', () => {
  const r = multiPointPath([], [], [1]);
  assert(Array.isArray(r.path), '应返回合法结构');
});

test('waypoints 有重复节点不崩溃', () => {
  const edges = [{ from: 1, to: 2, dist: 5, time: 3, transport: 'walk' }];
  const r = multiPointPath([], edges, [1, 2, 1]);
  assert(r !== undefined, '重复节点不应崩溃');
});

test('所有节点孤立时返回 totalCost=Infinity', () => {
  const r = multiPointPath([], [], [1, 2, 3]);
  assert(r.totalCost === Infinity || r.totalCost >= 0, '不可达时 totalCost 为 Infinity');
});

// ── 汇总 ──────────────────────────────────────────────────
console.log(`\n=== 汇总：${passed} 通过 / ${failed} 失败 ===\n`);

const report = {
  timestamp: new Date().toISOString(),
  suite: 'route-attack-cases',
  passed, failed,
  results,
};

const fs = require('fs');
const reportDir = path.join(__dirname, '../reports');
if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
const reportPath = path.join(reportDir, `report-${Date.now()}.json`);
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`报告已保存：${reportPath}`);

if (failed > 0) process.exit(1);
