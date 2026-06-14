/**
 * Concurrent read-load checks for the tourism system.
 *
 * Usage:
 *   node tests/concurrency/http_read_load.js
 *   API_BASE=http://127.0.0.1:3001 node tests/concurrency/http_read_load.js
 */

const BASE_URL = process.env.API_BASE || 'http://127.0.0.1:3001';
const SCALE = Math.max(1, Number(process.env.LOAD_SCALE || 1));
const ROUNDS_OVERRIDE = Number(process.env.LOAD_ROUNDS || 0);

const scenarios = [
  {
    name: 'spots-recommend',
    method: 'GET',
    path: '/api/spots/recommend?type=scenic&sortBy=popularity&limit=10',
    concurrency: 40,
    rounds: 3,
    expect: (json) => Array.isArray(json?.data),
  },
  {
    name: 'foods-recommend',
    method: 'GET',
    path: '/api/foods/recommend?sortBy=rating&limit=10',
    concurrency: 40,
    rounds: 3,
    expect: (json) => Array.isArray(json?.data),
  },
  {
    name: 'diaries-search',
    method: 'GET',
    path: '/api/diaries/search?q=旅行&mode=fulltext&limit=10',
    concurrency: 30,
    rounds: 3,
    expect: (json) => Array.isArray(json?.data),
  },
  {
    name: 'routes-graph-stats',
    method: 'GET',
    path: '/api/routes/graph-stats',
    concurrency: 25,
    rounds: 3,
    expect: (json) => Number(json?.data?.totalEdges) > 0 && Number(json?.data?.totalNodes) > 0,
  },
];

async function main() {
  await ensureBackendReady();
  const scaledScenarios = scenarios.map((scenario) => ({
    ...scenario,
    concurrency: Math.max(1, Math.floor(scenario.concurrency * SCALE)),
    rounds: ROUNDS_OVERRIDE > 0 ? ROUNDS_OVERRIDE : scenario.rounds,
  }));

  console.log(`\n=== Concurrent Read Load (${BASE_URL}) ===\n`);
  const allRows = [];

  for (const scenario of scaledScenarios) {
    console.log(`--- ${scenario.name} ---`);
    for (let round = 1; round <= scenario.rounds; round += 1) {
      const result = await runScenario(scenario, round);
      allRows.push(result);
      console.log(
        `round ${round}: ok=${result.ok}/${result.total} avg=${result.avgMs}ms p95=${result.p95Ms}ms max=${result.maxMs}ms errors=${result.errors}`
      );
    }
    console.log('');
  }

  console.log('=== Summary ===');
  console.log('| scenario | total | ok | avg(ms) | p95(ms) | max(ms) | errors |');
  console.log('|---|---:|---:|---:|---:|---:|---:|');
  for (const row of allRows) {
    console.log(
      `| ${row.name}#${row.round} | ${row.total} | ${row.ok} | ${row.avgMs} | ${row.p95Ms} | ${row.maxMs} | ${row.errors} |`
    );
  }
}

async function ensureBackendReady() {
  const response = await fetch(`${BASE_URL}/api/health`);
  if (!response.ok) {
    throw new Error(`Backend health check failed: ${response.status}`);
  }
}

async function runScenario(scenario, round) {
  const tasks = Array.from({ length: scenario.concurrency }, (_, index) =>
    executeOne(scenario, index)
  );
  const results = await Promise.all(tasks);
  const times = results.map((item) => item.ms).sort((a, b) => a - b);
  const ok = results.filter((item) => item.ok).length;

  return {
    name: scenario.name,
    round,
    total: results.length,
    ok,
    errors: results.length - ok,
    avgMs: average(times).toFixed(1),
    p95Ms: percentile(times, 0.95).toFixed(1),
    maxMs: Math.max(...times).toFixed(1),
  };
}

async function executeOne(scenario, index) {
  const started = performance.now();
  try {
    const response = await fetch(`${BASE_URL}${scenario.path}`, {
      method: scenario.method,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': String((index % 5) + 1),
      },
      body: scenario.body ? JSON.stringify(scenario.body) : undefined,
    });
    const json = await response.json().catch(() => null);
    const ok = response.ok && json?.success !== false && scenario.expect(json);
    return { ok, ms: performance.now() - started };
  } catch {
    return { ok: false, ms: performance.now() - started };
  }
}

function average(items) {
  if (items.length === 0) return 0;
  return items.reduce((sum, value) => sum + value, 0) / items.length;
}

function percentile(sortedItems, ratio) {
  if (sortedItems.length === 0) return 0;
  const index = Math.min(sortedItems.length - 1, Math.floor(sortedItems.length * ratio));
  return sortedItems[index];
}

main().catch((error) => {
  console.error('\nRead-load test failed:', error.message);
  process.exit(1);
});
