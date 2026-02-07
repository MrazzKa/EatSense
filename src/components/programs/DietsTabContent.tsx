import React, { useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../../app/i18n/hooks';
import { useTheme, useDesignTokens } from '../../contexts/ThemeContext';
import DietCard from '../DietCard';
import ActiveDietWidget from '../ActiveDietWidget';
import type { Program, Recommendation, ActiveDiet } from './types';
import { getLocalizedText } from './types';

const DIETS_UI_GROUPS: Array<{ id: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string; labelKey: string }> = [
    { id: 'Popular', icon: 'star', color: '#FFB300', labelKey: 'diets_groups_popular' },
    { id: 'Health', icon: 'heart', color: '#4CAF50', labelKey: 'diets_groups_health' },
    { id: 'Weight loss', icon: 'trending-down', color: '#2196F3', labelKey: 'diets_groups_weight_loss' },
    { id: 'Performance', icon: 'fitness', color: '#F44336', labelKey: 'diets_groups_performance' },
    { id: 'Medical', icon: 'medical', color: '#009688', labelKey: 'diets_groups_medical' },
    { id: 'Seasonal', icon: 'calendar', color: '#FF9800', labelKey: 'diets_groups_seasonal' },
];

interface DietsTabContentProps {
    activeDiet: ActiveDiet | null;
    recommendations: Recommendation[];
    featuredDiets: Program[];
    allDiets: Program[];
    selectedType: string | null;
    selectedDifficulty: string | null;
    searchQuery: string;
    onProgramPress: (_programId: string) => void;
    onTypeChange: (_type: string | null) => void;
    onDifficultyChange: (_difficulty: string | null) => void;
    onSearchChange: (_query: string) => void;
    refreshing?: boolean;
    onRefresh?: () => void;
    checkLockStatus?: (_id: string) => boolean; // Added checkLockStatus prop
}

/**
 * DietsTabContent - Content for the "Diets" tab
 */
export default function DietsTabContent({
    activeDiet,
    recommendations,
    featuredDiets,
    allDiets,
    selectedType,
    selectedDifficulty,
    searchQuery,
    onProgramPress,
    onTypeChange,
    onDifficultyChange,
    onSearchChange: _onSearchChange,
    refreshing: _refreshing = false,
    onRefresh: _onRefresh,
    checkLockStatus, // Destructure new prop
}: DietsTabContentProps) {
    const { t, language } = useI18n();
    const { colors } = useTheme();
    const tokens = useDesignTokens();

    const typeFilters: Array<{ id: string | null; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = [
        { id: null, label: t('diets_all') || 'All', icon: 'apps' },
        { id: 'WEIGHT_LOSS', label: t('diets_weight_loss') || 'Weight Loss', icon: 'trending-down' },
        { id: 'HEALTH', label: t('diets_health') || 'Health', icon: 'heart' },
        { id: 'SPORTS', label: t('diets_sports') || 'Sports', icon: 'fitness' },
        { id: 'MEDICAL', label: t('diets_medical') || 'Medical', icon: 'medical' },
    ];
    // FIX: Map SPORTS to PERFORMANCE for backend (if backend uses PERFORMANCE instead of SPORTS)
    // Backend enum has SPORTS, so this should work directly

    const difficultyFilters = [
        { id: null, label: t('diets_all') || 'All' },
        { id: 'EASY', label: t('diets_difficulty_easy') || 'Easy' },
        { id: 'MODERATE', label: t('diets_difficulty_moderate') || 'Moderate' },
        { id: 'HARD', label: t('diets_difficulty_hard') || 'Hard' },
    ];

    // Filter diets by uiGroup (only diet groups) and exclude lifestyle programs
    // FIX: Apply all filters - type, difficulty, search query
    // Filter diets by uiGroup (only diet groups) and exclude lifestyle programs
    // FIX: Apply all filters - type, difficulty, search query
    const filteredDiets = useMemo(() => {
        let diets = allDiets.filter(diet => {
            // FIX: Exclude lifestyle programs - they should only appear in Lifestyle tab
            // Lifestyle programs have type 'LIFESTYLE' (uppercase enum from Prisma)
            // Also check category as fallback
            if (diet.type === 'LIFESTYLE' || diet.type === 'lifestyle' || diet.category === 'lifestyle') {
                return false;
            }
            const group = diet.uiGroup || 'Popular';
            return DIETS_UI_GROUPS.some(g => g.id === group);
        });

        // FIX: Apply type filter (WEIGHT_LOSS, HEALTH, SPORTS, MEDICAL)
        if (selectedType) {
            diets = diets.filter(diet => {
                // Normalize type comparison - handle both uppercase and lowercase
                const dietType = (diet.type || '').toUpperCase();
                const filterType = selectedType.toUpperCase();
                return dietType === filterType;
            });
        }

        // FIX: Apply difficulty filter (EASY, MODERATE, HARD)
        if (selectedDifficulty) {
            diets = diets.filter(diet => {
                // Normalize difficulty comparison
                const dietDifficulty = (diet.difficulty || '').toUpperCase();
                const filterDifficulty = selectedDifficulty.toUpperCase();
                return dietDifficulty === filterDifficulty;
            });
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            diets = diets.filter(diet => {
                const name = getLocalizedText(diet.name, language, t).toLowerCase();
                const desc = getLocalizedText(diet.shortDescription || diet.description, language, t).toLowerCase();
                return name.includes(query) || desc.includes(query);
            });
        }

        return diets;
    }, [allDiets, selectedType, selectedDifficulty, searchQuery, language, t]);

    // Group diets by uiGroup
    const groupedDiets = useMemo(() => {
        const groups: Record<string, Program[]> = {};
        filteredDiets.forEach(diet => {
            const group = diet.uiGroup || 'Popular';
            if (!groups[group]) groups[group] = [];
            groups[group].push(diet);
        });
        return groups;
    }, [filteredDiets]);

    const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

    return (
        <View>
            {/* Active Diet Widget */}
            {/* FIX: Only show activeDiet if it's a diet (not lifestyle) */}
            {/* Lifestyle trackers should only appear in LifestyleTabContent */}
            {/* Check both program.type and ensure it's not lifestyle */}
            {activeDiet &&
                activeDiet.program?.type !== 'LIFESTYLE' &&
                activeDiet.program?.type !== 'lifestyle' && (
                    <View style={styles.section}>
                        <ActiveDietWidget
                            userDiet={activeDiet}
                            onPress={() => onProgramPress(activeDiet.programId)}
                        />
                    </View>
                )}

            {/* FIX: Show informational banner when user has active lifestyle program */}
            {/* This helps user understand their tracker is in Lifestyle tab, not here */}
            {activeDiet &&
                (activeDiet.program?.type === 'LIFESTYLE' ||
                    activeDiet.program?.type === 'lifestyle') && (
                    <View style={styles.section}>
                        <TouchableOpacity
                            style={[styles.lifestyleBanner, { backgroundColor: (colors.primary || '#4CAF50') + '15' }]}
                            onPress={() => onProgramPress(activeDiet.programId)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.lifestyleBannerIcon}>
                                <Ionicons name="sparkles" size={24} color={colors.primary || '#4CAF50'} />
                            </View>
                            <View style={styles.lifestyleBannerContent}>
                                <Text style={[styles.lifestyleBannerTitle, { color: colors.textPrimary || '#000' }]}>
                                    {getLocalizedText(activeDiet.program?.name, language, t)}
                                </Text>
                                <Text style={[styles.lifestyleBannerSubtitle, { color: colors.textSecondary || '#666' }]}>
                                    {t('diets_activeLifestyleBanner') || 'Ваш активный стиль жизни. Нажмите для отслеживания.'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary || '#666'} />
                        </TouchableOpacity>
                    </View>
                )}

            {/* AI Recommendations */}
            {recommendations.length > 0 && !activeDiet && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="sparkles" size={18} color={colors.primary || '#4CAF50'} />
                        <Text style={styles.sectionTitle}>
                            {t('diets_recommended') || 'Recommended for You'}
                        </Text>
                    </View>
                    <Text style={styles.sectionDescription}>
                        {t('diets_recommended_description') || 'Based on your profile and eating habits'}
                    </Text>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {recommendations.map((rec, idx) => (
                            <TouchableOpacity
                                key={idx}
                                style={styles.recommendationCard}
                                onPress={() => onProgramPress(rec.diet.slug || rec.diet.id)}
                            >
                                <View style={styles.matchBadge}>
                                    <Text style={styles.matchText}>{rec.matchScore}%</Text>
                                </View>
                                <Text style={styles.recName}>
                                    {getLocalizedText(rec.diet.name, language, t)}
                                </Text>
                                <Text style={styles.recReason} numberOfLines={2}>
                                    {getLocalizedText(rec.reason, language, t)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View >
            )
            }

            {/* Featured Diets */}
            {
                featuredDiets.length > 0 && !searchQuery && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            {t('diets_featured') || 'Popular Diets'}
                        </Text>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {featuredDiets.map((diet) => (
                                <TouchableOpacity
                                    key={diet.id}
                                    style={[
                                        styles.featuredCard,
                                        { backgroundColor: diet.color || '#4CAF50' },
                                        checkLockStatus && checkLockStatus(diet.slug || diet.id) && { opacity: 0.8 } // Visual feedback for locked
                                    ]}
                                    onPress={() => onProgramPress(diet.slug || diet.id)}
                                >
                                    <Ionicons name="star" size={20} color="rgba(255,255,255,0.8)" />
                                    {checkLockStatus && checkLockStatus(diet.slug || diet.id) && (
                                        <View style={{ position: 'absolute', top: 10, right: 10 }}>
                                            <Ionicons name="lock-closed" size={16} color="rgba(255,255,255,0.9)" />
                                        </View>
                                    )}
                                    <Text style={styles.featuredName}>
                                        {getLocalizedText(diet.name, language, t)}
                                    </Text>
                                    <Text style={styles.featuredDesc} numberOfLines={2}>
                                        {getLocalizedText(diet.shortDescription || diet.description, language, t)}
                                    </Text>
                                    <View style={styles.featuredMeta}>
                                        <Text style={styles.featuredMetaText}>
                                            {diet.duration} {t('diets_days') || 'days'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))
                            }
                        </ScrollView >
                    </View >
                )}

            {/* Type Filters */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('diets_browse') || 'Browse All'}</Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
                    {typeFilters.map((filter) => (
                        <TouchableOpacity
                            key={filter.id || 'all'}
                            style={[
                                styles.filterChip,
                                selectedType === filter.id && styles.filterChipActive,
                            ]}
                            onPress={() => onTypeChange(filter.id)}
                        >
                            <Ionicons
                                name={filter.icon}
                                size={16}
                                color={selectedType === filter.id ? '#FFF' : colors.textSecondary || '#666'}
                            />
                            <Text style={[
                                styles.filterChipText,
                                selectedType === filter.id && styles.filterChipTextActive,
                            ]}>
                                {filter.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Difficulty Filters */}
                <View style={styles.difficultyRow}>
                    <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
                        {t('diets_filter_difficulty') || 'Difficulty'}:
                    </Text>
                    {difficultyFilters.map((filter) => (
                        <TouchableOpacity
                            key={filter.id || 'all-diff'}
                            style={[
                                styles.difficultyChip,
                                selectedDifficulty === filter.id && styles.difficultyChipActive,
                            ]}
                            onPress={() => onDifficultyChange(filter.id)}
                        >
                            <Text style={[
                                styles.difficultyChipText,
                                { color: selectedDifficulty === filter.id ? '#FFF' : colors.textSecondary },
                            ]}>
                                {filter.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* All Diets grouped by category */}
            {
                Object.entries(groupedDiets).map(([group, diets]) => {
                    const groupConfig = DIETS_UI_GROUPS.find(g => g.id === group);
                    if (!groupConfig) return null;

                    return (
                        <View key={group} style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name={groupConfig.icon} size={18} color={groupConfig.color} />
                                <Text style={styles.sectionTitle}>
                                    {t(groupConfig.labelKey) || group}
                                </Text>
                            </View>
                            <View style={styles.dietsList}>
                                {diets.map((diet) => (
                                    <DietCard
                                        key={diet.id}
                                        diet={diet}
                                        onPress={() => onProgramPress(diet.slug || diet.id)}
                                        isLocked={checkLockStatus ? checkLockStatus(diet.slug || diet.id) : false}
                                    />
                                ))}
                            </View>
                        </View>
                    );
                })
            }

            {
                filteredDiets.length === 0 && (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="search" size={48} color="#CCC" />
                        <Text style={styles.emptyText}>
                            {t('diets_no_diets') || 'No diets found'}
                        </Text>
                    </View>
                )
            }
        </View >
    );
}

const createStyles = (tokens: any, colors: any) => StyleSheet.create({
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
        color: colors.textPrimary || '#212121',
        marginLeft: 6,
    },
    sectionDescription: {
        fontSize: 13,
        color: colors.textSecondary || '#666',
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
    dietsList: {
        paddingHorizontal: 16,
        marginTop: 8,
        gap: 12,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 40,
        paddingBottom: 40,
    },
    emptyText: {
        fontSize: 15,
        color: tokens.colors?.textSecondary || '#999',
        marginTop: 12,
    },
    // FIX: Styles for active lifestyle banner in Diets tab
    lifestyleBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: (tokens.colors?.primary || '#4CAF50') + '30',
    },
    lifestyleBannerIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: (tokens.colors?.primary || '#4CAF50') + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    lifestyleBannerContent: {
        flex: 1,
    },
    lifestyleBannerTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    lifestyleBannerSubtitle: {
        fontSize: 13,
        lineHeight: 18,
    },
});
