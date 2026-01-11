import React, { useState, useRef, useCallback, useMemo } from 'react';
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
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import ApiService from '../services/apiService';

/**
 * ConsultationChatScreen - Real-time chat with specialist
 */
export default function ConsultationChatScreen({ route, navigation }) {
    const { consultationId } = route.params;
    const { t } = useI18n();
    const { user } = useAuth();
    const themeContext = useTheme();
    const tokens = useDesignTokens();

    const [consultation, setConsultation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const flatListRef = useRef(null);

    const loadData = useCallback(async () => {
        try {
            const [consultationData, messagesData] = await Promise.all([
                ApiService.getConsultation(consultationId),
                ApiService.getMessages(consultationId),
            ]);

            if (consultationData) {
                setConsultation(consultationData);
            }

            if (Array.isArray(messagesData)) {
                setMessages(messagesData);
            }
        } catch (error) {
            console.error('[ConsultationChatScreen] Load error:', error);
        } finally {
            setLoading(false);
        }
    }, [consultationId]);

    const loadMessages = useCallback(async (silent = false) => {
        try {
            const messagesData = await ApiService.getMessages(consultationId);
            if (Array.isArray(messagesData)) {
                setMessages(messagesData);
            }
        } catch (error) {
            if (!silent) {
                console.error('[ConsultationChatScreen] Load messages error:', error);
            }
        }
    }, [consultationId]);

    useFocusEffect(
        useCallback(() => {
            loadData();
            // Mark as read when entering
            ApiService.markAsRead(consultationId).catch(() => { });

            // Poll for new messages every 5 seconds
            const pollInterval = setInterval(() => {
                loadMessages(true);
            }, 5000);

            return () => clearInterval(pollInterval);
        }, [consultationId, loadData, loadMessages])
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
            sender: { id: user?.id, name: user?.name },
        };
        setMessages(prev => [...prev, tempMessage]);

        try {
            const newMessage = await ApiService.sendMessage(consultationId, text, 'text');
            // Replace temp message with real one
            setMessages(prev => prev.map(m => m.id === tempMessage.id ? newMessage : m));
        } catch (error) {
            console.error('[ConsultationChatScreen] Send error:', error);
            // Remove temp message on error
            setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
            setInputText(text); // Restore text
        } finally {
            setSending(false);
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const isMyMessage = (message) => message.senderId === user?.id;

    const specialist = consultation?.specialist;

    const styles = useMemo(() => {
        const colors = themeContext?.colors || {};
        return createStyles(tokens, colors);
    }, [tokens, themeContext?.colors]);

    const renderMessage = ({ item }) => {
        const isMine = isMyMessage(item);

        return (
            <View style={[styles.messageContainer, isMine && styles.messageContainerMine]}>
                <View style={[styles.messageBubble, isMine && styles.messageBubbleMine]}>
                    <Text style={[styles.messageText, isMine && styles.messageTextMine]}>
                        {item.content}
                    </Text>
                    <Text style={[styles.messageTime, isMine && styles.messageTimeMine]}>
                        {formatTime(item.createdAt)}
                    </Text>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer} edges={['top']}>
                <ActivityIndicator size="large" color={tokens.colors?.primary || '#4CAF50'} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color={tokens.colors?.textPrimary || '#212121'} />
                </TouchableOpacity>

                <View style={styles.headerInfo}>
                    {specialist?.avatarUrl ? (
                        <Image source={{ uri: specialist.avatarUrl }} style={styles.headerAvatar} />
                    ) : (
                        <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
                            <Ionicons name="person" size={18} color="#9CA3AF" />
                        </View>
                    )}
                    <View>
                        <Text style={styles.headerName} numberOfLines={1}>
                            {specialist?.displayName || t('experts.specialist') || 'Specialist'}
                        </Text>
                        <Text style={styles.headerStatus}>
                            {consultation?.status === 'active'
                                ? t('consultations.status_active') || 'Active'
                                : consultation?.status || 'Active'}
                        </Text>
                    </View>
                </View>

                <View style={styles.headerPlaceholder} />
            </View>

            {/* Messages */}
            <KeyboardAvoidingView
                style={styles.chatContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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
                            <Ionicons name="chatbubble-outline" size={48} color="#CCC" />
                            <Text style={styles.emptyText}>
                                {t('consultations.start_conversation') || 'Start your conversation'}
                            </Text>
                        </View>
                    }
                />

                {/* Input */}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder={t('consultations.type_message') || 'Type a message...'}
                        placeholderTextColor={tokens.colors?.textSecondary || '#9CA3AF'}
                        multiline
                        maxLength={2000}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
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
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const createStyles = (tokens, _colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: tokens.colors?.background || '#F3F4F6',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: tokens.colors?.background || '#F3F4F6',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: tokens.colors?.surface || '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: tokens.colors?.border || '#E5E7EB',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 10,
    },
    headerAvatarPlaceholder: {
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerName: {
        fontSize: 16,
        fontWeight: '600',
        color: tokens.colors?.textPrimary || '#1F2937',
    },
    headerStatus: {
        fontSize: 12,
        color: '#4CAF50',
    },
    headerPlaceholder: {
        width: 40,
    },
    chatContainer: {
        flex: 1,
    },
    messagesList: {
        padding: 16,
        flexGrow: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyText: {
        fontSize: 15,
        color: tokens.colors?.textSecondary || '#9CA3AF',
        marginTop: 12,
    },
    messageContainer: {
        marginBottom: 8,
        alignItems: 'flex-start',
    },
    messageContainerMine: {
        alignItems: 'flex-end',
    },
    messageBubble: {
        maxWidth: '80%',
        backgroundColor: tokens.colors?.surface || '#FFF',
        borderRadius: 16,
        borderBottomLeftRadius: 4,
        paddingHorizontal: 14,
        paddingVertical: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    messageBubbleMine: {
        backgroundColor: tokens.colors?.primary || '#4CAF50',
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 4,
    },
    messageText: {
        fontSize: 15,
        color: tokens.colors?.textPrimary || '#1F2937',
        lineHeight: 20,
    },
    messageTextMine: {
        color: '#FFF',
    },
    messageTime: {
        fontSize: 11,
        color: tokens.colors?.textSecondary || '#9CA3AF',
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    messageTimeMine: {
        color: 'rgba(255, 255, 255, 0.7)',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 12,
        backgroundColor: tokens.colors?.surface || '#FFF',
        borderTopWidth: 1,
        borderTopColor: tokens.colors?.border || '#E5E7EB',
    },
    input: {
        flex: 1,
        maxHeight: 100,
        backgroundColor: tokens.colors?.surfaceSecondary || '#F3F4F6',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 15,
        color: tokens.colors?.textPrimary || '#1F2937',
        marginRight: 8,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: tokens.colors?.primary || '#4CAF50',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: tokens.colors?.borderMuted || '#D1D5DB',
    },
});
