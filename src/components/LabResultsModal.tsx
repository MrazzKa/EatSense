import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { SwipeClosableModal } from './common/SwipeClosableModal';
import { useI18n } from '../../app/i18n/hooks';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import ApiService from '../services/apiService';
import { mapLanguageToLocale } from '../utils/locale';
import { ProfileSegmentedControl } from './ProfileSegmentedControl';

interface LabResultsModalProps {
  visible: boolean;
  onClose: () => void;
  onResult?: (result: any) => void;
}

const LAB_TYPES = [
  { id: 'auto', i18nKey: 'aiAssistant.lab.type.auto' },
  { id: 'cbc', i18nKey: 'aiAssistant.lab.type.cbc' },
  { id: 'biochemistry', i18nKey: 'aiAssistant.lab.type.biochemistry' },
  { id: 'lipid', i18nKey: 'aiAssistant.lab.type.lipid' },
  { id: 'glycemic', i18nKey: 'aiAssistant.lab.type.glycemic' },
  { id: 'vitamins', i18nKey: 'aiAssistant.lab.type.vitamins' },
  { id: 'hormonal', i18nKey: 'aiAssistant.lab.type.hormonal' },
  { id: 'inflammation', i18nKey: 'aiAssistant.lab.type.inflammation' },
  { id: 'other', i18nKey: 'aiAssistant.lab.type.other' },
];

export const LabResultsModal: React.FC<LabResultsModalProps> = ({
  visible,
  onClose,
  onResult,
}) => {
  console.log('[LabResultsModal] visible:', visible);
  
  const { t, language } = useI18n();
  const { colors, tokens } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [selectedLabType, setSelectedLabType] = useState<string>('auto');
  const [question, setQuestion] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ type: 'image' | 'pdf'; uri: string; name: string; mimeType: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          t('common.error') || 'Error',
          t('gallery.permissionRequired') || 'Permission to access gallery is required',
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
        setSelectedFile({
          type: 'image',
          uri: asset.uri,
          name: asset.fileName || 'lab-photo.jpg',
          mimeType: asset.mimeType || 'image/jpeg',
        });
      }
    } catch (e) {
      console.warn('handlePickImage error', e);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          type: 'pdf',
          uri: asset.uri,
          name: asset.name || 'document.pdf',
          mimeType: asset.mimeType || 'application/pdf',
        });
      }
    } catch (e) {
      console.warn('handlePickDocument error', e);
    }
  };

  const handleRemoveAttachment = () => {
    setSelectedFile(null);
  };

  const handleSubmit = async () => {
    if (!question.trim() && !selectedFile) {
      Alert.alert(
        t('common.error') || 'Error',
        t('aiAssistant.lab.emptyError') || 'Please provide lab results text or attach a file',
      );
      return;
    }

    if (!user?.id) {
      Alert.alert(t('common.error') || 'Error', t('auth.error') || 'User not authenticated');
      return;
    }

    setIsSubmitting(true);

    try {
      const locale = mapLanguageToLocale(language);

      if (selectedFile) {
        // Create FormData for multipart/form-data
        const formData = new FormData();
        formData.append('question', question.trim() || '');
        formData.append('language', locale);
        if (selectedLabType !== 'auto') {
          formData.append('labType', selectedLabType);
        }

        formData.append('file', {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.mimeType,
        } as any);

        // Use fetch directly for multipart/form-data
        // Note: Don't set Content-Type header manually - browser/React Native will set it with boundary
        const headers: any = ApiService.getHeaders();
        delete headers['Content-Type']; // Let FormData set the Content-Type with boundary
        
        // Get baseURL from ApiService instance
        const baseURL = (ApiService as any).baseURL || 'http://localhost:3000';
        
        const response = await fetch(`${baseURL}/ai-assistant/lab-results`, {
          method: 'POST',
          headers,
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        Alert.alert(
          t('common.success') || 'Success',
          t('aiAssistant.lab.submitted') || 'Lab results submitted successfully',
        );
        if (onResult) {
          onResult(result);
        }
        // Reset form
        setQuestion('');
        setSelectedFile(null);
        setSelectedLabType('auto');
        onClose();
      } else {
        // Text-only submission
        const response = await ApiService.request('/ai-assistant/lab-results', {
          method: 'POST',
          body: JSON.stringify({
            userId: user.id,
            rawText: question.trim(),
            language: locale,
            labType: selectedLabType !== 'auto' ? selectedLabType : undefined,
          }),
        });

        Alert.alert(
          t('common.success') || 'Success',
          t('aiAssistant.lab.submitted') || 'Lab results submitted successfully',
        );
        if (onResult) {
          onResult(response);
        }
        setQuestion('');
        setSelectedLabType('auto');
        onClose();
      }
    } catch (error: any) {
      console.error('Error submitting lab results:', error);
      Alert.alert(
        t('common.error') || 'Error',
        t('aiAssistant.lab.error') || 'Failed to submit lab results. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SwipeClosableModal
      visible={visible}
      onClose={onClose}
      swipeDirection="down"
      enableSwipe={true}
      enableBackdropClose={true}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={{ flex: 1, backgroundColor: colors.background || colors.surface }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
        >
          <SafeAreaView
            style={[styles.container, { backgroundColor: colors.background || colors.surface }]}
            edges={['top', 'bottom']}
          >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border || colors.borderMuted }]}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary || colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary || colors.text }]}>
              {t('aiAssistant.lab.title') || t('aiAssistant.lab.typeTitle') || 'Lab Results Analysis'}
            </Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView
            style={styles.scrollView}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 32 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Lab Type Selection */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary || colors.text }]}>
                {t('aiAssistant.lab.typeTitle') || 'Lab Analysis Type'}
              </Text>
              <ProfileSegmentedControl
                label=""
                value={selectedLabType}
                options={LAB_TYPES.map((type) => ({
                  value: type.id,
                  label: t(type.i18nKey) || type.id,
                }))}
                onChange={setSelectedLabType}
              />
            </View>

            {/* Attachment Block */}
            <View style={styles.section}>
              <View style={styles.attachmentRow}>
                <TouchableOpacity
                  style={[styles.attachButton, { borderColor: colors.border || colors.borderMuted }]}
                  onPress={handlePickImage}
                >
                  <Ionicons name="image-outline" size={24} color={colors.primary} />
                  <Text style={[styles.attachButtonText, { color: colors.textPrimary || colors.text }]}>
                    {t('aiAssistant.lab.attachPhoto') || 'Attach Photo'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.attachButton, { borderColor: colors.border || colors.borderMuted }]}
                  onPress={handlePickDocument}
                >
                  <Ionicons name="document-attach-outline" size={24} color={colors.primary} />
                  <Text style={[styles.attachButtonText, { color: colors.textPrimary || colors.text }]}>
                    {t('aiAssistant.lab.attachPdf') || 'Attach File (PDF)'}
                  </Text>
                </TouchableOpacity>
              </View>

              {selectedFile && (
                <View style={[styles.attachmentPreview, { backgroundColor: colors.surfaceMuted || colors.card }]}>
                  {selectedFile.type === 'image' ? (
                    <Image source={{ uri: selectedFile.uri }} style={styles.previewImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.pdfPreview}>
                      <Ionicons name="document-text" size={48} color={colors.primary} />
                      <Text style={[styles.pdfName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {selectedFile.name}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={handleRemoveAttachment}
                  >
                    <Ionicons name="close-circle" size={24} color={colors.error || '#EF4444'} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Text Input */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.textPrimary || colors.text }]}>
                {t('aiAssistant.lab.manualTitle') || 'Or paste your lab results manually'}
              </Text>
              <TextInput
                style={[
                  styles.manualInput,
                  {
                    backgroundColor: colors.surface,
                    color: colors.textPrimary,
                    borderColor: colors.border || colors.borderMuted,
                  },
                ]}
                placeholder={t('aiAssistant.lab.manualPlaceholder') || 'Paste your lab results here...'}
                placeholderTextColor={colors.textTertiary || colors.textSecondary}
                value={question}
                onChangeText={setQuestion}
                multiline
                textAlignVertical="top"
                editable={!isSubmitting}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  backgroundColor:
                    (question.trim() || selectedFile) && !isSubmitting
                      ? colors.primary
                      : colors.surfaceMuted || '#E5E5EA',
                },
              ]}
              onPress={handleSubmit}
              disabled={(!question.trim() && !selectedFile) || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.onPrimary || '#FFFFFF'} />
              ) : (
                <>
                  <Ionicons name="send" size={20} color={colors.onPrimary || '#FFFFFF'} />
                  <Text style={[styles.submitButtonText, { color: colors.onPrimary || '#FFFFFF' }]}>
                    {t('aiAssistant.lab.submit') || t('common.send') || 'Submit'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </SwipeClosableModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
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
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 16,
  },
  manualInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  pdfPreview: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  pdfName: {
    fontSize: 14,
    paddingHorizontal: 16,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  hintText: {
    fontSize: 14,
    lineHeight: 20,
  },
  attachmentRow: {
    flexDirection: 'row',
    gap: 12,
  },
  attachButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  attachButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  attachmentPreview: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  previewImage: {
    width: '100%',
    height: 200,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LabResultsModal;

