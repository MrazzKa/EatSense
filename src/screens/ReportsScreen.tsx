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
// import { API_BASE_URL } from '../config/env'; // Unused

export default function ReportsScreen() {
  const { colors, tokens } = useTheme();
  const { t, language } = useI18n();
  const [loading, setLoading] = useState(false);
  const [noData, setNoData] = useState(false);

  const handleDownloadCurrentMonth = async () => {
    try {
      console.log('[ReportsScreen] Downloading monthly report');
      setLoading(true);
      setNoData(false);
      
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const locale = language || 'en';

      const response = await ApiService.getMonthlyReport({ year, month, locale });

      if (!response || response.status === 204 || response.status === 404) {
        // No data for this month
        setNoData(true);
        return;
      }

      if (response.status !== 200 || !response.data) {
        // Any other status or missing data = error
        Alert.alert(
          t('common.error'),
          t('reports.error.generic') || t('reports.error') || 'Failed to generate monthly report. Please try again later.',
        );
        return;
      }

      // Convert arrayBuffer/blob to base64 FIRST (before checking directories)
      const monthString = `${year}-${String(month).padStart(2, '0')}`;
      let base64Data: string;
      
      // Handle ArrayBuffer (preferred)
      if (response.data instanceof ArrayBuffer) {
        const uint8Array = new Uint8Array(response.data);
        
        // Convert to base64 manually (btoa not available in React Native)
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let base64 = '';
        let i = 0;
        while (i < uint8Array.length) {
          const a = uint8Array[i++];
          const b = i < uint8Array.length ? uint8Array[i++] : 0;
          const c = i < uint8Array.length ? uint8Array[i++] : 0;
          
          const bitmap = (a << 16) | (b << 8) | c;
          
          base64 += chars.charAt((bitmap >> 18) & 63);
          base64 += chars.charAt((bitmap >> 12) & 63);
          base64 += i - 2 < uint8Array.length ? chars.charAt((bitmap >> 6) & 63) : '=';
          base64 += i - 1 < uint8Array.length ? chars.charAt(bitmap & 63) : '=';
        }
        base64Data = base64;
      } else if (response.data && typeof response.data.arrayBuffer === 'function') {
        // Handle Blob with arrayBuffer method
        try {
          const arrayBuffer = await response.data.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
          let base64 = '';
          let i = 0;
          while (i < uint8Array.length) {
            const a = uint8Array[i++];
            const b = i < uint8Array.length ? uint8Array[i++] : 0;
            const c = i < uint8Array.length ? uint8Array[i++] : 0;
            
            const bitmap = (a << 16) | (b << 8) | c;
            
            base64 += chars.charAt((bitmap >> 18) & 63);
            base64 += chars.charAt((bitmap >> 12) & 63);
            base64 += i - 2 < uint8Array.length ? chars.charAt((bitmap >> 6) & 63) : '=';
            base64 += i - 1 < uint8Array.length ? chars.charAt(bitmap & 63) : '=';
          }
          base64Data = base64;
        } catch (blobError) {
          console.error('[ReportsScreen] Error converting blob to base64:', blobError);
          throw new Error('Failed to convert PDF blob to base64');
        }
      } else if (typeof response.data === 'string') {
        // Already base64 string
        base64Data = response.data.includes('data:') 
          ? response.data.split(',')[1] 
          : response.data;
      } else {
        console.error('[ReportsScreen] Invalid response data format:', typeof response.data, response.data);
        throw new Error('Invalid response data format: expected ArrayBuffer, Blob or string');
      }

      // Now check if we can save to file system
      const documentDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
      
      // If both are null (e.g., in Expo Go), share directly via data URI
      if (!documentDir) {
        if (__DEV__) {
          console.warn('[ReportsScreen] Both documentDirectory and cacheDirectory are null, sharing directly via data URI');
        }
        
        // Share directly via data URI
        const dataUri = `data:application/pdf;base64,${base64Data}`;
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(dataUri, {
            mimeType: 'application/pdf',
            dialogTitle: `EatSense Monthly Report ${monthString}`,
          });
          setLoading(false);
          return;
        } else {
          Alert.alert(
            t('common.error'),
            t('reports.error.noDirectory') || 'Cannot save or share report. File system not available.',
          );
          setLoading(false);
          return;
        }
      }
      
      // Save to file system
      const cleanDocDir = documentDir.endsWith('/') ? documentDir : `${documentDir}/`;
      const fileUri = `${cleanDocDir}eatsense-monthly-report-${monthString}.pdf`;
      
      if (__DEV__) {
        console.log('[ReportsScreen] Using directory:', documentDir === FileSystem.documentDirectory ? 'documentDirectory' : 'cacheDirectory');
        console.log('[ReportsScreen] File path:', fileUri);
        console.log('[ReportsScreen] Writing file with base64 data, length:', base64Data?.length || 0);
      }

      // Use legacy API directly (cacheDirectory is writable)
      const { writeAsStringAsync } = await import('expo-file-system/legacy');
      
      await writeAsStringAsync(fileUri, base64Data, {
        encoding: 'base64', // Use string literal instead of enum
      });

      console.log('[ReportsScreen] PDF saved to:', fileUri);

      // Share the file
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert(
          t('common.success'),
          t('reports.downloaded') || 'Monthly report downloaded successfully',
        );
      }
    } catch (error: any) {
      console.error('[ReportsScreen] Failed to download monthly report:', error);
      
      // Check if it's a network error
      if (error?.message?.includes('Network') || error?.message?.includes('fetch')) {
        Alert.alert(
          t('common.error'),
          t('reports.error.network') || 'Network error. Please check your connection and try again.',
        );
      } else {
        Alert.alert(
          t('common.error'),
          t('reports.error.generic') || t('reports.error') || 'Failed to download monthly report. Please try again later.',
        );
      }
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

          {noData && (
            <View style={styles.noDataContainer}>
              <Ionicons 
                name="information-circle-outline" 
                size={20} 
                color={colors.textSecondary || colors.textTertiary} 
                style={styles.noDataIcon}
              />
              <Text style={[styles.noDataText, { color: colors.textSecondary || colors.textTertiary }]}>
                {t('reports.noDataForMonth') || 'No data for this month yet. Add some meals to generate a report.'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (tokens: any) =>
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
    noDataContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: tokens.spacing.md || 12,
      padding: tokens.spacing.md || 12,
      borderRadius: tokens.radii.md || 8,
      backgroundColor: tokens.colors.surfaceMuted || tokens.colors.surface + '80',
    },
    noDataIcon: {
      marginRight: tokens.spacing.sm || 8,
    },
    noDataText: {
      flex: 1,
      fontSize: tokens.typography.body?.fontSize || 14,
      lineHeight: tokens.typography.body?.lineHeight || 20,
    },
  });

