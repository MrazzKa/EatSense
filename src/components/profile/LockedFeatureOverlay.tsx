import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../../app/i18n/hooks';

interface LockedFeatureOverlayProps {
  isLocked: boolean;
  featureName: string;
  onUpgrade?: () => void;
  children: React.ReactNode;
}

export default function LockedFeatureOverlay({ isLocked, featureName, onUpgrade, children }: LockedFeatureOverlayProps) {
  const { colors, tokens } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

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
      <View style={styles.contentWrapper}>
        {children}
      </View>
      <View style={styles.overlay}>
        <Ionicons name="lock-closed" size={32} color="#FFF" />
        <Text style={styles.lockText}>{featureName}</Text>
        <TouchableOpacity onPress={handleUpgrade} style={styles.ctaBtn}>
          <Ionicons name="star" size={16} color="#FFF" style={{ marginRight: 6 }} />
          <Text style={styles.ctaText}>
            {t('profile.advancedSettings.upgrade') || 'Upgrade to Pro'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (tokens: any, colors: any) =>
  StyleSheet.create({
    wrapper: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: tokens.radii.lg || 16,
    },
    contentWrapper: {
      opacity: 0.3,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: tokens.radii.lg || 16,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
      padding: 20,
    },
    lockText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    ctaBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#7C3AED',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
    },
    ctaText: {
      color: '#FFF',
      fontSize: 15,
      fontWeight: '600',
    },
  });
