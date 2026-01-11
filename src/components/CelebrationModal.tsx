import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import ConfettiCelebration from './ConfettiCelebration';

interface CelebrationModalProps {
  visible: boolean;
  completionRate: number; // 0-1
  onClose: () => void;
  onContinue?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * CelebrationModal - Shows celebration when day is completed
 * Displays confetti, praise text based on completion rate, and auto-closes after 2 seconds
 */
export default function CelebrationModal({
  visible,
  completionRate,
  onClose,
  onContinue,
}: CelebrationModalProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [showConfetti, setShowConfetti] = useState(false);

  const handleClose = React.useCallback(() => {
    setShowConfetti(false);
    onClose();
  }, [onClose]);

  const handleContinue = React.useCallback(() => {
    handleClose();
    onContinue?.();
  }, [handleClose, onContinue]);

  useEffect(() => {
    if (visible) {
      setShowConfetti(true);
      // Auto-close after 2 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setShowConfetti(false);
    }
  }, [visible, handleClose]);

  // Get praise text based on completion rate
  const getPraiseText = () => {
    if (completionRate >= 1.0) {
      return t('diets.celebration.perfect') || 'Perfect! 🎉';
    } else if (completionRate >= 0.8) {
      return t('diets.celebration.excellent') || 'Excellent work! 🌟';
    } else if (completionRate >= 0.6) {
      return t('diets.celebration.great') || 'Great job! 💪';
    } else {
      return t('diets.celebration.good') || 'Good progress! 👍';
    }
  };

  const getSubtext = () => {
    if (completionRate >= 1.0) {
      return t('diets.celebration.perfectSubtext') || 'You completed all tasks today!';
    } else if (completionRate >= 0.6) {
      return t('diets.celebration.greatSubtext') || 'You\'re maintaining your streak!';
    } else {
      return t('diets.celebration.goodSubtext') || 'Every step counts!';
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <ConfettiCelebration
          visible={showConfetti}
          onComplete={() => setShowConfetti(false)}
          duration={2000}
          particleCount={80}
        />

        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="trophy" size={64} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {getPraiseText()}
          </Text>

          <Text style={[styles.subtext, { color: colors.textSecondary }]}>
            {getSubtext()}
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {t('common.continue') || 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 400,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 120,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
