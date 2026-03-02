import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { useHabits } from '../hooks/useHabits';
import { useShopping } from '../hooks/useShopping';
import { useShoppingRecommendations } from '../hooks/useShoppingRecommendations';
import { getFeatureLimit, canUseFeature } from '../utils/subscriptionGuard';
import ApiService from '../services/apiService';
import HabitGrid from '../components/tracker/HabitGrid';
import HabitWave from '../components/tracker/HabitWave';
import StatsRow from '../components/tracker/StatsRow';
import HabitModal from '../components/tracker/HabitModal';
import ShoppingList from '../components/tracker/ShoppingList';
import PaywallModal from '../components/PaywallModal';
import AppCard from '../components/common/AppCard';
import { Habit } from '../types/tracker';
import { LinearGradient } from 'expo-linear-gradient';

type Tab = 'habits' | 'shopping';

export default function TrackerScreen() {
  const { colors, tokens } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  const [activeTab, setActiveTab] = useState<Tab>('habits');
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState('');

  // Fetch real subscription plan
  const [plan, setPlan] = useState<string | null>(null);
  useEffect(() => {
    ApiService.getCurrentSubscription()
      .then((data: any) => {
        if (data?.hasSubscription && data.subscription?.plan) {
          setPlan(data.subscription.plan);
        } else {
          setPlan('free');
        }
      })
      .catch(() => setPlan('free'));
  }, []);

  const {
    habits,
    completions,
    streak,
    weeklyPercentage,
    weekDates,
    today,
    addHabit,
    updateHabit,
    deleteHabit,
    reorderHabits,
    toggleCompletion,
    isHabitActiveOnDate,
  } = useHabits();

  const {
    activeItems,
    boughtItems,
    addItem: addShoppingItem,
    removeItem,
    toggleItem,
    clearBought,
    shareList,
  } = useShopping();

  const {
    recommendations,
    loading: recsLoading,
    insufficientData,
  } = useShoppingRecommendations();

  const habitsLimit = getFeatureLimit('unlimitedHabits', plan);
  const shoppingLimit = getFeatureLimit('unlimitedShopping', plan);

  const showLimitPaywall = useCallback((feature: string) => {
    setPaywallFeature(feature);
    setShowPaywall(true);
  }, []);

  const handleAddHabit = useCallback(() => {
    if (habitsLimit !== null && habits.length >= habitsLimit) {
      showLimitPaywall(t('tracker.limit.habits') || 'Unlimited Habits');
      return;
    }
    setEditingHabit(null);
    setShowHabitModal(true);
  }, [habits.length, habitsLimit, showLimitPaywall, t]);

  const handleSaveHabit = useCallback(async (data: { emoji: string; name: string; frequency: any; customDays?: number[] }) => {
    if (editingHabit) {
      await updateHabit(editingHabit.id, data);
    } else {
      await addHabit(data);
    }
  }, [editingHabit, updateHabit, addHabit]);

  const handleDeleteHabit = useCallback((habit: Habit) => {
    Alert.alert(
      t('tracker.habits.delete') || 'Delete Habit',
      t('tracker.habits.deleteConfirm') || 'Are you sure you want to delete this habit?',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        { text: t('common.delete') || 'Delete', style: 'destructive', onPress: () => deleteHabit(habit.id) },
      ]
    );
  }, [deleteHabit, t]);

  const handleEditHabit = useCallback((habit: Habit) => {
    setEditingHabit(habit);
    setShowHabitModal(true);
  }, []);

  const canAddMoreShopping = shoppingLimit === null || activeItems.length < shoppingLimit;

  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('tracker.title') || 'My Day'}
        </Text>
        <Text style={[styles.date, { color: colors.textSecondary }]}>{dateStr}</Text>
      </View>

      {/* Sub-tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.surfaceSecondary || colors.surface }]}>
        {(['habits', 'shopping'] as Tab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && { backgroundColor: colors.primary }]}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === tab ? '#FFF' : colors.textPrimary },
            ]}>
              {tab === 'habits'
                ? (t('tracker.tabs.habits') || 'Habits')
                : (t('tracker.tabs.shopping') || 'Shopping')
              }
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'habits' ? (
          <>
            {/* Streak badge */}
            {streak > 0 && (
              <LinearGradient
                colors={['#FF6B35', '#F7931E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.streakBadge}
              >
                <Text style={styles.streakEmoji}>🔥</Text>
                <Text style={styles.streakText}>
                  {streak} {t('tracker.streak') || 'day streak'}
                </Text>
              </LinearGradient>
            )}

            {/* Wave chart */}
            {habits.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  {t('tracker.wave.title') || 'Weekly Progress'}
                </Text>
                <HabitWave
                  habits={habits}
                  weekDates={weekDates}
                  today={today}
                  completions={completions}
                  isActiveOnDate={isHabitActiveOnDate}
                />
              </View>
            )}

            {/* Habit grid */}
            {habits.length > 0 ? (
              <HabitGrid
                habits={habits}
                weekDates={weekDates}
                today={today}
                completions={completions}
                onToggle={toggleCompletion}
                isActiveOnDate={isHabitActiveOnDate}
              />
            ) : (
              <AppCard style={styles.emptyCard}>
                <View style={styles.emptyState}>
                  <Text style={{ fontSize: 40 }}>📋</Text>
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    {t('tracker.emptyState') || 'No habits yet'}
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                    {t('tracker.emptyStateSubtitle') || 'Add your first habit to start tracking'}
                  </Text>
                </View>
              </AppCard>
            )}

            {/* Stats */}
            {habits.length > 0 && (
              <StatsRow
                streak={streak}
                weeklyPercentage={weeklyPercentage}
                totalHabits={habits.length}
              />
            )}

            {/* Habits list with edit/delete */}
            {habits.length > 0 && (
              <View style={styles.habitsList}>
                {habits.map(habit => (
                  <TouchableOpacity
                    key={habit.id}
                    onPress={() => handleEditHabit(habit)}
                    onLongPress={() => handleDeleteHabit(habit)}
                    style={[styles.habitListItem, { borderBottomColor: colors.border }]}
                  >
                    <Text style={styles.habitEmoji}>{habit.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.habitName, { color: colors.textPrimary }]}>{habit.name}</Text>
                      <Text style={[styles.habitFreq, { color: colors.textTertiary }]}>
                        {t(`tracker.habits.${habit.frequency}`) || habit.frequency}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Add button */}
            <TouchableOpacity onPress={handleAddHabit} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.addBtnText}>{t('tracker.habits.add') || 'Add Habit'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          /* Shopping tab */
          <ShoppingList
            activeItems={activeItems}
            boughtItems={boughtItems}
            onAdd={addShoppingItem}
            onToggle={toggleItem}
            onRemove={removeItem}
            onClearBought={clearBought}
            onShare={() => shareList(t('tracker.shopping.shareTitle') || 'Shopping List')}
            recommendations={recommendations}
            recommendationsLoading={recsLoading}
            insufficientData={insufficientData}
            canAddMore={canAddMoreShopping}
            onLimitReached={() => showLimitPaywall(t('tracker.limit.shopping') || 'Unlimited Shopping')}
          />
        )}
      </ScrollView>

      {/* Habit Modal */}
      <HabitModal
        visible={showHabitModal}
        onClose={() => setShowHabitModal(false)}
        onSave={handleSaveHabit}
        editHabit={editingHabit}
      />

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onSubscribed={() => setShowPaywall(false)}
        featureName={paywallFeature}
      />
    </SafeAreaView>
  );
}

const createStyles = (tokens: any, colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      paddingHorizontal: tokens.spacing.lg,
      paddingTop: tokens.spacing.md,
      paddingBottom: tokens.spacing.sm,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
    },
    date: {
      fontSize: 14,
      marginTop: 4,
    },
    tabBar: {
      flexDirection: 'row',
      marginHorizontal: tokens.spacing.lg,
      borderRadius: tokens.radii.md || 12,
      padding: 3,
      marginBottom: tokens.spacing.md,
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: (tokens.radii.md || 12) - 2,
      alignItems: 'center',
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
    },
    scrollContent: {
      paddingHorizontal: tokens.spacing.lg,
      paddingBottom: 40,
    },
    streakBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      gap: 6,
      marginBottom: tokens.spacing.md,
    },
    streakEmoji: {
      fontSize: 18,
    },
    streakText: {
      color: '#FFF',
      fontSize: 15,
      fontWeight: '700',
    },
    section: {
      marginBottom: tokens.spacing.sm,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    emptyCard: {
      marginVertical: tokens.spacing.md,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 32,
      gap: 8,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    emptySubtitle: {
      fontSize: 14,
      textAlign: 'center',
    },
    habitsList: {
      marginTop: tokens.spacing.sm,
    },
    habitListItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: 12,
    },
    habitEmoji: {
      fontSize: 24,
    },
    habitName: {
      fontSize: 15,
      fontWeight: '500',
    },
    habitFreq: {
      fontSize: 12,
      marginTop: 2,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: tokens.radii.md || 12,
      marginTop: tokens.spacing.lg,
      gap: 8,
    },
    addBtnText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });
