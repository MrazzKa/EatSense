import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import ApiService from '../services/apiService';
// import { API_BASE_URL } from '../config/env'; // Unused

const REPORTS_HISTORY_KEY = 'reports:history';

interface ReportHistoryItem {
  year: number;
  month: number;
  locale: string;
  fileUri: string;
  createdAt: string;
}

export default function ReportsScreen() {
  const { colors, tokens } = useTheme();
  const { t, language } = useI18n();
  const [loading, setLoading] = useState(false);
  const [noData, setNoData] = useState(false);
  const [history, setHistory] = useState<ReportHistoryItem[]>([]);

  const handleDownloadCurrentMonth = async () => {
    try {
      console.log('[ReportsScreen] Downloading monthly report');
      setLoading(true);
      setNoData(false);

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const locale = language || 'en';

      // Check directory availability first
      let directory = FileSystem.documentDirectory || FileSystem.cacheDirectory;
      if (!directory && !(await Sharing.isAvailableAsync())) {
        Alert.alert(
          t('common.info') || 'Info',
          t('reports.error.noDirectory') || 'Download not available in Expo Go. Please use a development build.',
        );
        setLoading(false);
        return;
      }

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
        base64Data = (response.data as string).includes('data:')
          ? (response.data as string).split(',')[1]
          : (response.data as string);
      } else {
        console.error('[ReportsScreen] Invalid response data format:', typeof response.data, response.data);
        throw new Error('Invalid response data format: expected ArrayBuffer, Blob or string');
      }

      // Now check if we can save to file system
      const documentDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;

      // If both are null (e.g., in Expo Go), try using cacheDirectory explicitly
      if (!documentDir) {
        // In rare cases where neither directory is available, try cacheDirectory as last resort
        const fallbackDir = FileSystem.cacheDirectory;
        if (!fallbackDir) {
          if (__DEV__) {
            console.warn('[ReportsScreen] No file system directory available');
          }
          Alert.alert(
            t('common.error'),
            t('reports.error.noDirectory') || 'Cannot save or share report. File system not available.',
          );
          setLoading(false);
          return;
        }
      }

      // Save to file system - at this point documentDir is guaranteed to be non-null
      const cleanDocDir = documentDir!.endsWith('/') ? documentDir : `${documentDir}/`;
      const fileUri = `${cleanDocDir}eatsense-monthly-report-${monthString}.pdf`;

      if (__DEV__) {
        console.log('[ReportsScreen] Using directory:', documentDir === FileSystem.documentDirectory ? 'documentDirectory' : 'cacheDirectory');
        console.log('[ReportsScreen] File path:', fileUri);
        console.log('[ReportsScreen] Writing file with base64 data, length:', base64Data?.length || 0);
      }

      // Write file using FileSystem from legacy import
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('[ReportsScreen] PDF saved to:', fileUri);

      // Save to history
      const historyItem: ReportHistoryItem = {
        year,
        month,
        locale,
        fileUri,
        createdAt: new Date().toISOString(),
      };
      await saveReportToHistory(historyItem);
      await loadReportHistory();

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

  // Load report history from AsyncStorage
  const loadReportHistory = useCallback(async () => {
    try {
      const historyJson = await AsyncStorage.getItem(REPORTS_HISTORY_KEY);
      if (historyJson) {
        const parsed = JSON.parse(historyJson);
        // Sort by createdAt descending
        const sorted = Array.isArray(parsed)
          ? parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          : [];
        setHistory(sorted);
      }
    } catch (error) {
      console.error('[ReportsScreen] Error loading history:', error);
      setHistory([]);
    }
  }, []);

  // Save report to history (each download creates new entry, with retention limit)
  const saveReportToHistory = async (item: ReportHistoryItem) => {
    try {
      const historyJson = await AsyncStorage.getItem(REPORTS_HISTORY_KEY);
      const existing = historyJson ? JSON.parse(historyJson) : [];

      // Add new item at the beginning (allow duplicates - each download = new entry)
      // Retention: keep last 30 entries to prevent unlimited growth
      const updated = [item, ...existing].slice(0, 30);
      await AsyncStorage.setItem(REPORTS_HISTORY_KEY, JSON.stringify(updated));
      setHistory(updated); // Update state immediately
    } catch (error) {
      console.error('[ReportsScreen] Error saving to history:', error);
    }
  };

  // Load history on mount
  useEffect(() => {
    loadReportHistory();
  }, [loadReportHistory]);

  // Handle open report from history
  const handleOpenReport = async (item: ReportHistoryItem) => {
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(item.fileUri);
      } else {
        Alert.alert(
          t('common.info') || 'Info',
          t('reports.fileSaved') || `Report saved at: ${item.fileUri}`,
        );
      }
    } catch (error) {
      console.error('[ReportsScreen] Error opening report:', error);
      Alert.alert(
        t('common.error'),
        t('reports.error.openFailed') || 'Failed to open report file.',
      );
    }
  };

  // Handle delete report from history
  const handleDeleteReport = async (item: ReportHistoryItem) => {
    Alert.alert(
      t('common.confirm') || 'Confirm',
      t('reports.deleteConfirm') || 'Delete this report from history?',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('common.delete') || 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const historyJson = await AsyncStorage.getItem(REPORTS_HISTORY_KEY);
              const existing = historyJson ? JSON.parse(historyJson) : [];
              const filtered = existing.filter((h: ReportHistoryItem) =>
                !(h.year === item.year && h.month === item.month && h.locale === item.locale && h.createdAt === item.createdAt)
              );
              await AsyncStorage.setItem(REPORTS_HISTORY_KEY, JSON.stringify(filtered));
              await loadReportHistory();
            } catch (error) {
              console.error('[ReportsScreen] Error deleting report:', error);
            }
          },
        },
      ],
    );
  };

  const formatMonthYear = (year: number, month: number, locale: string) => {
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString(locale === 'ru' ? 'ru-RU' : locale === 'kk' ? 'kk-KZ' : 'en-US', {
      month: 'long',
      year: 'numeric',
    });
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

        {/* Reports History */}
        {history.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface || colors.card, borderColor: colors.border || colors.borderMuted, marginTop: tokens.spacing.lg || 16 }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: colors.primaryTint || colors.primary + '20' }]}>
                <Ionicons name="time-outline" size={24} color={colors.primary || '#007AFF'} />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary || colors.text }]}>
                  {t('reports.history.title') || 'Recent Reports'}
                </Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                  {t('reports.history.subtitle') || 'Previously downloaded reports'}
                </Text>
              </View>
            </View>

            <FlatList
              data={history}
              keyExtractor={(item, index) => `${item.year}-${item.month}-${item.locale}-${index}`}
              renderItem={({ item }) => (
                <View style={[styles.historyItem, { borderColor: colors.border || colors.borderMuted }]}>
                  <View style={styles.historyItemContent}>
                    <Ionicons name="document-text" size={20} color={colors.primary || '#007AFF'} />
                    <View style={styles.historyItemText}>
                      <Text style={[styles.historyItemTitle, { color: colors.textPrimary || colors.text }]}>
                        {formatMonthYear(item.year, item.month, item.locale)}
                      </Text>
                      <Text style={[styles.historyItemDate, { color: colors.textSecondary }]}>
                        {new Date(item.createdAt).toLocaleDateString(language || 'en')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.historyItemActions}>
                    <TouchableOpacity
                      onPress={() => handleOpenReport(item)}
                      style={styles.historyActionButton}
                    >
                      <Ionicons name="share-outline" size={18} color={colors.primary || '#007AFF'} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteReport(item)}
                      style={styles.historyActionButton}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.error || '#EF4444'} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              scrollEnabled={false}
            />
          </View>
        )}
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
    historyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: tokens.spacing.md || 12,
      paddingHorizontal: tokens.spacing.md || 12,
      borderBottomWidth: 1,
    },
    historyItemContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    historyItemText: {
      marginLeft: tokens.spacing.md || 12,
      flex: 1,
    },
    historyItemTitle: {
      fontSize: tokens.typography.bodyStrong?.fontSize || 16,
      fontWeight: tokens.typography.bodyStrong?.fontWeight || '600',
      marginBottom: tokens.spacing.xs || 4,
    },
    historyItemDate: {
      fontSize: tokens.typography.body?.fontSize || 14,
    },
    historyItemActions: {
      flexDirection: 'row',
      gap: tokens.spacing.sm || 8,
    },
    historyActionButton: {
      padding: tokens.spacing.sm || 8,
    },
  });

