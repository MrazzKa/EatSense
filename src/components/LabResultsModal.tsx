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
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
  const [imageFile, setImageFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const resetState = () => {
    setMode('text');
    setText('');
    setFile(null);
    setImageFile(null);
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
        setImageFile(null);
        setMode('file');
      }
    } catch (err) {
      console.error('LabResultsModal: file pick error', err);
      setError(t('aiAssistant.lab.errors.filePickFailed'));
    }
  };

  const handlePickImage = async () => {
    try {
      setError(null);
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!pickerResult.canceled && pickerResult.assets[0]) {
        // Convert to JPEG to avoid HEIF/HEIC format issues on backend
        // This handles iOS photos that are often in HEIF format
        const manipulated = await ImageManipulator.manipulateAsync(
          pickerResult.assets[0].uri,
          [], // No transformations needed, just format conversion
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );

        setImageFile({
          uri: manipulated.uri,
          name: `lab-photo-${Date.now()}.jpg`,
          type: 'image/jpeg',
        });
        setFile(null);
        setMode('file');
      }
    } catch (err) {
      console.error('LabResultsModal: image pick error', err);
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
      if ((!file || file.canceled || !file.assets || file.assets.length === 0) && !imageFile) {
        setError(t('aiAssistant.lab.errors.noFile'));
        return;
      }
    }

    setLoading(true);

    try {
      const locale = language === 'ru' ? 'ru' : language === 'kk' ? 'kk' : 'en';
      let response;

      if (mode === 'text') {
        // Text mode: send JSON payload
        const payload = {
          inputType: 'text',
          text: text.trim(),
          locale,
        };
        response = await ApiService.analyzeLabResults(payload);
      } else if (mode === 'file') {
        // File mode: first upload file, then send fileId
        let fileId: string | undefined;
        let fileName: string | undefined;
        let mimeType: string | undefined;

        if (imageFile) {
          // Photo upload - upload to media service first
          try {
            const uploadResult = await ApiService.uploadImage(imageFile.uri);
            if (uploadResult?.id) {
              fileId = uploadResult.id;
              fileName = imageFile.name;
              mimeType = imageFile.type;
            } else {
              throw new Error('Failed to upload file');
            }
          } catch (uploadError: any) {
            console.error('LabResultsModal: file upload error', uploadError);
            setError(t('aiAssistant.lab.errors.fileUploadFailed') || 'Failed to upload file. Please try again.');
            setLoading(false);
            return;
          }
        } else if (file && file.assets && file.assets.length > 0) {
          // PDF upload - upload to media service first
          try {
            console.log('[LabResultsModal] PDF picker result:', file);
            const asset = file.assets[0];

            console.log('[LabResultsModal] Uploading PDF:', asset.name);

            const uploadResult = await ApiService.uploadImage(asset.uri);
            if (uploadResult?.id) {
              fileId = uploadResult.id;
              fileName = asset.name || `lab-report-${Date.now()}.pdf`;
              mimeType = asset.mimeType || 'application/pdf';

              console.log('[LabResultsModal] PDF uploaded, fileId:', fileId);
            } else {
              throw new Error('Failed to upload PDF file');
            }
          } catch (uploadError: any) {
            console.error('[LabResultsModal] PDF upload error:', uploadError);
            setError(t('aiAssistant.lab.errors.fileUploadFailed') || 'Failed to upload PDF. Please try again.');
            setLoading(false);
            return;
          }
        } else {
          setError(t('aiAssistant.lab.errors.noFile'));
          setLoading(false);
          return;
        }

        // Now send analysis request with fileId
        if (fileId) {
          const payload = {
            inputType: 'file' as const,
            fileId,
            fileName,
            mimeType,
            locale,
          };
          response = await ApiService.analyzeLabResults(payload);
        } else {
          setError(t('aiAssistant.lab.errors.noFile'));
          setLoading(false);
          return;
        }
      } else {
        setError(t('aiAssistant.lab.errors.generic'));
        setLoading(false);
        return;
      }

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
      presentationStyle="fullScreen"
      enableSwipe={false}
      enableBackdropClose={false}
    >
      <View style={[styles.container, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        {/* Header with close button */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary || colors.text }]}>
            {t('aiAssistant.lab.title')}
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color={colors.textPrimary || colors.text} />
          </TouchableOpacity>
        </View>
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
            <View style={styles.fileButtonsRow}>
              <TouchableOpacity
                style={[styles.fileButton, { borderColor: colors.primary, flex: 1, marginRight: 8 }]}
                onPress={handlePickFile}
                disabled={loading}
              >
                <Ionicons name="document-text" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.fileButtonText, { color: colors.primary }]}>
                  {t('aiAssistant.lab.attachPdf')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.fileButton, { borderColor: colors.primary, flex: 1, marginLeft: 8 }]}
                onPress={handlePickImage}
                disabled={loading}
              >
                <Ionicons name="image" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.fileButtonText, { color: colors.primary }]}>
                  {t('aiAssistant.lab.attachPhoto')}
                </Text>
              </TouchableOpacity>
            </View>
            {(file || imageFile) && (
              <View style={[styles.selectedFileInfo, { backgroundColor: colors.success + '15' }]}>
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={colors.success || '#10B981'}
                />
                <Text style={[styles.selectedFileText, { color: colors.success || '#10B981', flex: 1 }]}>
                  {file ? t('aiAssistant.lab.pdfAttached') || 'PDF прикреплен' : t('aiAssistant.lab.photoAttached') || 'Фото прикреплено'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setFile(null);
                    setImageFile(null);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={20} color={colors.textTertiary || '#9CA3AF'} />
                </TouchableOpacity>
              </View>
            )}
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
              {t('aiAssistant.lab.resultTitle') || 'Разбор и рекомендации'}
            </Text>
            <Text style={[styles.resultText, { color: colors.textSecondary }]}>
              {result}
            </Text>
            {/* Disclaimer */}
            <View style={[styles.disclaimerBox, { backgroundColor: colors.surfaceMuted || colors.surface }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
                {t('aiAssistant.lab.disclaimer') || 'Приложение не является заменой профессиональной медицинской консультации. При наличии проблем со здоровьем обратитесь к врачу.'}
              </Text>
            </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
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
  fileButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  fileButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  fileButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedFileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    gap: 8,
  },
  selectedFileText: {
    fontSize: 13,
    flex: 1,
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
  disclaimerBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  disclaimerText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
});

export default LabResultsModal;
