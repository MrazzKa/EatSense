'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, MicOff, Mic, PhoneOff, VideoOff } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { apiFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n/context';
import {
    LiveKitRoom,
    VideoConference,
    formatChatMessageLinks,
} from '@livekit/components-react';
import '@livekit/components-styles';

type TokenResp = {
    token: string;
    url: string;
    roomName: string;
    sessionId: string;
    expiresIn: number;
};

/**
 * Expert-side video consultation page.
 *
 * Mirrors the mobile VideoCallScreen: fetches a LiveKit JWT for the given
 * conversation and renders the LiveKit pre-built VideoConference component
 * (camera/mic toggle, screen share, participant grid, leave button).
 */
export default function ExpertCallPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const { t } = useI18n();
    const conversationId = params?.id;
    const [creds, setCreds] = useState<TokenResp | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [connectionLost, setConnectionLost] = useState(false);
    const [clientMuted, setClientMuted] = useState(false);
    const [muting, setMuting] = useState(false);
    const startedAtRef = useRef<number | null>(null);

    const sessionEndedRef = useRef(false);
    const [consultationEndAt, setConsultationEndAt] = useState<number | null>(null);

    // Try to load consultation endAt — if `params.id` is a scheduled consultation
    // id, we can auto-finish the call when its paid window closes. If it's a raw
    // conversation id this returns 404 and we silently skip the timer.
    useEffect(() => {
        if (!conversationId) return;
        let cancelled = false;
        apiFetch<any>(`/consultations/${conversationId}`)
            .then((data) => {
                if (!cancelled && data?.endAt) {
                    setConsultationEndAt(new Date(data.endAt).getTime());
                }
            })
            .catch(() => { /* not a consultation id, no auto-end */ });
        return () => { cancelled = true; };
    }, [conversationId]);

    useEffect(() => {
        if (!conversationId) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await apiFetch<TokenResp>(`/video/token/${conversationId}`, { method: 'POST' });
                if (!cancelled) {
                    setCreds(res);
                    // startedAtRef is set in onConnected (first connect only) so the
                    // billed duration matches actual time spent in the room.
                }
            } catch (err: any) {
                if (cancelled) return;
                const status = err?.status || err?.response?.status;
                setError(status === 503
                    ? t('call', 'notConfigured')
                    : (err?.message || 'Failed to start video session'));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [conversationId, t]);

    const onConnected = useCallback(() => {
        setConnectionLost(false);
        // First connect only — reconnects must not reset the duration clock.
        if (!startedAtRef.current) {
            startedAtRef.current = Date.now();
        }
        if (creds?.sessionId) {
            apiFetch(`/video/session/${creds.sessionId}/started`, {
                method: 'POST',
                body: JSON.stringify({}),
            }).catch(() => { /* swallow */ });
        }
    }, [creds]);

    const finishCall = useCallback(async () => {
        if (sessionEndedRef.current) {
            router.push('/chats');
            return;
        }
        sessionEndedRef.current = true;
        const duration = startedAtRef.current
            ? Math.round((Date.now() - startedAtRef.current) / 1000)
            : 0;
        if (creds?.sessionId) {
            try {
                await apiFetch(`/video/session/${creds.sessionId}/ended`, {
                    method: 'POST',
                    body: JSON.stringify({ durationSec: duration }),
                });
            } catch { /* swallow */ }
        }
        router.push('/chats');
    }, [creds, router]);

    const onDisconnected = useCallback(() => {
        setConnectionLost(true);
    }, []);

    const toggleClientMute = useCallback(async () => {
        if (!creds?.sessionId || muting) return;
        const next = !clientMuted;
        setMuting(true);
        try {
            await apiFetch(`/video/session/${creds.sessionId}/mute-participant`, {
                method: 'POST',
                body: JSON.stringify({ mute: next }),
            });
            setClientMuted(next);
        } catch {
            /* surface nothing; expert can retry */
        } finally {
            setMuting(false);
        }
    }, [creds?.sessionId, clientMuted, muting]);

    // Auto-finish when the paid consultation window closes (+60s grace).
    useEffect(() => {
        if (!consultationEndAt || !creds?.sessionId) return;
        const graceMs = 60_000;
        const dueAt = consultationEndAt + graceMs;
        const now = Date.now();
        if (now >= dueAt) {
            finishCall();
            return;
        }
        const handle = setTimeout(() => finishCall(), dueAt - now);
        return () => clearTimeout(handle);
    }, [consultationEndAt, creds?.sessionId, finishCall]);

    // Guarantee the session is reported as ended even if the user navigates
    // away by closing the tab, hitting browser back, or being redirected by
    // ProtectedRoute. Otherwise the row sits in `in_call` until heartbeat
    // timeout (worst case: clock charges keep running).
    useEffect(() => {
        const handleUnload = () => {
            if (sessionEndedRef.current || !creds?.sessionId) return;
            const duration = startedAtRef.current
                ? Math.round((Date.now() - startedAtRef.current) / 1000)
                : 0;
            // sendBeacon is the only request type guaranteed to complete during
            // unload. Falls back to keepalive fetch on Safari.
            try {
                const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
                const url = `${process.env.NEXT_PUBLIC_API_URL || ''}/video/session/${creds.sessionId}/ended`;
                const body = JSON.stringify({ durationSec: duration });
                if (navigator?.sendBeacon) {
                    const blob = new Blob([body], { type: 'application/json' });
                    navigator.sendBeacon(`${url}?token=${encodeURIComponent(token || '')}`, blob);
                } else {
                    fetch(url, {
                        method: 'POST',
                        keepalive: true,
                        headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body,
                    }).catch(() => {});
                }
                sessionEndedRef.current = true;
            } catch {
                // Best-effort.
            }
        };

        window.addEventListener('beforeunload', handleUnload);
        window.addEventListener('pagehide', handleUnload);
        return () => {
            window.removeEventListener('beforeunload', handleUnload);
            window.removeEventListener('pagehide', handleUnload);
            // Component unmounting via in-app nav (router.push without finishCall).
            handleUnload();
        };
    }, [creds?.sessionId]);

    if (loading) {
        return (
            <AppShell>
                <div className="max-w-3xl mx-auto p-8 text-center text-[var(--text2)]">
                    {t('call', 'connecting')}
                </div>
            </AppShell>
        );
    }

    if (error || !creds) {
        return (
            <AppShell>
                <div className="max-w-3xl mx-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
                    <VideoOff size={36} className="mx-auto text-[var(--text2)] mb-3" />
                    <h2 className="font-medium mb-1">{t('call', 'unavailable')}</h2>
                    <p className="text-sm text-[var(--text2)]">{error || t('call', 'tryAgainLater')}</p>
                </div>
            </AppShell>
        );
    }

    // Full-bleed video conference. LiveKit pre-built component handles the
    // entire UI: participant tiles, mute/video toggle, screen share, chat,
    // leave button. Styles come from @livekit/components-styles import above.
    return (
        <div data-lk-theme="default" style={{ height: '100vh', background: '#000' }}>
            <LiveKitRoom
                token={creds.token}
                serverUrl={creds.url}
                connect
                video
                audio
                onConnected={onConnected}
                onDisconnected={onDisconnected}
                style={{ height: '100%' }}
            >
                <div className="fixed left-4 right-4 top-4 z-20 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-white backdrop-blur md:left-6 md:right-6">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{connectionLost ? t('call', 'reconnecting') : t('call', 'inProgress')}</p>
                        <p className="truncate text-xs text-white/70">{connectionLost ? t('call', 'reconnectingHint') : t('call', 'inProgressHint')}</p>
                    </div>
                    {connectionLost ? <Loader2 size={18} className="shrink-0 animate-spin text-white/80" /> : null}
                    <button
                        type="button"
                        onClick={toggleClientMute}
                        disabled={muting}
                        className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-50"
                    >
                        {clientMuted ? <Mic size={16} /> : <MicOff size={16} />}
                        {clientMuted ? t('call', 'unmuteClient') : t('call', 'muteClient')}
                    </button>
                    <button
                        type="button"
                        onClick={finishCall}
                        className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[var(--red)] px-3 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
                    >
                        <PhoneOff size={16} />
                        {t('call', 'end')}
                    </button>
                </div>
                <VideoConference chatMessageFormatter={formatChatMessageLinks} />
            </LiveKitRoom>
        </div>
    );
}
