import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import ApiService from '../services/apiService';

interface SuggestedFoodItem {
  id: string;
  name: string;
  category: 'protein' | 'fiber' | 'healthy_fat' | 'carb' | 'general';
  reason: string;
  tip: string;
}

export const SuggestedFoodScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [data, setData] = useState<SuggestedFoodItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[SuggestedFoodScreen] Mounted, loading suggestions...');
    let mounted = true;
    ApiService.getSuggestedFoods()
      .then((items) => {
        console.log('[SuggestedFoodScreen] Loaded suggestions:', items?.length || 0);
        if (mounted) setData(items || []);
      })
      .catch((error) => {
        console.error('[SuggestedFoodScreen] Error loading suggestions:', error);
        if (mounted) setData([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary || colors.text }]}>
          {t('suggestedFood.title') || 'Suggested Food'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('suggestedFood.subtitle') ||
            'Based on your last 7 days, here are some ideas to balance your nutrition.'}
        </Text>
      </View>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface || colors.card,
                borderColor: colors.border || colors.borderMuted,
              },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.textPrimary || colors.text }]}>{item.name}</Text>
            <Text style={[styles.cardReason, { color: colors.textSecondary }]}>
              {item.reason}
            </Text>
            <Text style={[styles.cardTip, { color: colors.textPrimary || colors.text }]}>{item.tip}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t('suggestedFood.empty') || 'No suggestions available at the moment.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardReason: {
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  cardTip: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default SuggestedFoodScreen;

