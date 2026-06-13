/**
 * Robustness checks for business-facing API error handling.
 *
 * Usage:
 *   node tests/robustness/http_resilience_checks.js
 */

const BASE_URL = process.env.API_BASE || 'http://127.0.0.1:3001';

const scenarios = [
  {
    label: 'route-missing-params',
    method: 'POST',
    path: '/api/routes/shortest',
    body: {},
    accepted: [400],
  },
  {
    label: 'route-invalid-node',
    method: 'POST',
    path: '/api/routes/shortest',
    body: { fromId: 999999, toId: 888888, mode: 'distance' },
    accepted: [200],
  },
  {
    label: 'route-multi-too-few',
    method: 'POST',
    path: '/api/routes/multi',
    body: { waypointIds: [1] },
    accepted: [400],
  },
  {
    label: 'diary-rate-overflow',
    method: 'POST',
    path: '/api/diaries/1/rate',
    headers: { 'x-user-id': '1' },
    body: { score: 6 },
    accepted: [400],
  },
  {
    label: 'diary-comment-empty',
    method: 'POST',
    path: '/api/diaries/1/comment',
    headers: { 'x-user-id': '1' },
    body: { content: '' },
    accepted: [400],
  },
  {
    label: 'group-join-invalid-code',
    method: 'POST',
    path: '/api/groups/join',
    headers: { 'x-user-id': '1' },
    body: { code: 'ZZZZZZ' },
    accepted: [404],
  },
  {
    label: 'foods-search-long-keyword',
    method: 'GET',
    path: `/api/foods/search?q=${encodeURIComponent('景点'.repeat(300))}&limit=10`,
    accepted: [200],
  },
  {
    label: 'spots-search-script-payload',
    method: 'GET',
    path: `/api/spots/search?q=${encodeURIComponent('<script>alert(1)</script>')}&mode=fuzzy`,
    accepted: [200],
  },
];

async function main() {
  await ensureBackendReady();
  console.log(`\n=== HTTP Resilience Checks (${BASE_URL}) ===\n`);

  let failures = 0;
  for (const scenario of scenarios) {
    const result = await requestScenario(scenario);
    const ok = scenario.accepted.includes(result.status) && result.status !== 500;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${scenario.label} -> status=${result.status} body=${trim(result.body)}`);
    if (!ok) failures += 1;
  }

  if (failures > 0) {
    console.error(`\nRobustness regressions: ${failures}`);
    process.exit(1);
  }
}

async function ensureBackendReady() {
  const response = await fetch(`${BASE_URL}/api/health`);
  if (!response.ok) throw new Error(`Backend health check failed: ${response.status}`);
}

async function requestScenario(scenario) {
  try {
    const response = await fetch(`${BASE_URL}${scenario.path}`, {
      method: scenario.method,
      headers: {
        'Content-Type': 'application/json',
        ...(scenario.headers || {}),
      },
      body: scenario.body ? JSON.stringify(scenario.body) : undefined,
    });
    return {
      status: response.status,
      body: await response.text(),
    };
  } catch (error) {
    return {
      status: 0,
      body: error.message,
    };
  }
}

function trim(text) {
  return String(text || '').replace(/\s+/g, ' ').slice(0, 120);
}

main().catch((error) => {
  console.error('\nResilience check failed:', error.message);
  process.exit(1);
});
