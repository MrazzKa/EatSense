import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SwipeClosableModal } from './common/SwipeClosableModal';
import { useI18n } from '../../app/i18n/hooks';
import { useTheme } from '../contexts/ThemeContext';

interface DescribeFoodModalProps {
  visible: boolean;
  onClose: () => void;
  onAnalyze: (description: string) => void;
}

export const DescribeFoodModal: React.FC<DescribeFoodModalProps> = ({ visible, onClose, onAnalyze }) => {
  const [description, setDescription] = useState('');
  const { t } = useI18n();
  const { colors } = useTheme();

  const handleAnalyze = () => {
    if (description.trim()) {
      if (onAnalyze && typeof onAnalyze === 'function') {
        onAnalyze(description.trim());
      }
      setDescription('');
      if (onClose && typeof onClose === 'function') {
        onClose();
      }
    }
  };

  return (
    <SwipeClosableModal
      visible={visible}
      onClose={onClose}
      swipeDirection="down"
      enableSwipe={true}
      enableBackdropClose={true}
      animationType="fade"
    >
          <View style={[styles.content, { backgroundColor: colors.background || colors.surface }]}>
            <Text style={[styles.title, { color: colors.textPrimary || colors.text }]}>{t('describeFood.title')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('describeFood.subtitle')}
            </Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.textInput, {
                  backgroundColor: colors.inputBackground || colors.surface,
                  borderColor: colors.border || colors.borderMuted,
                  color: colors.textPrimary || colors.text,
                }]}
                placeholder={t('describeFood.placeholder')}
                placeholderTextColor={colors.textTertiary || colors.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            
            <TouchableOpacity 
              style={[
                styles.analyzeButton, 
                { backgroundColor: colors.primary || '#3498DB' },
                !description.trim() && { backgroundColor: colors.surfaceMuted || '#BDC3C7' }
              ]} 
              onPress={handleAnalyze}
              disabled={!description.trim()}
            >
              <Ionicons name="sparkles" size={20} color={colors.onPrimary || '#FFFFFF'} />
              <Text style={[styles.analyzeButtonText, { color: colors.onPrimary || '#FFFFFF' }]}>
                {t('describeFood.analyze')}
              </Text>
            </TouchableOpacity>
          </View>
    </SwipeClosableModal>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  analyzeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
