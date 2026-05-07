// k6 scenario: constant arrival rate against POST /food/analyze.
//
// Runs `TARGET_RPS` requests per second for `DURATION` seconds, each request
// uploads a tiny JPEG and then polls until COMPLETED or fails.
//
// Usage:
//   k6 run -e BASE_URL=http://localhost:3000 \
//          -e K6_AUTH_TOKEN=eyJ... \
//          -e TARGET_RPS=100 \
//          load-tests/food-analyze.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TOKEN = __ENV.K6_AUTH_TOKEN || '';
const TARGET_RPS = parseInt(__ENV.TARGET_RPS || '100', 10);
const DURATION = __ENV.DURATION || '30s';
const POLL_TIMEOUT_MS = parseInt(__ENV.POLL_TIMEOUT_MS || '60000', 10);

// 1x1 black JPEG (smallest valid JPEG we can attach as a multipart file)
const TINY_JPEG = open('./tiny.jpg', 'b');

const errors = new Counter('analyze_errors');
const e2eLatency = new Trend('e2e_latency_ms', true);

export const options = {
  scenarios: {
    constant: {
      executor: 'constant-arrival-rate',
      rate: TARGET_RPS,
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: Math.max(50, TARGET_RPS),
      maxVUs: TARGET_RPS * 4,
    },
  },
  thresholds: {
    'http_req_failed': ['rate<0.05'],
    'http_req_duration{name:analyze}': ['p(95)<2000'],
    'e2e_latency_ms': ['p(95)<15000'],
  },
};

export default function run() {
  const t0 = Date.now();

  const headers = {
    Authorization: `Bearer ${TOKEN}`,
  };

  const data = {
    image: http.file(TINY_JPEG, 'food.jpg', 'image/jpeg'),
    locale: 'en',
  };

  const startRes = http.post(`${BASE_URL}/food/analyze`, data, {
    headers,
    tags: { name: 'analyze' },
  });

  const ok = check(startRes, {
    'analyze 2xx': (r) => r.status >= 200 && r.status < 300,
  });
  if (!ok) {
    errors.add(1);
    return;
  }

  let analysisId;
  try {
    analysisId = JSON.parse(startRes.body).analysisId || JSON.parse(startRes.body).id;
  } catch (e) {
    errors.add(1);
    return;
  }
  if (!analysisId) {
    errors.add(1);
    return;
  }

  // Poll status until COMPLETED, FAILED, or NEEDS_REVIEW
  const pollStart = Date.now();
  while (Date.now() - pollStart < POLL_TIMEOUT_MS) {
    const statusRes = http.get(`${BASE_URL}/food/analysis/${analysisId}/status`, {
      headers,
      tags: { name: 'status' },
    });
    if (statusRes.status >= 200 && statusRes.status < 300) {
      try {
        const json = JSON.parse(statusRes.body);
        if (json.status === 'COMPLETED' || json.status === 'NEEDS_REVIEW' || json.status === 'FAILED') {
          e2eLatency.add(Date.now() - t0);
          return;
        }
      } catch {
        // ignore malformed body
      }
    }
    sleep(0.5);
  }

  errors.add(1);
}
