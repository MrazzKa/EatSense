import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SwipeClosableModal } from './common/SwipeClosableModal';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import ApiService from '../services/apiService';

type LabMode = 'text' | 'file';

interface LabResultsModalProps {
  visible: boolean;
  onClose: () => void;
  onResult?: (_result: any) => void;
}

const LabResultsModal: React.FC<LabResultsModalProps> = ({ visible, onClose, onResult }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, language } = useI18n();

  const [mode, setMode] = useState<LabMode>('text');
  const [text, setText] = useState('');
  const [file, setFile] = useState<DocumentPicker.DocumentPickerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const resetState = () => {
    setMode('text');
    setText('');
    setFile(null);
    setLoading(false);
    setError(null);
    setResult(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handlePickFile = async () => {
    try {
      setError(null);
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (res.canceled) return;

      if (res.assets && res.assets.length > 0) {
        setFile(res);
        setMode('file');
      }
    } catch (err) {
      console.error('LabResultsModal: file pick error', err);
      setError(t('aiAssistant.lab.errors.filePickFailed'));
    }
  };

  const handleAnalyze = async () => {
    setError(null);
    setResult(null);

    // Simple validation: either text or file
    if (mode === 'text') {
      if (!text.trim()) {
        setError(t('aiAssistant.lab.errors.emptyText'));
        return;
      }
    }

    if (mode === 'file') {
      if (!file || file.canceled || !file.assets || file.assets.length === 0) {
        setError(t('aiAssistant.lab.errors.noFile'));
        return;
      }
    }

    setLoading(true);

    try {
      const locale = language === 'ru' ? 'ru' : language === 'kk' ? 'kk' : 'en';
      const payload: any = {
        inputType: mode,
        locale,
      };

      if (mode === 'text') {
        payload.text = text.trim();
      }

      // For file mode, we would need to upload the file first and get fileId
      // For now, we'll show an error that file mode is not yet implemented
      if (mode === 'file') {
        setError(t('aiAssistant.lab.errors.fileNotSupported'));
        setLoading(false);
        return;
      }

      const response = await ApiService.analyzeLabResults(payload);

      if (response?.summary) {
        setResult(response.summary);
        if (onResult) {
          onResult({ success: true, summary: response.summary });
        }
      } else if (typeof response === 'string') {
        setResult(response);
        if (onResult) {
          onResult({ success: true, summary: response });
        }
      } else {
        setError(t('aiAssistant.lab.errors.noSummary'));
      }
    } catch (err: any) {
      console.error('LabResultsModal: analyze error', err);
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t('aiAssistant.lab.errors.generic');
      setError(message);
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
      <View style={[styles.container, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.textPrimary || colors.text }]}>
          {t('aiAssistant.lab.title')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('aiAssistant.lab.subtitle')}
        </Text>

        {/* Mode Switch */}
        <View style={styles.modeSwitch}>
          <ModeButton
            label={t('aiAssistant.lab.mode.text')}
            active={mode === 'text'}
            onPress={() => {
              setMode('text');
              setFile(null);
            }}
            colors={colors}
          />
          <ModeButton
            label={t('aiAssistant.lab.mode.file')}
            active={mode === 'file'}
            onPress={() => {
              setMode('file');
              setText('');
            }}
            colors={colors}
          />
        </View>

        {/* Text Input */}
        {mode === 'text' && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('aiAssistant.lab.textLabel')}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  color: colors.textPrimary || colors.text,
                  borderColor: colors.border || colors.borderMuted,
                  backgroundColor: colors.card || colors.surface,
                },
              ]}
              placeholder={t('aiAssistant.lab.textPlaceholder')}
              placeholderTextColor={colors.textTertiary || colors.textSecondary}
              multiline
              value={text}
              onChangeText={setText}
              editable={!loading}
            />
          </View>
        )}

        {/* File */}
        {mode === 'file' && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('aiAssistant.lab.fileLabel')}
            </Text>
            <TouchableOpacity
              style={[styles.fileButton, { borderColor: colors.primary }]}
              onPress={handlePickFile}
              disabled={loading}
            >
              <Text style={[styles.fileButtonText, { color: colors.primary }]}>
                {file?.assets?.[0]?.name || t('aiAssistant.lab.attachPdf')}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.helperText, { color: colors.textTertiary || colors.textSecondary }]}>
              {t('aiAssistant.lab.fileHint')}
            </Text>
          </View>
        )}

        {/* Errors */}
        {error && (
          <View style={[styles.errorBox, { backgroundColor: colors.error + '15' }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        )}

        {/* Analyze Button */}
        <TouchableOpacity
          style={[
            styles.analyzeButton,
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
            <Text style={[styles.analyzeButtonText, { color: colors.onPrimary || '#FFFFFF' }]}>
              {t('aiAssistant.lab.analyzeButton')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Result */}
        {result && (
          <ScrollView style={[styles.resultBox, { backgroundColor: colors.card || colors.surface }]}>
            <Text style={[styles.resultTitle, { color: colors.textPrimary || colors.text }]}>
              {t('aiAssistant.lab.resultTitle')}
            </Text>
            <Text style={[styles.resultText, { color: colors.textSecondary }]}>
              {result}
            </Text>
          </ScrollView>
        )}
      </View>
    </SwipeClosableModal>
  );
};

interface ModeButtonProps {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: any;
}

const ModeButton: React.FC<ModeButtonProps> = ({ label, active, onPress, colors }) => {
  return (
    <TouchableOpacity
      style={[
        styles.modeButton,
        {
          backgroundColor: active ? colors.primary : 'transparent',
          borderColor: colors.primary,
        },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.modeButtonText,
          { color: active ? colors.onPrimary || '#FFFFFF' : colors.primary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
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
    marginBottom: 16,
  },
  modeSwitch: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
    fontWeight: '500',
  },
  textInput: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  fileButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  fileButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
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
  analyzeButton: {
    marginTop: 8,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeButtonText: {
    fontWeight: '600',
    fontSize: 15,
  },
  resultBox: {
    marginTop: 16,
    borderRadius: 12,
    padding: 12,
    maxHeight: 300,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default LabResultsModal;
