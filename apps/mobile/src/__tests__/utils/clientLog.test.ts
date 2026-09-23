/**
 * The batching in clientLog exists to keep telemetry out of the way of the
 * requests a user is actually waiting for. Its guarantees — one request at a
 * time, entries grouped, a burst sent without waiting out the timer, and never
 * throwing at the caller — are all invisible until they regress, so they are
 * pinned here.
 */

/**
 * Waits for a condition across microtasks instead of guessing how many ticks a
 * promise chain needs. Counting `await Promise.resolve()` calls passes on a
 * quiet machine and fails under parallel workers, which is the worst kind of
 * test: one that reports a problem that is not there.
 */
async function until(predicate: () => boolean, ticks = 100): Promise<void> {
  for (let i = 0; i < ticks; i++) {
    if (predicate()) return;
    await Promise.resolve();
  }
  throw new Error('Condition was never met');
}

/** For asserting that something did NOT happen, which cannot be waited for. */
async function settle(ticks = 20): Promise<void> {
  for (let i = 0; i < ticks; i++) await Promise.resolve();
}

describe('clientLog', () => {
  let fetchMock: jest.Mock;

  const load = () => {
    let mod: typeof import('../../utils/clientLog');
    jest.isolateModules(() => {
      mod = require('../../utils/clientLog');
    });
    return mod!;
  };

  const bodyOf = (call: any[]) => JSON.parse(call[1].body);

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock = jest.fn().mockResolvedValue({ ok: true });
    (global as any).fetch = fetchMock;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not hit the network on every call', () => {
    const { clientLog } = load();
    clientLog('Nav:one');
    clientLog('Nav:two');
    clientLog('Nav:three');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the queued entries together once things go quiet', async () => {
    const { clientLog } = load();
    clientLog('Nav:one');
    clientLog('Nav:two', { route: 'BodyMap' });

    jest.advanceTimersByTime(2000);
    await until(() => fetchMock.mock.calls.length === 1);

    const body = bodyOf(fetchMock.mock.calls[0]);
    expect(body.entries).toHaveLength(2);
    expect(body.entries.map((e: any) => e.stage)).toEqual(['Nav:one', 'Nav:two']);
    expect(body.entries[1].extra).toEqual({ route: 'BodyMap' });
  });

  it('stamps each entry with platform, build and time', async () => {
    const { clientLog } = load();
    clientLog('App:start');
    jest.advanceTimersByTime(2000);
    await until(() => fetchMock.mock.calls.length === 1);

    const entry = bodyOf(fetchMock.mock.calls[0]).entries[0];
    expect(entry.platform).toBeTruthy();
    expect(entry.build).toBeTruthy();
    expect(typeof entry.at).toBe('string');
  });

  it('sends a burst immediately instead of waiting out the timer', async () => {
    const { clientLog } = load();
    for (let i = 0; i < 20; i++) clientLog(`Burst:${i}`);
    await until(() => fetchMock.mock.calls.length === 1);

    expect(bodyOf(fetchMock.mock.calls[0]).entries).toHaveLength(20);
  });

  it('keeps only one request in flight and sends the rest afterwards', async () => {
    let release: (v: any) => void = () => {};
    fetchMock.mockImplementationOnce(
      () => new Promise((resolve) => { release = resolve; }),
    );

    const { clientLog } = load();
    clientLog('First');
    jest.advanceTimersByTime(2000);
    await until(() => fetchMock.mock.calls.length === 1);

    // Arrives while the first request is still open.
    clientLog('Second');
    jest.advanceTimersByTime(2000);
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    release({ ok: true });
    await settle();
    jest.advanceTimersByTime(2000);
    await until(() => fetchMock.mock.calls.length === 2);
    expect(bodyOf(fetchMock.mock.calls[1]).entries[0].stage).toBe('Second');
  });

  it('never rejects at the caller, even when the network is down', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    const { clientLog } = load();

    await expect(clientLog('Whatever')).resolves.toBeUndefined();
    jest.advanceTimersByTime(2000);
    await until(() => fetchMock.mock.calls.length === 1);
    // Still alive and still queueing after a failed send.
    await expect(clientLog('After failure')).resolves.toBeUndefined();
  });

  it('drops the oldest entries rather than growing without bound', async () => {
    // Nothing can flush while a request hangs, so the queue is the only thing
    // absorbing the load — it must have a ceiling.
    fetchMock.mockImplementation(() => new Promise(() => {}));
    const { clientLog } = load();

    for (let i = 0; i < 300; i++) clientLog(`Spam:${i}`);
    await until(() => fetchMock.mock.calls.length === 1);

    // One batch left with the socket; whatever is still queued is capped.
    const sent = bodyOf(fetchMock.mock.calls[0]).entries.length;
    expect(sent).toBeLessThanOrEqual(300);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('flushes when the app leaves the foreground', async () => {
    const { AppState } = require('react-native');
    const spy = jest.spyOn(AppState, 'addEventListener');
    const { clientLog } = load();

    clientLog('Before background');
    const handler = spy.mock.calls.find((c: any[]) => c[0] === 'change')?.[1] as any;
    expect(typeof handler).toBe('function');

    handler('background');
    await until(() => fetchMock.mock.calls.length === 1);

    expect(bodyOf(fetchMock.mock.calls[0]).entries[0].stage).toBe('Before background');
    spy.mockRestore();
  });
});
