import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../app/i18n/hooks';

/**
 * ConsultationCard - Displays consultation/chat summary
 */
export default function ConsultationCard({ consultation, onPress }) {
    const { t } = useI18n();

    const specialist = consultation.specialist;
    const lastMessage = consultation.messages?.[0];
    const unreadCount = consultation._count?.messages || 0;

    const statusColors = {
        active: '#4CAF50',
        completed: '#9CA3AF',
        cancelled: '#EF4444',
    };

    const statusLabels = {
        active: t('consultations.status_active') || 'Active',
        completed: t('consultations.status_completed') || 'Completed',
        cancelled: t('consultations.status_cancelled') || 'Cancelled',
    };

    const formatTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return t('common.yesterday') || 'Yesterday';
        } else if (diffDays < 7) {
            return date.toLocaleDateString([], { weekday: 'short' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.8}
        >
            {/* Avatar */}
            <View style={styles.avatarContainer}>
                {specialist?.avatarUrl ? (
                    <Image
                        source={{ uri: specialist.avatarUrl }}
                        style={styles.avatar}
                    />
                ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <Ionicons name="person" size={24} color="#9CA3AF" />
                    </View>
                )}
                {unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </Text>
                    </View>
                )}
            </View>

            {/* Content */}
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.name} numberOfLines={1}>
                        {specialist?.displayName || 'Specialist'}
                    </Text>
                    <Text style={styles.time}>
                        {formatTime(lastMessage?.createdAt || consultation.updatedAt)}
                    </Text>
                </View>

                <View style={styles.messageRow}>
                    <Text style={[styles.message, unreadCount > 0 && styles.messageUnread]} numberOfLines={1}>
                        {lastMessage?.content || t('consultations.no_messages') || 'No messages yet'}
                    </Text>
                </View>

                <View style={styles.footer}>
                    <View style={[styles.statusBadge, { backgroundColor: statusColors[consultation.status] + '20' }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusColors[consultation.status] }]} />
                        <Text style={[styles.statusText, { color: statusColors[consultation.status] }]}>
                            {statusLabels[consultation.status] || consultation.status}
                        </Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarPlaceholder: {
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    unreadBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    unreadText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '700',
    },
    content: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    name: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
        flex: 1,
        marginRight: 8,
    },
    time: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    messageRow: {
        marginBottom: 6,
    },
    message: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 18,
    },
    messageUnread: {
        color: '#1F2937',
        fontWeight: '500',
    },
    footer: {
        flexDirection: 'row',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 4,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
});
