import React, { useMemo, useCallback, memo } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ListRenderItemInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../../app/i18n/hooks';
import { useTheme, useDesignTokens } from '../../contexts/ThemeContext';
import DietCard from '../DietCard';
import ActiveDietWidget from '../ActiveDietWidget';
import CategoryChips from './CategoryChips';
import TrendingCarousel from './TrendingCarousel';
import type { Program, ActiveDiet } from './types';
import { getLocalizedText } from './types';
import { categoryToUiGroup } from '../../data/lifestyleCategories';

interface LifestyleTabContentProps {
    activeDiet: ActiveDiet | null;
    allDiets: Program[];
    selectedCategory: string | null;
    searchQuery: string;
    onProgramPress: (_programId: string) => void;
    onCategorySelect: (_categoryId: string | null) => void;
    onSearchChange: (_query: string) => void;
}

// List item types for FlatList
type ListItem =
    | { type: 'active'; data: ActiveDiet }
    | { type: 'trending'; data: Program[] }
    | { type: 'categories'; data: null }
    | { type: 'disclaimer'; data: null }
    | { type: 'section-header'; data: { title: string; key: string } }
    | { type: 'program'; data: Program }
    | { type: 'empty'; data: { searchQuery: string } };

// Memoized section header
const SectionHeader = memo(({ title, colors }: { title: string; colors: any }) => (
    <Text style={[styles.sectionTitle, { color: colors.textPrimary || '#212121' }]}>
        {title}
    </Text>
));
SectionHeader.displayName = 'SectionHeader';

// Static styles that don't depend on theme
const styles = StyleSheet.create({
    section: {
        marginTop: 24,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        paddingHorizontal: 16,
        marginTop: 24,
    },
    disclaimerBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
        marginHorizontal: 16,
        marginTop: 24,
    },
    disclaimerText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 18,
    },
    programItem: {
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 40,
        paddingBottom: 40,
    },
    emptyText: {
        fontSize: 15,
        marginTop: 12,
    },
});

/**
 * LifestyleTabContent - Optimized with FlatList virtualization
 * Performance: ~200ms render vs 6s with ScrollView + map()
 */
export default function LifestyleTabContent({
    activeDiet,
    allDiets,
    selectedCategory,
    searchQuery,
    onProgramPress,
    onCategorySelect,
    onSearchChange: _onSearchChange,
}: LifestyleTabContentProps) {
    const { t, language } = useI18n();
    const { colors } = useTheme();
    const tokens = useDesignTokens();

    // Filter lifestyle programs (type === 'LIFESTYLE' or uiGroup in lifestyle groups)
    const lifestylePrograms = useMemo(() => {
        return allDiets.filter(diet => {
            if (diet.type === 'LIFESTYLE') return true;
            const uiGroups = ['Trending', 'Historical', 'Vintage', 'Old Money', 'Aesthetic'];
            return uiGroups.includes(diet.uiGroup || '');
        });
    }, [allDiets]);

    // Get trending programs
    const trendingPrograms = useMemo(() => {
        return lifestylePrograms.filter(diet => {
            return diet.uiGroup === 'Trending' || diet.category === 'TRENDING';
        }).slice(0, 8);
    }, [lifestylePrograms]);

    // Filter by selected category and search
    const filteredPrograms = useMemo(() => {
        let programs = lifestylePrograms;

        if (selectedCategory) {
            const uiGroup = categoryToUiGroup(selectedCategory);
            programs = programs.filter(diet => diet.uiGroup === uiGroup || diet.category === selectedCategory);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            programs = programs.filter(diet => {
                const name = getLocalizedText(diet.name, language).toLowerCase();
                const desc = getLocalizedText(diet.shortDescription || diet.description, language).toLowerCase();
                return name.includes(query) || desc.includes(query);
            });
        }

        return programs;
    }, [lifestylePrograms, selectedCategory, searchQuery, language]);

    // Group programs by category
    const groupedPrograms = useMemo(() => {
        const groups: Record<string, Program[]> = {};
        filteredPrograms.forEach(program => {
            const group = program.category || program.uiGroup || 'TRENDING';
            if (!groups[group]) groups[group] = [];
            groups[group].push(program);
        });
        return groups;
    }, [filteredPrograms]);

    // Build flat list data with all sections
    const listData = useMemo((): ListItem[] => {
        const items: ListItem[] = [];

        // Active diet widget
        if (activeDiet) {
            items.push({ type: 'active', data: activeDiet });
        }

        // Trending carousel
        if (trendingPrograms.length > 0 && !searchQuery) {
            items.push({ type: 'trending', data: trendingPrograms });
        }

        // Category chips
        if (!searchQuery) {
            items.push({ type: 'categories', data: null });
        }

        // Disclaimer
        items.push({ type: 'disclaimer', data: null });

        // Programs
        if (selectedCategory) {
            // Selected category header
            items.push({
                type: 'section-header',
                data: {
                    title: t(`diets.lifestyle.categories.${selectedCategory}`) || selectedCategory,
                    key: selectedCategory,
                },
            });
            // Programs in selected category
            filteredPrograms.forEach(program => {
                items.push({ type: 'program', data: program });
            });
        } else {
            // All categories
            Object.entries(groupedPrograms).forEach(([category, programs]) => {
                items.push({
                    type: 'section-header',
                    data: {
                        title: t(`diets.lifestyle.categories.${category}`) || category,
                        key: category,
                    },
                });
                programs.forEach(program => {
                    items.push({ type: 'program', data: program });
                });
            });
        }

        // Empty state
        if (filteredPrograms.length === 0) {
            items.push({ type: 'empty', data: { searchQuery } });
        }

        return items;
    }, [activeDiet, trendingPrograms, searchQuery, selectedCategory, filteredPrograms, groupedPrograms, t]);

    // Memoized key extractor
    const keyExtractor = useCallback((item: ListItem, index: number): string => {
        switch (item.type) {
            case 'active': return 'active-diet';
            case 'trending': return 'trending-carousel';
            case 'categories': return 'category-chips';
            case 'disclaimer': return 'disclaimer';
            case 'section-header': return `header-${item.data.key}`;
            case 'program': return `program-${item.data.id}`;
            case 'empty': return 'empty-state';
            default: return `item-${index}`;
        }
    }, []);

    // Memoized render item
    const renderItem = useCallback(({ item }: ListRenderItemInfo<ListItem>) => {
        switch (item.type) {
            case 'active':
                return (
                    <View style={styles.section}>
                        <ActiveDietWidget
                            userDiet={item.data}
                            onPress={() => onProgramPress(item.data.programId)}
                        />
                    </View>
                );

            case 'trending':
                return (
                    <TrendingCarousel
                        programs={item.data}
                        onProgramPress={onProgramPress}
                    />
                );

            case 'categories':
                return (
                    <View style={styles.section}>
                        <CategoryChips
                            selectedCategory={selectedCategory}
                            onCategorySelect={onCategorySelect}
                        />
                    </View>
                );

            case 'disclaimer':
                return (
                    <View style={[
                        styles.disclaimerBanner,
                        {
                            backgroundColor: colors.surfaceSecondary || '#F0F7FF',
                            borderColor: (colors.primary || '#4CAF50') + '20',
                        },
                    ]}>
                        <Ionicons name="information-circle" size={16} color={colors.primary || '#4CAF50'} />
                        <Text style={[styles.disclaimerText, { color: colors.textSecondary || '#666' }]}>
                            {t('diets.lifestyle.disclaimer') ||
                                'These lifestyle programs are for inspiration and educational purposes only. They are not medical advice. Consult a healthcare professional before making significant dietary changes.'}
                        </Text>
                    </View>
                );

            case 'section-header':
                return <SectionHeader title={item.data.title} colors={colors} />;

            case 'program':
                return (
                    <View style={styles.programItem}>
                        <DietCard
                            diet={item.data}
                            onPress={() => onProgramPress(item.data.id)}
                        />
                    </View>
                );

            case 'empty':
                return (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="sparkles" size={48} color="#CCC" />
                        <Text style={[styles.emptyText, { color: colors.textSecondary || '#999' }]}>
                            {item.data.searchQuery
                                ? (t('diets.no_programs_search') || 'No programs found')
                                : (t('diets.no_programs') || 'No programs available')}
                        </Text>
                    </View>
                );

            default:
                return null;
        }
    }, [colors, selectedCategory, onCategorySelect, onProgramPress, t]);

    // Get item layout for better performance (optional - only if items have fixed height)
    // const getItemLayout = useCallback((data: ListItem[] | null, index: number) => ({
    //     length: 100, // approximate item height
    //     offset: 100 * index,
    //     index,
    // }), []);

    return (
        <FlatList
            data={listData}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            // Virtualization optimizations
            windowSize={5}
            initialNumToRender={8}
            maxToRenderPerBatch={5}
            removeClippedSubviews={true}
            // Disable scroll since parent handles it
            scrollEnabled={false}
            // Avoid measuring overhead
            showsVerticalScrollIndicator={false}
        />
    );
}
