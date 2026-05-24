// k6 scenario: ramp from 100 → 500 → 1000 RPS in 1-minute steps.
// Same body as food-analyze.js, just a multi-stage executor.

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TOKEN = __ENV.K6_AUTH_TOKEN || '';
const POLL_TIMEOUT_MS = parseInt(__ENV.POLL_TIMEOUT_MS || '60000', 10);

const TINY_JPEG = open('./tiny.jpg', 'b');

const errors = new Counter('analyze_errors');
const e2eLatency = new Trend('e2e_latency_ms', true);

export const options = {
  scenarios: {
    ramp: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 200,
      maxVUs: 4000,
      stages: [
        { duration: '30s', target: 100 },
        { duration: '60s', target: 100 },
        { duration: '30s', target: 500 },
        { duration: '60s', target: 500 },
        { duration: '30s', target: 1000 },
        { duration: '60s', target: 1000 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    'http_req_failed': ['rate<0.10'],
    'e2e_latency_ms': ['p(95)<20000'],
  },
};

export default function run() {
  const t0 = Date.now();
  const headers = { Authorization: `Bearer ${TOKEN}` };
  const data = { image: http.file(TINY_JPEG, 'food.jpg', 'image/jpeg'), locale: 'en' };

  const startRes = http.post(`${BASE_URL}/food/analyze`, data, { headers, tags: { name: 'analyze' } });
  if (!check(startRes, { 'analyze 2xx': (r) => r.status >= 200 && r.status < 300 })) {
    errors.add(1);
    return;
  }
  let analysisId;
  try {
    analysisId = JSON.parse(startRes.body).analysisId || JSON.parse(startRes.body).id;
  } catch {
    errors.add(1);
    return;
  }
  if (!analysisId) {
    errors.add(1);
    return;
  }

  const pollStart = Date.now();
  while (Date.now() - pollStart < POLL_TIMEOUT_MS) {
    const r = http.get(`${BASE_URL}/food/analysis/${analysisId}/status`, { headers, tags: { name: 'status' } });
    if (r.status >= 200 && r.status < 300) {
      try {
        const j = JSON.parse(r.body);
        if (j.status === 'COMPLETED' || j.status === 'FAILED' || j.status === 'NEEDS_REVIEW') {
          e2eLatency.add(Date.now() - t0);
          return;
        }
      } catch {
        // ignore
      }
    }
    sleep(0.5);
  }
  errors.add(1);
}
