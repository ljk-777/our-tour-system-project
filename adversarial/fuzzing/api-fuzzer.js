/**
 * API 模糊测试
 * 向所有关键端点发送随机/畸形请求，统计 500 错误率
 * 使用前提：后端服务运行在 http://localhost:3000
 */
const http = require('http');

const BASE_URL = process.env.API_BASE || 'http://localhost:3000';
const TIMEOUT_MS = 5000;

let total = 0, errors500 = 0, timeouts = 0, passed = 0;
const redFindings = [];

// ── 工具函数 ──────────────────────────────────────────────

function request(method, path, body = null) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });

    req.on('error', () => resolve({ status: 0, body: 'NETWORK_ERROR' }));
    req.setTimeout(TIMEOUT_MS, () => { req.destroy(); resolve({ status: 0, body: 'TIMEOUT' }); });

    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function fuzz(label, method, path, body = null) {
  total++;
  const result = await request(method, path, body);
  if (result.body === 'TIMEOUT') {
    timeouts++;
    console.log(`  ⚠️  TIMEOUT  [${method}] ${path}`);
    redFindings.push({ label, method, path, body, issue: 'TIMEOUT' });
  } else if (result.status === 500) {
    errors500++;
    console.log(`  ❌ 500      [${method}] ${path} ${body ? JSON.stringify(body) : ''}`);
    redFindings.push({ label, method, path, body, status: 500 });
  } else if (result.status === 0) {
    console.log(`  ⚪ NO_CONN  [${method}] ${path}`);
  } else {
    passed++;
    console.log(`  ✅ ${result.status}       [${method}] ${path}`);
  }
}

// ── 测试套件 ──────────────────────────────────────────────

async function runAll() {
  console.log(`\n=== API 模糊测试 (${BASE_URL}) ===\n`);

  // GET /api/spots
  console.log('【景点接口】');
  await fuzz('spots-normal',       'GET', '/api/spots');
  await fuzz('spots-limit-neg',    'GET', '/api/spots?limit=-1');
  await fuzz('spots-limit-huge',   'GET', '/api/spots?limit=999999');
  await fuzz('spots-offset-str',   'GET', '/api/spots?offset=abc');
  await fuzz('spots-type-xss',     'GET', '/api/spots?type=<script>alert(1)</script>');
  await fuzz('spots-type-sql',     'GET', "/api/spots?city=' OR 1=1 --");
  await fuzz('spots-type-null',    'GET', '/api/spots?type=');
  await fuzz('spots-unicode',      'GET', '/api/spots?city=%F0%9F%98%80'); // emoji

  // GET /api/spots/topk
  console.log('\n【TopK 接口】');
  await fuzz('topk-normal',        'GET', '/api/spots/topk?k=10');
  await fuzz('topk-zero',          'GET', '/api/spots/topk?k=0');
  await fuzz('topk-neg',           'GET', '/api/spots/topk?k=-5');
  await fuzz('topk-float',         'GET', '/api/spots/topk?k=3.7');
  await fuzz('topk-str',           'GET', '/api/spots/topk?k=abc');
  await fuzz('topk-huge',          'GET', '/api/spots/topk?k=100000');

  // GET /api/spots/search
  console.log('\n【搜索接口】');
  await fuzz('search-normal',      'GET', '/api/spots/search?q=西湖');
  await fuzz('search-empty',       'GET', '/api/spots/search?q=');
  await fuzz('search-sql',         'GET', "/api/spots/search?q=' OR '1'='1");
  await fuzz('search-xss',         'GET', '/api/spots/search?q=<img src=x onerror=alert(1)>');
  await fuzz('search-longstr',     'GET', `/api/spots/search?q=${'a'.repeat(1000)}`);
  await fuzz('search-special',     'GET', '/api/spots/search?q=../../../etc/passwd');
  await fuzz('search-null-byte',   'GET', '/api/spots/search?q=西湖%00恶意');

  // POST /api/routes/shortest
  console.log('\n【最短路接口】');
  await fuzz('route-normal',       'POST', '/api/routes/shortest', { fromId: 1, toId: 2 });
  await fuzz('route-missing-from', 'POST', '/api/routes/shortest', { toId: 2 });
  await fuzz('route-missing-to',   'POST', '/api/routes/shortest', { fromId: 1 });
  await fuzz('route-both-null',    'POST', '/api/routes/shortest', {});
  await fuzz('route-str-id',       'POST', '/api/routes/shortest', { fromId: 'abc', toId: 'xyz' });
  await fuzz('route-same-node',    'POST', '/api/routes/shortest', { fromId: 1, toId: 1 });
  await fuzz('route-neg-id',       'POST', '/api/routes/shortest', { fromId: -1, toId: -2 });
  await fuzz('route-float-id',     'POST', '/api/routes/shortest', { fromId: 1.5, toId: 2.7 });
  await fuzz('route-huge-id',      'POST', '/api/routes/shortest', { fromId: 999999999, toId: 999999998 });
  await fuzz('route-invalid-mode', 'POST', '/api/routes/shortest', { fromId: 1, toId: 2, mode: 'fly' });
  await fuzz('route-body-string',  'POST', '/api/routes/shortest', 'not-json');

  // POST /api/routes/multi
  console.log('\n【多点路线接口】');
  await fuzz('multi-normal',       'POST', '/api/routes/multi', { waypoints: [1, 2, 3] });
  await fuzz('multi-empty',        'POST', '/api/routes/multi', { waypoints: [] });
  await fuzz('multi-one',          'POST', '/api/routes/multi', { waypoints: [1] });
  await fuzz('multi-dup',          'POST', '/api/routes/multi', { waypoints: [1, 1, 1] });
  await fuzz('multi-missing',      'POST', '/api/routes/multi', {});
  await fuzz('multi-100-points',   'POST', '/api/routes/multi', { waypoints: Array.from({ length: 100 }, (_, i) => i + 1) });

  // GET /api/diaries
  console.log('\n【日记接口】');
  await fuzz('diary-normal',       'GET', '/api/diaries');
  await fuzz('diary-sort-invalid', 'GET', '/api/diaries?sortBy=evil&order=asc');
  await fuzz('diary-limit-neg',    'GET', '/api/diaries?limit=-10');
  await fuzz('diary-tag-xss',      'GET', '/api/diaries?tag=<script>');
  await fuzz('diary-uid-str',      'GET', '/api/diaries?userId=admin');

  // GET /api/diaries/search
  console.log('\n【日记搜索接口】');
  await fuzz('diary-search',       'GET', '/api/diaries/search?q=旅游');
  await fuzz('diary-search-empty', 'GET', '/api/diaries/search?q=');
  await fuzz('diary-search-sql',   'GET', "/api/diaries/search?q='; DROP TABLE--");

  // ── 汇总 ──────────────────────────────────────────────
  const errorRate = total > 0 ? ((errors500 / total) * 100).toFixed(1) : 0;
  console.log(`\n=== 汇总 ===`);
  console.log(`总计: ${total} | ✅ ${passed} | ❌ 500错误: ${errors500} | ⚠️ 超时: ${timeouts}`);
  console.log(`500 错误率: ${errorRate}%`);

  if (redFindings.length > 0) {
    console.log(`\nRED 发现（需修复）:`);
    redFindings.forEach(f => console.log(`  - [${f.issue || f.status}] ${f.method} ${f.path}`));
  }

  const fs = require('fs');
  const path = require('path');
  const reportDir = path.join(__dirname, '../reports');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    suite: 'api-fuzzer',
    total, passed, errors500, timeouts,
    errorRate: `${errorRate}%`,
    redFindings,
  }, null, 2));
  console.log(`\n报告已保存：${reportPath}`);
}

runAll().catch(console.error);
