import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../../app/i18n/hooks';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * ActiveDietWidget - Shows the current active diet on dashboard
 * If no active diet, shows a prompt to browse diets
 */
export default function ActiveDietWidget({ activeDiet, onOpenTracker, onBrowseDiets }) {
    const { t, language } = useI18n();
    const { colors } = useTheme();

    // No active diet - show prompt to browse diets
    if (!activeDiet) {
        return (
            <TouchableOpacity
                style={[styles.container, { backgroundColor: colors.surface || '#FFF', borderColor: colors.border || '#E0E0E0' }]}
                onPress={onBrowseDiets}
                activeOpacity={0.8}
            >
                <View style={styles.noDietContent}>
                    <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                        <Ionicons name="nutrition-outline" size={28} color={colors.primary || '#4CAF50'} />
                    </View>
                    <View style={styles.textContent}>
                        <Text style={[styles.noDietTitle, { color: colors.textPrimary }]}>
                            {t('dashboard.activeDiet.noDiet') || 'Choose a diet'}
                        </Text>
                        <Text style={[styles.noDietSubtitle, { color: colors.textSecondary }]}>
                            {t('dashboard.activeDiet.browseDiets') || 'Browse diets'}
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary || '#999'} />
                </View>
            </TouchableOpacity>
        );
    }

    // Has active diet/lifestyle - show progress widget
    // FIX 2026-01-19: Support both diet and lifestyle types with appropriate UI
    const { diet, type, streak, todayProgress } = activeDiet;
    const isLifestyle = type === 'lifestyle';

    // Helper to extract localized name
    const getLocalizedName = (name) => {
        if (!name) return isLifestyle ? 'Lifestyle' : 'Diet';
        if (typeof name === 'string') return name;
        if (typeof name === 'object') {
            return name[language] || name['en'] || name['ru'] || name[Object.keys(name)[0]] || (isLifestyle ? 'Lifestyle' : 'Diet');
        }
        return String(name);
    };
    const dietName = getLocalizedName(diet?.name);
    const completed = todayProgress?.completed || 0;
    const total = todayProgress?.total || 0;
    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
        <TouchableOpacity
            style={[styles.container, {
                backgroundColor: colors.surface || '#FFF',
                borderColor: colors.border || '#E0E0E0',
                borderLeftWidth: 4,
                borderLeftColor: diet?.color || colors.primary || '#4CAF50',
            }]}
            onPress={onOpenTracker}
            activeOpacity={0.8}
        >
            {/* Header row */}
            <View style={styles.header}>
                <Text style={[styles.dietName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {dietName}
                </Text>
                <View style={[styles.streakBadge, { backgroundColor: (diet?.color || colors.primary) + '20' }]}>
                    <Ionicons name={isLifestyle ? 'leaf' : 'flame'} size={14} color={diet?.color || colors.primary || '#4CAF50'} />
                    <Text style={[styles.streakText, { color: diet?.color || colors.primary || '#4CAF50' }]}>
                        {streak || 0} {t('dashboard.activeDiet.streak') || 'days streak'}
                    </Text>
                </View>
            </View>

            {/* Progress row */}
            <View style={styles.progressRow}>
                <View style={styles.progressInfo}>
                    <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                        {t('dashboard.activeDiet.progress') || 'Today\'s progress'}
                    </Text>
                    <Text style={[styles.progressValue, { color: colors.textPrimary }]}>
                        {completed}/{total} {t('dashboard.activeDiet.completed') || 'completed'}
                    </Text>
                </View>
                <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceSecondary || '#F0F0F0' }]}>
                        <View
                            style={[
                                styles.progressBarFill,
                                {
                                    width: `${progressPercent}%`,
                                    backgroundColor: diet?.color || colors.primary || '#4CAF50',
                                }
                            ]}
                        />
                    </View>
                </View>
            </View>

            {/* Days Left / Streak Info */}
            <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                    <Ionicons name="calendar-outline" size={14} color={colors.textSecondary || '#666'} />
                    <Text style={[styles.infoLabel, { color: colors.textSecondary || '#666' }]}>
                        {t('dashboard.activeDiet.daysLeft') || 'Days left'}
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                        {/* FIX: Use daysLeft from props if available, otherwise calculate correctly */}
                        {activeDiet?.daysLeft !== undefined && activeDiet.daysLeft !== null
                          ? activeDiet.daysLeft 
                          : (activeDiet?.totalDays && activeDiet?.currentDay 
                            ? Math.max(0, activeDiet.totalDays - activeDiet.currentDay + 1)
                            : 0)}
                    </Text>
                </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={[styles.openTrackerText, { color: colors.primary || '#4CAF50' }]}>
                    {t('dashboard.activeDiet.openTracker') || 'Open tracker'}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.primary || '#4CAF50'} />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    // No diet state
    noDietContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContent: {
        flex: 1,
        marginLeft: 12,
    },
    noDietTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    noDietSubtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    // Active diet state
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    dietName: {
        fontSize: 17,
        fontWeight: '700',
        flex: 1,
        marginRight: 8,
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    streakText: {
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 4,
    },
    progressRow: {
        marginBottom: 12,
    },
    progressInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    progressLabel: {
        fontSize: 13,
    },
    progressValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    progressBarContainer: {
        height: 8,
    },
    progressBarBg: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 12,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    infoItem: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 4,
    },
    infoLabel: {
        fontSize: 12,
        marginLeft: 4,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 4,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    openTrackerText: {
        fontSize: 14,
        fontWeight: '600',
        marginRight: 2,
    },
});
