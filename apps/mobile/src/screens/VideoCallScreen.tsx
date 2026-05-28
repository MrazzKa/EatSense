/**
 * Real-time video consultation screen powered by LiveKit.
 *
 * Flow:
 *   1. Read conversationId from route params.
 *   2. POST /video/token/:conversationId → { token, url, roomName, sessionId }.
 *   3. Render <LiveKitRoom> which establishes WebRTC connection.
 *   4. On explicit hangup, POST /video/session/:id/ended with duration.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
    LiveKitRoom,
    AudioSession,
    VideoTrack,
} from '@livekit/react-native';
// useTracks + isTrackReference live in @livekit/components-react (peer dep of
// @livekit/react-native, transitively installed). The mobile SDK reuses these
// framework-agnostic hooks and only ships its own native <VideoTrack> renderer.
import { useTracks, isTrackReference, useRoomContext } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useI18n } from '../../app/i18n/hooks';
import { useTheme } from '../contexts/ThemeContext';
import ApiService from '../services/apiService';
import MarketplaceService from '../services/marketplaceService';

// Note: LiveKit's WebRTC globals are registered once at app bootstrap (App.tsx).
// Calling registerGlobals() here too would be idempotent but redundant.

type TokenResponse = {
    token: string;
    url: string;
    roomName: string;
    sessionId: string;
    expiresIn: number;
};

export default function VideoCallScreen({ route, navigation }: any) {
    const { conversationId, consultationId } = route.params || {};
    const { t } = useI18n();
    const { colors } = useTheme();
    const [creds, setCreds] = useState<TokenResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [connectionLost, setConnectionLost] = useState(false);
    const [consultationEndAt, setConsultationEndAt] = useState<number | null>(null);
    const [isExpertSide, setIsExpertSide] = useState(false);
    const startedAtRef = useRef<number | null>(null);

    const fetchToken = useCallback(async () => {
        if (!conversationId) {
            setError(t('experts.video.noConversation') || 'Missing conversation');
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const res = await ApiService.request(`/video/token/${conversationId}`, {
                method: 'POST',
                body: JSON.stringify({}),
            });
            setCreds(res);
            // startedAtRef is set in onConnected (first connect only) so that
            // billed duration matches actual time spent in the room.
        } catch (err: any) {
            const status = err?.response?.status || err?.status;
            if (status === 503) {
                setError(t('experts.video.unavailable') || 'Video calls are not available yet.');
            } else {
                setError(err?.message || 'Failed to start video');
            }
        } finally {
            setLoading(false);
        }
    }, [conversationId, t]);

    useEffect(() => {
        fetchToken();
    }, [fetchToken]);

    useEffect(() => {
        if (!conversationId) return;
        let cancelled = false;
        MarketplaceService.getConversation(conversationId)
            .then((conversation: any) => {
                if (!cancelled) setIsExpertSide(Boolean(conversation?.isExpert));
            })
            .catch(() => {
                if (!cancelled) setIsExpertSide(false);
            });
        return () => { cancelled = true; };
    }, [conversationId]);

    // Load consultation end time so we can auto-finish when the paid window closes.
    useEffect(() => {
        if (!consultationId) return;
        let cancelled = false;
        ApiService.request(`/consultations/${consultationId}`)
            .then((data: any) => {
                if (cancelled) return;
                if (data?.endAt) setConsultationEndAt(new Date(data.endAt).getTime());
            })
            .catch(() => { });
        return () => { cancelled = true; };
    }, [consultationId]);

    // iOS/Android audio session lifecycle (echo cancellation, route, etc).
    useEffect(() => {
        if (!creds) return;
        let started = false;
        AudioSession.startAudioSession().then(() => { started = true; }).catch(() => { });
        return () => {
            if (started) AudioSession.stopAudioSession().catch(() => { });
        };
    }, [creds]);

    const sessionEndedRef = useRef(false);

    const endCallInternal = useCallback(async (opts?: { suppressNavigation?: boolean }) => {
        if (sessionEndedRef.current) {
            if (!opts?.suppressNavigation) navigation.goBack();
            return;
        }
        sessionEndedRef.current = true;
        const duration = startedAtRef.current
            ? Math.round((Date.now() - startedAtRef.current) / 1000)
            : 0;
        if (creds?.sessionId) {
            try {
                await ApiService.request(`/video/session/${creds.sessionId}/ended`, {
                    method: 'POST',
                    body: JSON.stringify({ durationSec: duration }),
                });
            } catch {
                // Best-effort — backend may already mark sessions as ended via heartbeat timeout.
            }
        }
        if (!opts?.suppressNavigation) navigation.goBack();
    }, [creds, navigation]);

    const endCall = useCallback(() => {
        endCallInternal();
    }, [endCallInternal]);

    // Hard guarantee: if the user backs out via gesture, hardware back, or the
    // screen unmounts for any reason, still report the session as ended so it
    // doesn't get stuck in `in_call` forever.
    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
            if (sessionEndedRef.current || !creds?.sessionId) return;
            e.preventDefault();
            endCallInternal({ suppressNavigation: true }).finally(() => {
                navigation.dispatch(e.data.action);
            });
        });
        return unsubscribe;
    }, [navigation, creds?.sessionId, endCallInternal]);

    useEffect(() => {
        return () => {
            if (!sessionEndedRef.current && creds?.sessionId) {
                // Fire-and-forget — component is unmounting, we cannot block here.
                ApiService.request(`/video/session/${creds.sessionId}/ended`, {
                    method: 'POST',
                    body: JSON.stringify({
                        durationSec: startedAtRef.current
                            ? Math.round((Date.now() - startedAtRef.current) / 1000)
                            : 0,
                    }),
                }).catch(() => {});
            }
        };
    }, [creds?.sessionId]);

    // Auto-finish call when the paid consultation window closes. We give a small
    // grace (60s after endAt) so trailing wrap-up doesn't get cut mid-sentence.
    useEffect(() => {
        if (!consultationEndAt || !creds?.sessionId) return;
        const graceMs = 60_000;
        const dueAt = consultationEndAt + graceMs;
        const now = Date.now();
        if (now >= dueAt) {
            endCallInternal();
            return;
        }
        const handle = setTimeout(() => {
            endCallInternal();
        }, dueAt - now);
        return () => clearTimeout(handle);
    }, [consultationEndAt, creds?.sessionId, endCallInternal]);

    const onConnected = useCallback(() => {
        setConnectionLost(false);
        // Set start time only on the first successful connect — otherwise reconnects
        // would reset the clock and the billed duration becomes wrong.
        if (!startedAtRef.current) {
            startedAtRef.current = Date.now();
        }
        if (creds?.sessionId) {
            ApiService.request(`/video/session/${creds.sessionId}/started`, {
                method: 'POST',
                body: JSON.stringify({}),
            }).catch(() => { });
        }
    }, [creds]);

    const onDisconnected = useCallback(() => {
        setConnectionLost(true);
    }, []);

    if (loading) {
        return (
            <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                    {t('experts.video.connecting') || 'Connecting…'}
                </Text>
            </SafeAreaView>
        );
    }

    if (error || !creds) {
        return (
            <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
                <Ionicons name="videocam-off-outline" size={48} color={colors.textTertiary} />
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                    {t('experts.video.unavailableTitle') || 'Video unavailable'}
                </Text>
                <Text style={[styles.hint, { color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 }]}>
                    {error || 'Try again later.'}
                </Text>
                <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.primaryButtonText}>{t('common.back') || 'Back'}</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.fullscreen}>
            <StatusBar barStyle="light-content" />
            <LiveKitRoom
                serverUrl={creds.url}
                token={creds.token}
                connect
                audio
                video
                onConnected={onConnected}
                onDisconnected={onDisconnected}
            >
                <RoomView
                    onEndCall={endCall}
                    t={t}
                    connectionLost={connectionLost}
                    sessionId={creds.sessionId}
                    isExpertSide={isExpertSide}
                />
            </LiveKitRoom>
        </View>
    );
}

function RoomView({
    onEndCall,
    t,
    connectionLost,
    sessionId,
    isExpertSide,
}: {
    onEndCall: () => void;
    t: any;
    connectionLost: boolean;
    sessionId: string;
    isExpertSide: boolean;
}) {
    const room = useRoomContext();
    const [micEnabled, setMicEnabled] = useState(true);
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [clientMuted, setClientMuted] = useState(false);
    const [moderationBusy, setModerationBusy] = useState(false);
    const tracks = useTracks(
        [
            { source: Track.Source.Camera, withPlaceholder: true },
            { source: Track.Source.ScreenShare, withPlaceholder: false },
        ],
        { onlySubscribed: false },
    );

    // Find remote camera (the other participant) and local camera (self).
    const remote = tracks.find(
        (tr) => isTrackReference(tr) && !tr.participant.isLocal && tr.source === Track.Source.Camera,
    );
    const local = tracks.find(
        (tr) => isTrackReference(tr) && tr.participant.isLocal && tr.source === Track.Source.Camera,
    );

    const toggleMic = useCallback(async () => {
        const next = !micEnabled;
        setMicEnabled(next);
        await room.localParticipant.setMicrophoneEnabled(next).catch(() => setMicEnabled(!next));
    }, [micEnabled, room]);

    const toggleCamera = useCallback(async () => {
        const next = !cameraEnabled;
        setCameraEnabled(next);
        await room.localParticipant.setCameraEnabled(next).catch(() => setCameraEnabled(!next));
    }, [cameraEnabled, room]);

    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const switchCamera = useCallback(async () => {
        const next = facingMode === 'user' ? 'environment' : 'user';
        // Restart the local camera track with the opposite facing mode.
        const track: any = (local as any)?.publication?.track;
        try {
            if (track?.restartTrack) {
                await track.restartTrack({ facingMode: next });
                setFacingMode(next);
            }
        } catch {
            /* keep current camera on failure */
        }
    }, [facingMode, local]);

    const toggleClientMute = useCallback(async () => {
        if (!sessionId || moderationBusy) return;
        const next = !clientMuted;
        setModerationBusy(true);
        try {
            await ApiService.request(`/video/session/${sessionId}/mute-participant`, {
                method: 'POST',
                body: JSON.stringify({ mute: next }),
            });
            setClientMuted(next);
        } catch {
            // The client may not have joined yet or may have no audio track.
        } finally {
            setModerationBusy(false);
        }
    }, [clientMuted, moderationBusy, sessionId]);

    return (
        <View style={styles.fullscreen}>
            {connectionLost ? (
                <SafeAreaView style={styles.reconnectingBanner} edges={['top']}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.reconnectingText}>
                        {t('experts.video.reconnecting') || 'Reconnecting...'}
                    </Text>
                </SafeAreaView>
            ) : null}

            {/* Remote video — full screen */}
            <View style={styles.remoteWrap}>
                {remote && isTrackReference(remote) ? (
                    <VideoTrack trackRef={remote} style={styles.remote} />
                ) : (
                    <View style={[styles.remote, styles.waitingRoom]}>
                        <View style={styles.waitingPulse}>
                            <Ionicons name="videocam-outline" size={64} color="#cdd5e0" />
                        </View>
                        <Text style={styles.waitingTitle}>
                            {t('experts.video.waitingForPeer') || 'Waiting for the other participant…'}
                        </Text>
                        <Text style={styles.waitingSubtitle}>
                            {t('experts.videoWaitingHint') || 'You will join automatically when they connect.'}
                        </Text>
                    </View>
                )}
            </View>

            {/* Local self-view — PIP top-right */}
            {local && isTrackReference(local) ? (
                <View style={styles.localPip}>
                    <VideoTrack trackRef={local} style={styles.localPipVideo} />
                </View>
            ) : (
                <View style={[styles.localPip, styles.localPipPlaceholder]}>
                    <Ionicons name="person" size={32} color="#cdd5e0" />
                </View>
            )}

            {/* Cancel waiting (shown while peer hasn't joined yet) */}
            {!remote && (
                <SafeAreaView style={styles.cancelContainer} edges={['top']}>
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={onEndCall}
                        accessibilityLabel={t('experts.video.cancel') || 'Cancel call'}
                    >
                        <Ionicons name="close" size={18} color="#fff" />
                        <Text style={styles.cancelButtonText}>
                            {t('experts.video.cancel') || 'Cancel'}
                        </Text>
                    </TouchableOpacity>
                </SafeAreaView>
            )}

            {/* End-call button */}
            <SafeAreaView style={styles.controlsContainer} edges={['bottom']}>
                <TouchableOpacity
                    style={[styles.mediaButton, !micEnabled && styles.mediaButtonOff]}
                    onPress={toggleMic}
                    accessibilityLabel={micEnabled ? (t('experts.video.muteMic') || 'Mute microphone') : (t('experts.video.unmuteMic') || 'Unmute microphone')}
                >
                    <Ionicons name={micEnabled ? 'mic' : 'mic-off'} size={26} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.endCallButton} onPress={onEndCall}>
                    <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.mediaButton, !cameraEnabled && styles.mediaButtonOff]}
                    onPress={toggleCamera}
                    accessibilityLabel={cameraEnabled ? (t('experts.video.disableCamera') || 'Turn camera off') : (t('experts.video.enableCamera') || 'Turn camera on')}
                >
                    <Ionicons name={cameraEnabled ? 'videocam' : 'videocam-off'} size={26} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.mediaButton}
                    onPress={switchCamera}
                    disabled={!cameraEnabled}
                    accessibilityLabel={t('experts.video.switchCamera') || 'Switch camera'}
                >
                    <Ionicons name="camera-reverse-outline" size={26} color="#fff" />
                </TouchableOpacity>
                {isExpertSide && (
                    <TouchableOpacity
                        style={[styles.mediaButton, clientMuted && styles.mediaButtonOff]}
                        onPress={toggleClientMute}
                        disabled={moderationBusy}
                        accessibilityLabel={clientMuted
                            ? (t('experts.video.unmuteClient') || 'Unmute client')
                            : (t('experts.video.muteClient') || 'Mute client')}
                    >
                        <Ionicons name={clientMuted ? 'volume-high-outline' : 'volume-mute-outline'} size={25} color="#fff" />
                    </TouchableOpacity>
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    fullscreen: {
        flex: 1,
        backgroundColor: '#000',
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    title: { fontSize: 20, fontWeight: '600', marginTop: 8 },
    hint: { fontSize: 14 },
    primaryButton: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 12 },
    primaryButtonText: { color: '#fff', fontWeight: '600' },
    remoteWrap: { flex: 1, backgroundColor: '#000' },
    remote: { flex: 1, width: '100%', height: '100%' },
    waitingRoom: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#111',
        gap: 12,
    },
    waitingText: { color: '#aaa', fontSize: 14 },
    waitingPulse: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    waitingTitle: { color: '#e8eaf0', fontSize: 17, fontWeight: '600', textAlign: 'center', paddingHorizontal: 32 },
    waitingSubtitle: { color: '#8b8b8b', fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
    localPip: {
        position: 'absolute',
        top: 60,
        right: 16,
        width: 110,
        height: 160,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        backgroundColor: '#222',
    },
    localPipVideo: { flex: 1 },
    localPipPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    reconnectingBanner: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
        backgroundColor: 'rgba(15, 23, 42, 0.86)',
    },
    reconnectingText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    controlsContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingBottom: 24,
    },
    mediaButton: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    mediaButtonOff: {
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    endCallButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#E53935',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 8,
    },
    cancelContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        alignItems: 'flex-start',
        paddingTop: 12,
        paddingHorizontal: 16,
        zIndex: 30,
    },
    cancelButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    cancelButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
});
