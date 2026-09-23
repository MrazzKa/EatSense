'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { apiFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n/context';
import { LOCALE_TAGS } from '@/lib/i18n/format';
import type { Locale } from '@/lib/i18n/messages';
import { useToast } from '@/components/toast';
import { CheckCircle2, MessageSquare, PhoneCall, PhoneOff, Users } from 'lucide-react';

const POLL_MS = 6000;
/** Matches the server cap; the switch stays on by re-sending this. */
const HEARTBEAT_MINUTES = 10;
const HEARTBEAT_MS = (HEARTBEAT_MINUTES - 2) * 60 * 1000;

interface WaitingRequest {
  id: string;
  reason: string | null;
  symptomReportId: string | null;
  locale: string | null;
  createdAt: string;
  expiresAt: string;
  client: { id: string; email: string };
}

interface AcceptedRequest {
  id: string;
  status: string;
  reason: string | null;
  symptomReportId: string | null;
  conversationId: string | null;
  acceptedAt: string | null;
}

export default function HotlinePage() {
  const { t, locale } = useI18n();
  const { toast } = useToast();

  const [online, setOnline] = useState(false);
  const [onlineUntil, setOnlineUntil] = useState<string | null>(null);
  const [waiting, setWaiting] = useState<WaitingRequest[]>([]);
  const [accepted, setAccepted] = useState<AcceptedRequest[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const onlineRef = useRef(false);

  const time = useCallback(
    (iso: string | null) => {
      if (!iso) return '';
      const at = new Date(iso);
      if (Number.isNaN(at.getTime())) return '';
      return at.toLocaleTimeString(LOCALE_TAGS[locale as Locale] || 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    },
    [locale],
  );

  const loadQueue = useCallback(async () => {
    if (!onlineRef.current) return;
    try {
      const data = await apiFetch<{ waiting: WaitingRequest[]; accepted: AcceptedRequest[] }>(
        '/hotline/expert/queue',
      );
      setWaiting(data.waiting ?? []);
      setAccepted(data.accepted ?? []);
    } catch {
      // A failed poll is not worth a toast; the next one is six seconds away.
    } finally {
      setLoaded(true);
    }
  }, []);

  const goOnline = useCallback(async () => {
    try {
      const res = await apiFetch<{ onlineUntil: string }>('/hotline/expert/presence', {
        method: 'POST',
        body: JSON.stringify({ minutes: HEARTBEAT_MINUTES }),
      });
      onlineRef.current = true;
      setOnline(true);
      setOnlineUntil(res.onlineUntil);
      loadQueue();
    } catch (error: any) {
      toast(error?.message || t('common', 'error'), 'error');
    }
  }, [loadQueue, toast, t]);

  const goOffline = useCallback(async () => {
    try {
      await apiFetch('/hotline/expert/presence', { method: 'DELETE' });
    } finally {
      onlineRef.current = false;
      setOnline(false);
      setOnlineUntil(null);
      setWaiting([]);
    }
  }, []);

  const accept = useCallback(
    async (id: string) => {
      setBusyId(id);
      try {
        const res = await apiFetch<AcceptedRequest>(`/hotline/expert/queue/${id}/accept`, {
          method: 'POST',
        });
        setWaiting((prev) => prev.filter((request) => request.id !== id));
        setAccepted((prev) => [res, ...prev]);
      } catch (error: any) {
        // A 409 means somebody else was faster. That is normal on a shared queue,
        // so it is reported as information rather than as a failure.
        const conflict = error?.status === 409;
        toast(
          conflict ? t('hotline', 'taken') : error?.message || t('common', 'error'),
          conflict ? 'info' : 'error',
        );
        loadQueue();
      } finally {
        setBusyId(null);
      }
    },
    [loadQueue, toast, t],
  );

  const complete = useCallback(
    async (id: string) => {
      setBusyId(id);
      try {
        await apiFetch(`/hotline/expert/queue/${id}/complete`, { method: 'POST' });
        setAccepted((prev) => prev.filter((request) => request.id !== id));
      } catch (error: any) {
        toast(error?.message || t('common', 'error'), 'error');
      } finally {
        setBusyId(null);
      }
    },
    [toast, t],
  );

  useEffect(() => {
    if (!online) return undefined;
    const poll = setInterval(loadQueue, POLL_MS);
    // Presence expires on the server, so the switch has to keep proving it is on.
    const beat = setInterval(() => {
      apiFetch<{ onlineUntil: string }>('/hotline/expert/presence', {
        method: 'POST',
        body: JSON.stringify({ minutes: HEARTBEAT_MINUTES }),
      })
        .then((res) => setOnlineUntil(res.onlineUntil))
        .catch(() => {});
    }, HEARTBEAT_MS);

    return () => {
      clearInterval(poll);
      clearInterval(beat);
    };
  }, [online, loadQueue]);

  // Leaving the page should take you off the line, not leave people waiting on
  // somebody who has closed the tab.
  useEffect(
    () => () => {
      if (onlineRef.current) {
        apiFetch('/hotline/expert/presence', { method: 'DELETE' }).catch(() => {});
      }
    },
    [],
  );

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">{t('hotline', 'title')}</h1>
          <p className="mt-1 text-sm text-[var(--text2)]">{t('hotline', 'subtitle')}</p>
        </header>

        <section className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${
                  online ? 'bg-emerald-500' : 'bg-[var(--text3,#9CA3AF)]'
                }`}
                aria-hidden
              />
              <div>
                <div className="text-sm font-semibold">
                  {online ? t('hotline', 'onTheLine') : t('hotline', 'offTheLine')}
                </div>
                {online && onlineUntil ? (
                  <div className="text-xs text-[var(--text2)]">
                    {t('hotline', 'onlineUntil').replace('{{time}}', time(onlineUntil))}
                  </div>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={online ? goOffline : goOnline}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${
                online
                  ? 'border border-[var(--border)] text-[var(--text2)]'
                  : 'bg-[var(--primary)] text-white'
              }`}
            >
              {online ? <PhoneOff size={16} /> : <PhoneCall size={16} />}
              {online ? t('hotline', 'goOffline') : t('hotline', 'goOnline')}
            </button>
          </div>
        </section>

        {!online ? (
          <p className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--text2)]">
            {t('hotline', 'notOnDuty')}
          </p>
        ) : (
          <>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--text2)]">
              <Users size={15} />
              {t('hotline', 'queue')}
              {waiting.length > 0 ? ` · ${waiting.length}` : ''}
            </h2>

            {loaded && waiting.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--text2)]">
                {t('hotline', 'queueEmpty')}
              </p>
            ) : null}

            <ul className="space-y-3">
              {waiting.map((request) => (
                <li
                  key={request.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
                >
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs text-[var(--text2)]">
                    <span>
                      {t('hotline', 'waitingSince').replace('{{time}}', time(request.createdAt))}
                    </span>
                    {request.locale ? <span className="uppercase">{request.locale}</span> : null}
                  </div>

                  <p className="text-sm">
                    {request.reason || (
                      <span className="text-[var(--text2)]">{t('hotline', 'noReason')}</span>
                    )}
                  </p>

                  {request.symptomReportId ? (
                    <p className="mt-2 text-xs font-medium text-[var(--primary)]">
                      {t('hotline', 'bodyMapAttached')}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => accept(request.id)}
                    disabled={busyId === request.id}
                    className="mt-3 w-full rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {busyId === request.id ? t('hotline', 'accepting') : t('hotline', 'accept')}
                  </button>
                </li>
              ))}
            </ul>

            {accepted.length > 0 ? (
              <>
                <h2 className="mb-3 mt-8 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--text2)]">
                  <CheckCircle2 size={15} />
                  {t('hotline', 'onTheLine')}
                </h2>
                <ul className="space-y-3">
                  {accepted.map((request) => (
                    <li
                      key={request.id}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
                    >
                      <p className="text-sm">
                        {request.reason || (
                          <span className="text-[var(--text2)]">{t('hotline', 'noReason')}</span>
                        )}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {request.conversationId ? (
                          <Link
                            href={`/chats/${request.conversationId}`}
                            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
                          >
                            <MessageSquare size={15} />
                            {t('hotline', 'openChat')}
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => complete(request.id)}
                          disabled={busyId === request.id}
                          className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text2)] disabled:opacity-60"
                        >
                          {t('hotline', 'complete')}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}
