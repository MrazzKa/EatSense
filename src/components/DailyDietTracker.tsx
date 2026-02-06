import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../app/i18n/hooks';
import { useTheme } from '../contexts/ThemeContext';
import { useProgramProgress } from '../stores/ProgramProgressStore';
import ApiService from '../services/apiService';
import CircularProgressRing from './CircularProgressRing';
import { getDaysText } from '../utils/pluralize';

interface TrackerItem {
    key: string;
    label: string;
    checked: boolean;
}

interface SymptomsData {
    energy?: number;
    digestion?: number;
    bloating?: number;
    mood?: number;
}

interface DailyDietTrackerProps {
    onUpdate?: () => void;
}

/**
 * DailyDietTracker - Daily checklist with progress ring and symptoms input
 */
export default function DailyDietTracker({ onUpdate }: DailyDietTrackerProps) {
    const { t, language } = useI18n();
    const { colors } = useTheme();
    const { activeProgram, loading: storeLoading, updateChecklist, markCelebrationShown } = useProgramProgress();

    // NOTE: useRefreshProgressOnFocus removed - parent component handles this
    // Having it in both parent and child caused double refresh on every focus

    // Cache last valid activeProgram to prevent tracker from disappearing during reloads
    const lastValidProgramRef = useRef<typeof activeProgram>(null);

    // Update cached program when we get a valid one
    useEffect(() => {
        if (activeProgram && (activeProgram.type === 'diet' || activeProgram.type === 'lifestyle')) {
            lastValidProgramRef.current = activeProgram;
        }
    }, [activeProgram]);

    // Use cached program during transient null states (API reload)
    const program = activeProgram || lastValidProgramRef.current;

    const [saving, setSaving] = useState(false);
    // NOTE: CelebrationModal removed from DailyDietTracker to prevent duplicate modals
    // CelebrationModal is now only rendered in DietProgramProgressScreen
    const [trackerData, setTrackerData] = useState<{
        dailyTracker: TrackerItem[];
        symptoms: SymptomsData;
        showSymptoms: boolean;
    } | null>(null);

    // Debounce and queue refs for toggle UX
    const pendingChecklistRef = useRef<Record<string, boolean> | null>(null);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isRequestInFlightRef = useRef(false);
    const DEBOUNCE_MS = 300; // Batch rapid toggles

    // FIX: Store last valid tracker data to prevent data loss on transient errors
    const lastValidTrackerDataRef = useRef<typeof trackerData>(null);

    // Load tracker data from API (for dailyTracker items and symptoms)
    const loadTrackerData = useCallback(async () => {
        if (!program || (program.type !== 'diet' && program.type !== 'lifestyle')) {
            setTrackerData(null);
            lastValidTrackerDataRef.current = null;
            return;
        }

        try {
            const data = await ApiService.get('/diets/active/today');

            // FIX: Handle null response (when program is null on backend)
            if (!data) {
                console.warn('[DailyDietTracker] API returned null - program may be missing');
                setTrackerData(null);
                lastValidTrackerDataRef.current = null;
                return;
            }

            // FIX: Ensure dailyTracker is always an array, even if empty
            const dailyTracker = Array.isArray(data?.dailyTracker) ? data.dailyTracker : [];
            const newTrackerData = {
                dailyTracker,
                symptoms: data?.symptoms || {},
                showSymptoms: data?.showSymptoms || false,
            };
            setTrackerData(newTrackerData);
            // Save as last valid state
            lastValidTrackerDataRef.current = newTrackerData;
        } catch (error: any) {
            console.error('[DailyDietTracker] Load tracker data failed:', error);
            // If 404, no active diet - clear tracker
            if (error?.status === 404 || error?.response?.status === 404) {
                setTrackerData(null);
                lastValidTrackerDataRef.current = null;
            } else if (error?.status === 401) {
                // FIX: On auth errors, keep showing last valid data instead of clearing
                // This prevents data "disappearing" during token refresh
                console.warn('[DailyDietTracker] Auth error - keeping last valid data');
                if (lastValidTrackerDataRef.current) {
                    setTrackerData(lastValidTrackerDataRef.current);
                }
                // Don't clear lastValidTrackerDataRef - keep it for recovery
            } else {
                // For other errors, keep last valid data if available
                console.warn('[DailyDietTracker] Network/server error - keeping last valid data');
                if (lastValidTrackerDataRef.current) {
                    setTrackerData(lastValidTrackerDataRef.current);
                }
            }
        }
    }, [program]);

    useEffect(() => {
        if (program && (program.type === 'diet' || program.type === 'lifestyle')) {
            loadTrackerData();
        } else {
            setTrackerData(null);
        }
    }, [program, loadTrackerData]);

    // NOTE: CelebrationModal useEffect removed - celebration is handled by parent screen

    // Debounced sync to backend
    const syncChecklistToBackend = useCallback(async (checklistToSync: Record<string, boolean>) => {
        if (isRequestInFlightRef.current) {
            // Queue for next sync
            pendingChecklistRef.current = checklistToSync;
            return;
        }

        // FIX: Save current state before sync for potential rollback
        const previousState = trackerData ? { ...trackerData } : null;

        isRequestInFlightRef.current = true;
        try {
            await updateChecklist(checklistToSync);
            // Update lastValidTrackerDataRef with new state after successful save
            if (trackerData) {
                lastValidTrackerDataRef.current = trackerData;
            }
            // Don't call loadTrackerData or full refresh - just notify parent
            onUpdate?.();

            // Check if more changes queued while we were saving
            if (pendingChecklistRef.current) {
                const pending = pendingChecklistRef.current;
                pendingChecklistRef.current = null;
                await syncChecklistToBackend(pending);
            }
        } catch (error) {
            console.error('[DailyDietTracker] Save checklist failed:', error);
            // FIX: Revert to previous state instead of reloading (prevents flicker)
            if (previousState) {
                setTrackerData(previousState);
            } else if (lastValidTrackerDataRef.current) {
                setTrackerData(lastValidTrackerDataRef.current);
            }
            // Don't reload - just show error state with previous data
        } finally {
            isRequestInFlightRef.current = false;
        }
    }, [updateChecklist, trackerData, onUpdate]);

    const handleChecklistToggle = useCallback((key: string) => {
        if (!trackerData || !program || !trackerData.dailyTracker || trackerData.dailyTracker.length === 0) return;

        // Build new checklist state
        const newChecklist: Record<string, boolean> = {};
        trackerData.dailyTracker.forEach(item => {
            newChecklist[item.key] = item.key === key ? !item.checked : item.checked;
        });

        // Optimistic UI update (immediate)
        setTrackerData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                dailyTracker: prev.dailyTracker.map(item =>
                    item.key === key ? { ...item, checked: !item.checked } : item
                ),
            };
        });

        // Debounce the backend sync
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        pendingChecklistRef.current = newChecklist;
        debounceTimerRef.current = setTimeout(() => {
            const checklistToSync = pendingChecklistRef.current;
            if (checklistToSync) {
                pendingChecklistRef.current = null;
                setSaving(true);
                syncChecklistToBackend(checklistToSync).finally(() => setSaving(false));
            }
        }, DEBOUNCE_MS);
    }, [trackerData, program, syncChecklistToBackend]);

    const handleSymptomChange = async (symptom: string, value: number) => {
        if (!trackerData || saving) return;

        // FIX: Save previous state for rollback
        const previousSymptoms = { ...trackerData.symptoms };
        const newSymptoms = { ...trackerData.symptoms, [symptom]: value };

        // Optimistic update
        setTrackerData(prev => {
            if (!prev) return prev;
            return { ...prev, symptoms: newSymptoms };
        });

        setSaving(true);
        try {
            await ApiService.patch('/diets/active/symptoms', { symptoms: newSymptoms });
            // Update lastValidTrackerDataRef on success
            if (trackerData) {
                lastValidTrackerDataRef.current = { ...trackerData, symptoms: newSymptoms };
            }
            onUpdate?.();
        } catch (error) {
            console.error('[DailyDietTracker] Save symptoms failed:', error);
            // FIX: Revert to previous symptoms instead of reloading (prevents flicker)
            setTrackerData(prev => {
                if (!prev) return prev;
                return { ...prev, symptoms: previousSymptoms };
            });
        } finally {
            setSaving(false);
        }
    };

    // FIX: Only show loading indicator if we don't have data yet
    // This prevents the component from flashing/unmounting when background updates happen
    if (!trackerData && storeLoading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.surface }]}>
                <ActivityIndicator size="small" color={colors.primary} />
            </View>
        );
    }

    if (!program || (program.type !== 'diet' && program.type !== 'lifestyle')) {
        return null; // No active diet or lifestyle
    }

    // FIX: Check if trackerData exists before accessing dailyTracker
    if (!trackerData || !trackerData.dailyTracker || trackerData.dailyTracker.length === 0) {
        return (
            <View style={[styles.container, { backgroundColor: colors.surface }]}>
                <ActivityIndicator size="small" color={colors.primary} />
            </View>
        );
    }

    const completedCount = trackerData.dailyTracker.filter(i => i.checked).length;
    const totalCount = trackerData.dailyTracker.length;
    // FIX 2026-01-19: Use local state for instant progress updates instead of store's todayLog
    // This ensures the progress ring updates immediately when checkboxes are toggled
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const thresholdPercent = Math.round((program.streak?.threshold || 0.6) * 100);
    const isLifestyle = program.type === 'lifestyle';

    return (
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Header with Progress Ring */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={[styles.title, { color: colors.textPrimary }]}>
                        {isLifestyle
                            ? (t('lifestyles_tracker_daily_inspiration') || 'Daily Inspiration')
                            : t('diets_tracker_daily_checklist')}
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        {t('diets_tracker_completed')}: {completedCount}/{totalCount}
                    </Text>
                </View>

                {/* Progress Ring - SVG-based circular progress */}
                <CircularProgressRing
                    progress={progressPercent / 100}
                    size={56}
                    strokeWidth={4}
                    showText={true}
                    textStyle={styles.progressText}
                />
            </View>

            {/* Streak Info */}
            {program.streak && (
                <View style={[styles.streakContainer, { backgroundColor: colors.surfaceSecondary }]}>
                    <Ionicons name="flame" size={18} color={colors.warning} />
                    <Text style={[styles.streakText, { color: colors.textPrimary }]}>
                        {t('diets_tracker_streak')}: {getDaysText(program.streak?.current || 0, language)}
                    </Text>
                    {(program.streak?.longest || 0) > 0 && (
                        <Text style={[styles.streakBest, { color: colors.textSecondary }]}>
                            ({t('diets_tracker_longest_streak')}: {program.streak?.longest || 0})
                        </Text>
                    )}
                </View>
            )}

            {/* Checklist Items */}
            <View style={styles.checklistContainer}>
                {trackerData.dailyTracker.map((item) => (
                    <TouchableOpacity
                        key={item.key}
                        style={[styles.checklistItem, { borderBottomColor: colors.border }]}
                        onPress={() => handleChecklistToggle(item.key)}
                        activeOpacity={0.7}
                    >
                        <View style={[
                            styles.checkbox,
                            {
                                borderColor: item.checked ? colors.primary : colors.border,
                                backgroundColor: item.checked ? colors.primary : 'transparent',
                            }
                        ]}>
                            {item.checked && (
                                <Ionicons name="checkmark" size={14} color="#FFF" />
                            )}
                        </View>
                        <Text style={[
                            styles.checklistLabel,
                            {
                                color: item.checked ? colors.textSecondary : colors.textPrimary,
                                textDecorationLine: item.checked ? 'line-through' : 'none',
                            }
                        ]}>
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Symptoms Section (Medical diets only) */}
            {trackerData.showSymptoms && (
                <View style={styles.symptomsContainer}>
                    <Text style={[styles.symptomsTitle, { color: colors.textPrimary }]}>
                        {t('diets_symptoms_title')}
                    </Text>
                    <Text style={[styles.symptomsHint, { color: colors.textTertiary }]}>
                        {t('diets_symptoms_scale_hint')}
                    </Text>

                    {['energy', 'digestion', 'bloating', 'mood'].map((symptom) => (
                        <View key={symptom} style={styles.symptomRow}>
                            <Text style={[styles.symptomLabel, { color: colors.textSecondary }]}>
                                {t(`diets.symptoms.${symptom}`)}
                            </Text>
                            <View style={styles.symptomButtons}>
                                {[1, 2, 3, 4, 5].map((value) => (
                                    <TouchableOpacity
                                        key={value}
                                        style={[
                                            styles.symptomButton,
                                            {
                                                backgroundColor:
                                                    trackerData.symptoms[symptom as keyof SymptomsData] === value
                                                        ? colors.primary
                                                        : colors.surfaceSecondary,
                                            }
                                        ]}
                                        onPress={() => handleSymptomChange(symptom, value)}
                                    >
                                        <Text style={[
                                            styles.symptomButtonText,
                                            {
                                                color: trackerData.symptoms[symptom as keyof SymptomsData] === value
                                                    ? '#FFF'
                                                    : colors.textSecondary,
                                            }
                                        ]}>
                                            {value}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Footer hint */}
            <Text style={[styles.footerHint, { color: colors.textTertiary }]}>
                {t('diets_tracker_complete_to_maintain', { threshold: thresholdPercent })}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerLeft: {
        flex: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },
    subtitle: {
        fontSize: 14,
        marginTop: 2,
    },
    progressText: {
        fontSize: 14,
        fontWeight: '700',
    },
    streakContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 10,
        marginBottom: 16,
        gap: 6,
    },
    streakText: {
        fontSize: 14,
        fontWeight: '600',
    },
    streakBest: {
        fontSize: 12,
    },
    checklistContainer: {
        marginBottom: 8,
    },
    checklistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    checklistLabel: {
        fontSize: 15,
        flex: 1,
    },
    symptomsContainer: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E5EA',
    },
    symptomsTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    symptomsHint: {
        fontSize: 12,
        marginBottom: 12,
    },
    symptomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    symptomLabel: {
        fontSize: 14,
        flex: 1,
    },
    symptomButtons: {
        flexDirection: 'row',
        gap: 6,
    },
    symptomButton: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    symptomButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    footerHint: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 8,
    },
});

