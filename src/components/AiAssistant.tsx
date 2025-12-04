// AI Assistant with safe error handling
// Wrapped in ErrorBoundary to prevent crashes

import React, { useEffect, useState, Suspense } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { clientLog } from '../utils/clientLog';
import { ErrorBoundary } from './ErrorBoundary';
import { useI18n } from '../../app/i18n/hooks';
import { useTheme } from '../contexts/ThemeContext';
import { RealAiAssistant } from './RealAiAssistant';
import { SwipeClosableModal } from './common/SwipeClosableModal';

interface AiAssistantProps {
  visible: boolean;
  onClose: () => void;
}

// Safe fallback component
const AiAssistantFallback: React.FC<{ onClose: () => void; t: (key: string) => string }> = ({ onClose, t }) => {
  const { colors } = useTheme();
  
  return (
    <View style={styles.fallbackContent}>
      <View style={styles.iconContainer}>
        <Ionicons name="chatbubbles" size={64} color={colors.primary || '#007AFF'} />
      </View>
      
      <Text style={[styles.mainTitle, { color: colors.textPrimary || colors.text }]}>
        {t('aiAssistant.unavailable') || 'AI Assistant temporarily unavailable'}
      </Text>
      
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {t('aiAssistant.unavailableDescription') || 
          'We are testing the first version of the app. The assistant section is temporarily disabled, but everything else is working.'}
      </Text>
      
      <TouchableOpacity 
        style={[styles.closeButtonLarge, { backgroundColor: colors.primary || '#007AFF' }]}
        onPress={() => {
          if (onClose && typeof onClose === 'function') {
            onClose();
          }
        }}
      >
        <Text style={[styles.closeButtonText, { color: colors.onPrimary || '#FFFFFF' }]}>
          {t('common.close') || 'Close'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// Main component with error boundary
const AiAssistantContent: React.FC<AiAssistantProps> = ({ visible, onClose }) => {
  const { t } = useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (visible) {
      console.log('[AiAssistant] Modal opened, visible:', visible);
      clientLog('AiAssistant:opened').catch(() => {});
      setHasError(false);
    } else {
      console.log('[AiAssistant] Modal closed, visible:', visible);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      // Try to initialize AI Assistant
      clientLog('AiAssistant:initializing').catch(() => {});
      
      // Future: Load real AI Assistant implementation here
      // For now, just show fallback
      
      clientLog('AiAssistant:ready').catch(() => {});
    }
  }, [visible]);

  if (!visible) {
    return null;
  }

  const handleClose = async () => {
    await clientLog('AiAssistant:closed').catch(() => {});
    if (onClose && typeof onClose === 'function') {
    onClose();
    }
  };

  return (
    <SwipeClosableModal
      visible={visible}
      onClose={handleClose}
      swipeDirection="down"
      enableSwipe={true}
      enableBackdropClose={true}
      animationType="fade"
      presentationStyle="fullScreen"
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background || colors.surface }]}
        edges={['top', 'bottom']}
      >
        <View
          style={[
            styles.header,
            {
              borderBottomColor: colors.border || '#E5E5EA',
              paddingTop: 8,
              paddingHorizontal: 16,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.textPrimary || colors.text }]}>
            {t('dashboard.aiAssistant') || 'AI Assistant'}
          </Text>
          <TouchableOpacity
            onPress={typeof handleClose === 'function' ? handleClose : () => {}}
            style={styles.closeButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="close"
              size={24}
              color={colors.textPrimary || colors.text || '#000'}
            />
          </TouchableOpacity>
        </View>

        <ErrorBoundary>
          {hasError ? (
            <AiAssistantFallback onClose={handleClose} t={t} />
          ) : (
            <Suspense
              fallback={
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary || '#007AFF'} />
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                    {t('common.loading') || 'Loading...'}
                  </Text>
                </View>
              }
            >
              <RealAiAssistant onClose={handleClose} />
            </Suspense>
          )}
        </ErrorBoundary>
      </SafeAreaView>
    </SwipeClosableModal>
  );
};

const AiAssistant: React.FC<AiAssistantProps> = (props) => {
  return <AiAssistantContent {...props} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    minHeight: 56,
    zIndex: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    padding: 12,
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  fallbackContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  closeButtonLarge: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AiAssistant;
