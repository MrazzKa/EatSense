'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { VideoOff } from 'lucide-react';
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
    const startedAtRef = useRef<number | null>(null);

    useEffect(() => {
        if (!conversationId) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await apiFetch<TokenResp>(`/video/token/${conversationId}`, { method: 'POST' });
                if (!cancelled) {
                    setCreds(res);
                    startedAtRef.current = Date.now();
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
    }, [conversationId]);

    const onConnected = useCallback(() => {
        startedAtRef.current = Date.now();
        if (creds?.sessionId) {
            apiFetch(`/video/session/${creds.sessionId}/started`, {
                method: 'POST',
                body: JSON.stringify({}),
            }).catch(() => { /* swallow */ });
        }
    }, [creds]);

    const onDisconnected = useCallback(async () => {
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
                <VideoConference chatMessageFormatter={formatChatMessageLinks} />
            </LiveKitRoom>
        </div>
    );
}
