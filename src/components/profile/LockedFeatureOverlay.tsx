import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../../app/i18n/hooks';

interface LockedFeatureOverlayProps {
  isLocked: boolean;
  featureName: string;
  onUpgrade?: () => void;
  children: React.ReactNode;
}

export default function LockedFeatureOverlay({ isLocked, featureName, onUpgrade, children }: LockedFeatureOverlayProps) {
  const { tokens, isDark } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(tokens, isDark), [tokens, isDark]);

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      (navigation as any).navigate('Subscription');
    }
  };

  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <View style={styles.wrapper}>
      {/* `pointerEvents="none"` blocks taps from reaching the dimmed content
          underneath. Without this RN passes touches straight through the
          absolute overlay (which has no own handler outside the CTA) to the
          interactive children below — so the locked health profile fields
          could be edited on the free plan. */}
      <View style={styles.contentWrapper} pointerEvents="none">
        {children}
      </View>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleUpgrade}
      >
        <BlurView
          intensity={isDark ? 38 : 28}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
          experimentalBlurMethod="dimezisBlurView"
        />
        <View style={styles.scrim} />
        <View style={styles.lockPanel}>
          <View style={styles.iconHalo}>
            <Ionicons name="lock-closed" size={28} color="#FFF" />
          </View>
          <Text style={styles.lockText}>{featureName}</Text>
          <LinearGradient
            colors={['#8B5CF6', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaBtn}
          >
            <Ionicons name="star" size={16} color="#FFF" style={styles.ctaIcon} />
            <Text style={styles.ctaText}>
              {t('profile.advancedSettings.upgrade') || 'Upgrade to Pro'}
            </Text>
          </LinearGradient>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (tokens: any, isDark: boolean) =>
  StyleSheet.create({
    wrapper: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: tokens.radii.lg || 16,
    },
    contentWrapper: {
      opacity: isDark ? 0.36 : 0.48,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: tokens.radii.lg || 16,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      overflow: 'hidden',
    },
    scrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: isDark ? 'rgba(8, 13, 25, 0.50)' : 'rgba(15, 23, 42, 0.26)',
    },
    lockPanel: {
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 12,
    },
    iconHalo: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.18)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255, 255, 255, 0.45)',
    },
    lockText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '700',
      textAlign: 'center',
      textShadowColor: 'rgba(0, 0, 0, 0.22)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    ctaBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 16,
      minWidth: 190,
      shadowColor: '#2563EB',
      shadowOpacity: 0.32,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 5,
    },
    ctaIcon: {
      marginRight: 7,
    },
    ctaText: {
      color: '#FFF',
      fontSize: 15,
      fontWeight: '700',
    },
  });
