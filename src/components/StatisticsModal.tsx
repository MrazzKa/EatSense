import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SwipeClosableModal } from './common/SwipeClosableModal';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import ApiService from '../services/apiService';

interface StatisticsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const StatisticsModal: React.FC<StatisticsModalProps> = ({ visible, onClose }) => {
  const { colors, tokens } = useTheme();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [monthlyStats, setMonthlyStats] = useState<any>(null);

  useEffect(() => {
    if (visible) {
      loadStats();
    }
  }, [visible]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [todayStats, monthly] = await Promise.all([
        ApiService.getStats(new Date()),
        ApiService.getMonthlyStats(),
      ]);
      setStats(todayStats);
      setMonthlyStats(monthly);
    } catch (error) {
      console.error('[StatisticsModal] Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  return (
    <SwipeClosableModal
      visible={visible}
      onClose={onClose}
      swipeDirection="down"
      enableSwipe={true}
      enableBackdropClose={true}
      animationType="fade"
      presentationStyle="fullScreen"
    >
      <SafeAreaView 
        style={[styles.container, { backgroundColor: colors.background || colors.surface || '#F8F9FA', flex: 1 }]} 
        edges={['top', 'bottom']}
      >
        <View style={[styles.header, { backgroundColor: colors.surface || colors.card, borderBottomColor: colors.border || '#E5E7EB' }]}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color={colors.text || '#2C3E50'} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text || '#2C3E50' }]}>
            {t('statistics.title') || 'Statistics'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary || '#3498DB'} />
            <Text style={[styles.loadingText, { color: colors.textSecondary || '#7F8C8D' }]}>
              {t('common.loading') || 'Loading...'}
            </Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent} 
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {/* Today's Stats */}
            {stats && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text || '#2C3E50' }]}>
                  {t('statistics.today') || 'Today'}
                </Text>
                
                <View style={[styles.statsCard, { backgroundColor: colors.surface || colors.card }]}>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: colors.textSecondary || '#7F8C8D' }]}>
                        {t('dashboard.calories') || 'Calories'}
                      </Text>
                      <Text style={[styles.statValue, { color: colors.primary || '#3498DB' }]}>
                        {formatNumber(stats.today?.calories || 0)}
                      </Text>
                      {stats.goals?.calories && (
                        <Text style={[styles.statGoal, { color: colors.textTertiary || '#95A5A6' }]}>
                          {t('dashboard.ofGoal', { goal: formatNumber(stats.goals.calories) }) || `of ${formatNumber(stats.goals.calories)} goal`}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.macrosRow}>
                    <View style={styles.macroItem}>
                      <Text style={[styles.macroLabel, { color: colors.textSecondary || '#7F8C8D' }]}>
                        {t('dashboard.protein') || 'Protein'}
                      </Text>
                      <Text style={[styles.macroValue, { color: colors.text || '#2C3E50' }]}>
                        {formatNumber(stats.today?.protein || 0)}g
                      </Text>
                    </View>
                    <View style={styles.macroItem}>
                      <Text style={[styles.macroLabel, { color: colors.textSecondary || '#7F8C8D' }]}>
                        {t('dashboard.carbs') || 'Carbs'}
                      </Text>
                      <Text style={[styles.macroValue, { color: colors.text || '#2C3E50' }]}>
                        {formatNumber(stats.today?.carbs || 0)}g
                      </Text>
                    </View>
                    <View style={styles.macroItem}>
                      <Text style={[styles.macroLabel, { color: colors.textSecondary || '#7F8C8D' }]}>
                        {t('dashboard.fat') || 'Fat'}
                      </Text>
                      <Text style={[styles.macroValue, { color: colors.text || '#2C3E50' }]}>
                        {formatNumber(stats.today?.fat || 0)}g
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Monthly Highlights */}
            {monthlyStats && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text || '#2C3E50' }]}>
                  {t('dashboard.monthlyStats.title') || 'Monthly Highlights'}
                </Text>
                
                {monthlyStats.topFoods && monthlyStats.topFoods.length > 0 && (
                  <View style={[styles.statsCard, { backgroundColor: colors.surface || colors.card }]}>
                    <Text style={[styles.cardTitle, { color: colors.text || '#2C3E50' }]}>
                      {t('dashboard.monthlyStats.topFoods') || 'Top Foods'}
                    </Text>
                    {monthlyStats.topFoods.slice(0, 5).map((food: any, index: number) => (
                      <View key={index} style={styles.foodItem}>
                        <Text style={[styles.foodName, { color: colors.text || '#2C3E50' }]} numberOfLines={1}>
                          {food.name || 'Unknown'}
                        </Text>
                        <Text style={[styles.foodCount, { color: colors.textSecondary || '#7F8C8D' }]}>
                          {food.count || 0} {t('statistics.times') || 'times'}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {monthlyStats.mealDistribution && monthlyStats.mealDistribution.length > 0 && (
                  <View style={[styles.statsCard, { backgroundColor: colors.surface || colors.card }]}>
                    <Text style={[styles.cardTitle, { color: colors.text || '#2C3E50' }]}>
                      {t('dashboard.monthlyStats.mealDistribution') || 'Meal Distribution'}
                    </Text>
                    {monthlyStats.mealDistribution.map((meal: any, index: number) => (
                      <View key={index} style={styles.mealItem}>
                        <Text style={[styles.mealLabel, { color: colors.text || '#2C3E50' }]}>
                          {meal.type || 'Meal'}
                        </Text>
                        <View style={styles.mealBarContainer}>
                          <View 
                            style={[
                              styles.mealBar, 
                              { 
                                width: `${Math.min(100, Math.max(0, meal.percentage || 0))}%`,
                                backgroundColor: colors.primary || '#3498DB'
                              }
                            ]} 
                          />
                        </View>
                        <Text style={[styles.mealPercentage, { color: colors.textSecondary || '#7F8C8D' }]}>
                          {Math.round(meal.percentage || 0)}%
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {!stats && !monthlyStats && !loading && (
              <View style={styles.emptyState}>
                <Ionicons name="stats-chart" size={48} color={colors.textTertiary || '#95A5A6'} />
                <Text style={[styles.emptyText, { color: colors.textSecondary || '#7F8C8D' }]}>
                  {t('statistics.empty') || 'No statistics available yet'}
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </SwipeClosableModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  placeholder: {
    width: 44,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  statsCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsRow: {
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  statGoal: {
    fontSize: 12,
    marginTop: 4,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F8F9FA',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  foodName: {
    fontSize: 14,
    flex: 1,
    marginRight: 12,
  },
  foodCount: {
    fontSize: 14,
  },
  mealItem: {
    marginBottom: 12,
  },
  mealLabel: {
    fontSize: 14,
    marginBottom: 6,
  },
  mealBarContainer: {
    height: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  mealBar: {
    height: '100%',
    borderRadius: 4,
  },
  mealPercentage: {
    fontSize: 12,
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
});
