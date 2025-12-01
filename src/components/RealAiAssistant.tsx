import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../../app/i18n/hooks';
import { useTheme } from '../contexts/ThemeContext';
import { clientLog } from '../utils/clientLog';
import { mapLanguageToLocale } from '../utils/locale';
import { LabResultsModal } from './LabResultsModal';
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface RealAiAssistantProps {
  onClose: () => void;
}

export const RealAiAssistant: React.FC<RealAiAssistantProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [labModalVisible, setLabModalVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  // Load conversation history on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (!user?.id) return;
      
      try {
        await clientLog('AiAssistant:loadingHistory').catch(() => {});
        if (!ApiService || typeof ApiService.getConversationHistory !== 'function') {
          console.warn('[RealAiAssistant] ApiService.getConversationHistory is not available');
          return;
        }
        const history = await ApiService.getConversationHistory(user.id, 10);
        
        if (Array.isArray(history) && history.length > 0) {
          const historyMessages: Message[] = history
            .slice(0, 10)
            .map((item: any, index: number) => ({
              id: `history-${index}-${Date.now()}`,
              role: item.role || (item.type === 'general_question' ? 'user' : 'assistant'),
              content: item.answer || item.question || '',
              timestamp: new Date(item.createdAt || Date.now()),
            }));
          setMessages(historyMessages.reverse());
        } else {
          // Add welcome message
          setMessages([
            {
              id: 'welcome-1',
              role: 'assistant',
              content: t('aiAssistant.welcome') || 'Hello! I\'m your AI nutrition assistant. How can I help you today?',
              timestamp: new Date(),
            },
          ]);
        }
      } catch (error) {
        console.error('[RealAiAssistant] Error loading history:', error);
        // Still show welcome message on error
        setMessages([
          {
            id: 'welcome-1',
            role: 'assistant',
            content: t('aiAssistant.welcome') || 'Hello! I\'m your AI nutrition assistant. How can I help you today?',
            timestamp: new Date(),
          },
        ]);
      }
    };

    loadHistory();
  }, [user?.id, t]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollViewRef.current && messages.length > 0) {
      setTimeout(() => {
        if (scrollViewRef.current && typeof scrollViewRef.current.scrollToEnd === 'function') {
          scrollViewRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    const trimmedInput = inputText.trim();
    if (!trimmedInput || isLoading || !user?.id) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmedInput,
      timestamp: new Date(),
    };

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      await clientLog('AiAssistant:messageSent', { messageLength: trimmedInput.length }).catch(() => {});

      // Call API - check if method exists
      if (!ApiService || typeof ApiService.getGeneralQuestion !== 'function') {
        throw new Error('ApiService.getGeneralQuestion is not available');
      }

      const response = await ApiService.getGeneralQuestion(
        user.id,
        trimmedInput,
        mapLanguageToLocale(language),
      );

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response?.answer || t('aiAssistant.error') || 'Sorry, I could not process your question. Please try again.',
        timestamp: new Date(),
      };

      await clientLog('AiAssistant:messageReceived', { 
        hasAnswer: !!response?.answer,
        answerLength: response?.answer?.length || 0,
      }).catch(() => {});

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('[RealAiAssistant] Error sending message:', error);
      
      // Check for quota exceeded error
      const isQuotaExceeded = 
        error?.status === 503 ||
        error?.status === 429 ||
        error?.payload?.code === 'AI_QUOTA_EXCEEDED' ||
        error?.message?.includes('quota') ||
        error?.message?.includes('AI_QUOTA_EXCEEDED');
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: isQuotaExceeded
          ? (t('aiAssistant.quotaExceeded') || 'AI Assistant quota exceeded. The service is temporarily unavailable. Please try again later.')
          : (t('aiAssistant.error') || 'Sorry, something went wrong. Please try again later.'),
        timestamp: new Date(),
      };

      await clientLog('AiAssistant:messageError', { 
        message: error?.message || String(error),
        status: error?.status,
        code: error?.payload?.code,
        isQuotaExceeded,
      }).catch(() => {});

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // Focus input after sending
      setTimeout(() => {
        if (inputRef.current && typeof inputRef.current.focus === 'function') {
          inputRef.current.focus();
        }
      }, 100);
    }
  }, [inputText, isLoading, user?.id, language, t]);

  const handleClose = useCallback(async () => {
    if (onClose && typeof onClose === 'function') {
      await clientLog('AiAssistant:closed').catch(() => {});
      onClose();
    }
  }, [onClose]);

  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    
    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser
              ? { backgroundColor: colors.primary || '#007AFF' }
              : { backgroundColor: colors.surfaceMuted || '#F2F2F7' },
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser
                ? { color: colors.onPrimary || '#FFFFFF' }
                : { color: colors.text || '#000000' },
            ]}
          >
            {message.content}
          </Text>
        </View>
      </View>
    );
  };

  const handleLabResult = (result: any) => {
    if (!result) return;
    const summary =
      result.summary ||
      result.recommendation ||
      t('aiAssistant.lab.analysisComplete') ||
      'Lab results analyzed.';
    const assistantMessage: Message = {
      id: `lab-${Date.now()}`,
      role: 'assistant',
      content: summary,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);
  };

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background || colors.surface }]}
    >
      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles" size={64} color={colors.textTertiary || '#8E8E93'} />
            <Text style={[styles.emptyText, { color: colors.textSecondary || '#6B7280' }]}>
              {t('aiAssistant.emptyState') || 'Start a conversation with your AI assistant'}
            </Text>
          </View>
        )}
        
        {messages.map(renderMessage)}
        
        {isLoading && (
          <View style={[styles.messageContainer, styles.assistantMessageContainer]}>
            <View style={[styles.messageBubble, { backgroundColor: colors.surfaceMuted || '#F2F2F7' }]}>
              <ActivityIndicator size="small" color={colors.primary || '#007AFF'} />
              <Text style={[styles.messageText, { color: colors.textSecondary || '#6B7280', marginLeft: 8 }]}>
                {t('aiAssistant.typing') || 'Assistant is typing...'}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surface || colors.card,
            borderTopColor: colors.border || '#E5E5EA',
            paddingBottom: (insets.bottom || 0) + 8,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setLabModalVisible(true)}
        >
          <Ionicons name="attach" size={20} color={colors.textTertiary || '#8E8E93'} />
        </TouchableOpacity>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              backgroundColor: colors.inputBackground || '#F2F2F7',
              color: colors.textPrimary || colors.text || '#000000',
              borderColor: colors.border || '#E5E5EA',
            },
          ]}
          placeholder={t('aiAssistant.placeholder') || 'Ask anything about your nutrition…'}
          placeholderTextColor={colors.textTertiary || '#8E8E93'}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
          multiline
          maxLength={500}
          editable={!isLoading}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor:
                inputText.trim() && !isLoading
                  ? colors.primary || '#007AFF'
                  : colors.surfaceMuted || '#E5E5EA',
            },
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.onPrimary || '#FFFFFF'} />
          ) : (
            <Ionicons
              name="send"
              size={20}
              color={
                inputText.trim() && !isLoading
                  ? colors.onPrimary || '#FFFFFF'
                  : colors.textTertiary || '#8E8E93'
              }
            />
          )}
        </TouchableOpacity>
      </View>

      <LabResultsModal
        visible={labModalVisible}
        onClose={() => setLabModalVisible(false)}
        onResult={handleLabResult}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor will be set dynamically from theme
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    opacity: 0.7,
  },
  messageContainer: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  assistantMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    fontSize: 16,
  },
  iconButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

