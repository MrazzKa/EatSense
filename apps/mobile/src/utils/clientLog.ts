import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import safeEnv from './env';

const API_BASE_URL = safeEnv.apiBaseUrl || 'https://eatsense-production.up.railway.app';

/** Wait this long for more entries before sending what we have. */
const FLUSH_IDLE_MS = 2000;
/** Send immediately once this many are queued, rather than waiting out the timer. */
const FLUSH_AT_SIZE = 20;
/** Never hold more than this. Losing old debug lines beats leaking memory. */
const MAX_QUEUE = 100;

interface LogEntry {
  stage: string;
  platform: string;
  build: string;
  env: string;
  extra: Record<string, any> | null;
  at: string;
}

let queue: LogEntry[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let inFlight = false;

function buildNumber(): string {
  return String(
    Constants.expoConfig?.ios?.buildNumber ||
      Constants.expoConfig?.android?.versionCode ||
      safeEnv.buildNumber ||
      'unknown',
  );
}

async function flush(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  // One request at a time. Without this, a burst of logs opens a burst of
  // sockets that compete with the requests the user is actually waiting for.
  if (inFlight || queue.length === 0) return;

  const batch = queue;
  queue = [];
  inFlight = true;
  try {
    await fetch(`${API_BASE_URL}/debug/client-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: batch }),
    });
  } catch {
    // Debug logging must never surface as an error to the user, and a failed
    // batch is not worth retrying — it would only compete with real traffic.
  } finally {
    inFlight = false;
    // Anything that arrived while we were sending.
    if (queue.length > 0) schedule();
  }
}

function schedule(): void {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    void flush();
  }, FLUSH_IDLE_MS);
}

/**
 * Client-side logging, batched.
 *
 * This used to `await fetch` one POST per call, and it is called from ~90 places
 * including the navigation container's `onStateChange` — so every screen change
 * opened a request that competed with the API calls the user was waiting on.
 * Entries are now buffered and sent together, which keeps the production
 * debugging value without putting the network in the middle of navigation.
 *
 * It never throws and never blocks: callers can fire and forget.
 */
export function clientLog(stage: string, extra?: Record<string, any>): Promise<void> {
  try {
    queue.push({
      stage,
      platform: Platform.OS,
      build: buildNumber(),
      env: safeEnv.environment || 'unknown',
      extra: extra ?? null,
      at: new Date().toISOString(),
    });

    if (queue.length > MAX_QUEUE) {
      queue = queue.slice(-MAX_QUEUE);
    }

    if (queue.length >= FLUSH_AT_SIZE) void flush();
    else schedule();
  } catch {
    // Never let telemetry break a caller.
  }
  return Promise.resolve();
}

/**
 * Send what is queued right now.
 *
 * Called when the app goes to the background, which is exactly when a crash-
 * adjacent log would otherwise be lost with the process.
 */
export function flushClientLogs(): Promise<void> {
  return flush();
}

AppState.addEventListener('change', (state) => {
  if (state !== 'active') void flush();
});
