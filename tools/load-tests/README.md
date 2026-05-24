# Load tests for the food-analysis pipeline

These scripts simulate concurrent users hitting `/food/analyze` so we can
measure where the API breaks before we ship a release that gets featured.

The tests do **not** call OpenAI. We run a tiny mock server that returns the
shape Vision/Anthropic would return — the goal is to find bottlenecks in
**our** code (queue, Prisma, Redis, sharp, media upload, autosave), not to
benchmark the model provider.

## What we measure

- p50 / p95 / p99 latency of the synchronous endpoint (`POST /food/analyze`)
- end-to-end completion latency (poll `GET /food/analysis/:id/status` until
  `COMPLETED`)
- error rate (5xx, 4xx, timeouts)
- backend memory / CPU on the host running the API while the test runs

## How to run

1. Start the mock OpenAI server:

   ```bash
   node tools/load-tests/mock-openai-server.js
   ```

   Listens on `http://127.0.0.1:8787`. Returns deterministic JSON responses
   for `/v1/chat/completions` after a configurable delay
   (`MOCK_DELAY_MS`, default `2500`).

2. Start the API pointed at the mock:

   ```bash
   OPENAI_BASE_URL=http://127.0.0.1:8787/v1 \
   OPENAI_API_KEY=fake-key \
   NODE_OPTIONS=--max-old-space-size=4096 \
   pnpm --dir apps/api run start:dev
   ```

3. Run the k6 scenario you want:

   ```bash
   # 100 RPS for 30s
   k6 run -e BASE_URL=http://localhost:3000 -e TARGET_RPS=100 tools/load-tests/food-analyze.js

   # ramp 100 → 500 → 1000 RPS, 1 min each
   k6 run -e BASE_URL=http://localhost:3000 tools/load-tests/food-analyze-ramp.js
   ```

## Auth

The endpoint is behind JWT. For load tests we generate a single test user and
bake its token into `K6_AUTH_TOKEN`. See `tools/load-tests/seed-test-user.ts` for
how to mint one against the running API.

## Expected bottlenecks (hypothesis to verify)

- `sharp` resize on `analysisBuffer` happens twice per image (display + 512)
  in `FoodProcessor.handleImageAnalysis` — single-process, CPU-bound.
- `MediaService.uploadFile` — depends on storage backend; for cloud storage it
  is the network hop that dominates.
- BullMQ queue depth — workers per process, default 1. Look at `food-analysis`
  queue length under load.
- Prisma connection pool — `DATABASE_CONNECTION_LIMIT` env var.
- Redis lock contention — `analysis:processing:${analysisId}` keys.

## Output

Each run prints standard k6 metrics + a CSV in `tools/load-tests/results/`. Compare
runs by changing one knob at a time (worker count, sharp quality, image size,
Redis cache TTL).
