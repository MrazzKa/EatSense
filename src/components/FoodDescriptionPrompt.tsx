import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';

interface FoodDescriptionPromptProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (_description: string) => void;
  imageUri?: string;
}

export const FoodDescriptionPrompt: React.FC<FoodDescriptionPromptProps> = ({
  visible,
  onClose,
  onConfirm,
  imageUri: _imageUri,
}) => {
  const [description, setDescription] = useState('');
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useI18n();

  const handleConfirm = () => {
    if (description.trim()) {
      onConfirm(description.trim());
      setDescription('');
    } else {
      onConfirm('');
      setDescription('');
    }
    onClose();
  };

  const handleSkip = () => {
    onConfirm('');
    setDescription('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.backdrop,
            { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
          ]}
        >
          <View
            style={[
              styles.content,
              {
                backgroundColor: colors.card || colors.surface,
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.textPrimary || colors.text }]}>
                {t('foodDescriptionPrompt.title') || 'Что вы ели?'}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.textPrimary || colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('foodDescriptionPrompt.subtitle') || 'Это поможет нам лучше проанализировать ваше блюдо'}
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  color: colors.textPrimary || colors.text,
                  backgroundColor: colors.surface || colors.background,
                  borderColor: colors.border || colors.borderMuted,
                },
              ]}
              placeholder={t('foodDescriptionPrompt.placeholder') || 'Например: хачапури, борщ, салат...'}
              placeholderTextColor={colors.textTertiary || colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              autoFocus={true}
              multiline={false}
            />

            <View style={styles.buttons}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.skipButton,
                  { borderColor: colors.border || colors.borderMuted },
                ]}
                onPress={handleSkip}
              >
                <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>
                  {t('foodDescriptionPrompt.skip') || 'Пропустить'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.confirmButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleConfirm}
              >
                <Text style={[styles.confirmButtonText, { color: '#FFFFFF' }]}>
                  {t('foodDescriptionPrompt.confirm') || 'Продолжить'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    minHeight: 50,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    // backgroundColor set via style prop
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

