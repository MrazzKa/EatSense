import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import ApiService from '../services/apiService';
import { API_BASE_URL } from '../config/env';

export default function ReportsScreen() {
  const { colors, tokens } = useTheme();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  const handleDownloadCurrentMonth = async () => {
    try {
      console.log('[ReportsScreen] Downloading monthly report');
      setLoading(true);
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const monthString = `${year}-${String(month).padStart(2, '0')}`;
      
      const url = `${API_BASE_URL}/stats/monthly-report?month=${monthString}`;
      const fileUri = `${FileSystem.cacheDirectory}eatsense-monthly-report-${monthString}.pdf`;

      console.log('[ReportsScreen] Report URL:', url);
      console.log('[ReportsScreen] Saving to:', fileUri);

      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        fileUri,
        {
          headers: ApiService.getHeaders(),
        }
      );

      const result = await downloadResumable.downloadAsync();
      
      if (result?.uri) {
        console.log('[ReportsScreen] Download completed, sharing:', result.uri);
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(result.uri);
        } else {
          Alert.alert(
            t('common.success'),
            t('reports.downloaded'),
          );
        }
      } else {
        throw new Error('Download failed: no URI returned');
      }
    } catch (error: any) {
      console.error('[ReportsScreen] Failed to download monthly report:', error);
      Alert.alert(
        t('common.error'),
        t('reports.error'),
      );
    } finally {
      setLoading(false);
    }
  };

  const styles = useMemo(() => createStyles(tokens), [tokens]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary || colors.text }]}>
            {t('reports.title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('reports.subtitle')}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface || colors.card, borderColor: colors.border || colors.borderMuted }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: colors.primaryTint || colors.primary + '20' }]}>
              <Ionicons name="document-text-outline" size={24} color={colors.primary || '#007AFF'} />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary || colors.text }]}>
                {t('reports.monthly.title')}
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                {t('reports.monthly.subtitle')}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, {
              backgroundColor: loading ? colors.surfaceMuted : colors.primary,
            }]}
            onPress={handleDownloadCurrentMonth}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="download-outline" size={18} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>
                  {t('reports.monthly.downloadCurrent')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (tokens) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: tokens.spacing.xl || 16,
    },
    header: {
      marginBottom: tokens.spacing.xl || 24,
    },
    title: {
      fontSize: tokens.typography.headingL?.fontSize || 28,
      fontWeight: tokens.typography.headingL?.fontWeight || '700',
      marginBottom: tokens.spacing.xs || 4,
    },
    subtitle: {
      fontSize: tokens.typography.body?.fontSize || 15,
      lineHeight: tokens.typography.body?.lineHeight || 22,
    },
    card: {
      borderRadius: tokens.radii.lg || 16,
      padding: tokens.spacing.xl || 20,
      borderWidth: 1,
      ...(tokens.states.cardShadow || tokens.elevations.md || {}),
    },
    cardHeader: {
      flexDirection: 'row',
      marginBottom: tokens.spacing.lg || 16,
    },
    cardIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: tokens.spacing.md || 12,
    },
    cardTextContainer: {
      flex: 1,
    },
    cardTitle: {
      fontSize: tokens.typography.headingS?.fontSize || 18,
      fontWeight: tokens.typography.headingS?.fontWeight || '600',
      marginBottom: tokens.spacing.xs || 4,
    },
    cardSubtitle: {
      fontSize: tokens.typography.body?.fontSize || 14,
      lineHeight: tokens.typography.body?.lineHeight || 20,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: tokens.radii.full || 999,
      paddingVertical: tokens.spacing.md || 12,
      paddingHorizontal: tokens.spacing.lg || 20,
    },
    buttonIcon: {
      marginRight: tokens.spacing.sm || 8,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: tokens.typography.bodyStrong?.fontSize || 16,
      fontWeight: tokens.typography.bodyStrong?.fontWeight || '600',
    },
  });

