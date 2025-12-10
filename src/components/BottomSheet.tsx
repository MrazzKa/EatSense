import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SwipeClosableModal } from './common/SwipeClosableModal';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onCameraPress: () => void;
  onGalleryPress: () => void;
  onDescribeFoodPress: () => void; // Renamed from onDescribePress for clarity
  onLabResultsPress?: () => void; // Optional, separate from describe food
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  onCameraPress,
  onGalleryPress,
  onDescribeFoodPress,
  onLabResultsPress,
}) => {
  const { colors } = useTheme();
  const { t } = useI18n();

  return (
    <SwipeClosableModal
      visible={visible}
      onClose={onClose}
      presentationStyle="pageSheet"
    >
      <View style={[styles.content, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.textPrimary || colors.text }]}>
          {t('dashboard.bottomSheet.title') || 'Add Food'}
        </Text>
        
        <View style={styles.options}>
          <TouchableOpacity
            style={[styles.option, { backgroundColor: colors.card || colors.surface }]}
            onPress={onCameraPress}
          >
            <View style={[styles.optionIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="camera" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.optionText, { color: colors.textPrimary || colors.text }]}>
              {t('dashboard.bottomSheet.takePhoto') || 'Camera'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.option, { backgroundColor: colors.card || colors.surface }]}
            onPress={onGalleryPress}
          >
            <View style={[styles.optionIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="images" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.optionText, { color: colors.textPrimary || colors.text }]}>
              {t('dashboard.bottomSheet.fromGallery') || 'Gallery'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.option, { backgroundColor: colors.card || colors.surface }]}
            onPress={onDescribeFoodPress}
          >
            <View style={[styles.optionIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="create" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.optionText, { color: colors.textPrimary || colors.text }]}>
              {t('dashboard.bottomSheet.describeFood') || 'Describe Food'}
            </Text>
          </TouchableOpacity>

          {onLabResultsPress && (
            <TouchableOpacity
              style={[styles.option, { backgroundColor: colors.card || colors.surface }]}
              onPress={onLabResultsPress}
            >
              <View style={[styles.optionIcon, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="flask" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.optionText, { color: colors.textPrimary || colors.text }]}>
                {t('dashboard.bottomSheet.labResults') || 'Lab Results'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SwipeClosableModal>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  options: {
    gap: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
