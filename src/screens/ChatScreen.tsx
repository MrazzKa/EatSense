// @ts-nocheck
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    Image,
    ActionSheetIOS,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { useAuth } from '../contexts/AuthContext';
import MarketplaceService from '../services/marketplaceService';
import ApiService from '../services/apiService';
import * as ImagePicker from 'expo-image-picker';
import ReviewModal from '../components/common/ReviewModal';
import DisclaimerModal from '../components/common/DisclaimerModal';
import { shouldShowDisclaimer } from '../legal/disclaimerUtils';

const POLL_INTERVAL = 4000; // 4 seconds

export default function ChatScreen({ navigation, route }) {
    const themeContext = useTheme();
    const tokens = useDesignTokens();
    const colors = themeContext?.colors || {};
    const { t } = useI18n();
    const { user } = useAuth();

    const conversationId = route.params?.conversationId;

    const [messages, setMessages] = useState([]);
    const [conversation, setConversation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [text, setText] = useState('');
    const [showDisclaimer, setShowDisclaimer] = useState(false);
    const [showReview, setShowReview] = useState(false);
    const flatListRef = useRef(null);
    const pollingRef = useRef(null);
    const lastMessageIdRef = useRef(null);
    const disclaimerCheckedRef = useRef(false);

    const loadData = useCallback(async () => {
        try {
            const [convData, messagesData] = await Promise.all([
                MarketplaceService.getConversation(conversationId),
                MarketplaceService.getMessages(conversationId),
            ]);
            setConversation(convData);
            const msgs = Array.isArray(messagesData) ? messagesData : [];
            setMessages(msgs);
            if (msgs.length > 0) {
                lastMessageIdRef.current = msgs[msgs.length - 1].id;
            }
            await MarketplaceService.markAsRead(conversationId).catch(() => {});
        } catch (err) {
            console.error('[ChatScreen] Failed to load:', err);
        } finally {
            setLoading(false);
        }
    }, [conversationId]);

    // Initial load + disclaimer check
    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (!disclaimerCheckedRef.current && !loading && conversation) {
            disclaimerCheckedRef.current = true;
            shouldShowDisclaimer('experts_chat').then((show) => {
                if (show) setShowDisclaimer(true);
            });
        }
    }, [loading, conversation]);

    // Polling: start when focused, stop when blurred
    useFocusEffect(
        useCallback(() => {
            const poll = async () => {
                try {
                    const messagesData = await MarketplaceService.getMessages(conversationId);
                    const msgs = Array.isArray(messagesData) ? messagesData : [];
                    if (msgs.length > 0) {
                        const latestId = msgs[msgs.length - 1].id;
                        if (latestId !== lastMessageIdRef.current) {
                            setMessages(msgs);
                            lastMessageIdRef.current = latestId;
                            await MarketplaceService.markAsRead(conversationId).catch(() => {});
                        }
                    }
                } catch {
                    // silent — polling failure is not critical
                }
            };

            pollingRef.current = setInterval(poll, POLL_INTERVAL);
            return () => {
                if (pollingRef.current) clearInterval(pollingRef.current);
            };
        }, [conversationId])
    );

    const handleSend = useCallback(async () => {
        if (!text.trim() || sending) return;
        setSending(true);
        try {
            const newMessage = await MarketplaceService.sendMessage(conversationId, text.trim());
            setMessages((prev) => [...prev, newMessage]);
            lastMessageIdRef.current = newMessage.id;
            setText('');
            setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
        } catch {
            Alert.alert(t('common.error') || 'Error', t('experts.request_error') || 'Failed to send message');
        } finally {
            setSending(false);
        }
    }, [text, sending, conversationId, t]);

    const handleSendPhoto = useCallback(async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.7,
                allowsEditing: false,
            });

            if (result.canceled || !result.assets?.[0]) return;

            setSending(true);
            const uploadResult = await ApiService.uploadImage(result.assets[0].uri);
            if (uploadResult?.url) {
                const newMessage = await MarketplaceService.sendMessage(
                    conversationId,
                    uploadResult.url,
                    'photo',
                );
                setMessages((prev) => [...prev, newMessage]);
                lastMessageIdRef.current = newMessage.id;
                setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
            }
        } catch {
            Alert.alert(t('common.error') || 'Error', t('experts.request_error') || 'Failed to send photo');
        } finally {
            setSending(false);
        }
    }, [conversationId, t]);

    const handleShareMeals = useCallback(async () => {
        Alert.alert(
            t('experts.shareData') || 'Share Data',
            t('experts.shareDataConfirm') || 'Share your meals from the last 7 days?',
            [
                { text: t('common.cancel') || 'Cancel', style: 'cancel' },
                {
                    text: t('common.confirm') || 'Confirm',
                    onPress: async () => {
                        try {
                            const toDate = new Date();
                            const fromDate = new Date(toDate.getTime() - 7 * 24 * 60 * 60 * 1000);
                            const newMessage = await MarketplaceService.shareMeals(
                                conversationId,
                                fromDate.toISOString(),
                                toDate.toISOString(),
                            );
                            setMessages((prev) => [...prev, newMessage]);
                            lastMessageIdRef.current = newMessage.id;
                        } catch {
                            Alert.alert(t('common.error') || 'Error', t('experts.request_error') || 'Failed to share meals');
                        }
                    },
                },
            ],
        );
    }, [conversationId, t]);

    const handleRequestData = useCallback(async () => {
        try {
            const newMessage = await MarketplaceService.sendMessage(
                conversationId,
                t('experts.shareDataRequest') || 'I would like to access your nutrition data to provide better recommendations. Please allow access.',
                'report_request',
            );
            setMessages((prev) => [...prev, newMessage]);
            lastMessageIdRef.current = newMessage.id;
        } catch {
            Alert.alert(t('common.error') || 'Error', t('experts.request_error') || 'Failed');
        }
    }, [conversationId, t]);

    const handleGrantAccess = useCallback(async () => {
        try {
            await MarketplaceService.updateConversation(conversationId, { reportsShared: true });
            setConversation((prev) => ({ ...prev, reportsShared: true }));
            // Send confirmation message
            const newMessage = await MarketplaceService.sendMessage(
                conversationId,
                t('experts.accessGranted') || 'Access to nutrition data granted.',
                'report_grant',
            );
            setMessages((prev) => [...prev, newMessage]);
            lastMessageIdRef.current = newMessage.id;
        } catch {
            Alert.alert(t('common.error') || 'Error', t('experts.request_error') || 'Failed');
        }
    }, [conversationId, t]);

    const handleRevokeAccess = useCallback(async () => {
        try {
            await MarketplaceService.updateConversation(conversationId, { reportsShared: false });
            setConversation((prev) => ({ ...prev, reportsShared: false }));
            const newMessage = await MarketplaceService.sendMessage(
                conversationId,
                t('experts.accessRevoked') || 'Access to nutrition data revoked.',
                'report_revoke',
            );
            setMessages((prev) => [...prev, newMessage]);
            lastMessageIdRef.current = newMessage.id;
        } catch {
            Alert.alert(t('common.error') || 'Error', t('experts.request_error') || 'Failed');
        }
    }, [conversationId, t]);

    const handleCompleteConsultation = useCallback(async () => {
        Alert.alert(
            t('experts.completeConsultation') || 'Complete Consultation',
            t('experts.completeConfirm') || 'Mark this consultation as completed? The client will be able to leave a review.',
            [
                { text: t('common.cancel') || 'Cancel', style: 'cancel' },
                {
                    text: t('common.confirm') || 'Confirm',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await MarketplaceService.updateConversation(conversationId, { status: 'completed' });
                            setConversation((prev) => ({ ...prev, status: 'completed' }));
                        } catch {
                            Alert.alert(t('common.error') || 'Error', t('experts.request_error') || 'Failed to complete');
                        }
                    },
                },
            ],
        );
    }, [conversationId, t]);

    const handleReport = useCallback(() => {
        Alert.alert(
            t('experts.reportAbuse') || 'Report',
            t('experts.reportAbuseConfirm') || 'Report this conversation for abuse?',
            [
                { text: t('common.cancel') || 'Cancel', style: 'cancel' },
                {
                    text: t('experts.report') || 'Report',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await MarketplaceService.createAbuseReport({
                                conversationId,
                                reason: 'user_report',
                            });
                            Alert.alert(t('experts.reportSent') || 'Report sent');
                        } catch {
                            Alert.alert(t('common.error') || 'Error', t('experts.request_error') || 'Failed');
                        }
                    },
                },
            ],
        );
    }, [conversationId, t]);

    const handleMoreMenu = useCallback(() => {
        const isExpertSide = conversation?.isExpert;
        const isActive = conversation?.status === 'active';
        const hasAccess = conversation?.reportsShared;

        // Build actions dynamically
        const actions = [];

        if (!isExpertSide) {
            actions.push({ label: t('experts.shareData') || 'Share Meals', handler: handleShareMeals });
            if (hasAccess) {
                actions.push({ label: t('experts.revokeAccess') || 'Revoke Data Access', handler: handleRevokeAccess });
            }
        }
        if (isExpertSide && isActive) {
            actions.push({ label: t('experts.requestDataAccess') || 'Request Data Access', handler: handleRequestData });
            actions.push({ label: t('experts.completeConsultation') || 'Complete Consultation', handler: handleCompleteConsultation });
        }
        actions.push({ label: t('experts.reportAbuse') || 'Report', handler: handleReport, destructive: true });

        if (Platform.OS === 'ios') {
            const options = [...actions.map((a) => a.label), t('common.cancel') || 'Cancel'];
            const destructiveIndex = actions.findIndex((a) => a.destructive);
            ActionSheetIOS.showActionSheetWithOptions(
                { options, cancelButtonIndex: options.length - 1, destructiveButtonIndex: destructiveIndex >= 0 ? destructiveIndex : undefined },
                (idx) => { if (idx < actions.length) actions[idx].handler(); },
            );
        } else {
            Alert.alert(
                t('common.options') || 'Options',
                undefined,
                [
                    ...actions.map((a) => ({ text: a.label, onPress: a.handler, style: a.destructive ? 'destructive' : 'default' })),
                    { text: t('common.cancel') || 'Cancel', style: 'cancel' },
                ],
            );
        }
    }, [conversation, handleShareMeals, handleCompleteConsultation, handleReport, handleRequestData, handleRevokeAccess, t]);

    const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

    const isMe = useCallback(
        (senderId) => senderId === user?.id,
        [user?.id],
    );

    const getOtherPartyName = () => {
        if (!conversation) return 'Chat';
        if (conversation.isClient) {
            return conversation.expert?.displayName || 'Expert';
        }
        const cp = conversation.client?.userProfile;
        return cp?.firstName || 'Client';
    };

    const isActive = conversation?.status === 'active';

    const renderMessage = ({ item }) => {
        const mine = isMe(item.senderId);
        const isPhoto = item.type === 'photo';
        const isMealShare = item.type === 'meal_share';
        const isReportShare = item.type === 'report_share';
        const isReportRequest = item.type === 'report_request';
        const isReportGrant = item.type === 'report_grant';
        const isReportRevoke = item.type === 'report_revoke';
        const isSystemMessage = isReportGrant || isReportRevoke;

        // System-style messages (grant/revoke) render as centered info bubbles
        if (isSystemMessage) {
            return (
                <View style={styles.systemMessageRow}>
                    <View style={styles.systemBubble}>
                        <Ionicons
                            name={isReportGrant ? 'lock-open-outline' : 'lock-closed-outline'}
                            size={14}
                            color={colors.textSecondary || '#6B7280'}
                        />
                        <Text style={styles.systemText}>{item.content}</Text>
                    </View>
                </View>
            );
        }

        return (
            <View style={[styles.messageRow, mine ? styles.messageRowRight : styles.messageRowLeft]}>
                <View
                    style={[
                        styles.messageBubble,
                        mine
                            ? { backgroundColor: colors.primary || '#4CAF50' }
                            : { backgroundColor: colors.surface || '#FFF', borderColor: colors.border || '#E5E7EB', borderWidth: 1 },
                    ]}
                >
                    {isMealShare && (
                        <View style={styles.specialBadge}>
                            <Ionicons name="restaurant" size={14} color={mine ? '#fff' : colors.primary || '#4CAF50'} />
                            <Text style={[styles.specialBadgeText, { color: mine ? '#fff' : colors.primary || '#4CAF50' }]}>
                                {t('experts.sharedMeals') || 'Shared Meals'}
                            </Text>
                        </View>
                    )}
                    {isReportShare && (
                        <View style={styles.specialBadge}>
                            <Ionicons name="document-text" size={14} color={mine ? '#fff' : colors.primary || '#4CAF50'} />
                            <Text style={[styles.specialBadgeText, { color: mine ? '#fff' : colors.primary || '#4CAF50' }]}>
                                {t('experts.sharedReport') || 'Shared Report'}
                            </Text>
                        </View>
                    )}
                    {isReportRequest && (
                        <View style={styles.specialBadge}>
                            <Ionicons name="shield-outline" size={14} color={mine ? '#fff' : '#FF9800'} />
                            <Text style={[styles.specialBadgeText, { color: mine ? '#fff' : '#FF9800' }]}>
                                {t('experts.dataAccessRequest') || 'Data Access Request'}
                            </Text>
                        </View>
                    )}
                    {isPhoto ? (
                        <Image
                            source={{ uri: item.content }}
                            style={styles.photoMessage}
                            resizeMode="cover"
                        />
                    ) : (
                        <Text style={[styles.messageText, { color: mine ? '#fff' : colors.textPrimary || '#212121' }]}>
                            {item.content}
                        </Text>
                    )}
                    {/* Action buttons for report_request — only visible to client */}
                    {isReportRequest && !mine && !conversation?.reportsShared && (
                        <View style={styles.actionButtons}>
                            <TouchableOpacity style={styles.allowButton} onPress={handleGrantAccess}>
                                <Text style={styles.allowButtonText}>{t('experts.allowAccess') || 'Allow'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.denyButton}>
                                <Text style={styles.denyButtonText}>{t('experts.denyAccess') || 'Deny'}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    {isReportRequest && !mine && conversation?.reportsShared && (
                        <View style={styles.grantedBadge}>
                            <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                            <Text style={styles.grantedText}>{t('experts.accessGranted') || 'Access granted'}</Text>
                        </View>
                    )}
                    <View style={styles.messageFooter}>
                        <Text style={[styles.messageTime, { color: mine ? 'rgba(255,255,255,0.7)' : colors.textSecondary || '#9CA3AF' }]}>
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        {mine && item.isRead && (
                            <Ionicons
                                name="checkmark-done"
                                size={14}
                                color={mine ? 'rgba(255,255,255,0.7)' : colors.textSecondary || '#9CA3AF'}
                                style={{ marginLeft: 4 }}
                            />
                        )}
                    </View>
                </View>
            </View>
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
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerBack} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary || '#212121'} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{getOtherPartyName()}</Text>
                    <Text style={[styles.headerSubtitle, { color: isActive ? '#4CAF50' : colors.textSecondary || '#9CA3AF' }]}>
                        {isActive
                            ? (t('experts.activeConsultation') || 'Active')
                            : (t('experts.consultationCompleted') || 'Completed')}
                    </Text>
                </View>
                <TouchableOpacity style={styles.headerAction} onPress={handleMoreMenu}>
                    <Ionicons name="ellipsis-vertical" size={22} color={colors.textPrimary || '#212121'} />
                </TouchableOpacity>
            </View>

            {/* Messages */}
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                contentContainerStyle={messages.length === 0 ? styles.emptyMessagesList : styles.messagesList}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.textSecondary || '#9CA3AF'} />
                        <Text style={styles.emptyText}>
                            {t('experts.startConversation') || 'Say hello to start the conversation'}
                        </Text>
                    </View>
                }
            />

            {/* Input or ended banner */}
            {isActive ? (
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={styles.inputContainer}>
                        <TouchableOpacity style={styles.attachButton} onPress={handleSendPhoto}>
                            <Ionicons name="camera-outline" size={24} color={colors.primary || '#4CAF50'} />
                        </TouchableOpacity>
                        <TextInput
                            style={styles.input}
                            placeholder={t('experts.typePlaceholder') || 'Type a message...'}
                            placeholderTextColor={colors.textSecondary || '#9CA3AF'}
                            value={text}
                            onChangeText={setText}
                            multiline
                            maxLength={2000}
                        />
                        <TouchableOpacity
                            style={[styles.sendButton, { opacity: text.trim() ? 1 : 0.5 }]}
                            onPress={handleSend}
                            disabled={!text.trim() || sending}
                        >
                            {sending ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Ionicons name="send" size={18} color="#fff" />
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            ) : (
                <View style={styles.endedBanner}>
                    <View style={styles.endedRow}>
                        <Ionicons name="checkmark-done" size={18} color={colors.textSecondary || '#9CA3AF'} />
                        <Text style={styles.endedText}>
                            {t('experts.consultationCompleted') || 'Consultation completed'}
                        </Text>
                    </View>
                    {conversation?.isClient && (
                        <TouchableOpacity style={styles.reviewButton} onPress={() => setShowReview(true)}>
                            <Ionicons name="star-outline" size={18} color="#FFF" />
                            <Text style={styles.reviewButtonText}>
                                {t('experts.leaveReview') || 'Leave a Review'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Disclaimer */}
            <DisclaimerModal
                disclaimerKey="experts_chat"
                visible={showDisclaimer}
                onAccept={() => setShowDisclaimer(false)}
                onCancel={() => {
                    setShowDisclaimer(false);
                    navigation.goBack();
                }}
            />

            {/* Review Modal */}
            <ReviewModal
                visible={showReview}
                expertId={conversation?.expertId}
                conversationId={conversationId}
                onClose={() => setShowReview(false)}
                onSubmitted={() => {
                    Alert.alert(
                        t('experts.reviewSubmitted') || 'Thank you!',
                        t('experts.reviewSubmittedDesc') || 'Your review has been submitted.',
                    );
                }}
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
    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: colors.surface || '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: colors.border || '#E0E0E0',
    },
    headerBack: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        flex: 1,
        marginLeft: 4,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: colors.textPrimary || '#212121',
    },
    headerSubtitle: {
        fontSize: 12,
        marginTop: 1,
    },
    headerAction: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Messages
    messagesList: {
        padding: 16,
        flexGrow: 1,
    },
    emptyMessagesList: {
        padding: 16,
        flexGrow: 1,
    },
    messageRow: {
        marginBottom: 8,
    },
    messageRowLeft: {
        alignItems: 'flex-start',
    },
    messageRowRight: {
        alignItems: 'flex-end',
    },
    messageBubble: {
        maxWidth: '78%',
        borderRadius: 18,
        padding: 10,
        paddingHorizontal: 14,
    },
    specialBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 6,
    },
    specialBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    photoMessage: {
        width: 200,
        height: 200,
        borderRadius: 12,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    messageFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    messageTime: {
        fontSize: 11,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 15,
        color: colors.textSecondary || '#9CA3AF',
        marginTop: 12,
        textAlign: 'center',
    },
    // Input
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 10,
        paddingBottom: 12,
        backgroundColor: colors.surface || '#FFF',
        borderTopWidth: 1,
        borderTopColor: colors.border || '#E0E0E0',
    },
    attachButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 16,
        maxHeight: 100,
        backgroundColor: colors.background || '#F3F4F6',
        color: colors.textPrimary || '#212121',
        borderWidth: 1,
        borderColor: colors.border || '#E5E7EB',
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary || '#4CAF50',
        marginLeft: 8,
    },
    // Ended
    endedBanner: {
        alignItems: 'center',
        padding: 16,
        backgroundColor: colors.surface || '#FFF',
        borderTopWidth: 1,
        borderTopColor: colors.border || '#E0E0E0',
    },
    endedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    endedText: {
        fontSize: 14,
        color: colors.textSecondary || '#9CA3AF',
    },
    reviewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        backgroundColor: '#FFC107',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
    },
    reviewButtonText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '600',
    },
    // System messages
    systemMessageRow: {
        alignItems: 'center',
        marginVertical: 8,
    },
    systemBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.surfaceSecondary || '#F3F4F6',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
    },
    systemText: {
        fontSize: 13,
        color: colors.textSecondary || '#6B7280',
    },
    // Action buttons for report request
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
    },
    allowButton: {
        flex: 1,
        backgroundColor: '#4CAF50',
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    allowButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    denyButton: {
        flex: 1,
        backgroundColor: colors.surfaceSecondary || '#F3F4F6',
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    denyButtonText: {
        color: colors.textSecondary || '#6B7280',
        fontSize: 14,
        fontWeight: '500',
    },
    grantedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 8,
    },
    grantedText: {
        fontSize: 12,
        color: '#4CAF50',
        fontWeight: '500',
    },
});
