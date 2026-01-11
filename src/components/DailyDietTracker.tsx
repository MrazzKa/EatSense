import React, { useState, useEffect, useCallback } from 'react';
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
import { useProgramProgress, useRefreshProgressOnFocus } from '../stores/ProgramProgressStore';
import ApiService from '../services/apiService';
import CircularProgressRing from './CircularProgressRing';
import CelebrationModal from './CelebrationModal';

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
    const { t } = useI18n();
    const { colors } = useTheme();
    const { activeProgram, loading: storeLoading, updateChecklist, refreshProgress, markCelebrationShown } = useProgramProgress();

    // Refresh on focus
    useRefreshProgressOnFocus();

    const [saving, setSaving] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);
    const [trackerData, setTrackerData] = useState<{
        dailyTracker: TrackerItem[];
        symptoms: SymptomsData;
        showSymptoms: boolean;
    } | null>(null);

    // Load tracker data from API (for dailyTracker items and symptoms)
    const loadTrackerData = useCallback(async () => {
        if (!activeProgram || activeProgram.type !== 'diet') return;

        try {
            const data = await ApiService.get('/diets/active/today');
            setTrackerData({
                dailyTracker: data.dailyTracker || [],
                symptoms: data.symptoms || {},
                showSymptoms: data.showSymptoms || false,
            });
        } catch (error) {
            console.error('[DailyDietTracker] Load tracker data failed:', error);
        }
    }, [activeProgram]);

    useEffect(() => {
        if (activeProgram && activeProgram.type === 'diet') {
            loadTrackerData();
        }
    }, [activeProgram, loadTrackerData]);

    // Show celebration when day is completed
    useEffect(() => {
        if (activeProgram?.todayLog?.completed && !activeProgram.todayLog.celebrationShown) {
            setShowCelebration(true);
        }
    }, [activeProgram?.todayLog?.completed, activeProgram?.todayLog?.celebrationShown]);

    const handleChecklistToggle = async (key: string) => {
        if (!trackerData || !activeProgram || saving) return;

        const newChecklist: Record<string, boolean> = {};
        trackerData.dailyTracker.forEach(item => {
            newChecklist[item.key] = item.key === key ? !item.checked : item.checked;
        });

        // Optimistic update
        setTrackerData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                dailyTracker: prev.dailyTracker.map(item =>
                    item.key === key ? { ...item, checked: !item.checked } : item
                ),
            };
        });

        setSaving(true);
        try {
            await updateChecklist(newChecklist);
            await refreshProgress(); // Refresh store
            await loadTrackerData(); // Refresh tracker data
            onUpdate?.();
        } catch (error) {
            console.error('[DailyDietTracker] Save checklist failed:', error);
            // Revert on error
            await loadTrackerData();
        } finally {
            setSaving(false);
        }
    };

    const handleSymptomChange = async (symptom: string, value: number) => {
        if (!trackerData || saving) return;

        const newSymptoms = { ...trackerData.symptoms, [symptom]: value };

        // Optimistic update
        setTrackerData(prev => {
            if (!prev) return prev;
            return { ...prev, symptoms: newSymptoms };
        });

        setSaving(true);
        try {
            await ApiService.patch('/diets/active/symptoms', { symptoms: newSymptoms });
            onUpdate?.();
        } catch (error) {
            console.error('[DailyDietTracker] Save symptoms failed:', error);
            await loadTrackerData();
        } finally {
            setSaving(false);
        }
    };

    if (storeLoading || !trackerData) {
        return (
            <View style={[styles.container, { backgroundColor: colors.surface }]}>
                <ActivityIndicator size="small" color={colors.primary} />
            </View>
        );
    }

    if (!activeProgram || activeProgram.type !== 'diet') {
        return null; // No active diet
    }

    const completedCount = trackerData.dailyTracker.filter(i => i.checked).length;
    const totalCount = trackerData.dailyTracker.length;
    const progressPercent = Math.round((activeProgram.todayLog?.completionRate || 0) * 100);
    const thresholdPercent = Math.round((activeProgram.streak?.threshold || 0.6) * 100);

    return (
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Celebration Modal */}
            <CelebrationModal
                visible={showCelebration}
                completionRate={activeProgram.todayLog?.completionRate || 0}
                onClose={async () => {
                    setShowCelebration(false);
                    // Mark celebration as shown in database
                    await markCelebrationShown();
                }}
            />
            {/* Header with Progress Ring */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={[styles.title, { color: colors.textPrimary }]}>
                        {t('diets.tracker.daily_checklist')}
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        {t('diets.tracker.completed')}: {completedCount}/{totalCount}
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
            {activeProgram.streak && (
                <View style={[styles.streakContainer, { backgroundColor: colors.surfaceSecondary }]}>
                    <Ionicons name="flame" size={18} color={colors.warning} />
                    <Text style={[styles.streakText, { color: colors.textPrimary }]}>
                        {t('diets.tracker.streak')}: {activeProgram.streak?.current || 0} {t('diets.tracker.days')}
                    </Text>
                    {(activeProgram.streak?.longest || 0) > 0 && (
                        <Text style={[styles.streakBest, { color: colors.textSecondary }]}>
                            ({t('diets.tracker.longest_streak')}: {activeProgram.streak?.longest || 0})
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
                        {t('diets.symptoms.title')}
                    </Text>
                    <Text style={[styles.symptomsHint, { color: colors.textTertiary }]}>
                        {t('diets.symptoms.scale_hint')}
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
                {t('diets.tracker.complete_to_maintain', { threshold: thresholdPercent })}
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

