import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import DietProgramsService from '../services/dietProgramsService';

export default function DietProgramDetailScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadProgram(); }, []);

  const loadProgram = async () => {
    try {
      const data = await DietProgramsService.getProgram(route.params.id);
      setProgram(data);
    } catch (error) {
      console.error('Failed to load program:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    Alert.alert(
      t('dietPrograms.startProgram') || 'Start Program',
      `Start "${program.name}" (${program.duration} days)?`,
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        { text: t('dietPrograms.startConfirm') || 'Start', onPress: async () => {
          try {
            await DietProgramsService.startProgram(program.id);
            navigation.navigate('DietProgramProgress', { id: program.id });
          } catch (error) {
            Alert.alert('Error', 'Failed to start program');
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

  if (!program) {
    return <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}><Text style={{ color: colors.textPrimary }}>Program not found</Text></SafeAreaView>;
  }

  const day1 = program.days?.[0];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView>
        {program.imageUrl ? (
          <Image source={{ uri: program.imageUrl }} style={styles.headerImage} />
        ) : (
          <View style={[styles.headerImagePlaceholder, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="restaurant" size={48} color={colors.primary} />
          </View>
        )}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={[styles.programName, { color: colors.textPrimary }]}>{program.name}</Text>
          {program.subtitle && <Text style={[styles.programSubtitle, { color: colors.textSecondary }]}>{program.subtitle}</Text>}

          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{program.duration}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>days</Text>
            </View>
            {program.dailyCalories && (
              <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="flame-outline" size={20} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{program.dailyCalories}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>kcal/day</Text>
              </View>
            )}
            {program.difficulty && (
              <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="fitness-outline" size={20} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.textPrimary, textTransform: 'capitalize' }]}>{program.difficulty}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>level</Text>
              </View>
            )}
          </View>

          {program.description && (
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('dietPrograms.about') || 'About'}</Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>{program.description}</Text>
            </View>
          )}

          {day1?.meals?.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('dietPrograms.previewDay1') || 'Day 1 Preview'}</Text>
              {day1.meals.map((meal, index) => (
                <View key={index} style={styles.mealItem}>
                  <View style={[styles.mealIconContainer, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons name={getMealIcon(meal.mealType)} size={18} color={colors.primary} />
                  </View>
                  <View style={styles.mealInfo}>
                    <Text style={[styles.mealType, { color: colors.textSecondary }]}>{meal.mealType}</Text>
                    <Text style={[styles.mealName, { color: colors.textPrimary }]}>{meal.name}</Text>
                  </View>
                  {meal.calories && <Text style={[styles.mealCalories, { color: colors.textSecondary }]}>{meal.calories} kcal</Text>}
                </View>
              ))}
            </View>
          )}

          {program.tags?.length > 0 && (
            <View style={styles.tagsRow}>
              {program.tags.map((tag) => (
                <View key={tag} style={[styles.tag, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity style={[styles.startButton, { backgroundColor: colors.primary }]} onPress={handleStart}>
          <Text style={styles.startButtonText}>{t('dietPrograms.startProgram') || 'Start Program'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerImage: { width: '100%', height: 200 },
  headerImagePlaceholder: { width: '100%', height: 200, alignItems: 'center', justifyContent: 'center' },
  backButton: { position: 'absolute', top: 16, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16 },
  programName: { fontSize: 24, fontWeight: '700' },
  programSubtitle: { fontSize: 16, marginTop: 4 },
  statsRow: { flexDirection: 'row', marginTop: 16, gap: 12 },
  statBox: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1 },
  statValue: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  statLabel: { fontSize: 12, marginTop: 2 },
  section: { borderRadius: 12, padding: 16, marginTop: 16, borderWidth: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  description: { fontSize: 15, lineHeight: 22 },
  mealItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  mealIconContainer: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  mealInfo: { flex: 1, marginLeft: 12 },
  mealType: { fontSize: 12, textTransform: 'capitalize' },
  mealName: { fontSize: 15, fontWeight: '500', marginTop: 2 },
  mealCalories: { fontSize: 13 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, gap: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  tagText: { fontSize: 13, fontWeight: '500' },
  footer: { padding: 16, borderTopWidth: 1 },
  startButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  startButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
