// @ts-nocheck
import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import MarketplaceService from '../services/marketplaceService';
import ApiService from '../services/apiService';

export default function ConsultationsListScreen({ navigation }) {
    const themeContext = useTheme();
    const tokens = useDesignTokens();
    const colors = themeContext?.colors || {};
    const { t } = useI18n();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadConversations = useCallback(async (isRefresh = false) => {
        try {
            if (!isRefresh) setLoading(true);
            const result = await MarketplaceService.getConversations();
            const data = result?.asClient || [];
            setConversations(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load conversations:', error);
            setConversations([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadConversations();
        }, [loadConversations])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadConversations(true);
    }, [loadConversations]);

    const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        if (diffDays === 1) {
            return t('common.yesterday') || 'Yesterday';
        }
        if (diffDays < 7) {
            return date.toLocaleDateString([], { weekday: 'short' });
        }
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const getLastMessagePreview = (conv) => {
        const lastMsg = conv.messages?.[0];
        if (!lastMsg) return t('experts.noMessages') || 'No messages yet';
        if (lastMsg.type === 'photo') return '📷 ' + (t('experts.photo') || 'Photo');
        if (lastMsg.type === 'meal_share') return '🍽 ' + (t('experts.sharedMeals') || 'Shared meals');
        if (lastMsg.type === 'report_share') return '📊 ' + (t('experts.sharedReport') || 'Shared report');
        return lastMsg.content?.length > 60 ? lastMsg.content.slice(0, 60) + '…' : lastMsg.content;
    };

    const renderConversation = ({ item }) => {
        const expert = item.expert || {};
        const unreadCount = item._count?.messages || 0;
        const isCompleted = item.status === 'completed' || item.status === 'cancelled';
        const lastMessageTime = item.messages?.[0]?.createdAt || item.lastMessageAt || item.createdAt;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('Chat', { conversationId: item.id })}
                activeOpacity={0.7}
            >
                <View style={styles.cardRow}>
                    {expert.avatarUrl ? (
                        <Image source={{ uri: ApiService.resolveMediaUrl(expert.avatarUrl) }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Ionicons name="person" size={22} color="#9CA3AF" />
                        </View>
                    )}

                    <View style={styles.cardContent}>
                        <View style={styles.nameRow}>
                            <Text style={styles.expertName} numberOfLines={1}>
                                {expert.displayName || 'Expert'}
                            </Text>
                            {expert.isVerified && (
                                <Ionicons name="checkmark-circle" size={14} color="#4CAF50" style={{ marginLeft: 4 }} />
                            )}
                            <Text style={styles.timeText}>{formatTime(lastMessageTime)}</Text>
                        </View>

                        <View style={styles.previewRow}>
                            <Text
                                style={[styles.previewText, unreadCount > 0 && styles.previewTextUnread]}
                                numberOfLines={1}
                            >
                                {getLastMessagePreview(item)}
                            </Text>
                            {unreadCount > 0 && (
                                <View style={styles.unreadBadge}>
                                    <Text style={styles.unreadText}>
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {isCompleted && (
                            <View style={styles.statusRow}>
                                <Ionicons name="checkmark-done" size={14} color={colors.textSecondary || '#9CA3AF'} />
                                <Text style={styles.statusText}>
                                    {t('experts.consultationCompleted') || 'Completed'}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary || '#4CAF50'} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary || '#212121'} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('experts.myConsultations') || 'My Consultations'}</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={conversations}
                renderItem={renderConversation}
                keyExtractor={(item) => item.id}
                contentContainerStyle={conversations.length === 0 ? styles.emptyList : styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="chatbubbles-outline" size={56} color={colors.textSecondary || '#9CA3AF'} />
                        <Text style={styles.emptyTitle}>
                            {t('experts.no_consultations') || 'No consultations yet'}
                        </Text>
                        <Text style={styles.emptySubtitle}>
                            {t('experts.findExpertHint') || 'Find an expert to start a consultation'}
                        </Text>
                        <TouchableOpacity
                            style={styles.findButton}
                            onPress={() => navigation.navigate('Experts')}
                        >
                            <Text style={styles.findButtonText}>
                                {t('experts.findSpecialist') || 'Find Expert'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const createStyles = (tokens, colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background || '#FAFAFA',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.surface || '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: colors.border || '#E0E0E0',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary || '#212121',
    },
    list: {
        paddingVertical: 8,
    },
    emptyList: {
        flex: 1,
    },
    card: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: colors.surface || '#FFF',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border || '#E5E7EB',
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    avatarPlaceholder: {
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardContent: {
        flex: 1,
        marginLeft: 12,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    expertName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary || '#212121',
        flex: 1,
    },
    timeText: {
        fontSize: 13,
        color: colors.textSecondary || '#9CA3AF',
        marginLeft: 8,
    },
    previewRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    previewText: {
        fontSize: 14,
        color: colors.textSecondary || '#6B7280',
        flex: 1,
    },
    previewTextUnread: {
        color: colors.textPrimary || '#212121',
        fontWeight: '500',
    },
    unreadBadge: {
        backgroundColor: colors.primary || '#4CAF50',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        paddingHorizontal: 6,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    unreadText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    statusText: {
        fontSize: 12,
        color: colors.textSecondary || '#9CA3AF',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary || '#212121',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: colors.textSecondary || '#6B7280',
        marginTop: 8,
        textAlign: 'center',
    },
    findButton: {
        backgroundColor: colors.primary || '#4CAF50',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 24,
    },
    findButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
