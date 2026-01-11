import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import MarketplaceService from '../services/marketplaceService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ROLE_STORAGE_KEY = '@eatsense:expertsRole';

interface ConversationsListScreenProps {
    navigation: any;
}

export default function ConversationsListScreen({ navigation }: ConversationsListScreenProps) {
    const { colors } = useTheme();
    const { t } = useI18n();
    const [conversations, setConversations] = useState<{
        asClient: any[];
        asExpert: any[];
    }>({ asClient: [], asExpert: [] });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'client' | 'expert'>('client');
    const [isExpert, setIsExpert] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            setLoading(true);

            // Check if user is an expert
            const role = await AsyncStorage.getItem(ROLE_STORAGE_KEY);
            setIsExpert(role === 'expert');

            const data = await MarketplaceService.getConversations();
            setConversations({
                asClient: data?.asClient || [],
                asExpert: data?.asExpert || [],
            });

            // Default tab based on role
            if (role === 'expert' && data?.asExpert?.length > 0) {
                setActiveTab('expert');
            }
        } catch (error) {
            console.error('Failed to load conversations:', error);
            setConversations({ asClient: [], asExpert: [] });
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (days === 1) {
            return t('common.yesterday', 'Yesterday');
        } else if (days < 7) {
            return `${days} ${t('common.daysAgo', 'days ago')}`;
        }
        return date.toLocaleDateString();
    };

    const renderConversation = ({ item }: { item: any }) => {
        const isClientView = activeTab === 'client';
        const displayName = isClientView
            ? item.expert?.displayName || 'Expert'
            : `${item.client?.userProfile?.firstName || ''} ${item.client?.userProfile?.lastName || ''}`.trim() || 'Client';
        const avatarUrl = isClientView
            ? item.expert?.avatarUrl
            : item.client?.userProfile?.avatarUrl;

        const hasUnread = item._count?.messages > 0;

        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => navigation.navigate('ConversationChat', { conversationId: item.id })}
            >
                <View style={styles.cardHeader}>
                    {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                            <Ionicons name="person" size={24} color={colors.primary} />
                        </View>
                    )}
                    <View style={styles.cardInfo}>
                        <View style={styles.nameRow}>
                            <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                                {displayName}
                            </Text>
                            {item.expert?.isVerified && isClientView && (
                                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" style={{ marginLeft: 4 }} />
                            )}
                        </View>
                        {isClientView && item.expert?.type && (
                            <Text style={[styles.type, { color: colors.textSecondary }]}>
                                {item.expert.type === 'dietitian' ? t('experts.dietitian.title', 'Dietitian') : t('experts.nutritionist.title', 'Nutritionist')}
                            </Text>
                        )}
                    </View>
                    <View style={styles.rightSection}>
                        <Text style={[styles.date, { color: colors.textSecondary }]}>
                            {formatDate(item.lastMessageAt || item.createdAt)}
                        </Text>
                        {hasUnread && (
                            <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                                <Text style={styles.unreadText}>{item._count.messages}</Text>
                            </View>
                        )}
                    </View>
                </View>
                {item.messages?.[0] && (
                    <Text
                        style={[styles.lastMessage, { color: hasUnread ? colors.textPrimary : colors.textSecondary }]}
                        numberOfLines={2}
                    >
                        {item.messages[0].content}
                    </Text>
                )}
                {item.offer && (
                    <View style={[styles.offerTag, { backgroundColor: colors.primary + '15' }]}>
                        <Text style={[styles.offerTagText, { color: colors.primary }]}>
                            {(item.offer.name as any)?.ru || (item.offer.name as any)?.en || 'Offer'}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const currentList = activeTab === 'client' ? conversations.asClient : conversations.asExpert;
    const showTabs = isExpert && (conversations.asClient.length > 0 || conversations.asExpert.length > 0);

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                    {t('experts.myConversations', 'My Chats')}
                </Text>
                <View style={{ width: 24 }} />
            </View>

            {showTabs && (
                <View style={[styles.tabContainer, { borderColor: colors.border }]}>
                    <TouchableOpacity
                        style={[
                            styles.tabButton,
                            activeTab === 'client' && { backgroundColor: colors.primary },
                        ]}
                        onPress={() => setActiveTab('client')}
                    >
                        <Text style={[
                            styles.tabText,
                            { color: activeTab === 'client' ? '#FFF' : colors.textSecondary }
                        ]}>
                            {t('experts.asClient', 'As Client')}
                        </Text>
                        {conversations.asClient.length > 0 && (
                            <View style={[styles.tabBadge, { backgroundColor: activeTab === 'client' ? '#FFF' : colors.primary }]}>
                                <Text style={[styles.tabBadgeText, { color: activeTab === 'client' ? colors.primary : '#FFF' }]}>
                                    {conversations.asClient.length}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.tabButton,
                            activeTab === 'expert' && { backgroundColor: '#7C3AED' },
                        ]}
                        onPress={() => setActiveTab('expert')}
                    >
                        <Text style={[
                            styles.tabText,
                            { color: activeTab === 'expert' ? '#FFF' : colors.textSecondary }
                        ]}>
                            {t('experts.asExpert', 'As Expert')}
                        </Text>
                        {conversations.asExpert.length > 0 && (
                            <View style={[styles.tabBadge, { backgroundColor: activeTab === 'expert' ? '#FFF' : '#7C3AED' }]}>
                                <Text style={[styles.tabBadgeText, { color: activeTab === 'expert' ? '#7C3AED' : '#FFF' }]}>
                                    {conversations.asExpert.length}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            <FlatList
                data={currentList}
                renderItem={renderConversation}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="chatbubbles-outline" size={48} color={colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            {t('experts.noConversations', 'No conversations yet')}
                        </Text>
                        {activeTab === 'client' && (
                            <TouchableOpacity
                                style={[styles.findButton, { backgroundColor: colors.primary }]}
                                onPress={() => navigation.navigate('SpecialistList')}
                            >
                                <Text style={styles.findButtonText}>
                                    {t('experts.findSpecialist', 'Find a Specialist')}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },
    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        gap: 6,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
    },
    tabBadge: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    tabBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    list: {
        padding: 16,
        paddingTop: 4,
    },
    card: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardInfo: {
        flex: 1,
        marginLeft: 12,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    type: {
        fontSize: 13,
        marginTop: 2,
    },
    rightSection: {
        alignItems: 'flex-end',
        gap: 6,
    },
    date: {
        fontSize: 12,
    },
    unreadBadge: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    unreadText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '600',
    },
    lastMessage: {
        fontSize: 14,
        marginTop: 12,
        lineHeight: 20,
    },
    offerTag: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        marginTop: 10,
    },
    offerTagText: {
        fontSize: 12,
        fontWeight: '500',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 12,
        marginBottom: 24,
    },
    findButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    findButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
