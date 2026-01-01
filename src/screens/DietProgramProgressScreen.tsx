import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import DietProgramsService from '../services/dietProgramsService';

interface DietProgramProgressScreenProps {
    navigation: any;
    route: any;
}

export default function DietProgramProgressScreen({ navigation, route }: DietProgramProgressScreenProps) {
    const { colors } = useTheme();
    const { t } = useI18n();
    const [progress, setProgress] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const loadProgress = useCallback(async () => {
        try {
            const data = await DietProgramsService.getProgress(route.params.id);
            setProgress(data);
        } catch (error) {
            console.error('Failed to load progress:', error);
        } finally {
            setLoading(false);
        }
    }, [route.params.id]);

    useEffect(() => {
        loadProgress();
    }, [loadProgress]);

    const handleCompleteDay = async () => {
        if (!progress) return;

        if (progress.currentDay >= progress.program.duration) {
            Alert.alert(t('dietPrograms.completed'), t('dietPrograms.completedMessage'), [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
            return;
        }

        try {
            await DietProgramsService.completeDay(route.params.id, progress.currentDay);
            loadProgress();
        } catch {
            Alert.alert(t('common.error'), t('errors.completeDay'));
        }
    };

    const getMealIcon = (mealType: string): any => {
        switch (mealType) {
            case 'breakfast':
                return 'sunny-outline';
            case 'lunch':
                return 'restaurant-outline';
            case 'dinner':
                return 'moon-outline';
            case 'snack':
                return 'cafe-outline';
            default:
                return 'restaurant-outline';
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (!progress) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.loadingContainer}>
                    <Text style={{ color: colors.textPrimary }}>{t('dietPrograms.notFound')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    const currentDay = progress.program?.days?.find((d: any) => d.dayNumber === progress.currentDay);
    const progressPercent = Math.round((progress.currentDay / progress.program.duration) * 100);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.textPrimary }]}>{progress.program.name}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Progress Card */}
                <View style={[styles.progressCard, { backgroundColor: colors.primary }]}>
                    <Text style={styles.progressDayLabel}>
                        {t('dietPrograms.day')} {progress.currentDay}
                    </Text>
                    <Text style={styles.progressOfTotal}>
                        {t('common.of')} {progress.program.duration}
                    </Text>
                    <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
                    </View>
                    <Text style={styles.progressPercent}>{progressPercent}%</Text>
                </View>

                {/* Today's Meals */}
                {currentDay?.meals?.length > 0 && (
                    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                            {t('dietPrograms.day')} {progress.currentDay}
                        </Text>
                        {currentDay.title && (
                            <Text style={[styles.dayTitle, { color: colors.textSecondary }]}>{currentDay.title}</Text>
                        )}
                        {currentDay.meals.map((meal: any, index: number) => (
                            <View key={index} style={styles.mealItem}>
                                <View style={[styles.mealIconContainer, { backgroundColor: colors.primary + '20' }]}>
                                    <Ionicons name={getMealIcon(meal.mealType)} size={18} color={colors.primary} />
                                </View>
                                <View style={styles.mealInfo}>
                                    <Text style={[styles.mealType, { color: colors.textSecondary }]}>{meal.mealType}</Text>
                                    <Text style={[styles.mealName, { color: colors.textPrimary }]}>{meal.name}</Text>
                                    {meal.description && (
                                        <Text style={[styles.mealDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                                            {meal.description}
                                        </Text>
                                    )}
                                </View>
                                {meal.calories && (
                                    <Text style={[styles.mealCalories, { color: colors.textSecondary }]}>{meal.calories} kcal</Text>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {/* Day Progress Dots */}
                <View style={styles.daysRow}>
                    {Array.from({ length: Math.min(progress.program.duration, 14) }, (_, i) => i + 1).map((day) => (
                        <View
                            key={day}
                            style={[
                                styles.dayDot,
                                {
                                    backgroundColor:
                                        day < progress.currentDay
                                            ? colors.primary
                                            : day === progress.currentDay
                                                ? colors.primary + '50'
                                                : colors.border,
                                },
                            ]}
                        >
                            {day < progress.currentDay && <Ionicons name="checkmark" size={10} color="#fff" />}
                        </View>
                    ))}
                </View>
            </ScrollView>

            <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                <TouchableOpacity style={[styles.completeButton, { backgroundColor: colors.primary }]} onPress={handleCompleteDay}>
                    <Text style={styles.completeButtonText}>
                        {progress.currentDay >= progress.program.duration
                            ? t('dietPrograms.finishProgram')
                            : t('dietPrograms.completeDay')}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },
    content: {
        padding: 16,
    },
    progressCard: {
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginBottom: 16,
    },
    progressDayLabel: {
        color: '#fff',
        fontSize: 32,
        fontWeight: '700',
    },
    progressOfTotal: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        marginTop: 4,
    },
    progressBarContainer: {
        width: '100%',
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 4,
        marginTop: 16,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#fff',
        borderRadius: 4,
    },
    progressPercent: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 8,
    },
    section: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    dayTitle: {
        fontSize: 14,
        marginBottom: 12,
    },
    mealItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    mealIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mealInfo: {
        flex: 1,
        marginLeft: 12,
    },
    mealType: {
        fontSize: 12,
        textTransform: 'capitalize',
    },
    mealName: {
        fontSize: 15,
        fontWeight: '500',
        marginTop: 2,
    },
    mealDescription: {
        fontSize: 13,
        marginTop: 4,
        lineHeight: 18,
    },
    mealCalories: {
        fontSize: 13,
    },
    daysRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        marginTop: 8,
    },
    dayDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
    },
    completeButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    completeButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
    },
});
