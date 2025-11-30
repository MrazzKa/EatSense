import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../../app/i18n/hooks';
import { useTheme } from '../contexts/ThemeContext';
import { clientLog } from '../utils/clientLog';
import { mapLanguageToLocale } from '../utils/locale';
import { ImagePickerBlock } from './ImagePickerBlock';
import { formatMacro, formatCalories } from '../utils/nutritionFormat';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface LabMetric {
  name: string;
  value: number | string;
  unit: string;
  isNormal: boolean;
  level: 'low' | 'normal' | 'high';
  comment?: string;
}

interface RealAiAssistantProps {
  onClose: () => void;
}

type TabType = 'chat' | 'health';

interface HealthResult {
  id: string;
  metrics?: LabMetric[];
  summary: string;
  recommendation: string;
  keyFindings?: string[];
}

export const RealAiAssistant: React.FC<RealAiAssistantProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [healthText, setHealthText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [healthResult, setHealthResult] = useState<HealthResult | null>(null);
  // Task 6: Photo analysis state
  const [healthAnalysisImage, setHealthAnalysisImage] = useState<string | null>(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [photoAnalysisResult, setPhotoAnalysisResult] = useState<any>(null);
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

  // Detect if text looks like lab results (numbers + units like g/L, mmol/L, %, etc.)
  const looksLikeLabResults = useCallback((text: string): boolean => {
    const labPatterns = [
      /\d+\.?\d*\s*(g\/L|mmol\/L|mg\/dL|μmol\/L|IU\/L|%|cells\/μL|10\^3\/μL)/i,
      /\b(WBC|RBC|HGB|HCT|PLT|GLU|CHOL|HDL|LDL|TG|ALT|AST|CREA|BUN|TSH|T4|T3)\b/i,
      /\b(white blood|red blood|hemoglobin|hematocrit|platelet|glucose|cholesterol|triglyceride)\b/i,
    ];
    return labPatterns.some(pattern => pattern.test(text));
  }, []);

  const handleAnalyzeHealth = useCallback(async () => {
    const trimmedText = healthText.trim();
    if (!trimmedText || isLoading || !user?.id) return;

    setIsLoading(true);
    setHealthResult(null);

    try {
      const isLabResults = looksLikeLabResults(trimmedText);
      await clientLog('AiAssistant:healthAnalyzed', { 
        textLength: trimmedText.length,
        isLabResults,
      }).catch(() => {});

      let response: any;

      if (isLabResults) {
        // Call lab-results endpoint
        if (!ApiService || typeof ApiService.analyzeLabResults !== 'function') {
          throw new Error('ApiService.analyzeLabResults is not available');
        }
        response = await ApiService.analyzeLabResults(
          user.id,
          trimmedText,
          mapLanguageToLocale(language),
        );
        setHealthResult({
          id: response.id || `health-${Date.now()}`,
          metrics: response.metrics || [],
          summary: response.summary || '',
          recommendation: response.recommendation || '',
        });
      } else {
        // Call health-check endpoint
        if (!ApiService || typeof ApiService.getHealthCheck !== 'function') {
          throw new Error('ApiService.getHealthCheck is not available');
        }
        response = await ApiService.getHealthCheck(
          user.id,
          trimmedText,
          mapLanguageToLocale(language),
        );
        // Parse health-check response (it returns { answer, ... })
        const answer = response?.answer || response?.summary || '';
        // Try to extract structured data if available
        setHealthResult({
          id: `health-${Date.now()}`,
          summary: answer,
          recommendation: response?.recommendation || '',
          keyFindings: response?.keyFindings || [],
        });
      }

      setHealthText('');
    } catch (error: any) {
      console.error('[RealAiAssistant] Error analyzing health:', error);
      
      const isQuotaExceeded = 
        error?.status === 503 ||
        error?.status === 429 ||
        error?.payload?.code === 'AI_QUOTA_EXCEEDED';
      
      const errorMessage = isQuotaExceeded
        ? (t('aiAssistant.quotaExceeded') || 'AI Assistant quota exceeded. Please try again later.')
        : (t('aiAssistant.error') || 'Sorry, something went wrong. Please try again later.');

      setHealthResult({
        id: `error-${Date.now()}`,
        metrics: [],
        summary: errorMessage,
        recommendation: '',
      });

      await clientLog('AiAssistant:healthError', { 
        message: error?.message || String(error),
        status: error?.status,
      }).catch(() => {});
    } finally {
      setIsLoading(false);
    }
  }, [healthText, isLoading, user?.id, language, t, looksLikeLabResults]);

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

  // Task 6: Handle photo analysis in Health Analysis tab
  const handlePhotoAnalysis = useCallback(async (imageUri: string) => {
    if (!imageUri || isAnalyzingPhoto || !user?.id) return;

    setIsAnalyzingPhoto(true);
    setHealthAnalysisImage(imageUri);
    setPhotoAnalysisResult(null);
    setHealthResult(null);

    try {
      await clientLog('AiAssistant:healthPhotoAnalysis', { imageUri }).catch(() => {});
      
      const locale = mapLanguageToLocale(language);
      const analysisResponse = await ApiService.analyzeImage(imageUri, locale);
      
      // Wait for analysis to complete
      let analysisId = analysisResponse.analysisId;
      if (!analysisId && analysisResponse.id) {
        analysisId = analysisResponse.id;
      }

      if (analysisId) {
        // Poll for results
        let attempts = 0;
        const maxAttempts = 30;
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          
          try {
            const result = await ApiService.getAnalysisResult(analysisId);
            if (result && result.status === 'COMPLETED' && result.items && result.items.length > 0) {
              // Format as health result
              const totalCalories = result.totalCalories || 0;
              const totalProtein = result.totalProtein || 0;
              const totalCarbs = result.totalCarbs || 0;
              const totalFat = result.totalFat || 0;
              
              setPhotoAnalysisResult({
                analysisId,
                dishName: result.dishName || 'Analyzed Meal',
                calories: totalCalories,
                protein: totalProtein,
                carbs: totalCarbs,
                fat: totalFat,
                healthScore: result.healthScore,
                ingredients: result.ingredients || [],
                imageUrl: result.imageUrl || imageUri,
              });
              
              setHealthResult({
                id: `photo-${analysisId}`,
                summary: t('aiAssistant.healthAnalysis.photoResultTitle', { dish: result.dishName }) || 
                  `Analyzed: ${result.dishName}`,
                recommendation: result.healthScore?.feedback?.[0] || '',
                keyFindings: result.healthScore?.feedback || [],
              });
              
              setIsAnalyzingPhoto(false);
              return;
            }
          } catch (pollError: any) {
            if (pollError?.status === 404) {
              // Analysis not ready yet, continue polling
              attempts++;
              continue;
            }
            throw pollError;
          }
          
          attempts++;
        }
        
        throw new Error('Analysis timeout');
      } else {
        throw new Error('No analysis ID returned');
      }
    } catch (error: any) {
      console.error('[RealAiAssistant] Error analyzing photo:', error);
      await clientLog('AiAssistant:healthPhotoError', { 
        message: error?.message || String(error),
      }).catch(() => {});
      
      setHealthResult({
        id: `error-${Date.now()}`,
        summary: t('aiAssistant.healthAnalysis.error') || 'Failed to analyze photo. Please try again.',
        recommendation: '',
      });
    } finally {
      setIsAnalyzingPhoto(false);
    }
  }, [isAnalyzingPhoto, user?.id, language, t]);

  const renderHealthResults = () => {
    // Task 6: Show photo analysis result if available
    if (photoAnalysisResult) {
      return (
        <ScrollView style={styles.labResultsContainer} contentContainerStyle={styles.labResultsContent}>
          <View style={[styles.labSection, { backgroundColor: colors.surfaceMuted || '#F2F2F7' }]}>
            <Text style={[styles.labSectionTitle, { color: colors.text || '#000000' }]}>
              {t('aiAssistant.healthAnalysis.photoResultTitle', { dish: photoAnalysisResult.dishName }) || 
                `Analyzed: ${photoAnalysisResult.dishName}`}
            </Text>
            <View style={styles.photoAnalysisSummary}>
              <View style={styles.photoAnalysisRow}>
                <Text style={[styles.photoAnalysisLabel, { color: colors.textSecondary }]}>
                  {t('dashboard.calories') || 'Calories'}
                </Text>
                <Text style={[styles.photoAnalysisValue, { color: colors.primary }]}>
                  {formatCalories(photoAnalysisResult.calories)}
                </Text>
              </View>
              <View style={styles.photoAnalysisRow}>
                <Text style={[styles.photoAnalysisLabel, { color: colors.textSecondary }]}>
                  {t('dashboard.protein') || 'Protein'}
                </Text>
                <Text style={[styles.photoAnalysisValue, { color: colors.primary }]}>
                  {formatMacro(photoAnalysisResult.protein)}
                </Text>
              </View>
              <View style={styles.photoAnalysisRow}>
                <Text style={[styles.photoAnalysisLabel, { color: colors.textSecondary }]}>
                  {t('dashboard.carbs') || 'Carbs'}
                </Text>
                <Text style={[styles.photoAnalysisValue, { color: colors.primary }]}>
                  {formatMacro(photoAnalysisResult.carbs)}
                </Text>
              </View>
              <View style={styles.photoAnalysisRow}>
                <Text style={[styles.photoAnalysisLabel, { color: colors.textSecondary }]}>
                  {t('dashboard.fat') || 'Fat'}
                </Text>
                <Text style={[styles.photoAnalysisValue, { color: colors.primary }]}>
                  {formatMacro(photoAnalysisResult.fat)}
                </Text>
              </View>
            </View>
            {photoAnalysisResult.healthScore && (
              <View style={styles.healthScoreSection}>
                <Text style={[styles.healthScoreLabel, { color: colors.text }]}>
                  {t('healthScore.title') || 'Health Score'}
                </Text>
                <Text style={[styles.healthScoreValue, { color: colors.primary }]}>
                  {photoAnalysisResult.healthScore.score || 0}/100
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      );
    }

    if (!healthResult) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="medical" size={64} color={colors.textTertiary || '#8E8E93'} />
          <Text style={[styles.emptyText, { color: colors.textSecondary || '#6B7280' }]}>
            {t('aiAssistant.healthAnalysis.empty') || 'Paste your health information or lab results below to analyze'}
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.labResultsContainer} contentContainerStyle={styles.labResultsContent}>
        {healthResult.summary && (
          <View style={[styles.labSection, { backgroundColor: colors.surfaceMuted || '#F2F2F7' }]}>
            <Text style={[styles.labSectionTitle, { color: colors.text || '#000000' }]}>
              {t('aiAssistant.healthAnalysis.summary') || 'Summary'}
            </Text>
            <Text style={[styles.labSectionText, { color: colors.text || '#000000' }]}>
              {healthResult.summary}
            </Text>
          </View>
        )}

        {healthResult.keyFindings && healthResult.keyFindings.length > 0 && (
          <View style={styles.labMetricsContainer}>
            <Text style={[styles.labSectionTitle, { color: colors.text || '#000000' }]}>
              {t('aiAssistant.healthAnalysis.keyFindings') || 'Key Findings'}
            </Text>
            {healthResult.keyFindings.map((finding, index) => (
              <View
                key={index}
                style={[
                  styles.labMetricCard,
                  {
                    backgroundColor: colors.surface || colors.card,
                    borderColor: colors.primary || '#007AFF',
                  },
                ]}
              >
                <Text style={[styles.labMetricName, { color: colors.text || '#000000' }]}>
                  {finding}
                </Text>
              </View>
            ))}
          </View>
        )}

        {healthResult.metrics && healthResult.metrics.length > 0 && (
          <View style={styles.labMetricsContainer}>
            <Text style={[styles.labSectionTitle, { color: colors.text || '#000000' }]}>
              {t('aiAssistant.healthAnalysis.metrics') || 'Metrics'}
            </Text>
            {healthResult.metrics.map((metric, index) => (
              <View
                key={index}
                style={[
                  styles.labMetricCard,
                  {
                    backgroundColor: colors.surface || colors.card,
                    borderColor: metric.isNormal
                      ? colors.success || '#34C759'
                      : metric.level === 'high'
                      ? colors.error || '#FF3B30'
                      : colors.warning || '#FF9500',
                  },
                ]}
              >
                <View style={styles.labMetricHeader}>
                  <Text style={[styles.labMetricName, { color: colors.text || '#000000' }]}>
                    {metric.name}
                  </Text>
                  <View
                    style={[
                      styles.labMetricBadge,
                      {
                        backgroundColor: metric.isNormal
                          ? (colors.success + '20') || '#34C75920'
                          : metric.level === 'high'
                          ? (colors.error + '20') || '#FF3B3020'
                          : (colors.warning + '20') || '#FF950020',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.labMetricBadgeText,
                        {
                          color: metric.isNormal
                            ? colors.success || '#34C759'
                            : metric.level === 'high'
                            ? colors.error || '#FF3B30'
                            : colors.warning || '#FF9500',
                        },
                      ]}
                    >
                      {metric.level.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.labMetricValue, { color: colors.text || '#000000' }]}>
                  {metric.value} {metric.unit}
                </Text>
                {metric.comment && (
                  <Text style={[styles.labMetricComment, { color: colors.textSecondary || '#6B7280' }]}>
                    {metric.comment}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {healthResult.recommendation && (
          <View style={[styles.labSection, { backgroundColor: colors.surfaceMuted || '#F2F2F7' }]}>
            <Text style={[styles.labSectionTitle, { color: colors.text || '#000000' }]}>
              {t('aiAssistant.healthAnalysis.recommendation') || 'Recommendations'}
            </Text>
            <Text style={[styles.labSectionText, { color: colors.text || '#000000' }]}>
              {healthResult.recommendation}
            </Text>
          </View>
        )}

        <View style={[styles.labDisclaimer, { backgroundColor: colors.warning + '20' || '#FF950020' }]}>
          <Ionicons name="warning" size={16} color={colors.warning || '#FF9500'} />
          <Text style={[styles.labDisclaimerText, { color: colors.text || '#000000' }]}>
            {t('aiAssistant.healthAnalysis.disclaimer') || 'This is not a medical diagnosis. Please consult a healthcare professional for medical decisions.'}
          </Text>
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background || colors.surface }]}>
      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: colors.surface || colors.card, borderBottomColor: colors.border || '#E5E5EA' }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'chat' && { borderBottomColor: colors.primary || '#007AFF' },
          ]}
          onPress={() => setActiveTab('chat')}
        >
          <Ionicons
            name="chatbubbles"
            size={20}
            color={activeTab === 'chat' ? colors.primary || '#007AFF' : colors.textTertiary || '#8E8E93'}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'chat' ? colors.primary || '#007AFF' : colors.textTertiary || '#8E8E93',
              },
            ]}
          >
            {t('aiAssistant.tabs.chat') || 'Chat'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'health' && { borderBottomColor: colors.primary || '#007AFF' },
          ]}
          onPress={() => setActiveTab('health')}
        >
          <Ionicons
            name="medical"
            size={20}
            color={activeTab === 'health' ? colors.primary || '#007AFF' : colors.textTertiary || '#8E8E93'}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'health' ? colors.primary || '#007AFF' : colors.textTertiary || '#8E8E93',
              },
            ]}
          >
            {t('aiAssistant.tabs.healthAnalysis') || 'Health Analysis'}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {activeTab === 'chat' ? (
          <>
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
            <View style={[styles.inputContainer, { 
              backgroundColor: colors.surface || colors.card, 
              borderTopColor: colors.border || '#E5E5EA',
              paddingBottom: insets.bottom || 12,
            }]}>
              <TextInput
                ref={inputRef}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground || '#F2F2F7',
                    color: colors.text || '#000000',
                    borderColor: colors.border || '#E5E5EA',
                  },
                ]}
                placeholder={t('aiAssistant.placeholder') || 'Type your question...'}
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
          </>
        ) : (
          <>
            {renderHealthResults()}
            
            {/* Task 6: Photo upload section */}
            {!photoAnalysisResult && (
              <View style={[styles.photoUploadSection, { backgroundColor: colors.surfaceMuted || '#F2F2F7' }]}>
                <Text style={[styles.photoUploadTitle, { color: colors.text }]}>
                  {t('aiAssistant.healthAnalysis.addPhoto') || 'Add Photo'}
                </Text>
                <ImagePickerBlock
                  onImageSelected={handlePhotoAnalysis}
                  selectedImage={healthAnalysisImage || undefined}
                  placeholder={t('aiAssistant.healthAnalysis.selectPhoto') || 'Select a photo to analyze'}
                />
                {isAnalyzingPhoto && (
                  <View style={styles.analyzingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.analyzingText, { color: colors.textSecondary }]}>
                      {t('aiAssistant.healthAnalysis.analyzing') || 'Analyzing photo...'}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Health Analysis Input */}
            <View style={[styles.inputContainer, { 
              backgroundColor: colors.surface || colors.card, 
              borderTopColor: colors.border || '#E5E5EA',
              paddingBottom: insets.bottom || 12,
            }]}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground || '#F2F2F7',
                    color: colors.text || '#000000',
                    borderColor: colors.border || '#E5E5EA',
                  },
                ]}
                placeholder={t('aiAssistant.healthAnalysis.placeholder') || 'Paste your health information or lab results here...'}
                placeholderTextColor={colors.textTertiary || '#8E8E93'}
                value={healthText}
                onChangeText={setHealthText}
                multiline
                maxLength={2000}
                editable={!isLoading && !isAnalyzingPhoto}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  {
                    backgroundColor:
                      healthText.trim() && !isLoading && !isAnalyzingPhoto
                        ? colors.primary || '#007AFF'
                        : colors.surfaceMuted || '#E5E5EA',
                  },
                ]}
                onPress={handleAnalyzeHealth}
                disabled={!healthText.trim() || isLoading || isAnalyzingPhoto}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.onPrimary || '#FFFFFF'} />
                ) : (
                  <Ionicons
                    name="analytics"
                    size={20}
                    color={
                      healthText.trim() && !isLoading && !isAnalyzingPhoto
                        ? colors.onPrimary || '#FFFFFF'
                        : colors.textTertiary || '#8E8E93'
                    }
                  />
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
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
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  labResultsContainer: {
    flex: 1,
  },
  labResultsContent: {
    padding: 16,
    paddingBottom: 8,
  },
  labSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  labSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  labSectionText: {
    fontSize: 16,
    lineHeight: 24,
  },
  labMetricsContainer: {
    marginBottom: 16,
  },
  labMetricCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
  },
  labMetricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  labMetricName: {
    fontSize: 16,
    fontWeight: '600',
  },
  labMetricBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  labMetricBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  labMetricValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  labMetricComment: {
    fontSize: 14,
    lineHeight: 20,
  },
  labDisclaimer: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  labDisclaimerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});

