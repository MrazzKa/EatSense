import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import DietProgramsService from '../services/dietProgramsService';

export default function DietProgramProgressScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [userProgram, setUserProgram] = useState(null);
  const [currentDayData, setCurrentDayData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const myPrograms = await DietProgramsService.getMyPrograms();
      const active = myPrograms.find((p) => p.programId === route.params.id && p.status === 'active');
      if (!active) {
        navigation.goBack();
        return;
      }
      setUserProgram(active);
      const dayData = await DietProgramsService.getProgramDay(route.params.id, active.currentDay);
      setCurrentDayData(dayData);
    } catch (error) {
      console.error('Failed to load progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteDay = async () => {
    const nextDay = userProgram.currentDay + 1;
    const isLast = nextDay > userProgram.program.duration;

    Alert.alert(
      isLast ? (t('dietPrograms.finishProgram') || 'Finish Program') : (t('dietPrograms.completeDay') || 'Complete Day'),
      isLast ? 'Congratulations! You completed the program!' : `Mark Day ${userProgram.currentDay} as complete?`,
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        { text: t('common.confirm') || 'Confirm', onPress: async () => {
          try {
            const updated = await DietProgramsService.updateProgress(route.params.id, nextDay);
            if (updated.status === 'completed') {
              Alert.alert(t('dietPrograms.completed') || 'Congratulations!', t('dietPrograms.completedMessage') || 'You completed the program!', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } else {
              setUserProgram(updated);
              const dayData = await DietProgramsService.getProgramDay(route.params.id, updated.currentDay);
              setCurrentDayData(dayData);
            }
          } catch (error) {
            Alert.alert('Error', 'Failed to update progress');
          }
        }},
      ]
    );
  };

  const getMealIcon = (mealType) => {
    switch (mealType) {
      case 'breakfast': return 'sunny-outline';
      case 'lunch': return 'restaurant-outline';
      case 'dinner': return 'moon-outline';
      case 'snack': return 'cafe-outline';
      default: return 'restaurant-outline';
    }
  };

  if (loading) {
    return <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></SafeAreaView>;
  }

  if (!userProgram || !currentDayData) {
    return <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}><Text style={{ color: colors.textPrimary }}>Program not found</Text></SafeAreaView>;
  }

  const progress = (userProgram.currentDay / userProgram.program.duration) * 100;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={colors.textPrimary} /></TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{userProgram.program.name}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.dayLabel, { color: colors.textSecondary }]}>{t('dietPrograms.day') || 'Day'}</Text>
          <Text style={[styles.dayNumber, { color: colors.primary }]}>{userProgram.currentDay}</Text>
          <Text style={[styles.dayTotal, { color: colors.textSecondary }]}>of {userProgram.program.duration}</Text>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${progress}%` }]} />
          </View>
        </View>

        {currentDayData.title && <Text style={[styles.dayTitle, { color: colors.textPrimary }]}>{currentDayData.title}</Text>}
        {currentDayData.description && <Text style={[styles.dayDescription, { color: colors.textSecondary }]}>{currentDayData.description}</Text>}

        <View style={[styles.mealsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {currentDayData.meals?.map((meal, index) => (
            <View key={index} style={[styles.mealItem, index < currentDayData.meals.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <View style={[styles.mealIconContainer, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name={getMealIcon(meal.mealType)} size={20} color={colors.primary} />
              </View>
              <View style={styles.mealInfo}>
                <Text style={[styles.mealType, { color: colors.textSecondary }]}>{meal.mealType}</Text>
                <Text style={[styles.mealName, { color: colors.textPrimary }]}>{meal.name}</Text>
                {meal.description && <Text style={[styles.mealDescription, { color: colors.textSecondary }]}>{meal.description}</Text>}
              </View>
              <View style={styles.mealMacros}>
                {meal.calories && <Text style={[styles.macroText, { color: colors.textSecondary }]}>{meal.calories} kcal</Text>}
                {meal.protein && <Text style={[styles.macroText, { color: colors.textSecondary }]}>P: {meal.protein}g</Text>}
              </View>
            </View>
          ))}
        </View>

        {currentDayData.totalCalories && (
          <View style={[styles.totalsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.totalItem}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Calories</Text>
              <Text style={[styles.totalValue, { color: colors.textPrimary }]}>{currentDayData.totalCalories}</Text>
            </View>
            {currentDayData.totalProtein && (
              <View style={styles.totalItem}>
                <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Protein</Text>
                <Text style={[styles.totalValue, { color: colors.textPrimary }]}>{currentDayData.totalProtein}g</Text>
              </View>
            )}
            {currentDayData.totalCarbs && (
              <View style={styles.totalItem}>
                <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Carbs</Text>
                <Text style={[styles.totalValue, { color: colors.textPrimary }]}>{currentDayData.totalCarbs}g</Text>
              </View>
            )}
            {currentDayData.totalFat && (
              <View style={styles.totalItem}>
                <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Fat</Text>
                <Text style={[styles.totalValue, { color: colors.textPrimary }]}>{currentDayData.totalFat}g</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity style={[styles.completeButton, { backgroundColor: colors.primary }]} onPress={handleCompleteDay}>
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <Text style={styles.completeButtonText}>{t('dietPrograms.completeDay') || 'Complete Day'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 18, fontWeight: '600' },
  content: { padding: 16 },
  progressCard: { alignItems: 'center', padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  dayLabel: { fontSize: 14 },
  dayNumber: { fontSize: 48, fontWeight: '700' },
  dayTotal: { fontSize: 14, marginTop: -4 },
  progressBar: { width: '100%', height: 8, borderRadius: 4, marginTop: 16 },
  progressFill: { height: '100%', borderRadius: 4 },
  dayTitle: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  dayDescription: { fontSize: 15, lineHeight: 22, marginBottom: 16 },
  mealsCard: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  mealItem: { flexDirection: 'row', padding: 16 },
  mealIconContainer: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  mealInfo: { flex: 1, marginLeft: 12 },
  mealType: { fontSize: 12, textTransform: 'capitalize' },
  mealName: { fontSize: 16, fontWeight: '600', marginTop: 2 },
  mealDescription: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  mealMacros: { alignItems: 'flex-end' },
  macroText: { fontSize: 12 },
  totalsCard: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, marginTop: 16, padding: 16 },
  totalItem: { flex: 1, alignItems: 'center' },
  totalLabel: { fontSize: 12 },
  totalValue: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  footer: { padding: 16, borderTopWidth: 1 },
  completeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, gap: 8 },
  completeButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
