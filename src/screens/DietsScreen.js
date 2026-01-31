import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useI18n } from '../../app/i18n/hooks';
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';
import ApiService from '../services/apiService';
import DietsTabContent from '../components/programs/DietsTabContent';
import LifestyleTabContent from '../features/lifestyles/components/LifestyleTabContent';
import SuggestProgramCard from '../components/programs/SuggestProgramCard';
import { useProgramProgress, useRefreshProgressOnFocus } from '../stores/ProgramProgressStore';
import seedBundle from '../../assets/dietsBundleSeed.json';
import { trialService } from '../services/trialService';
import PremiumLockModal from '../components/common/PremiumLockModal';
import { isFreeDiet } from '../config/freeContent';

// Cache TTL for bundle data (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

// In-memory cache for instant access (faster than AsyncStorage)
let memoryCache = null;
let memoryCacheTimestamp = 0;

// Helper functions for caching
const loadFromCache = async (key) => {
    // Step 1: Check in-memory cache first (fastest, 0ms)
    if (memoryCache && Date.now() - memoryCacheTimestamp < CACHE_TTL) {
        return memoryCache;
    }

    // Step 2: Check AsyncStorage (slower, ~10-50ms)
    try {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL) {
                // Update memory cache for next time
                memoryCache = data;
                memoryCacheTimestamp = timestamp;
                return data;
            }
        }
    } catch (e) {
        console.warn('Cache read error:', e);
    }
    return null;
};

const saveToCache = async (key, data) => {
    // Update memory cache immediately (0ms)
    memoryCache = data;
    memoryCacheTimestamp = Date.now();

    // Save to AsyncStorage in background (non-blocking)
    try {
        await AsyncStorage.setItem(key, JSON.stringify({
            data,
            timestamp: Date.now(),
        }));
    } catch (e) {
        console.warn('Cache write error:', e);
    }
};

// Skeleton loader for fast perceived loading
const DietsSkeleton = React.memo(({ colors }) => (
    <View style={skeletonStyles.container}>
        {/* Tab skeleton */}
        <View style={[skeletonStyles.tab, { backgroundColor: colors?.surfaceSecondary || '#F5F5F5' }]} />

        {/* Cards skeleton */}
        {[1, 2, 3, 4].map((i) => (
            <View
                key={i}
                style={[skeletonStyles.card, { backgroundColor: colors?.surfaceSecondary || '#F5F5F5' }]}
            >
                <View style={[skeletonStyles.image, { backgroundColor: colors?.border || '#E0E0E0' }]} />
                <View style={skeletonStyles.content}>
                    <View style={[skeletonStyles.title, { backgroundColor: colors?.border || '#E0E0E0' }]} />
                    <View style={[skeletonStyles.text, { backgroundColor: colors?.border || '#E0E0E0' }]} />
                </View>
            </View>
        ))}
    </View>
));
DietsSkeleton.displayName = 'DietsSkeleton';

// Static skeleton styles
const skeletonStyles = StyleSheet.create({
    container: {
        padding: 16,
    },
    tab: {
        height: 44,
        borderRadius: 22,
        marginBottom: 16,
    },
    card: {
        height: 160,
        borderRadius: 16,
        marginBottom: 12,
        flexDirection: 'row',
        padding: 12,
    },
    image: {
        width: 100,
        height: '100%',
        borderRadius: 12,
    },
    content: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    title: {
        height: 20,
        borderRadius: 4,
        marginBottom: 8,
        width: '70%',
    },
    text: {
        height: 14,
        borderRadius: 4,
        width: '90%',
    },
});

// Main tabs: "Диеты" and "Стиль жизни"
const MAIN_TABS = [
    { id: 'diets', labelKey: 'diets_tabs_diets', fallback: 'Diets' },
    { id: 'lifestyle', labelKey: 'diets_tabs_lifestyle', fallback: 'Lifestyle' },
];

/**
 * DietsScreen - Main screen for diet programs and meal plans
 */
export default function DietsScreen({ navigation }) {
    const { t, language } = useI18n();
    const themeContext = useTheme();
    const tokens = useDesignTokens();

    // Get active program from store (real-time updates)
    const { activeProgram, loadProgress } = useProgramProgress();
    useRefreshProgressOnFocus(); // Refresh on focus

    // FIX: Load progress when Diets screen mounts (lazy loading - only when needed)
    // This ensures program data is available for the tracker
    useEffect(() => {
        if (!activeProgram) {
            loadProgress().catch(() => {
                // Silent fail - tracker will just not show if no program
            });
        }
    }, [activeProgram, loadProgress]);

    // Unified cache key for bundle data
    const BUNDLE_CACHE_KEY = 'diets_bundle_cache_v1';

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeDiet, setActiveDiet] = useState(null); // Bundle format for DietsTabContent
    const [recommendations, setRecommendations] = useState([]);
    const [featuredDiets, setFeaturedDiets] = useState([]);
    const [allDiets, setAllDiets] = useState([]);
    const [selectedType, setSelectedType] = useState(null);
    const [selectedDifficulty, setSelectedDifficulty] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [, setSelectedCategory] = useState(null); // For lifestyle tab
    const [activeTab, setActiveTab] = useState('diets'); // New: main tab state
    const scrollViewRef = useRef(null);

    // Lifestyle state
    const [lifestylePrograms, setLifestylePrograms] = useState([]);
    const [featuredLifestyles, setFeaturedLifestyles] = useState([]);
    const [isLoadingLifestyles, setIsLoadingLifestyles] = useState(false);
    const [subscription, setSubscription] = useState(null); // Access control

    // NEW: Trial & Lock State
    const [lockModalVisible, setLockModalVisible] = useState(false);
    const [selectedProgramForUnlock, setSelectedProgramForUnlock] = useState(null);
    // Force update state to re-render when trial starts
    const [, setTick] = useState(0);

    // Track if store has loaded at least once - prevents clearing activeDiet from bundle prematurely
    const storeHasLoadedRef = useRef(false);

    // Initialize trial service on mount
    useEffect(() => {
        trialService.init();
    }, []);

    // NEW: Check if program is locked
    const checkLockStatus = useCallback((programId) => {
        // 1. Check free list first
        if (isFreeDiet(programId)) return false;

        // 2. If user has active subscription, NEVER lock
        if (subscription?.hasSubscription) return false;

        // 3. If user has active customized/started this program (activeProgram), NEVER lock
        // This ensures if they started it, they keep it.
        // Also check if activeProgram matches the ID?
        // Ideally if they are running it, it's unlocked.
        if (activeProgram?.programId === programId) return false;

        // 4. Check local soft trial
        const isTrial = trialService.isTrialActive(programId);
        if (isTrial) return false;

        // 5. Otherwise Locked
        return true;
    }, [subscription, activeProgram]);

    // Load data using bundle API - OPTIMIZED for instant loading
    const loadData = useCallback(async (forceRefresh = false) => {
        let isMounted = true;

        try {
            let hasCache = false;

            // Step 1: Try to show cached data immediately for instant UI
            if (!forceRefresh) {
                const cached = memoryCache && Date.now() - memoryCacheTimestamp < CACHE_TTL
                    ? memoryCache
                    : await loadFromCache(BUNDLE_CACHE_KEY);

                if (cached && isMounted) {
                    setFeaturedDiets(cached.featuredDiets || []);
                    setFeaturedLifestyles(cached.featuredLifestyles || []);
                    setAllDiets(cached.allDiets || []);
                    setLifestylePrograms(cached.allLifestyles || []);
                    setActiveDiet(cached.activeProgram || null);
                    setLoading(false);
                    hasCache = true;
                } else {
                    if (isMounted && seedBundle) {
                        setFeaturedDiets(seedBundle.featuredDiets || []);
                        setFeaturedLifestyles(seedBundle.featuredLifestyles || []);
                        setAllDiets(seedBundle.allDiets || []);
                        setLifestylePrograms(seedBundle.allLifestyles || []);
                        setActiveDiet(seedBundle.activeProgram || null);
                        setLoading(false);
                    }
                }
            }

            // Step 2: Fetch fresh data
            const fetchFreshData = async () => {
                try {
                    const bundle = await ApiService.getDietsBundle(language);
                    if (isMounted && bundle) {
                        setFeaturedDiets(bundle.featuredDiets || []);
                        setFeaturedLifestyles(bundle.featuredLifestyles || []);
                        setAllDiets(bundle.allDiets || []);
                        setLifestylePrograms(bundle.allLifestyles || []);
                        setActiveDiet(bundle.activeProgram || null);
                        setLoading(false);
                        setRefreshing(false);
                        setIsLoadingLifestyles(false);
                        await saveToCache(BUNDLE_CACHE_KEY, bundle);
                    }
                } catch (err) {
                    console.error('[DietsScreen] Bundle fetch error:', err);
                    if (!hasCache && isMounted) {
                        setLoading(false);
                        setRefreshing(false);
                    }
                }
            };

            // Step 3: Fetch recommendations
            const fetchRecommendations = async () => {
                try {
                    const recsRes = await ApiService.getDietRecommendations();
                    if (isMounted && Array.isArray(recsRes)) {
                        setRecommendations(recsRes);
                    }
                } catch (e) {
                    console.warn('[DietsScreen] Recommendations fetch failed:', e);
                }
            };

            if (hasCache) {
                Promise.all([fetchFreshData(), fetchRecommendations()]).catch(() => { });
            } else {
                await Promise.all([fetchFreshData(), fetchRecommendations()]);
            }

            // Step 4: Fetch subscription status
            ApiService.getCurrentSubscription()
                .then(sub => {
                    if (isMounted) setSubscription(sub);
                })
                .catch(err => console.warn('[DietsScreen] Subscription fetch failed:', err));

        } catch (error) {
            console.error('[DietsScreen] Load error:', error);
            setLoading(false);
            setRefreshing(false);
        }

        return () => {
            isMounted = false;
        };
    }, [language]);

    // Update activeDiet from store when activeProgram changes
    useEffect(() => {
        if (activeProgram !== undefined) {
            storeHasLoadedRef.current = true;
        }

        if (activeProgram && activeProgram.type === 'diet') {
            const programName = activeProgram.programName || 'Diet';
            const nameLocalized = typeof programName === 'object'
                ? programName
                : { [language]: programName, en: programName, ru: programName, kk: programName, fr: programName };
            const nameString = typeof programName === 'string'
                ? programName
                : (programName[language] || programName['en'] || programName['ru'] || programName['kk'] || programName['fr'] || Object.values(programName)[0] || 'Diet');

            setActiveDiet({
                programId: activeProgram.programId,
                currentDay: activeProgram.currentDayIndex || 1,
                totalDays: activeProgram.durationDays || 0,
                program: {
                    id: activeProgram.programId,
                    name: nameString,
                    nameLocalized: nameLocalized,
                    type: 'diet',
                    color: '#4CAF50',
                },
                progress: {
                    percentComplete: activeProgram.durationDays > 0
                        ? Math.round((activeProgram.currentDayIndex / activeProgram.durationDays) * 100)
                        : 0,
                    totalDays: activeProgram.durationDays,
                    daysCompleted: activeProgram.currentDayIndex,
                },
                todayPlan: activeProgram.todayPlan || [],
                dailyLogs: activeProgram.todayLog ? [{
                    breakfastLogged: false,
                    lunchLogged: false,
                    dinnerLogged: false,
                }] : [],
            });
        } else if (activeProgram && activeProgram.type === 'lifestyle') {
            setActiveDiet(null);
        } else if (!activeProgram && storeHasLoadedRef.current) {
            setActiveDiet(null);
        }
    }, [activeProgram, language]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await AsyncStorage.removeItem('diets_bundle_cache_v1');
        } catch (e) {
            console.warn('[DietsScreen] Failed to clear cache:', e);
        }
        await loadData(true);
    }, [loadData]);

    const onTypeChange = async (type) => {
        setSelectedType(type);
    };

    const onDifficultyChange = (difficulty) => {
        setSelectedDifficulty(difficulty);
    };

    const onSearchChange = (text) => {
        setSearchQuery(text);
    };

    const handleTabSwitch = (tabId) => {
        setActiveTab(tabId);
        setSearchQuery('');
        setSelectedType(null);
        setSelectedDifficulty(null);
        setSelectedCategory(null);
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ y: 0, animated: true });
        }
    };

    const handleProgramPress = (programId) => {
        // Check lock status
        if (checkLockStatus(programId)) {
            setSelectedProgramForUnlock(programId);
            setLockModalVisible(true);
            return;
        }

        if (activeTab === 'lifestyle') {
            navigation.navigate('LifestyleDetail', { id: programId });
        } else {
            navigation.navigate('DietProgramDetail', { dietId: programId });
        }
    };

    // NEW: Unlock handler
    const handleUnlock = async () => {
        if (selectedProgramForUnlock) {
            const success = await trialService.startTrial(selectedProgramForUnlock);
            if (success) {
                setLockModalVisible(false);
                setTick(t => t + 1); // Force re-render/re-check lock status

                setTimeout(() => {
                    if (activeTab === 'lifestyle') {
                        navigation.navigate('LifestyleDetail', { id: selectedProgramForUnlock });
                    } else {
                        navigation.navigate('DietProgramDetail', { dietId: selectedProgramForUnlock });
                    }
                }, 100);
            }
        }
    };

    const styles = useMemo(() => {
        const colors = themeContext?.colors || {};
        return createStyles(tokens, colors);
    }, [tokens, themeContext?.colors]);

    if (loading && allDiets.length === 0) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>{t('diets_title') || 'Diets'}</Text>
                </View>
                <DietsSkeleton colors={themeContext?.colors} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                ref={scrollViewRef}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>{t('diets_title') || 'Diets'}</Text>
                    <Text style={styles.headerSubtitle}>
                        {t('diets_subtitle') || 'Find the perfect nutrition plan for you'}
                    </Text>
                </View>

                {/* Main Tabs: Диеты / Стиль жизни */}
                <View style={styles.tabsContainer}>
                    {MAIN_TABS.map((tab) => (
                        <TouchableOpacity
                            key={tab.id}
                            style={[
                                styles.tabButton,
                                activeTab === tab.id && styles.tabButtonActive,
                            ]}
                            onPress={() => handleTabSwitch(tab.id)}
                        >
                            <Text style={[
                                styles.tabButtonText,
                                activeTab === tab.id && styles.tabButtonTextActive,
                            ]}>
                                {t(tab.labelKey) || tab.fallback}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Suggest Program Card */}
                {!searchQuery && (
                    <View style={styles.suggestSectionTop}>
                        <SuggestProgramCard type={activeTab === 'lifestyle' ? 'lifestyle' : 'diet'} />
                    </View>
                )}

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={[styles.searchInputContainer, { backgroundColor: tokens.colors?.surface, borderColor: tokens.colors?.border }]}>
                        <Ionicons name="search" size={20} color={tokens.colors?.textTertiary || '#999'} />
                        <TextInput
                            style={[styles.searchInput, { color: tokens.colors?.textPrimary }]}
                            placeholder={
                                activeTab === 'lifestyle'
                                    ? (t('lifestyles.search.placeholder') || 'Search lifestyle programs...')
                                    : (t('diets_search_placeholder') || 'Search diets...')
                            }
                            placeholderTextColor={tokens.colors?.textTertiary || '#999'}
                            value={searchQuery}
                            onChangeText={onSearchChange}
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={20} color={tokens.colors?.textTertiary || '#999'} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Tab Content */}
                <View style={[styles.tabContentWrapper, { minHeight: 400 }]}>
                    {activeTab === 'diets' ? (
                        <DietsTabContent
                            activeDiet={activeDiet}
                            recommendations={recommendations}
                            featuredDiets={featuredDiets}
                            allDiets={allDiets}
                            selectedType={selectedType}
                            selectedDifficulty={selectedDifficulty}
                            searchQuery={searchQuery}
                            onProgramPress={handleProgramPress}
                            onTypeChange={onTypeChange}
                            onDifficultyChange={onDifficultyChange}
                            onSearchChange={onSearchChange}
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            checkLockStatus={checkLockStatus}
                        />
                    ) : (
                        <LifestyleTabContent
                            searchQuery={searchQuery}
                            onSearchChange={onSearchChange}
                            onProgramPress={handleProgramPress}
                            programs={lifestylePrograms}
                            featuredPrograms={featuredLifestyles}
                            isLoading={isLoadingLifestyles}
                            activeProgram={activeProgram && activeProgram.type === 'lifestyle' ? {
                                diet: {
                                    id: activeProgram.programId,
                                    name: activeProgram.programName || 'Lifestyle',
                                    color: '#9C27B0',
                                },
                                type: 'lifestyle',
                                streak: activeProgram.streak?.current || 0,
                                todayProgress: {
                                    completed: activeProgram.todayLog?.completedCount || 0,
                                    total: activeProgram.todayLog?.totalCount || 0,
                                },
                                currentDay: activeProgram.currentDayIndex,
                                totalDays: activeProgram.durationDays,
                                daysLeft: activeProgram.daysLeft,
                            } : null}
                            subscription={subscription}
                        />
                    )}
                </View>

                {/* Loading indicator for lifestyles */}
                {(isLoadingLifestyles && activeTab === 'lifestyle') && (
                    <View style={styles.loadingMoreContainer}>
                        <ActivityIndicator size="small" color={tokens.colors?.primary || '#4CAF50'} />
                        <Text style={[styles.loadingMoreText, { color: tokens.colors?.textSecondary }]}>
                            {t('lifestyles.loading_more') || 'Loading more programs...'}
                        </Text>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Premium Lock Modal */}
            <PremiumLockModal
                visible={lockModalVisible}
                onClose={() => setLockModalVisible(false)}
                onUnlock={handleUnlock}
            />
        </SafeAreaView>
    );
}

const createStyles = (tokens, _colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: tokens.colors?.background || '#FAFAFA',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: tokens.colors?.background || '#FAFAFA',
    },
    loadingMoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 8,
    },
    loadingMoreText: {
        fontSize: 14,
    },
    header: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: tokens.colors?.textPrimary || '#212121',
    },
    headerSubtitle: {
        fontSize: 14,
        color: tokens.colors?.textSecondary || '#666',
        marginTop: 4,
    },
    // Main Tabs
    tabsContainer: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
        backgroundColor: tokens.colors?.surfaceSecondary || '#F0F0F0',
        borderRadius: 12,
        padding: 4,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    tabButtonActive: {
        backgroundColor: tokens.colors?.primary || '#4CAF50',
    },
    tabButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: tokens.colors?.textSecondary || '#666',
    },
    tabButtonTextActive: {
        color: '#FFF',
    },
    section: {
        marginTop: 24,
        paddingHorizontal: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: tokens.colors?.textPrimary || '#212121',
        marginLeft: 6,
    },
    sectionDescription: {
        fontSize: 13,
        color: tokens.colors?.textSecondary || '#666',
        marginBottom: 12,
    },
    recommendationCard: {
        width: 200,
        backgroundColor: tokens.colors?.surface || '#FFF',
        borderRadius: 12,
        padding: 14,
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    matchBadge: {
        backgroundColor: tokens.colors?.primary || '#4CAF50',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        marginBottom: 8,
    },
    matchText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
    },
    recName: {
        fontSize: 15,
        fontWeight: '600',
        color: tokens.colors?.textPrimary || '#212121',
        marginBottom: 4,
    },
    recReason: {
        fontSize: 12,
        color: tokens.colors?.textSecondary || '#666',
        lineHeight: 16,
    },
    featuredCard: {
        width: 180,
        borderRadius: 14,
        padding: 14,
        marginRight: 12,
    },
    featuredName: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
        marginTop: 8,
        marginBottom: 4,
    },
    featuredDesc: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 12,
        lineHeight: 16,
        marginBottom: 8,
    },
    featuredMeta: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    featuredMetaText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '600',
    },
    filtersRow: {
        marginTop: 12,
        marginBottom: 12,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: tokens.colors?.surfaceSecondary || '#F0F0F0',
        marginRight: 8,
    },
    filterChipActive: {
        backgroundColor: tokens.colors?.primary || '#4CAF50',
    },
    filterChipText: {
        fontSize: 13,
        color: tokens.colors?.textSecondary || '#666',
        marginLeft: 6,
        fontWeight: '500',
    },
    filterChipTextActive: {
        color: '#FFF',
    },
    searchContainer: {
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        paddingVertical: 0,
    },
    difficultyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        flexWrap: 'wrap',
        gap: 6,
    },
    filterLabel: {
        fontSize: 13,
        marginRight: 8,
    },
    difficultyChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        backgroundColor: tokens.colors?.surfaceSecondary || '#F0F0F0',
    },
    difficultyChipActive: {
        backgroundColor: tokens.colors?.primary || '#4CAF50',
    },
    difficultyChipText: {
        fontSize: 12,
        fontWeight: '500',
    },
});
