import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useI18n } from '../../app/i18n/hooks';
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';
import ApiService from '../services/apiService';
import DietsTabContent from '../components/programs/DietsTabContent';
import LifestyleTabContent from '../features/lifestyles/components/LifestyleTabContent';

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
    { id: 'diets', labelKey: 'diets.tabs.diets', fallback: 'Diets' },
    { id: 'lifestyle', labelKey: 'diets.tabs.lifestyle', fallback: 'Lifestyle' },
];


/**
 * DietsScreen - Main screen for diet programs and meal plans
 */
export default function DietsScreen({ navigation }) {
    const { t } = useI18n();
    const themeContext = useTheme();
    const tokens = useDesignTokens();


    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeDiet, setActiveDiet] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [featuredDiets, setFeaturedDiets] = useState([]);
    const [allDiets, setAllDiets] = useState([]);
    const [selectedType, setSelectedType] = useState(null);
    const [selectedDifficulty, setSelectedDifficulty] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [, setSelectedCategory] = useState(null); // For lifestyle tab
    const [activeTab, setActiveTab] = useState('diets'); // New: main tab state
    const scrollViewRef = useRef(null);

    const loadData = useCallback(async () => {
        // Show content immediately with optimistic loading
        setLoading(false);

        try {
            // For lifestyle tab - data is mostly static, only fetch active diet
            if (activeTab === 'lifestyle') {
                // Don't wait - load in background
                ApiService.getActiveDiet()
                    .then(res => setActiveDiet(res))
                    .catch(() => setActiveDiet(null))
                    .finally(() => setRefreshing(false));
                return;
            }

            // For diets tab - parallel loading
            const filters = {};
            if (selectedType) filters.type = selectedType;
            if (selectedDifficulty) filters.difficulty = selectedDifficulty;
            if (searchQuery) filters.search = searchQuery;

            const [activeRes, recsRes, featuredRes, allRes] = await Promise.all([
                ApiService.getActiveDiet().catch(() => null),
                ApiService.getDietRecommendations().catch(() => []),
                ApiService.getFeaturedDiets().catch(() => []),
                ApiService.getDiets(filters).catch(() => ({ diets: [] })),
            ]);

            setActiveDiet(activeRes || null);
            if (Array.isArray(recsRes)) setRecommendations(recsRes);
            if (Array.isArray(featuredRes)) setFeaturedDiets(featuredRes);
            if (allRes?.diets) setAllDiets(allRes.diets);

        } catch (error) {
            console.error('[DietsScreen] Load error:', error);
        } finally {
            setRefreshing(false);
        }
    }, [selectedType, selectedDifficulty, searchQuery, activeTab]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const onTypeChange = async (type) => {
        setSelectedType(type);
    };

    const onDifficultyChange = (difficulty) => {
        setSelectedDifficulty(difficulty);
    };

    const onSearchChange = (text) => {
        setSearchQuery(text);
    };

    // Handle tab switch - reset scroll and filters
    // Handle tab switch - reset scroll and filters
    const handleTabSwitch = (tabId) => {
        setActiveTab(tabId);
        setSearchQuery(''); // Clear search
        setSelectedType(null); // Clear type filter
        setSelectedDifficulty(null); // Clear difficulty filter
        setSelectedCategory(null); // Clear lifestyle category
        // Scroll to top
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ y: 0, animated: true });
        }
    };

    const handleProgramPress = (programId) => {
        // Check if this is a lifestyle program by checking if activeTab is 'lifestyle'
        // This is a simple approach - could be improved by checking actual program data
        if (activeTab === 'lifestyle') {
            navigation.navigate('LifestyleDetail', { id: programId });
        } else {
            navigation.navigate('DietProgramDetail', { dietId: programId });
        }
    };

    const styles = useMemo(() => {
        const colors = themeContext?.colors || {};
        return createStyles(tokens, colors);
    }, [tokens, themeContext?.colors]);

    // Show skeleton only on initial load when we have no data
    if (loading && allDiets.length === 0) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>{t('diets.title') || 'Diets'}</Text>
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
                    <Text style={styles.headerTitle}>{t('diets.title') || 'Diets'}</Text>
                    <Text style={styles.headerSubtitle}>
                        {t('diets.subtitle') || 'Find the perfect nutrition plan for you'}
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

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={[styles.searchInputContainer, { backgroundColor: tokens.colors?.surface, borderColor: tokens.colors?.border }]}>
                        <Ionicons name="search" size={20} color={tokens.colors?.textTertiary || '#999'} />
                        <TextInput
                            style={[styles.searchInput, { color: tokens.colors?.textPrimary }]}
                            placeholder={
                                activeTab === 'lifestyle'
                                    ? (t('lifestyles.search.placeholder') || 'Search lifestyle programs...')
                                    : (t('diets.search_placeholder') || 'Search diets...')
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
                    />
                ) : (
                    <LifestyleTabContent
                        searchQuery={searchQuery}
                        onSearchChange={onSearchChange}
                        onProgramPress={handleProgramPress}
                    />
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
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
    // Main Tabs (Diets / Lifestyle)
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

    // Recommendations
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

    // Featured
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

    // Filters
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

    // Search
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

    // Difficulty Filter
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

    // Historical Section
    historicalSection: {
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
        borderRadius: 16,
        padding: 16,
    },
    historicalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    historicalHeaderText: {
        marginLeft: 10,
    },
    historicalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#4E342E',
    },
    historicalSubtitle: {
        fontSize: 12,
        color: '#795548',
        marginTop: 2,
    },
    disclaimerBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(121, 85, 72, 0.1)',
        padding: 10,
        borderRadius: 8,
        marginBottom: 12,
        gap: 8,
    },
    disclaimerText: {
        flex: 1,
        fontSize: 12,
        color: '#795548',
        fontStyle: 'italic',
    },
    historicalCard: {
        width: 160,
        height: 140,
        borderRadius: 12,
        padding: 16,
        marginRight: 12,
        justifyContent: 'space-between',
    },
    historicalName: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700',
        marginTop: 8,
        marginBottom: 4,
    },
    historicalDesc: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 11,
        marginTop: 4,
        lineHeight: 15,
        flex: 1,
    },
    historicalMeta: {
        position: 'absolute',
        bottom: 14,
        left: 14,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    historicalMetaText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '600',
    },

    // Diets List
    dietsList: {
        paddingHorizontal: 16,
        marginTop: 8,
        gap: 12,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 40,
    },
    emptyText: {
        fontSize: 15,
        color: tokens.colors?.textSecondary || '#999',
        marginTop: 12,
    },
});
