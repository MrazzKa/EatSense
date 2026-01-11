import React, { useMemo } from 'react';
import {
    View,
    Text,

    StyleSheet,
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

/**
 * LifestyleTabContent - Content for the "Lifestyle" tab
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
            // Filter by type or uiGroup
            if (diet.type === 'LIFESTYLE') return true;
            // Also include programs with lifestyle uiGroups
            const uiGroups = ['Trending', 'Historical', 'Vintage', 'Old Money', 'Aesthetic'];
            return uiGroups.includes(diet.uiGroup || '');
        });
    }, [allDiets]);

    // Get trending programs (uiGroup === 'Trending' or category === 'TRENDING')
    const trendingPrograms = useMemo(() => {
        return lifestylePrograms.filter(diet => {
            return diet.uiGroup === 'Trending' || diet.category === 'TRENDING';
        }).slice(0, 8); // Limit to 8
    }, [lifestylePrograms]);

    // Filter by selected category
    const filteredPrograms = useMemo(() => {
        let programs = lifestylePrograms;

        // Filter by category
        if (selectedCategory) {
            const uiGroup = categoryToUiGroup(selectedCategory);
            programs = programs.filter(diet => diet.uiGroup === uiGroup || diet.category === selectedCategory);
        }

        // Filter by search query
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

    // Group programs by category/uiGroup
    const groupedPrograms = useMemo(() => {
        const groups: Record<string, Program[]> = {};
        filteredPrograms.forEach(program => {
            const group = program.category || program.uiGroup || 'TRENDING';
            if (!groups[group]) groups[group] = [];
            groups[group].push(program);
        });
        return groups;
    }, [filteredPrograms]);

    const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

    return (
        <View>
            {/* Active Lifestyle Widget */}
            {activeDiet && (
                <View style={styles.section}>
                    <ActiveDietWidget
                        userDiet={activeDiet}
                        onPress={() => onProgramPress(activeDiet.programId)}
                    />
                </View>
            )}

            {/* Trending Carousel */}
            {trendingPrograms.length > 0 && !searchQuery && (
                <TrendingCarousel
                    programs={trendingPrograms}
                    onProgramPress={onProgramPress}
                />
            )}

            {/* Category Chips */}
            {!searchQuery && (
                <View style={styles.section}>
                    <CategoryChips
                        selectedCategory={selectedCategory}
                        onCategorySelect={onCategorySelect}
                    />
                </View>
            )}

            {/* Disclaimer Banner */}
            <View style={styles.section}>
                <View style={styles.disclaimerBanner}>
                    <Ionicons name="information-circle" size={16} color={colors.primary || '#4CAF50'} />
                    <Text style={styles.disclaimerText}>
                        {t('diets.lifestyle.disclaimer') ||
                            'These lifestyle programs are for inspiration and educational purposes only. They are not medical advice. Consult a healthcare professional before making significant dietary changes.'}
                    </Text>
                </View>
            </View>

            {/* Catalog by Category */}
            {selectedCategory ? (
                // Show programs for selected category
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        {t(`diets.lifestyle.categories.${selectedCategory}`) || selectedCategory}
                    </Text>
                    <View style={styles.programsList}>
                        {filteredPrograms.map((program) => (
                            <DietCard
                                key={program.id}
                                diet={program}
                                onPress={() => onProgramPress(program.id)}
                            />
                        ))}
                    </View>
                </View>
            ) : (
                // Show all programs grouped by category
                Object.entries(groupedPrograms).map(([category, programs]) => (
                    <View key={category} style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            {t(`diets.lifestyle.categories.${category}`) || category}
                        </Text>
                        <View style={styles.programsList}>
                            {programs.map((program) => (
                                <DietCard
                                    key={program.id}
                                    diet={program}
                                    onPress={() => onProgramPress(program.id)}
                                />
                            ))}
                        </View>
                    </View>
                ))
            )}

            {/* Empty State */}
            {filteredPrograms.length === 0 && (
                <View style={styles.emptyContainer}>
                    <Ionicons name="sparkles" size={48} color="#CCC" />
                    <Text style={styles.emptyText}>
                        {searchQuery
                            ? (t('diets.no_programs_search') || 'No programs found')
                            : (t('diets.no_programs') || 'No programs available')}
                    </Text>
                </View>
            )}
        </View>
    );
}

const createStyles = (tokens: any, colors: any) => StyleSheet.create({
    section: {
        marginTop: 24,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary || '#212121',
        marginBottom: 12,
    },
    disclaimerBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.surfaceSecondary || '#F0F7FF',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.primary + '20' || '#4CAF5020',
        gap: 8,
    },
    disclaimerText: {
        flex: 1,
        fontSize: 12,
        color: colors.textSecondary || '#666',
        lineHeight: 18,
    },
    programsList: {
        gap: 12,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 40,
        paddingBottom: 40,
    },
    emptyText: {
        fontSize: 15,
        color: colors.textSecondary || '#999',
        marginTop: 12,
    },
});
