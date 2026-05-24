import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import ConfettiCelebration from './ConfettiCelebration';
import { shareLifestyleAsText } from '../services/lifestyleShareService';

interface CelebrationModalProps {
  visible: boolean;
  completionRate: number; // 0-1
  onClose: () => void;
  onContinue?: () => void;
  /** Optional lifestyle/program name for sharing */
  programName?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * CelebrationModal - Shows celebration when day is completed
 * Displays confetti, praise text based on completion rate
 * User must manually close via close button or tapping outside
 * Optionally shows a share button if programName is provided
 */
export default function CelebrationModal({
  visible,
  completionRate,
  onClose,
  programName,
}: CelebrationModalProps) {
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const [showConfetti, setShowConfetti] = useState(false);

  const handleClose = React.useCallback(() => {
    setShowConfetti(false);
    onClose();
  }, [onClose]);

  const handleShare = React.useCallback(() => {
    if (programName) {
      shareLifestyleAsText({
        name: programName,
        language: (language || 'ru') as 'en' | 'ru' | 'kk' | 'fr',
      });
    }
  }, [programName, language]);

  useEffect(() => {
    if (visible) {
      setShowConfetti(true);
    } else {
      setShowConfetti(false);
    }
  }, [visible]);

  // Get praise text based on completion rate
  const getPraiseText = () => {
    if (completionRate >= 1.0) {
      return t('diets_celebration_perfect') || 'Perfect! 🎉';
    } else if (completionRate >= 0.8) {
      return t('diets_celebration_excellent') || 'Excellent work! 🌟';
    } else if (completionRate >= 0.6) {
      return t('diets_celebration_great') || 'Great job! 💪';
    } else {
      return t('diets_celebration_good') || 'Good progress! 👍';
    }
  };

  const getSubtext = () => {
    if (completionRate >= 1.0) {
      return t('diets_celebration_perfectSubtext') || 'You completed all tasks today!';
    } else if (completionRate >= 0.6) {
      return t('diets_celebration_greatSubtext') || "You're maintaining your streak!";
    } else {
      return t('diets_celebration_goodSubtext') || 'Every step counts!';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <ConfettiCelebration
            visible={showConfetti}
            onComplete={() => setShowConfetti(false)}
            duration={2000}
            particleCount={80}
          />

          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.container, { backgroundColor: colors.surface }]}>
              {/* Close button */}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>

              <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="trophy" size={64} color={colors.primary} />
              </View>

              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {getPraiseText()}
              </Text>

              <Text style={[styles.subtext, { color: colors.textSecondary }]}>
                {getSubtext()}
              </Text>

              {programName && (
                <TouchableOpacity
                  style={[styles.shareButton, { backgroundColor: colors.primary }]}
                  onPress={handleShare}
                  activeOpacity={0.8}
                >
                  <Ionicons name="share-outline" size={20} color="#fff" />
                  <Text style={styles.shareButtonText}>
                    {t('lifestyles.share.button') || 'Share'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
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
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 1,
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
    marginBottom: 16,
    lineHeight: 22,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
