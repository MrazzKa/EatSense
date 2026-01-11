import React, { useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useI18n } from '../../app/i18n/hooks';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import MarketplaceService from '../services/marketplaceService';

interface ConversationChatScreenProps {
    route: {
        params: {
            conversationId: string;
        };
    };
    navigation: any;
}

/**
 * ConversationChatScreen - Real-time chat with expert/client
 */
export default function ConversationChatScreen({ route, navigation }: ConversationChatScreenProps) {
    const { conversationId } = route.params;
    const { t } = useI18n();
    const { user } = useAuth() as any;
    const { colors } = useTheme();

    const [conversation, setConversation] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const flatListRef = useRef<FlatList>(null);

    const loadData = useCallback(async () => {
        try {
            const [conversationData, messagesData] = await Promise.all([
                MarketplaceService.getConversation(conversationId),
                MarketplaceService.getMessages(conversationId),
            ]);

            if (conversationData) {
                setConversation(conversationData);
            }

            if (Array.isArray(messagesData)) {
                setMessages(messagesData);
            }
        } catch (error) {
            console.error('[ConversationChatScreen] Load error:', error);
        } finally {
            setLoading(false);
        }
    }, [conversationId]);

    const loadMessages = useCallback(async (silent = false) => {
        try {
            const messagesData = await MarketplaceService.getMessages(conversationId);
            if (Array.isArray(messagesData)) {
                setMessages(messagesData);
            }
        } catch (error) {
            if (!silent) {
                console.error('[ConversationChatScreen] Load messages error:', error);
            }
        }
    }, [conversationId]);

    useFocusEffect(
        useCallback(() => {
            loadData();
            // Mark as read when entering
            MarketplaceService.markAsRead(conversationId).catch(() => { });

            // Poll for new messages every 5 seconds
            const pollInterval = setInterval(() => {
                loadMessages(true);
            }, 5000);

            return () => clearInterval(pollInterval);
        }, [conversationId, loadData, loadMessages])
    );

    const handleSend = async () => {
        const text = inputText.trim();
        if (!text || sending) return;

        setSending(true);
        setInputText('');

        // Optimistic update
        const tempMessage = {
            id: `temp-${Date.now()}`,
            content: text,
            senderId: user?.id,
            type: 'text',
            createdAt: new Date().toISOString(),
            sender: { id: user?.id },
        };
        setMessages(prev => [...prev, tempMessage]);

        try {
            const newMessage = await MarketplaceService.sendMessage(conversationId, text, 'text');
            // Replace temp message with real one
            setMessages(prev => prev.map(m => m.id === tempMessage.id ? newMessage : m));
        } catch (error) {
            console.error('[ConversationChatScreen] Send error:', error);
            // Remove temp message on error
            setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
            setInputText(text); // Restore text
        } finally {
            setSending(false);
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const isMyMessage = (message: any) => message.senderId === user?.id;

    // Determine the other party based on conversation
    const isClientView = conversation?.clientId === user?.id;
    const otherParty = isClientView ? conversation?.expert : conversation?.client;
    const otherPartyName = isClientView
        ? (otherParty?.displayName || t('experts.expert', 'Expert'))
        : `${otherParty?.userProfile?.firstName || ''} ${otherParty?.userProfile?.lastName || ''}`.trim() || t('experts.client', 'Client');

    const renderMessage = ({ item }: { item: any }) => {
        const isMine = isMyMessage(item);

        // Handle different message types
        if (item.type === 'meal_share') {
            return (
                <View style={[styles.messageContainer, isMine && styles.messageContainerMine]}>
                    <View style={[styles.specialBubble, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
                        <Ionicons name="restaurant" size={20} color={colors.primary} />
                        <Text style={[styles.specialBubbleText, { color: colors.primary }]}>
                            {t('chat.mealShared', 'Meal data shared')}
                        </Text>
                        <Text style={[styles.messageTime, { color: colors.textSecondary }]}>
                            {formatTime(item.createdAt)}
                        </Text>
                    </View>
                </View>
            );
        }

        if (item.type === 'report_share') {
            return (
                <View style={[styles.messageContainer, isMine && styles.messageContainerMine]}>
                    <View style={[styles.specialBubble, { backgroundColor: '#7C3AED15', borderColor: '#7C3AED' }]}>
                        <Ionicons name="document-text" size={20} color="#7C3AED" />
                        <Text style={[styles.specialBubbleText, { color: '#7C3AED' }]}>
                            {t('chat.reportShared', 'Report shared')}
                        </Text>
                        <Text style={[styles.messageTime, { color: colors.textSecondary }]}>
                            {formatTime(item.createdAt)}
                        </Text>
                    </View>
                </View>
            );
        }

        return (
            <View style={[styles.messageContainer, isMine && styles.messageContainerMine]}>
                <View style={[
                    styles.messageBubble,
                    { backgroundColor: isMine ? colors.primary : colors.surface }
                ]}>
                    <Text style={[
                        styles.messageText,
                        { color: isMine ? '#FFF' : colors.textPrimary }
                    ]}>
                        {item.content}
                    </Text>
                    <Text style={[
                        styles.messageTime,
                        { color: isMine ? 'rgba(255,255,255,0.7)' : colors.textSecondary }
                    ]}>
                        {formatTime(item.createdAt)}
                    </Text>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]} edges={['top']}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>

                <View style={styles.headerInfo}>
                    {otherParty?.avatarUrl ? (
                        <Image source={{ uri: otherParty.avatarUrl }} style={styles.headerAvatar} />
                    ) : (
                        <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                            <Ionicons name="person" size={18} color={colors.primary} />
                        </View>
                    )}
                    <View style={styles.headerTextContainer}>
                        <Text style={[styles.headerName, { color: colors.textPrimary }]} numberOfLines={1}>
                            {otherPartyName}
                        </Text>
                        <Text style={[styles.headerStatus, { color: conversation?.status === 'active' ? '#4CAF50' : colors.textSecondary }]}>
                            {conversation?.status === 'active'
                                ? t('chat.active', 'Active')
                                : t('chat.ended', 'Ended')}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.headerAction}>
                    <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* Offer Tag */}
            {conversation?.offer && (
                <View style={[styles.offerBanner, { backgroundColor: colors.primary + '10', borderBottomColor: colors.border }]}>
                    <Ionicons name="pricetag" size={14} color={colors.primary} />
                    <Text style={[styles.offerBannerText, { color: colors.primary }]}>
                        {(conversation.offer.name as any)?.ru || (conversation.offer.name as any)?.en || 'Offer'}
                    </Text>
                </View>
            )}

            {/* Messages */}
            <KeyboardAvoidingView
                style={styles.chatContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.messagesList}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="chatbubble-outline" size={48} color={colors.textSecondary} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                {t('chat.startConversation', 'Start your conversation')}
                            </Text>
                        </View>
                    }
                />

                {/* Input */}
                {conversation?.status === 'active' ? (
                    <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.surfaceSecondary || colors.background, color: colors.textPrimary }]}
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder={t('chat.typeMessage', 'Type a message...')}
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            maxLength={2000}
                        />
                        <TouchableOpacity
                            style={[styles.sendButton, { backgroundColor: colors.primary }, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
                            onPress={handleSend}
                            disabled={!inputText.trim() || sending}
                        >
                            {sending ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Ionicons name="send" size={20} color="#FFF" />
                            )}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={[styles.endedBanner, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                        <Text style={[styles.endedText, { color: colors.textSecondary }]}>
                            {t('chat.conversationEnded', 'This conversation has ended')}
                        </Text>
                    </View>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    headerAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
    headerAvatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
    headerTextContainer: { flex: 1 },
    headerName: { fontSize: 16, fontWeight: '600' },
    headerStatus: { fontSize: 12 },
    headerAction: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    offerBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 6,
        borderBottomWidth: 1,
    },
    offerBannerText: { fontSize: 13, fontWeight: '500' },
    chatContainer: { flex: 1 },
    messagesList: { padding: 16, flexGrow: 1 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
    emptyText: { fontSize: 15, marginTop: 12 },
    messageContainer: { marginBottom: 8, alignItems: 'flex-start' },
    messageContainerMine: { alignItems: 'flex-end' },
    messageBubble: {
        maxWidth: '80%',
        borderRadius: 16,
        borderBottomLeftRadius: 4,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    messageText: { fontSize: 15, lineHeight: 20 },
    messageTime: { fontSize: 11, marginTop: 4, alignSelf: 'flex-end' },
    specialBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    specialBubbleText: { fontSize: 14, fontWeight: '500' },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 12,
        borderTopWidth: 1,
    },
    input: {
        flex: 1,
        maxHeight: 100,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 15,
        marginRight: 8,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: { opacity: 0.5 },
    endedBanner: { padding: 16, alignItems: 'center', borderTopWidth: 1 },
    endedText: { fontSize: 14 },
});
