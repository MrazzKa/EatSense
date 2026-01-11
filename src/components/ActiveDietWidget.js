import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../app/i18n/hooks';
import { useDesignTokens } from '../contexts/ThemeContext';

/**
 * ActiveDietWidget - Shows current active diet progress
 */
export default function ActiveDietWidget({ userDiet, onPress }) {
    const { t } = useI18n();
    const tokens = useDesignTokens();

    if (!userDiet) return null;

    const { program, progress, todayPlan } = userDiet;
    const percentComplete = progress?.percentComplete || 0;

    const mealsToday = todayPlan?.length || 0;
    const mealsLogged = [
        userDiet.dailyLogs?.[0]?.breakfastLogged,
        userDiet.dailyLogs?.[0]?.lunchLogged,
        userDiet.dailyLogs?.[0]?.dinnerLogged,
    ].filter(Boolean).length;

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: program?.color || tokens.colors?.primary || '#4CAF50' }]}
            onPress={onPress}
            activeOpacity={0.9}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <Ionicons name="flame" size={20} color="#FFF" />
                    <Text style={styles.title}>{t('diets.yourActiveDiet') || 'Your Active Diet'}</Text>
                </View>
                <View style={styles.dayBadge}>
                    <Text style={styles.dayBadgeText}>
                        {t('diets.day') || 'Day'} {userDiet.currentDay || 1}
                    </Text>
                </View>
            </View>

            {/* Diet name - use localized name */}
            <Text style={styles.dietName}>
                {program?.nameLocalized?.[t.language] || program?.name || 'Diet'}
            </Text>

            {/* Progress bar */}
            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${percentComplete}%` }]} />
                </View>
                <Text style={styles.progressText}>{percentComplete}%</Text>
            </View>

            {/* Today's progress */}
            <View style={styles.todayContainer}>
                <View style={styles.todayItem}>
                    <Ionicons name="restaurant-outline" size={16} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.todayLabel}>
                        {t('diets.mealsToday') || 'Meals today'}
                    </Text>
                    <Text style={styles.todayValue}>{mealsLogged}/{mealsToday}</Text>
                </View>

                <View style={styles.todayItem}>
                    <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.todayLabel}>
                        {t('diets.daysLeft') || 'Days left'}
                    </Text>
                    <Text style={styles.todayValue}>
                        {userDiet.totalDays ? (userDiet.totalDays - (userDiet.currentDay - 1)) : 0}
                    </Text>
                </View>
            </View>

            {/* CTA */}
            <View style={styles.ctaRow}>
                <Text style={styles.ctaText}>{t('diets.viewPlan') || 'View today\'s plan'}</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 13,
        fontWeight: '500',
        marginLeft: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    dayBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    dayBadgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
    },
    dietName: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 12,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    progressBar: {
        flex: 1,
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 3,
        marginRight: 10,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#FFF',
        borderRadius: 3,
    },
    progressText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
        minWidth: 40,
        textAlign: 'right',
    },
    todayContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
    },
    todayItem: {
        alignItems: 'center',
    },
    todayLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 11,
        marginTop: 4,
    },
    todayValue: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
        marginTop: 2,
    },
    ctaRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    ctaText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
        marginRight: 6,
    },
});
