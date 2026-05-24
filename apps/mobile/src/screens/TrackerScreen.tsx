import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileAvatarButton } from '../components/ProfileAvatarButton';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { useHabits } from '../hooks/useHabits';
import { useShopping } from '../hooks/useShopping';
import { useShoppingRecommendations } from '../hooks/useShoppingRecommendations';
import { getFeatureLimit } from '../utils/subscriptionGuard';
import ApiService from '../services/apiService';
import HabitGrid from '../components/tracker/HabitGrid';
import HabitModal from '../components/tracker/HabitModal';
import PresetHabitsModal from '../components/tracker/PresetHabitsModal';
import ShoppingList from '../components/tracker/ShoppingList';
import PaywallModal from '../components/PaywallModal';
import { GlassCard } from '../components/glass';
import { Habit } from '../types/tracker';

export default function TrackerScreen() {
  const { colors, tokens } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  const [showHabitModal, setShowHabitModal] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState('');

  // Refresh date when screen is focused (handles midnight crossover)
  const [dateStr, setDateStr] = useState(() =>
    new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
  );
  useFocusEffect(
    useCallback(() => {
      setDateStr(
        new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
      );
    }, [])
  );

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
    weekDates,
    today,
    loading: habitsLoading,
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
    loading: shoppingLoading,
    addItem: addShoppingItem,
    addItems: addShoppingItems,
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
    setShowPresetModal(true);
  }, [habits.length, habitsLimit, showLimitPaywall, t]);

  // Use addHabit which already uses ref internally — limit tracked via counter
  const handleAddPresets = useCallback(async (presets: { emoji: string; name: string; frequency: any }[]) => {
    let added = 0;
    for (const preset of presets) {
      if (habitsLimit !== null && (habits.length + added) >= habitsLimit) break;
      await addHabit(preset);
      added++;
    }
  }, [addHabit, habits.length, habitsLimit]);

  const handleOpenCustomHabit = useCallback(() => {
    setEditingHabit(null);
    setShowHabitModal(true);
  }, []);

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

  const isLoading = habitsLoading || shoppingLoading;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('tracker.title') || 'My Day'}
          </Text>
          <ProfileAvatarButton />
        </View>
        <Text style={[styles.date, { color: colors.textSecondary }]}>{dateStr}</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Streak badge */}
          {streak > 0 && (
            <GlassCard branded intensity="subtle" padding={null} style={styles.streakCard}>
              <View style={styles.streakRow}>
                <Text style={styles.streakEmoji}>🔥</Text>
                <Text style={[styles.streakText, { color: colors.primary }]}>
                  {streak} {t('tracker.streak') || 'day streak'}
                </Text>
              </View>
            </GlassCard>
          )}

          {/* ── HABITS ── */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {t('tracker.tabs.habits') || 'HABITS'}
            </Text>

            {/* Wave chart removed for minimalism */}

            {/* Habit grid */}
            {habits.length > 0 ? (
              <HabitGrid
                habits={habits}
                weekDates={weekDates}
                today={today}
                completions={completions}
                onToggle={toggleCompletion}
                isActiveOnDate={isHabitActiveOnDate}
                onEdit={handleEditHabit}
              />
            ) : (
              <GlassCard style={styles.emptyCard}>
                <View style={styles.emptyState}>
                  <Text style={{ fontSize: 36 }}>📋</Text>
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    {t('tracker.emptyState') || 'No habits yet'}
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                    {t('tracker.emptyStateSubtitle') || 'Add your first habit to start tracking'}
                  </Text>
                </View>
              </GlassCard>
            )}

            {/* Swipeable list removed for minimalism */}

            {/* Add habit button */}
            <TouchableOpacity onPress={handleAddHabit} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="add" size={20} color={colors.onPrimary || '#FFF'} />
              <Text style={[styles.addBtnText, { color: colors.onPrimary || '#FFF' }]}>{t('tracker.habits.add') || 'Add Habit'}</Text>
            </TouchableOpacity>
          </View>

          {/* ── SHOPPING LIST ── */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {t('tracker.tabs.shopping') || 'SHOPPING LIST'}
            </Text>
            <ShoppingList
              activeItems={activeItems}
              boughtItems={boughtItems}
              onAdd={addShoppingItem}
              onAddAll={addShoppingItems}
              onToggle={toggleItem}
              onRemove={removeItem}
              onClearBought={clearBought}
              onShare={() => shareList(t('tracker.shopping.shareTitle') || 'Shopping List')}
              recommendations={recommendations}
              recommendationsLoading={recsLoading}
              insufficientData={insufficientData}
              canAddMore={canAddMoreShopping}
              onLimitReached={() => showLimitPaywall(t('tracker.limit.shopping') || 'Unlimited Shopping')}
              shoppingLimit={shoppingLimit}
              currentCount={activeItems.length}
              compact
            />
          </View>
        </ScrollView>
      )}

      {/* Preset Habits Modal */}
      <PresetHabitsModal
        visible={showPresetModal}
        onClose={() => setShowPresetModal(false)}
        onAddPresets={handleAddPresets}
        onCreateCustom={handleOpenCustomHabit}
        existingHabits={habits}
      />

      {/* Habit Modal (custom / edit) */}
      <HabitModal
        visible={showHabitModal}
        onClose={() => setShowHabitModal(false)}
        onSave={handleSaveHabit}
        onDelete={handleDeleteHabit}
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
    scrollContent: {
      paddingHorizontal: tokens.spacing.lg,
      paddingBottom: 110,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    streakCard: {
      alignSelf: 'flex-start',
      marginBottom: tokens.spacing.lg,
    },
    streakRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
    },
    streakEmoji: {
      fontSize: 18,
    },
    streakText: {
      fontSize: 15,
      fontWeight: '700',
    },
    sectionBlock: {
      marginBottom: tokens.spacing.xl || 32,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: tokens.spacing.sm,
    },
    emptyCard: {
      marginVertical: tokens.spacing.sm,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 28,
      gap: 8,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '600',
    },
    emptySubtitle: {
      fontSize: 14,
      textAlign: 'center',
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: tokens.radii.md || 12,
      marginTop: tokens.spacing.md,
      gap: 8,
    },
    addBtnText: {
      fontSize: 16,
      fontWeight: '600',
    },
  });
