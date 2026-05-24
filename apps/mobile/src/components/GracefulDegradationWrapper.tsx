import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../app/i18n/hooks';

interface GracefulDegradationWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (_error: Error) => void;
}

export const GracefulDegradationWrapper: React.FC<GracefulDegradationWrapperProps> = ({
  children,
  fallback,
  onError,
}) => {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    // Add error boundary logic here
    return () => {
      // Cleanup if needed
    };
  }, [onError]);

  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        {fallback || (
          <View style={styles.defaultFallback}>
            <Ionicons name="warning" size={48} color="#E74C3C" />
            <Text style={styles.errorTitle}>{t('errorBoundary.somethingWentWrong') || 'Something went wrong'}</Text>
            <Text style={styles.errorMessage}>
              {error?.message || t('errorBoundary.unexpectedError') || 'An unexpected error occurred'}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setHasError(false);
                setError(null);
              }}
            >
              <Text style={styles.retryButtonText}>{t('common.tryAgain') || t('errorBoundary.tryAgain') || 'Try Again'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  defaultFallback: {
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
