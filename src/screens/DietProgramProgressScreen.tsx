import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { useProgramProgress } from '../stores/ProgramProgressStore';
import DietProgramsService from '../services/dietProgramsService';
import DailyDietTracker from '../components/DailyDietTracker';
import CelebrationModal from '../components/CelebrationModal';

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

interface DietProgramProgressScreenProps {
    navigation: any;
    route: any;
}

// FIX: Use shared getLocalizedText from types.ts for consistency
import { getLocalizedText as getLocalizedTextShared } from '../components/programs/types';

const getLocalizedText = (value: any, lang: string, t?: (_key: string) => string): string => {
    // Use shared implementation for consistency
    return getLocalizedTextShared(value, lang, t);
};

export default function DietProgramProgressScreen({ navigation, route }: DietProgramProgressScreenProps) {
    const { colors } = useTheme();
    const { t, language } = useI18n();
    const { activeProgram, loading: storeLoading, completeDay: completeDayStore, refreshProgress, markCelebrationShown, invalidateCache } = useProgramProgress();
    const [showCelebration, setShowCelebration] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    // FIX: Initialize based on whether we have correct data - prevents loading screen if data exists
    const [isInitializing, setIsInitializing] = useState(() => {
        // If we already have correct activeProgram, no need to initialize
        return !(activeProgram && activeProgram.programId === route.params?.id);
    });

    // FIX: Only refresh if we don't have the correct activeProgram
    // This prevents unnecessary reloads when navigating back to this screen
    useEffect(() => {
        const initialize = async () => {
            // FIX: Check if we have correct data first - if yes, skip initialization entirely
            // This prevents loading screen when navigating from start program with data already in store
            if (activeProgram && activeProgram.programId === route.params?.id) {
                // Data is already correct, no need to reload or show loading
                setIsInitializing(false);
                return;
            }

            setIsInitializing(true);
            // Only refresh if activeProgram is missing or doesn't match route
            if (!activeProgram || activeProgram.programId !== route.params?.id) {
                // Only invalidate if we're sure we need fresh data
                if (!activeProgram) {
                    invalidateCache();
                }
                await refreshProgress();
            }
            setIsInitializing(false);
        };
        // FIX: Add small delay to allow navigation to complete before checking
        // This prevents unnecessary refresh when navigating from start program
        const timer = setTimeout(initialize, 50); // Reduced delay for faster initialization
        return () => clearTimeout(timer);
    }, [route.params?.id, activeProgram?.programId, invalidateCache, refreshProgress, activeProgram]); // Also depend on activeProgram.programId to detect when it changes

    // FIX: Don't refresh on every focus - only if data is missing or incorrect
    // This prevents constant reloads when navigating back to this screen
    // Also prevents double refresh after completing day (celebration modal closes, screen regains focus)
    useFocusEffect(
        useCallback(() => {
            // Only refresh if activeProgram is missing or doesn't match route
            // FIX: Add check to prevent refresh immediately after completing day
            // If we just completed a day, the optimistic update is enough, don't refresh
            if (!activeProgram || activeProgram.programId !== route.params?.id) {
                // Add small delay to prevent immediate refresh after navigation/actions
                const timer = setTimeout(() => {
                    refreshProgress().catch(() => {
                        // Silent fail - we'll retry on next focus
                    });
                }, 300); // Small delay to prevent refresh during transitions
                return () => clearTimeout(timer);
            }
            // FIX: If we have correct activeProgram, skip refresh entirely
            // This prevents visual reload and improves UX
        }, [activeProgram, route.params?.id, refreshProgress])
    );

    // Retry logic when activeProgram is null but we expect it to exist
    useEffect(() => {
        if (!storeLoading && !isInitializing && !activeProgram && retryCount < MAX_RETRY_ATTEMPTS) {
            const timer = setTimeout(async () => {
                console.log(`[DietProgramProgress] Retry ${retryCount + 1}/${MAX_RETRY_ATTEMPTS} - activeProgram not found`);
                setRetryCount(prev => prev + 1);
                invalidateCache();
                await refreshProgress();
            }, RETRY_DELAY_MS);
            return () => clearTimeout(timer);
        }
    }, [storeLoading, isInitializing, activeProgram, retryCount, refreshProgress, invalidateCache]);

    // Safeguard: If active program ID mismatches route params, redirect to correct one
    // This prevents showing "Day X of Diet A" while displaying meals for "Diet B"
    useEffect(() => {
        if (!storeLoading && activeProgram && route.params?.id && activeProgram.programId !== route.params.id) {
            console.warn(`[DietProgramProgress] Mismatch! Route: ${route.params.id}, Active: ${activeProgram.programId}. redirecting...`);
            navigation.setParams({ id: activeProgram.programId });
        }
    }, [activeProgram, route.params?.id, storeLoading, navigation]);

    // Show celebration when day is completed
    useEffect(() => {
        if (activeProgram?.todayLog?.completed && !activeProgram.todayLog.celebrationShown) {
            setShowCelebration(true);
        }
    }, [activeProgram?.todayLog?.completed, activeProgram?.todayLog?.celebrationShown]);

    const handleCompleteDay = async () => {
        if (!activeProgram || activeProgram.type !== 'diet') return;
        if (activeProgram.todayLog?.completed) return;

        if (activeProgram.currentDayIndex >= activeProgram.durationDays) {
            Alert.alert(t('dietPrograms.completed'), t('dietPrograms.completedMessage'), [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
            return;
        }

        try {
            const res = await completeDayStore();
            if (res?.alreadyCompleted) return;
            setShowCelebration(true);
        } catch (error: any) {
            Alert.alert(t('common.error'), error.message || t('errors.completeDay'));
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

    // Load program details if not in store
    const [programDetails, setProgramDetails] = useState<any>(null);
    const [loadingDetails, setLoadingDetails] = useState(true);

    useEffect(() => {
        const loadDetails = async () => {
            try {
                const data = await DietProgramsService.getProgram(route.params.id);
                setProgramDetails(data);
            } catch (error) {
                console.error('Failed to load program details:', error);
            } finally {
                setLoadingDetails(false);
            }
        };
        loadDetails();
    }, [route.params.id]);

    // FIX: Don't show loading if we have correct activeProgram - prevents loading screen when navigating from start
    // Show loading only if we're truly missing data or loading details
    const isLoading = (storeLoading || loadingDetails || isInitializing) &&
        (!activeProgram || activeProgram.programId !== route.params?.id) &&
        retryCount < MAX_RETRY_ATTEMPTS;

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    {retryCount > 0 && (
                        <Text style={{ color: colors.textSecondary, marginTop: 10 }}>
                            {t('common.loading')}...
                        </Text>
                    )}
                </View>
            </SafeAreaView>
        );
    }

    if (!activeProgram || activeProgram.type !== 'diet' || !programDetails) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.loadingContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
                    <Text style={{ color: colors.textPrimary, marginTop: 16, fontSize: 16 }}>
                        {t('dietPrograms.notFound')}
                    </Text>
                    <TouchableOpacity
                        style={{
                            marginTop: 16,
                            paddingHorizontal: 20,
                            paddingVertical: 10,
                            backgroundColor: colors.primary,
                            borderRadius: 8,
                        }}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={{ color: '#fff', fontWeight: '600' }}>{t('common.goBack')}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const currentDay = programDetails?.days?.find((d: any) => d.dayNumber === activeProgram.currentDayIndex);
    const progressPercent = Math.round((activeProgram.currentDayIndex / activeProgram.durationDays) * 100);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <CelebrationModal
                visible={showCelebration}
                completionRate={activeProgram.todayLog?.completionRate || 0}
                onClose={async () => {
                    setShowCelebration(false);
                    // Mark celebration as shown in database
                    await markCelebrationShown();
                }}
            />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.textPrimary }]}>{getLocalizedText(programDetails.name, language, t)}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Progress Card */}
                <View style={[styles.progressCard, { backgroundColor: colors.primary }]}>
                    <View style={styles.progressHeader}>
                        <View>
                            <Text style={styles.progressDayLabel}>
                                {t('dietPrograms.day')} {activeProgram.currentDayIndex}
                            </Text>
                            <Text style={styles.progressOfTotal}>
                                {t('common.of')} {activeProgram.durationDays}
                            </Text>
                        </View>
                        {/* Streak Badge */}
                        {/* Streak Badge */}
                        {/* Streak Badge */}
                        {activeProgram.streak?.current > 0 && (
                            <View style={styles.streakBadge}>
                                <Ionicons name="flame" size={16} color="#FFB300" />
                                <Text style={styles.streakText}>
                                    {activeProgram.streak?.current || 0} {t('diets.tracker.days')}
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
                    </View>
                    <Text style={styles.progressPercent}>{progressPercent}%</Text>
                </View>

                {/* Daily Diet Tracker - uses optimistic updates, no need for onUpdate refresh */}
                <DailyDietTracker />

                {/* Today's Meals */}
                {currentDay?.meals?.length > 0 && (
                    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                            {t('dietPrograms.mealsForDay')} {activeProgram.currentDayIndex}
                        </Text>
                        {currentDay?.title && (
                            <Text style={[styles.dayTitle, { color: colors.textSecondary }]}>{getLocalizedText(currentDay.title, language, t)}</Text>
                        )}
                        {currentDay.meals.map((meal: any, index: number) => (
                            <View key={index} style={styles.mealItem}>
                                <View style={[styles.mealIconContainer, { backgroundColor: colors.primary + '20' }]}>
                                    <Ionicons name={getMealIcon(meal.mealType)} size={18} color={colors.primary} />
                                </View>
                                <View style={styles.mealInfo}>
                                    <Text style={[styles.mealType, { color: colors.textSecondary }]}>{t(`dietPrograms.mealTypes.${meal.mealType}`) || meal.mealType}</Text>
                                    <Text style={[styles.mealName, { color: colors.textPrimary }]}>{getLocalizedText(meal.name, language, t)}</Text>
                                    {meal.description && (
                                        <Text style={[styles.mealDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                                            {getLocalizedText(meal.description, language, t)}
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
                    {Array.from({ length: Math.min(activeProgram.durationDays, 14) }, (_, i) => i + 1).map((day) => (
                        <View
                            key={day}
                            style={[
                                styles.dayDot,
                                {
                                    backgroundColor:
                                        day < activeProgram.currentDayIndex
                                            ? colors.primary
                                            : day === activeProgram.currentDayIndex
                                                ? colors.primary + '50'
                                                : colors.border,
                                },
                            ]}
                        >
                            {day < activeProgram.currentDayIndex && <Ionicons name="checkmark" size={10} color="#fff" />}
                        </View>
                    ))}
                </View>

                {/* Pause/Resume Button */}
                <TouchableOpacity
                    style={[styles.pauseButton, { borderColor: colors.warning || '#FF9800', backgroundColor: (colors.warning || '#FF9800') + '10' }]}
                    onPress={() => {
                        const isPaused = activeProgram?.status === 'paused';
                        Alert.alert(
                            isPaused ? t('dietPrograms.resumeProgram') : t('dietPrograms.pauseProgram'),
                            isPaused ? t('dietPrograms.resumeProgramConfirm') : t('dietPrograms.pauseProgramConfirm'),
                            [
                                { text: t('common.cancel'), style: 'cancel' },
                                {
                                    text: isPaused ? t('dietPrograms.resume') : t('dietPrograms.pause'),
                                    onPress: async () => {
                                        try {
                                            if (isPaused) {
                                                await DietProgramsService.resumeProgram();
                                            } else {
                                                await DietProgramsService.pauseProgram();
                                            }
                                            // FIX: Refresh in background - don't block UI
                                            refreshProgress().catch(() => {
                                                // Silent fail - optimistic update already applied
                                            });
                                        } catch {
                                            Alert.alert(t('common.error'), t('errors.pauseProgram'));
                                        }
                                    },
                                },
                            ]
                        );
                    }}
                >
                    <Ionicons
                        name={activeProgram?.status === 'paused' ? 'play-circle-outline' : 'pause-circle-outline'}
                        size={18}
                        color={colors.warning || '#FF9800'}
                    />
                    <Text style={[styles.pauseButtonText, { color: colors.warning || '#FF9800' }]}>
                        {activeProgram?.status === 'paused' ? t('dietPrograms.resumeProgram') : t('dietPrograms.pauseProgram')}
                    </Text>
                </TouchableOpacity>

                {/* Stop Program Button */}
                <TouchableOpacity
                    style={[styles.stopButton, { borderColor: colors.error }]}
                    onPress={() => {
                        Alert.alert(
                            t('dietPrograms.stopProgram'),
                            t('dietPrograms.stopProgramConfirm'),
                            [
                                { text: t('common.cancel'), style: 'cancel' },
                                {
                                    text: t('common.stop'),
                                    style: 'destructive',
                                    onPress: async () => {
                                        try {
                                            await DietProgramsService.stopProgram(route.params.id);
                                            // FIX: Clear cache and navigate immediately
                                            invalidateCache();
                                            // Navigate immediately - refresh in background
                                            navigation.goBack();
                                            // Refresh in background (non-blocking)
                                            refreshProgress().catch(() => {
                                                // Silent fail - navigation already happened
                                            });
                                        } catch {
                                            Alert.alert(t('common.error'), t('errors.stopProgram'));
                                        }
                                    },
                                },
                            ]
                        );
                    }}
                >
                    <Ionicons name="stop-circle-outline" size={18} color={colors.error} />
                    <Text style={[styles.stopButtonText, { color: colors.error }]}>
                        {t('dietPrograms.stopProgram')}
                    </Text>
                </TouchableOpacity>
            </ScrollView>

            <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                <TouchableOpacity
                    style={[styles.completeButton, { backgroundColor: colors.primary }]}
                    onPress={handleCompleteDay}
                    disabled={!!activeProgram.todayLog?.completed}
                >
                    <Text style={styles.completeButtonText}>
                        {activeProgram.todayLog?.completed
                            ? t('dietPrograms.dayCompleted')
                            : activeProgram.currentDayIndex >= activeProgram.durationDays
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
        marginBottom: 16,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        width: '100%',
        marginBottom: 8,
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
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 4,
    },
    streakText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
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
    pauseButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 16,
        gap: 8,
    },
    pauseButtonText: {
        fontSize: 15,
        fontWeight: '500',
    },
    stopButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 12,
        gap: 8,
    },
    stopButtonText: {
        fontSize: 15,
        fontWeight: '500',
    },
});
