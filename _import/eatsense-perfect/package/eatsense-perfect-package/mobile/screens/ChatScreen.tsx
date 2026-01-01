import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import MarketplaceService from '../services/marketplaceService';

export default function ChatScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [messages, setMessages] = useState([]);
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const flatListRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [consultationData, messagesData] = await Promise.all([
        MarketplaceService.getConsultation(route.params.consultationId),
        MarketplaceService.getMessages(route.params.consultationId),
      ]);
      setConsultation(consultationData);
      setMessages(messagesData);
      await MarketplaceService.markAsRead(route.params.consultationId);
    } catch (error) {
      console.error('Failed to load chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = useCallback(async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const newMessage = await MarketplaceService.sendMessage(route.params.consultationId, text.trim());
      setMessages((prev) => [...prev, newMessage]);
      setText('');
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  }, [text, sending, route.params.consultationId]);

  const handleShareMeals = useCallback(async () => {
    Alert.alert(
      t('chat.shareMeals') || 'Share Meals',
      t('chat.shareMealsConfirm') || 'Share your meals from the last 7 days?',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        { text: t('common.confirm') || 'Confirm', onPress: async () => {
          try {
            const toDate = new Date();
            const fromDate = new Date(toDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            const newMessage = await MarketplaceService.shareMeals(route.params.consultationId, fromDate.toISOString(), toDate.toISOString());
            setMessages((prev) => [...prev, newMessage]);
          } catch (error) {
            Alert.alert('Error', 'Failed to share meals');
          }
        }},
      ]
    );
  }, [route.params.consultationId, t]);

  const getDaysRemaining = () => {
    if (!consultation) return 0;
    const end = new Date(consultation.endsAt);
    const now = new Date();
    return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  };

  const renderMessage = ({ item }) => {
    const isMe = item.senderId === consultation?.clientId;
    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowRight : styles.messageRowLeft]}>
        <View style={[styles.messageBubble, isMe ? { backgroundColor: colors.primary } : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
          {item.type === 'meal_share' && <View style={styles.mealShareBadge}><Ionicons name="restaurant" size={14} color={isMe ? '#fff' : colors.primary} /><Text style={[styles.mealShareText, { color: isMe ? '#fff' : colors.primary }]}>Shared meals</Text></View>}
          {item.type === 'lab_share' && <View style={styles.mealShareBadge}><Ionicons name="document-text" size={14} color={isMe ? '#fff' : colors.primary} /><Text style={[styles.mealShareText, { color: isMe ? '#fff' : colors.primary }]}>Shared lab results</Text></View>}
          <Text style={[styles.messageText, { color: isMe ? '#fff' : colors.textPrimary }]}>{item.content}</Text>
          <Text style={[styles.messageTime, { color: isMe ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></SafeAreaView>;
  }

  const daysRemaining = getDaysRemaining();
  const isActive = consultation?.status === 'active' && daysRemaining > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={colors.textPrimary} /></TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{consultation?.specialist?.displayName || 'Specialist'}</Text>
          <Text style={[styles.headerSubtitle, { color: isActive ? '#4CAF50' : colors.textSecondary }]}>{isActive ? `${daysRemaining} days remaining` : 'Consultation ended'}</Text>
        </View>
        <TouchableOpacity onPress={handleShareMeals}><Ionicons name="attach" size={24} color={colors.primary} /></TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        ListEmptyComponent={<View style={styles.emptyContainer}><Text style={[styles.emptyText, { color: colors.textSecondary }]}>Start the conversation!</Text></View>}
      />

      {isActive ? (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="Type a message..."
              placeholderTextColor={colors.textSecondary}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity style={[styles.sendButton, { backgroundColor: colors.primary, opacity: text.trim() ? 1 : 0.5 }]} onPress={handleSend} disabled={!text.trim() || sending}>
              {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={20} color="#fff" />}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <View style={[styles.endedBanner, { backgroundColor: colors.surface }]}>
          <Text style={[styles.endedText, { color: colors.textSecondary }]}>This consultation has ended</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerCenter: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  messagesList: { padding: 16, flexGrow: 1 },
  messageRow: { marginBottom: 12 },
  messageRowLeft: { alignItems: 'flex-start' },
  messageRowRight: { alignItems: 'flex-end' },
  messageBubble: { maxWidth: '80%', borderRadius: 16, padding: 12 },
  mealShareBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  mealShareText: { fontSize: 12, fontWeight: '600' },
  messageText: { fontSize: 16, lineHeight: 22 },
  messageTime: { fontSize: 11, marginTop: 4, alignSelf: 'flex-end' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, maxHeight: 100, borderWidth: 1 },
  sendButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  endedBanner: { padding: 16, alignItems: 'center' },
  endedText: { fontSize: 14 },
});
