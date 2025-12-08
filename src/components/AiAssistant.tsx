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
        {t('aiAssistant.unavailable')}
      </Text>
      
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {t('aiAssistant.unavailableDescription')}
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
          {t('common.close')}
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
      enableSwipe={false}
      enableBackdropClose={true}
      presentationStyle="fullScreen"
    >
      <ErrorBoundary>
          {hasError ? (
            <AiAssistantFallback onClose={handleClose} t={t} />
          ) : (
            <Suspense
              fallback={
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary || '#007AFF'} />
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                    {t('common.loading')}
                  </Text>
                </View>
              }
            >
              <RealAiAssistant onClose={handleClose} />
            </Suspense>
          )}
        </ErrorBoundary>
    </SwipeClosableModal>
  );
};

const AiAssistant: React.FC<AiAssistantProps> = (props) => {
  return <AiAssistantContent {...props} />;
};

const styles = StyleSheet.create({
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
