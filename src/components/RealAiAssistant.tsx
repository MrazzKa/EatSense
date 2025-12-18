import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ActionSheetIOS,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import ApiService from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../../app/i18n/hooks';
import { useTheme } from '../contexts/ThemeContext';
import { clientLog } from '../utils/clientLog';
import { mapLanguageToLocale } from '../utils/locale';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachment?: {
    type: 'image' | 'pdf';
    uri: string;
    name: string;
  };
}

interface RealAiAssistantProps {
  onClose: () => void;
  mealContext?: {
    dishName?: string;
    ingredients?: Array<{ name: string; weight?: number; calories?: number; protein?: number; carbs?: number; fat?: number }>;
    totalCalories?: number;
    totalProtein?: number;
    totalCarbs?: number;
    totalFat?: number;
    healthScore?: any;
    imageUri?: string | null;
  } | null;
}

export const RealAiAssistant: React.FC<RealAiAssistantProps> = ({ onClose, mealContext }) => {
  if (__DEV__) {
    console.log('[RealAiAssistant] mounted');
  }
  
  const { user } = useAuth();
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<{ type: 'image' | 'pdf'; uri: string; name: string } | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // C1: Load conversation history on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (!user?.id) return;
      
      try {
        await clientLog('AiAssistant:loadingHistory').catch(() => {});
        if (!ApiService || typeof ApiService.getConversationHistory !== 'function') {
          if (__DEV__) {
            console.warn('[RealAiAssistant] ApiService.getConversationHistory is not available');
          }
          // Show welcome message if history not available
          setMessages([
            {
              id: 'welcome-1',
              role: 'assistant',
              content: t('aiAssistant.welcome'),
              timestamp: new Date(),
            },
          ]);
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
              content: t('aiAssistant.welcome'),
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
            content: t('aiAssistant.welcome'),
            timestamp: new Date(),
          },
        ]);
      }
    };

    loadHistory();
  }, [user?.id, t]);

  // Add meal context as initial message if provided
  useEffect(() => {
    if (mealContext && mealContext.dishName && messages.length === 0) {
      const contextMessage = `I just analyzed this meal: ${mealContext.dishName}. ` +
        (mealContext.totalCalories ? `${mealContext.totalCalories} calories. ` : '') +
        (mealContext.ingredients && mealContext.ingredients.length > 0 
          ? `Ingredients: ${mealContext.ingredients.map(i => i.name).join(', ')}. ` 
          : '') +
        'Can you tell me more about it?';
      
      setMessages([
        {
          id: 'meal-context-1',
          role: 'user',
          content: contextMessage,
          timestamp: new Date(),
        },
      ]);
    }
  }, [mealContext, messages.length]);

  // C2: Auto-scroll to bottom when messages change
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handlePickImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('common.error'),
          t('gallery.permissionRequired'),
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setSelectedAttachment({
          type: 'image',
          uri: asset.uri,
          name: asset.fileName || 'photo.jpg',
        });
      }
    } catch (error) {
      console.error('[RealAiAssistant] Error picking image:', error);
      Alert.alert(t('common.error'), t('gallery.error'));
    }
  }, [t, setSelectedAttachment]);

  const handlePickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedAttachment({
          type: 'pdf',
          uri: asset.uri,
          name: asset.name || 'document.pdf',
        });
      }
    } catch (error) {
      console.error('[RealAiAssistant] Error picking document:', error);
      Alert.alert(t('common.error'), t('aiAssistant.attach.error') || 'Failed to pick file');
    }
  }, [t, setSelectedAttachment]);

  // C3: Handle attachment selection (photo or PDF)
  const handleAttachmentPress = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            t('aiAssistant.attach.photo') || 'Choose Photo',
            t('aiAssistant.attach.file') || 'Choose File (PDF)',
            t('common.cancel') || 'Cancel',
          ],
          cancelButtonIndex: 2,
        },
        async (buttonIndex) => {
          if (buttonIndex === 0) {
            await handlePickImage();
          } else if (buttonIndex === 1) {
            await handlePickDocument();
          }
        },
      );
    } else {
      // Android: show Alert with options
      Alert.alert(
        t('aiAssistant.attach.title') || 'Attach File',
        '',
        [
          {
            text: t('aiAssistant.attach.photo') || 'Choose Photo',
            onPress: () => handlePickImage(),
          },
          {
            text: t('aiAssistant.attach.file') || 'Choose File (PDF)',
            onPress: () => handlePickDocument(),
          },
          {
            text: t('common.cancel') || 'Cancel',
            style: 'cancel',
          },
        ],
      );
    }
  }, [t, handlePickImage, handlePickDocument]);

  const handleRemoveAttachment = () => {
    setSelectedAttachment(null);
  };

  const handleSend = useCallback(async () => {
    const trimmedInput = inputText.trim();
    if ((!trimmedInput && !selectedAttachment) || isLoading || !user?.id) {
      if (__DEV__) {
        console.log('[RealAiAssistant] Cannot send: empty input/attachment or loading or no user');
      }
      return;
    }

    if (__DEV__) {
      console.log('[RealAiAssistant] Sending message:', trimmedInput.substring(0, 50), selectedAttachment ? 'with attachment' : '');
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmedInput || (selectedAttachment ? `[${selectedAttachment.type === 'image' ? t('aiAssistant.attach.photo') : t('aiAssistant.attach.file')}]` : ''),
      timestamp: new Date(),
      attachment: selectedAttachment || undefined,
    };

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setSelectedAttachment(null);
    setIsLoading(true);

    try {
      await clientLog('AiAssistant:messageSent', { 
        messageLength: trimmedInput.length,
        hasAttachment: !!selectedAttachment,
      }).catch(() => {});

      // Call API - check if method exists
      if (!ApiService || typeof ApiService.getGeneralQuestion !== 'function') {
        throw new Error('ApiService.getGeneralQuestion is not available');
      }

      // If mealContext is provided, use nutrition advice endpoint with context
      // Otherwise use general question endpoint
      let response;
      if (mealContext) {
        // Build context string from meal data
        const contextParts = [];
        if (mealContext.dishName) {
          contextParts.push(`Dish: ${mealContext.dishName}`);
        }
        if (mealContext.ingredients && mealContext.ingredients.length > 0) {
          const ingredientsList = mealContext.ingredients.map(ing => 
            `${ing.name}${ing.weight ? ` (${ing.weight}g)` : ''}`
          ).join(', ');
          contextParts.push(`Ingredients: ${ingredientsList}`);
        }
        if (mealContext.totalCalories) {
          contextParts.push(`Total: ${mealContext.totalCalories} kcal, P: ${mealContext.totalProtein || 0}g, C: ${mealContext.totalCarbs || 0}g, F: ${mealContext.totalFat || 0}g`);
        }
        
        const contextString = contextParts.join('\n');
        const questionWithContext = `${trimmedInput}\n\nContext about this meal:\n${contextString}`;
        
        if (ApiService && typeof ApiService.getNutritionAdvice === 'function') {
          response = await ApiService.getNutritionAdvice(
            user.id,
            questionWithContext,
            mealContext,
            mapLanguageToLocale(language),
          );
        } else {
          // Fallback to general question if nutrition advice not available
          response = await ApiService.getGeneralQuestion(
            user.id,
            questionWithContext,
            mapLanguageToLocale(language),
          );
        }
      } else {
        // No meal context - use general question
        response = await ApiService.getGeneralQuestion(
          user.id,
          trimmedInput || (selectedAttachment ? `[${selectedAttachment.type === 'image' ? 'Photo' : 'PDF'} attached]` : ''),
          mapLanguageToLocale(language),
        );
      }

      if (__DEV__) {
        console.log('[RealAiAssistant] Received response:', response?.answer ? 'has answer' : 'no answer');
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response?.answer || t('aiAssistant.error'),
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
          ? t('aiAssistant.quotaExceeded')
          : t('aiAssistant.error'),
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
  }, [inputText, selectedAttachment, isLoading, user?.id, language, t]);

  const renderMessage = ({ item: message }: { item: Message }) => {
    const isUser = message.role === 'user';
    
    return (
      <View
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
          {message.attachment && (
            <View style={styles.attachmentPreview}>
              <Ionicons 
                name={message.attachment.type === 'image' ? 'image' : 'document-text'} 
                size={20} 
                color={isUser ? colors.onPrimary : colors.textPrimary} 
              />
              <Text
                style={[
                  styles.attachmentText,
                  { color: isUser ? colors.onPrimary : colors.textPrimary },
                ]}
                numberOfLines={1}
              >
                {message.attachment.name}
              </Text>
            </View>
          )}
          <Text
            style={[
              styles.messageText,
              isUser
                ? { color: colors.onPrimary || '#FFFFFF' }
                : { color: colors.textPrimary || colors.text || '#000000' },
            ]}
          >
            {message.content}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles" size={64} color={colors.textTertiary || '#8E8E93'} />
      <Text style={[styles.emptyText, { color: colors.textSecondary || '#6B7280' }]}>
        {t('aiAssistant.emptyState')}
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!isLoading) return null;
    return (
      <View style={[styles.messageContainer, styles.assistantMessageContainer]}>
        <View style={[styles.messageBubble, { backgroundColor: colors.surfaceMuted || '#F2F2F7' }]}>
          <ActivityIndicator size="small" color={colors.primary || '#007AFF'} />
          <Text
            style={[
              styles.messageText,
              { color: colors.textSecondary || '#6B7280', marginLeft: 8 },
            ]}
          >
            {t('aiAssistant.typing')}
          </Text>
        </View>
      </View>
    );
  };

  // C1: New structure with proper layout
  return (
    <SafeAreaView 
      style={[styles.safeArea, { backgroundColor: colors.background || colors.surface }]} 
      edges={['top', 'bottom']}
    >
      {/* Header/Toolbar */}
      <View style={[styles.header, { backgroundColor: colors.surface || colors.card, borderBottomColor: colors.border || '#E5E5EA' }]}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={24} color={colors.textPrimary || colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary || colors.text }]}>
          {t('aiAssistant.title')}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <View style={[styles.container, { backgroundColor: colors.background || colors.surface }]}>
          {/* Messages List */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.messagesContent,
              messages.length === 0 && styles.messagesContentEmpty,
            ]}
            ListEmptyComponent={renderEmptyState}
            ListFooterComponent={renderFooter}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => {
              if (flatListRef.current && messages.length > 0) {
                flatListRef.current.scrollToEnd({ animated: true });
              }
            }}
          />

          {/* Attachment Preview */}
          {selectedAttachment && (
            <View style={[styles.attachmentBar, { backgroundColor: colors.surfaceMuted || '#F2F2F7' }]}>
              <Ionicons 
                name={selectedAttachment.type === 'image' ? 'image' : 'document-text'} 
                size={20} 
                color={colors.primary} 
              />
              <Text 
                style={[styles.attachmentBarText, { color: colors.textPrimary }]} 
                numberOfLines={1}
              >
                {selectedAttachment.name}
              </Text>
              <TouchableOpacity
                onPress={handleRemoveAttachment}
                style={styles.removeAttachmentButton}
              >
                <Ionicons name="close-circle" size={24} color={colors.error || '#EF4444'} />
              </TouchableOpacity>
            </View>
          )}

          {/* Input Bar */}
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
              onPress={handleAttachmentPress}
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
              placeholder={t('aiAssistant.inputPlaceholder') || t('aiAssistant.placeholder')}
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
                    (inputText.trim() || selectedAttachment) && !isLoading
                      ? colors.primary || '#007AFF'
                      : colors.surfaceMuted || '#E5E5EA',
                },
              ]}
              onPress={handleSend}
              disabled={(!inputText.trim() && !selectedAttachment) || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.onPrimary || '#FFFFFF'} />
              ) : (
                <Ionicons
                  name="send"
                  size={20}
                  color={
                    (inputText.trim() || selectedAttachment) && !isLoading
                      ? colors.onPrimary || '#FFFFFF'
                      : colors.textTertiary || '#8E8E93'
                  }
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 32,
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  messagesContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
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
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  attachmentText: {
    fontSize: 14,
    flex: 1,
  },
  attachmentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  attachmentBarText: {
    flex: 1,
    fontSize: 14,
  },
  removeAttachmentButton: {
    padding: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    borderWidth: 1,
    fontSize: 16,
    lineHeight: 20,
  },
  iconButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
});

export default RealAiAssistant;
