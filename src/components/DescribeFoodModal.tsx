import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SwipeClosableModal } from './common/SwipeClosableModal';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import ApiService from '../services/apiService';
import { useNavigation } from '@react-navigation/native';
import { mapLanguageToLocale } from '../utils/locale';

interface DescribeFoodModalProps {
  visible: boolean;
  onClose: () => void;
  /**
   * If provided, modal will NOT navigate itself,
   * but will pass analysisId to parent.
   */
  onAnalysisCompleted?: (_analysisId: string) => void;
}

const DescribeFoodModal: React.FC<DescribeFoodModalProps> = ({
  visible,
  onClose,
  onAnalysisCompleted,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const navigation = useNavigation<any>();

  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setText('');
    setLoading(false);
    setError(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleAnalyze = async () => {
    setError(null);

    if (!text.trim()) {
      setError(t('describeFood.errors.emptyText'));
      return;
    }

    setLoading(true);

    try {
      const locale = mapLanguageToLocale(language);
      
      // Call analyzeText API
      const response = await ApiService.analyzeText(text.trim(), locale);

      // Backend returns { analysisId: string }
      const analysisId = response?.analysisId;

      if (!analysisId) {
        console.warn(
          '[DescribeFoodModal] analyzeText response has no analysisId. Response =',
          response,
        );
        setError(t('describeFood.errors.noAnalysisId'));
        setLoading(false);
        return;
      }

      // Navigate with analysisId and let AnalysisResultsScreen handle polling
      // If onAnalysisCompleted is provided, call it instead of navigating
      if (onAnalysisCompleted) {
        onAnalysisCompleted(analysisId);
        handleClose();
        return;
      }

      // Otherwise, navigate to AnalysisResultsScreen
      if (navigation && typeof navigation.navigate === 'function') {
        navigation.navigate('AnalysisResults', {
          analysisId,
        });
        handleClose();
      } else {
        setError(t('describeFood.errors.navigationFailed'));
      }
    } catch (err: any) {
      console.error('[DescribeFoodModal] analyzeText error', err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        t('describeFood.errors.generic');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SwipeClosableModal
      visible={visible}
      onClose={handleClose}
      presentationStyle="pageSheet"
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
      >
        <View
          style={[
            styles.container,
            {
              paddingBottom: insets.bottom + 16,
              backgroundColor: colors.background,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.textPrimary || colors.text }]}>
            {t('describeFood.title')}
          </Text>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('describeFood.subtitle')}
          </Text>

          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t('describeFood.label')}
          </Text>

          <TextInput
            style={[
              styles.textInput,
              {
                color: colors.textPrimary || colors.text,
                backgroundColor: colors.card || colors.surface,
                borderColor: colors.border || colors.borderMuted,
              },
            ]}
            multiline
            value={text}
            onChangeText={setText}
            placeholder={t('describeFood.placeholder')}
            placeholderTextColor={colors.textTertiary || colors.textSecondary}
            editable={!loading}
            textAlignVertical="top"
          />

          {error && (
            <View style={[styles.errorBox, { backgroundColor: (colors.error || '#EF4444') + '15' }]}>
              <Text style={[styles.errorText, { color: colors.error || '#EF4444' }]}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: colors.primary,
                opacity: loading ? 0.7 : 1,
              },
            ]}
            onPress={handleAnalyze}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.onPrimary || '#FFFFFF'} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.onPrimary || '#FFFFFF' }]}>
                {t('describeFood.analyzeButton')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SwipeClosableModal>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
    fontWeight: '500',
  },
  textInput: {
    minHeight: 140,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  errorBox: {
    marginTop: 8,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 13,
  },
  button: {
    marginTop: 8,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 15,
  },
});

export default DescribeFoodModal;
