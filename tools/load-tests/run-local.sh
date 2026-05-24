#!/usr/bin/env bash
# Local load test runner — uses production build (more stable than --watch).
#
# Flow:
#   1. Reset local postgres+redis volumes
#   2. Apply prisma migrations
#   3. Start mock OpenAI on :8787
#   4. Build NestJS (one-time compile, much more stable than nest --watch)
#   5. Start API on :3000 with LOAD_TEST_MODE=true
#   6. Mint JWT via /auth/load-test-token (gated by LOAD_TEST_MODE)
#   7. Run k6 ramp 100→500→1000 RPS
#
# Output: tools/load-tests/results/<timestamp>/
#   k6.log         — screenshot the last 40 lines for the report
#   summary.json   — machine-readable metrics
#   api.log        — full NestJS log
#   build.log      — compile output (check on build failures)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOAD_DIR="$REPO_ROOT/tools/load-tests"
API_DIR="$REPO_ROOT/apps/api"
TS="$(date +%Y%m%d-%H%M%S)"
RESULTS_DIR="$LOAD_DIR/results/$TS"
mkdir -p "$RESULTS_DIR"
chmod 777 "$RESULTS_DIR"

MOCK_PID=""
API_PID=""

cleanup() {
  echo ""
  echo "[cleanup] Stopping API ($API_PID) and mock ($MOCK_PID)..."
  [[ -n "$API_PID" ]] && kill "$API_PID" 2>/dev/null || true
  [[ -n "$MOCK_PID" ]] && kill "$MOCK_PID" 2>/dev/null || true
  sleep 1
  (cd "$API_DIR" && docker compose stop postgres redis) > /dev/null 2>&1 || true
  echo "[cleanup] Done. Results: $RESULTS_DIR"
}
trap cleanup EXIT

# --- Sanity checks ------------------------------------------------------------
command -v docker >/dev/null || { echo "[!] docker not found. Start Docker Desktop."; exit 1; }
command -v jq >/dev/null || { echo "[!] jq not found. Install: sudo apt-get install -y jq"; exit 1; }
docker info >/dev/null 2>&1 || { echo "[!] Docker daemon not running."; exit 1; }

# Free port 3000 if something is squatting
if lsof -i:3000 -t >/dev/null 2>&1; then
  echo "[warn] Killing stale process on port 3000..."
  lsof -i:3000 -t | xargs -r kill -9 2>/dev/null || true
  sleep 2
fi

# --- 1. Infra -----------------------------------------------------------------
echo "[1/6] Resetting local postgres + redis (wipes local dev data)..."
(cd "$API_DIR" && docker compose down -v) > "$RESULTS_DIR/docker.log" 2>&1 || true
(cd "$API_DIR" && docker compose up -d postgres redis) >> "$RESULTS_DIR/docker.log" 2>&1

for i in {1..30}; do
  if docker exec "$(docker ps -qf 'name=postgres')" pg_isready -U postgres >/dev/null 2>&1; then
    echo "[1/6] Postgres ready (${i}s)"; break
  fi
  sleep 1
done

# --- 2. Migrations ------------------------------------------------------------
echo "[2/6] Applying migrations..."
(cd "$API_DIR" && npx prisma migrate deploy) > "$RESULTS_DIR/migrate.log" 2>&1 || {
  echo "[!] Migration failed. See $RESULTS_DIR/migrate.log"
  exit 1
}
(cd "$API_DIR" && npx prisma generate) >> "$RESULTS_DIR/migrate.log" 2>&1 || true

# --- 3. Build API -------------------------------------------------------------
# Prefer swc (Rust, ~3× faster + ~3× less memory than tsc). Falls back to tsc
# with a 6GB heap on machines without swc installed.
echo "[3/6] Building API..."
BUILD_OK=0
if (cd "$API_DIR" && node_modules/.bin/nest build -b swc 2>&1) > "$RESULTS_DIR/build.log"; then
  echo "[3/6] Built with swc"
  BUILD_OK=1
else
  echo "[3/6] swc failed/unavailable, retrying with tsc + 6GB heap..."
  if (cd "$API_DIR" && NODE_OPTIONS="--max-old-space-size=6144" npm run build) >> "$RESULTS_DIR/build.log" 2>&1; then
    echo "[3/6] Built with tsc"
    BUILD_OK=1
  fi
fi
if [[ "$BUILD_OK" != "1" ]]; then
  echo "[!] Build failed. Last 50 lines of build.log:"
  echo "----------------------------------------"
  tail -50 "$RESULTS_DIR/build.log"
  echo "----------------------------------------"
  echo "If you see 'heap out of memory', WSL2 is RAM-limited. Fix:"
  echo "  1. Create C:\\Users\\<you>\\.wslconfig:"
  echo "     [wsl2]"
  echo "     memory=12GB"
  echo "  2. PowerShell: wsl --shutdown"
  echo "  3. Reopen Ubuntu and retry."
  exit 1
fi

# --- 4. Mock OpenAI -----------------------------------------------------------
echo "[4/6] Starting mock OpenAI on :8787..."
node "$LOAD_DIR/mock-openai-server.js" > "$RESULTS_DIR/mock.log" 2>&1 &
MOCK_PID=$!
sleep 1

# --- 5. API (production node, not nest --watch) -------------------------------
echo "[5/6] Starting compiled API on :3000..."
(
  cd "$API_DIR"
  OPENAI_BASE_URL=http://127.0.0.1:8787/v1 \
  OPENAI_API_KEY=fake-key-for-load-test \
  NODE_OPTIONS=--max-old-space-size=4096 \
  DISABLE_LIMITS=true \
  LOAD_TEST_MODE=true \
  AUTH_DEV_IGNORE_MAIL_ERRORS=true \
  NODE_ENV=production \
  node dist/main.js > "$RESULTS_DIR/api.log" 2>&1 &
  echo $! > /tmp/eatsense-api.pid
)
sleep 2
API_PID="$(cat /tmp/eatsense-api.pid 2>/dev/null || echo '')"

echo "[5/6] Waiting for API on /health (up to 90s)..."
ready=0
for i in {1..90}; do
  if curl -sf http://localhost:3000/health >/dev/null 2>&1; then
    ready=1; echo "[5/6] API up (took ${i}s)"; break
  fi
  if [[ -n "$API_PID" ]] && ! kill -0 "$API_PID" 2>/dev/null; then
    echo "[!] API process died. Last 60 lines of api.log:"
    echo "----------------------------------------"
    tail -n 60 "$RESULTS_DIR/api.log"
    echo "----------------------------------------"
    exit 1
  fi
  sleep 1
done
if [[ "$ready" != "1" ]]; then
  echo "[!] API did not respond after 90s. Last 60 lines of api.log:"
  tail -n 60 "$RESULTS_DIR/api.log"
  exit 1
fi

# --- 6. Mint test JWT via dedicated load-test endpoint ------------------------
echo "[6/6] Minting test JWT via /auth/load-test-token..."
RESP=$(curl -s -X POST http://localhost:3000/auth/load-test-token \
  -H 'Content-Type: application/json' \
  -d '{}')
TOKEN=$(echo "$RESP" | jq -r '.accessToken // empty' 2>/dev/null || echo '')

if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
  echo "[!] Failed to get JWT. Response was:"
  echo "$RESP"
  echo ""
  echo "Check that LOAD_TEST_MODE=true and /auth/load-test-token endpoint exists."
  exit 1
fi
echo "[6/6] Token minted (length ${#TOKEN})"

# --- 7. k6 --------------------------------------------------------------------
echo ""
echo "===================================================="
echo "Starting k6 ramp 100→500→1000 RPS (5 minutes total)..."
echo "===================================================="
# WSL2 + Docker Desktop quirk: --network=host in the k6 container resolves to
# the Docker VM's loopback, NOT the WSL2 distro's. Use host.docker.internal
# which Docker Desktop provides as a stable alias for the WSL2 host.
docker run --rm \
  --add-host=host.docker.internal:host-gateway \
  --user "$(id -u):$(id -g)" \
  -v "$LOAD_DIR":/scripts \
  -e BASE_URL=http://host.docker.internal:3000 \
  -e K6_AUTH_TOKEN="$TOKEN" \
  grafana/k6:latest \
  run --summary-export=/scripts/results/$TS/summary.json /scripts/food-analyze-ramp.js \
  2>&1 | tee "$RESULTS_DIR/k6.log"

echo ""
echo "===================================================="
echo "Done. Results: $RESULTS_DIR"
echo "Screenshot the last ~40 lines of: $RESULTS_DIR/k6.log"
echo "===================================================="
