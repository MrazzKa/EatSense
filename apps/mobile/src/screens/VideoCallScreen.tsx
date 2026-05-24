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
    const { conversationId } = route.params || {};
    const { t } = useI18n();
    const { colors } = useTheme();
    const [creds, setCreds] = useState<TokenResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [connectionLost, setConnectionLost] = useState(false);
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
            startedAtRef.current = Date.now();
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

    // iOS/Android audio session lifecycle (echo cancellation, route, etc).
    useEffect(() => {
        if (!creds) return;
        let started = false;
        AudioSession.startAudioSession().then(() => { started = true; }).catch(() => { });
        return () => {
            if (started) AudioSession.stopAudioSession().catch(() => { });
        };
    }, [creds]);

    const endCall = useCallback(async () => {
        const duration = startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : 0;
        if (creds?.sessionId) {
            ApiService.request(`/video/session/${creds.sessionId}/ended`, {
                method: 'POST',
                body: JSON.stringify({ durationSec: duration }),
            }).catch(() => { });
        }
        navigation.goBack();
    }, [creds, navigation]);

    const onConnected = useCallback(() => {
        setConnectionLost(false);
        startedAtRef.current = Date.now();
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
                <RoomView onEndCall={endCall} t={t} connectionLost={connectionLost} />
            </LiveKitRoom>
        </View>
    );
}

function RoomView({ onEndCall, t, connectionLost }: { onEndCall: () => void; t: any; connectionLost: boolean }) {
    const room = useRoomContext();
    const [micEnabled, setMicEnabled] = useState(true);
    const [cameraEnabled, setCameraEnabled] = useState(true);
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
        gap: 18,
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
});
