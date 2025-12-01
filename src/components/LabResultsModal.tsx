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
  const { t, language } = useI18n();
  const { colors, tokens } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [selectedLabType, setSelectedLabType] = useState<string>('auto');
  const [question, setQuestion] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
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
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAttachedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('common.error') || 'Error', t('gallery.error') || 'Failed to select image');
    }
  };

  const handlePickDocument = async () => {
    // Use ImagePicker for both images and documents
    // Users can select PDF files through the image picker on some platforms
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
        mediaTypes: ImagePicker.MediaTypeOptions.All, // Allow images and videos (PDF support varies by platform)
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setAttachedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert(
        t('common.error') || 'Error',
        t('aiAssistant.lab.error') || 'Failed to select file',
      );
    }
  };

  const handleRemoveAttachment = () => {
    setAttachedImage(null);
  };

  const handleSubmit = async () => {
    if (!question.trim() && !attachedImage) {
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

      if (attachedImage) {
        // Create FormData for multipart/form-data
        const formData = new FormData();
        formData.append('question', question.trim() || '');
        formData.append('language', locale);
        if (selectedLabType !== 'auto') {
          formData.append('labType', selectedLabType);
        }

        // Determine file type
        const fileName = attachedImage.split('/').pop() || 'image.jpg';
        const fileType = fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';

        formData.append('file', {
          uri: attachedImage,
          name: fileName,
          type: fileType,
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
        setAttachedImage(null);
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
      presentationStyle="fullScreen"
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.surface || colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
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
              {t('aiAssistant.lab.typeTitle') || 'Lab Results Analysis'}
            </Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 24 },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
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
              <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                {t('aiAssistant.lab.hint') || 'Attach a photo of your lab results or enter the results manually'}
              </Text>

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
                    {t('aiAssistant.lab.attachFile') || 'Attach File (PDF)'}
                  </Text>
                </TouchableOpacity>
              </View>

              {attachedImage && (
                <View style={[styles.attachmentPreview, { backgroundColor: colors.surfaceMuted || colors.card }]}>
                  <Image source={{ uri: attachedImage }} style={styles.previewImage} resizeMode="cover" />
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
                {t('aiAssistant.lab.textInputLabel') || 'Or enter lab results manually:'}
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.inputBackground || colors.surfaceMuted,
                    color: colors.textPrimary || colors.text,
                    borderColor: colors.border || colors.borderMuted,
                  },
                ]}
                placeholder={t('aiAssistant.lab.placeholder') || 'Paste your lab results here...'}
                placeholderTextColor={colors.textTertiary || colors.textSecondary}
                value={question}
                onChangeText={setQuestion}
                multiline
                numberOfLines={6}
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
                    (question.trim() || attachedImage) && !isSubmitting
                      ? colors.primary
                      : colors.surfaceMuted || '#E5E5EA',
                },
              ]}
              onPress={handleSubmit}
              disabled={(!question.trim() && !attachedImage) || isSubmitting}
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
    padding: 16,
    paddingTop: 24,
    gap: 24,
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

