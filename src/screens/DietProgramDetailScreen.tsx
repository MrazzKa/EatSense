import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import DietProgramsService from '../services/dietProgramsService';
import ApiService from '../services/apiService';
import { useProgramProgress, useRefreshProgressOnFocus } from '../stores/ProgramProgressStore';
// FIX: Use shared getLocalizedText from types.ts for consistency
import { getLocalizedText as getLocalizedTextShared } from '../components/programs/types';
import { isFreeDiet } from '../config/freeContent';
import PaywallModal from '../components/PaywallModal';
import HealthDisclaimer from '../components/HealthDisclaimer';

const STARTING_TIMEOUT_MS = 10000; // 10 second timeout for start operation

interface DietProgramDetailScreenProps {
    navigation: any;
    route: any;
}

// FIX: Use shared implementation for consistency
const getLocalizedText = (value: any, lang: string, t?: (_key: string) => string): string => {
    return getLocalizedTextShared(value, lang, t);
};

export default function DietProgramDetailScreen({ navigation, route }: DietProgramDetailScreenProps) {
    const { colors } = useTheme();
    const { t, language } = useI18n();
    const { activeProgram, refreshProgress } = useProgramProgress();
    const [isStarting, setIsStarting] = useState(false);
    useRefreshProgressOnFocus(); // Refresh activeProgram when screen is focused
    const [program, setProgram] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showPaywall, setShowPaywall] = useState(false);
    const [isPremiumUser, setIsPremiumUser] = useState(false);

    // FIX: Load cached subscription immediately for instant premium detection
    useEffect(() => {
        AsyncStorage.getItem('eatsense_subscription_cache')
            .then(cached => {
                if (cached) {
                    try {
                        const sub = JSON.parse(cached);
                        if (sub?.hasSubscription === true) {
                            setIsPremiumUser(true);
                        }
                    } catch (e) { /* ignore */ }
                }
            })
            .catch(() => { });
    }, []);

    const loadProgram = useCallback(async () => {
        try {
            // Support both 'id' and 'dietId' parameter names
            const programId = route.params?.dietId || route.params?.id;
            if (!programId) {
                console.error('No program ID provided');
                setLoading(false);
                return;
            }
            const data = await DietProgramsService.getProgram(programId);
            setProgram(data);
        } catch (error) {
            console.error('Failed to load program:', error);
        } finally {
            setLoading(false);
        }
    }, [route.params?.dietId, route.params?.id]);

    useEffect(() => {
        loadProgram();
    }, [loadProgram]);

    // Check subscription status on every focus (re-checks after purchase on other screens)
    useFocusEffect(
        useCallback(() => {
            const checkSubscription = async () => {
                try {
                    const subscription = await ApiService.getCurrentSubscription();
                    setIsPremiumUser(subscription?.hasSubscription === true);
                } catch (error) {
                    console.error('[DietProgramDetail] Failed to check subscription:', error);
                    setIsPremiumUser(false);
                }
            };
            checkSubscription();
        }, [])
    );

    // Check if this program is currently active
    const isActive = activeProgram?.programId === program?.id;

    const handleContinue = () => {
        if (program?.id) {
            navigation.navigate('DietProgramProgress', { id: program.id });
        }
    };

    const handleStart = async () => {
        if (isStarting) return; // Prevent double-tap

        // Check if user has access to this diet
        const isFree = isFreeDiet(program?.id || '');

        // FIX: Removed local trialService — Apple Introductory Offer (3-day free trial)
        // is handled automatically by StoreKit when user subscribes via PaywallModal.
        // This ensures ALL content unlocks at once (like a regular subscription),
        // instead of requiring manual per-diet unlock.
        if (isFree || isPremiumUser) {
            confirmAndStart();
            return;
        }

        // Not free and not premium → show PaywallModal (Apple IAP with intro offer)
        setShowPaywall(true);
        return;

        function confirmAndStart() {
            Alert.alert(
                t('dietPrograms.startProgram'),
                `Start "${getLocalizedText(program.name, language)}" (${program.duration} ${t('common.days')})?`,
                [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                        text: t('dietPrograms.startConfirm'),
                        onPress: async () => {
                            if (isStarting) return;
                            setIsStarting(true);

                            try {
                                // FIX: Start program and navigate immediately - no loading screen
                                // Store will update automatically when screen focuses
                                await DietProgramsService.startProgram(program.id);

                                // Navigate immediately - no waiting for store refresh
                                // This prevents loading screen and improves UX
                                navigation.navigate('DietProgramProgress', { id: program.id });

                                // FIX: Don't refresh immediately - let the target screen handle it
                                // This prevents double refresh and visual reloads
                                // The DietProgramProgressScreen will refresh on mount if needed
                            } catch (err: any) {
                                const status = err?.response?.status || err?.status;

                                // 409 Conflict = already enrolled in THIS diet, refresh and navigate
                                if (status === 409) {
                                    await refreshProgress();
                                    navigation.navigate('DietProgramProgress', { id: program.id });
                                }
                                // 400 Bad Request = already have ANOTHER active diet
                                else if (status === 400) {
                                    await refreshProgress();
                                    Alert.alert(
                                        t('dietPrograms.anotherDietActive') || 'Another Diet Active',
                                        t('dietPrograms.anotherDietActiveMessage') || 'You already have an active diet. Complete or abandon it first.',
                                        [
                                            { text: t('common.cancel'), style: 'cancel' },
                                            {
                                                text: t('dietPrograms.viewActive') || 'View Active',
                                                // FIX: Navigate to Dashboard which has the Active Widget with correct ID
                                                // Direct navigation to DietProgramProgress might fail if we don't have the active ID handy
                                                onPress: () => navigation.navigate('MainTabs', { screen: 'Dashboard' }),
                                            },
                                        ]
                                    );
                                } else {
                                    console.error('[DietProgramDetail] Start failed:', err);
                                    Alert.alert(t('common.error'), t('errors.startProgram'));
                                }
                            } finally {
                                setIsStarting(false);
                            }
                        },
                    },
                ]
            );
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

    if (!program) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.loadingContainer}>
                    <Text style={{ color: colors.textPrimary }}>{t('dietPrograms.empty')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    const day1 = program.days?.[0];

    // Parse howItWorks and notFor fields
    // FIX: Backend now localizes these fields, so they should come as arrays
    // But handle both cases: localized array (from backend) or localized object (fallback)
    const howItWorksRaw = program.howItWorks;
    let howItWorks: any[] = [];
    if (howItWorksRaw) {
        if (Array.isArray(howItWorksRaw)) {
            // Backend already localized it - use as is
            howItWorks = howItWorksRaw;
        } else if (typeof howItWorksRaw === 'object') {
            // Fallback: Localized object - extract array for current language
            howItWorks = howItWorksRaw[language] || howItWorksRaw['en'] || howItWorksRaw['ru'] || howItWorksRaw['kk'] || howItWorksRaw['fr'] || [];
        }
    }

    const notForRaw = program.notFor;
    let notFor: any[] = [];
    if (notForRaw) {
        if (Array.isArray(notForRaw)) {
            // Backend already localized it - use as is
            notFor = notForRaw;
        } else if (typeof notForRaw === 'object') {
            // Fallback: Localized object - extract array for current language
            notFor = notForRaw[language] || notForRaw['en'] || notForRaw['ru'] || notForRaw['kk'] || notForRaw['fr'] || [];
        }
    }

    const dailyTracker = program.dailyTracker ? (Array.isArray(program.dailyTracker) ? program.dailyTracker : []) : [];
    const showDisclaimer = program.disclaimerKey === 'DISCLAIMER_HISTORICAL' || program.disclaimerKey === 'DISCLAIMER_MEDICAL';
    const isHistorical = program.uiGroup === 'Historical';
    const isMedical = program.uiGroup === 'Medical' || program.disclaimerKey === 'DISCLAIMER_MEDICAL';

    // Get evidence level badge color
    const getEvidenceBadge = (level: string) => {
        switch (level) {
            case 'high': return { color: '#4CAF50', icon: 'shield-checkmark' };
            case 'medium': return { color: '#FF9800', icon: 'shield-half' };
            case 'low': return { color: '#9E9E9E', icon: 'shield' };
            default: return null;
        }
    };
    const evidenceBadge = program.evidenceLevel ? getEvidenceBadge(program.evidenceLevel) : null;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <ScrollView>
                {program.imageUrl ? (
                    <Image source={{ uri: program.imageUrl }} style={styles.headerImage} />
                ) : (
                    <View style={[styles.headerImagePlaceholder, { backgroundColor: isHistorical ? '#F5F0E6' : colors.primary + '20' }]}>
                        <Ionicons name={isHistorical ? 'time' : 'restaurant'} size={48} color={isHistorical ? '#795548' : colors.primary} />
                    </View>
                )}
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>

                <View style={styles.content}>
                    {/* Disclaimer Banner */}
                    {showDisclaimer && (
                        <View style={[
                            styles.disclaimerBanner,
                            { backgroundColor: isHistorical ? '#F5F0E6' : '#FFF3E0' }
                        ]}>
                            <Ionicons
                                name={isHistorical ? 'information-circle' : 'warning'}
                                size={20}
                                color={isHistorical ? '#795548' : '#E65100'}
                            />
                            <Text style={[
                                styles.disclaimerText,
                                { color: isHistorical ? '#795548' : '#E65100' }
                            ]}>
                                {isHistorical
                                    ? t('diets.disclaimers.historical')
                                    : t('diets.disclaimers.medical')
                                }
                            </Text>
                        </View>
                    )}

                    <Text style={[styles.programName, { color: colors.textPrimary }]}>{getLocalizedText(program.name, language, t)}</Text>
                    {program.subtitle && (
                        <Text style={[styles.programSubtitle, { color: colors.textSecondary }]}>{getLocalizedText(program.subtitle, language, t)}</Text>
                    )}

                    {/* Evidence Badge */}
                    {evidenceBadge && (
                        <View style={[styles.evidenceBadge, { backgroundColor: evidenceBadge.color + '15' }]}>
                            <Ionicons name={evidenceBadge.icon as any} size={14} color={evidenceBadge.color} />
                            <Text style={[styles.evidenceText, { color: evidenceBadge.color }]}>
                                {t(`diets_evidence_${program.evidenceLevel}`) || t(`diets.evidence.${program.evidenceLevel}`) || program.evidenceLevel}
                            </Text>
                        </View>
                    )}

                    <View style={styles.statsRow}>
                        <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{program.duration}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('common.days')}</Text>
                        </View>
                        {program.dailyCalories && (
                            <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <Ionicons name="flame-outline" size={20} color={colors.primary} />
                                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{program.dailyCalories}</Text>
                                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('dietPrograms.kcalDay')}</Text>
                            </View>
                        )}
                        {program.difficulty && (
                            <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <Ionicons name="fitness-outline" size={20} color={colors.primary} />
                                <Text style={[styles.statValue, { color: colors.textPrimary, textTransform: 'capitalize' }]}>
                                    {t(`diets_difficulty_${program.difficulty.toLowerCase()}`) || t(`diets.difficulty.${program.difficulty.toLowerCase()}`) || program.difficulty}
                                </Text>
                                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('dietPrograms.level')}</Text>
                            </View>
                        )}
                    </View>

                    {program.description && (
                        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('dietPrograms.about')}</Text>
                            <Text style={[styles.description, { color: colors.textSecondary }]}>{getLocalizedText(program.description, language, t)}</Text>
                        </View>
                    )}

                    {/* How It Works Section */}
                    {howItWorks.length > 0 && (
                        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={styles.sectionHeaderRow}>
                                <Ionicons name="list" size={18} color={colors.primary} />
                                <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginLeft: 8, marginBottom: 0 }]}>
                                    {t('diets.how_it_works')}
                                </Text>
                            </View>
                            {howItWorks.map((item: any, index: number) => (
                                <View key={index} style={styles.howItWorksItem}>
                                    <View style={[styles.bulletPoint, { backgroundColor: colors.primary }]} />
                                    <Text style={[styles.howItWorksText, { color: colors.textSecondary }]}>
                                        {typeof item === 'string' ? item : getLocalizedText(item, language, t)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Daily Tracker Preview */}
                    {dailyTracker.length > 0 && (
                        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={styles.sectionHeaderRow}>
                                <Ionicons name="checkbox" size={18} color={colors.primary} />
                                <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginLeft: 8, marginBottom: 0 }]}>
                                    {t('diets_daily_tracker_preview') || t('diets.daily_tracker_preview') || 'Daily Tracker'}
                                </Text>
                            </View>
                            <Text style={[styles.trackerPreviewHint, { color: colors.textTertiary }]}>
                                {t('diets_tracker_preview_hint') || t('diets.tracker_preview_hint') || 'Track your daily progress with this checklist'}
                            </Text>
                            {dailyTracker.slice(0, 4).map((item: any, index: number) => (
                                <View key={index} style={styles.trackerPreviewItem}>
                                    <View style={[styles.checkboxPreview, { borderColor: colors.border }]} />
                                    <Text style={[styles.trackerPreviewText, { color: colors.textSecondary }]}>
                                        {getLocalizedText(item.label, language, t)}
                                    </Text>
                                </View>
                            ))}
                            {dailyTracker.length > 4 && (
                                <Text style={[styles.moreItems, { color: colors.textTertiary }]}>
                                    +{dailyTracker.length - 4} {t('diets.more_items')}
                                </Text>
                            )}
                        </View>
                    )}

                    {/* Not For Section (Contraindications) */}
                    {notFor.length > 0 && (
                        <View style={[styles.section, { backgroundColor: '#FFF3E0', borderColor: '#FFE0B2' }]}>
                            <View style={styles.sectionHeaderRow}>
                                <Ionicons name="warning" size={18} color="#E65100" />
                                <Text style={[styles.sectionTitle, { color: '#E65100', marginLeft: 8, marginBottom: 0 }]}>
                                    {t('diets.not_for')}
                                </Text>
                            </View>
                            {notFor.map((item: any, index: number) => (
                                <View key={index} style={styles.howItWorksItem}>
                                    <Ionicons name="close-circle" size={14} color="#E65100" style={{ marginRight: 8 }} />
                                    <Text style={[styles.howItWorksText, { color: '#BF360C' }]}>
                                        {typeof item === 'string' ? item : getLocalizedText(item, language, t)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Symptoms Note for Medical diets */}
                    {isMedical && (
                        <View style={[styles.medicalNote, { backgroundColor: '#E8F5E9', borderColor: '#C8E6C9' }]}>
                            <Ionicons name="medical" size={18} color="#2E7D32" />
                            <Text style={[styles.medicalNoteText, { color: '#2E7D32' }]}>
                                {t('diets.medical_note')}
                            </Text>
                        </View>
                    )}

                    {day1?.meals?.length > 0 && (
                        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('dietPrograms.previewDay1')}</Text>
                            {day1.meals.map((meal: any, index: number) => (
                                <View key={index} style={styles.mealItem}>
                                    <View style={[styles.mealIconContainer, { backgroundColor: colors.primary + '20' }]}>
                                        <Ionicons name={getMealIcon(meal.mealType)} size={18} color={colors.primary} />
                                    </View>
                                    <View style={styles.mealInfo}>
                                        <Text style={[styles.mealType, { color: colors.textSecondary }]}>{meal.mealType}</Text>
                                        <Text style={[styles.mealName, { color: colors.textPrimary }]}>{getLocalizedText(meal.name, language, t)}</Text>
                                    </View>
                                    {meal.calories && (
                                        <Text style={[styles.mealCalories, { color: colors.textSecondary }]}>{meal.calories} kcal</Text>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}

                    {program.tags?.length > 0 && (
                        <View style={styles.tagsRow}>
                            {program.tags.map((tag: string) => (
                                <View key={tag} style={[styles.tag, { backgroundColor: colors.primary + '15' }]}>
                                    <Text style={[styles.tagText, { color: colors.primary }]}>
                                        {t(`diets.tags.${tag}`) || tag}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Health Disclaimer + Scientific Sources link */}
                    <HealthDisclaimer style={{ marginTop: 16, marginBottom: 8 }} />
                </View>
            </ScrollView>

            <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                <TouchableOpacity
                    style={[styles.startButton, { backgroundColor: colors.primary, opacity: isStarting ? 0.7 : 1 }]}
                    onPress={isActive ? handleContinue : handleStart}
                    disabled={isStarting}
                >
                    {isStarting ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.startButtonText}>
                            {isActive ? (t('common.continue') || t('dietPrograms.continueProgram') || 'Continue') : t('dietPrograms.startProgram')}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Paywall Modal - Apple IAP with Introductory Offer (3-day free trial) */}
            <PaywallModal
                visible={showPaywall}
                onClose={() => setShowPaywall(false)}
                onSubscribed={async () => {
                    setIsPremiumUser(true);
                    setShowPaywall(false);
                    // FIX: Update subscription cache so ALL screens see the new subscription
                    try {
                        await new Promise(r => setTimeout(r, 1500)); // Wait for backend to process
                        const sub = await ApiService.getCurrentSubscription();
                        if (sub?.hasSubscription) {
                            AsyncStorage.setItem('eatsense_subscription_cache', JSON.stringify(sub)).catch(() => { });
                        }
                    } catch (e) {
                        console.warn('[DietProgramDetail] Failed to refresh subscription after purchase:', e);
                    }
                }}
                featureName={getLocalizedText(program?.name, language)}
            />
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
    headerImage: {
        width: '100%',
        height: 200,
    },
    headerImagePlaceholder: {
        width: '100%',
        height: 200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backButton: {
        position: 'absolute',
        top: 16,
        left: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        padding: 16,
    },
    programName: {
        fontSize: 24,
        fontWeight: '700',
    },
    programSubtitle: {
        fontSize: 16,
        marginTop: 4,
    },
    statsRow: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 12,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        marginTop: 4,
    },
    statLabel: {
        fontSize: 12,
        marginTop: 2,
    },
    section: {
        borderRadius: 12,
        padding: 16,
        marginTop: 16,
        borderWidth: 1,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    description: {
        fontSize: 15,
        lineHeight: 22,
    },
    mealItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
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
    mealCalories: {
        fontSize: 13,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 16,
        gap: 8,
    },
    tag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    tagText: {
        fontSize: 13,
        fontWeight: '500',
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
    },
    startButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    startButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
    },
    // Disclaimer Banner
    disclaimerBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 10,
        marginBottom: 12,
        gap: 10,
    },
    disclaimerText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
    },
    // Evidence Badge
    evidenceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 8,
        gap: 4,
    },
    evidenceText: {
        fontSize: 12,
        fontWeight: '500',
    },
    // How It Works
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    howItWorksItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    bulletPoint: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 6,
        marginRight: 10,
    },
    howItWorksText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
    },
    // Daily Tracker Preview
    trackerPreviewHint: {
        fontSize: 12,
        marginBottom: 10,
        fontStyle: 'italic',
    },
    trackerPreviewItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    checkboxPreview: {
        width: 18,
        height: 18,
        borderRadius: 4,
        borderWidth: 2,
        marginRight: 10,
    },
    trackerPreviewText: {
        fontSize: 14,
    },
    moreItems: {
        fontSize: 12,
        marginTop: 4,
    },
    // Medical Note
    medicalNote: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 10,
        marginTop: 12,
        borderWidth: 1,
        gap: 10,
    },
    medicalNoteText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
    },
});
