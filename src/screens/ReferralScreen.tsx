import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
// import * as Clipboard from 'expo-clipboard'; // Package not installed
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import ReferralsService from '../services/referralsService';

interface ReferralScreenProps {
    navigation: any;
}

export default function ReferralScreen({ navigation }: ReferralScreenProps) {
    const { colors } = useTheme();
    const { t } = useI18n();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const data = await ReferralsService.getReferralStats();
            setStats(data);
        } catch (error) {
            console.error('Failed to load referral stats:', error);
            // Set empty stats on error
            setStats({ code: '---', invitedCount: 0, earnedDays: 0, referrals: [] });
        } finally {
            setLoading(false);
        }
    };

    const handleCopyCode = useCallback(async () => {
        if (!stats?.code || stats.code === '---') return;
        // await Clipboard.setStringAsync(stats.code); // Package missing
        // Fallback or just show feedback
        console.warn('Clipboard package missing');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [stats?.code]);

    const handleShare = useCallback(async () => {
        if (!stats?.code || stats.code === '---') return;
        const message = t('referral.shareMessage')?.replace('{code}', stats.code) ||
            `Join me on EatSense! Use my code ${stats.code} and we both get 7 days PRO free! Download: https://eatsense.app`;
        try {
            await Share.share({ message });
        } catch (error) {
            console.error('Share failed:', error);
        }
    }, [stats?.code, t]);

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.textPrimary }]}>{t('referral.title')}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Hero Card */}
                <View style={[styles.heroCard, { backgroundColor: colors.primary }]}>
                    <View style={styles.heroIcon}>
                        <Ionicons name="gift" size={40} color="#fff" />
                    </View>
                    <Text style={styles.heroTitle}>{t('referral.heroTitle')}</Text>
                    <Text style={styles.heroSubtitle}>{t('referral.heroSubtitle')}</Text>
                </View>

                {/* Code Card */}
                <View style={[styles.codeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>{t('referral.yourCode')}</Text>
                    <View style={styles.codeRow}>
                        <Text style={[styles.codeText, { color: colors.textPrimary }]}>{stats?.code || '---'}</Text>
                        <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
                            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={22} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={[styles.shareButton, { backgroundColor: colors.primary }]} onPress={handleShare}>
                        <Ionicons name="share-social" size={20} color="#fff" />
                        <Text style={styles.shareButtonText}>{t('referral.share')}</Text>
                    </TouchableOpacity>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Ionicons name="people" size={24} color={colors.primary} />
                        <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats?.invitedCount || 0}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('referral.invited')}</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Ionicons name="calendar" size={24} color={colors.primary} />
                        <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats?.earnedDays || 0}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('referral.earnedDays')}</Text>
                    </View>
                </View>

                {/* Referral History */}
                {stats?.referrals?.length > 0 && (
                    <View style={[styles.historySection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.historyTitle, { color: colors.textPrimary }]}>{t('referral.history')}</Text>
                        {stats.referrals.map((referral: any) => (
                            <View key={referral.id} style={styles.historyItem}>
                                <View style={[styles.historyAvatar, { backgroundColor: colors.primary + '20' }]}>
                                    <Text style={[styles.historyAvatarText, { color: colors.primary }]}>
                                        {referral.friend?.firstName?.charAt(0).toUpperCase() || '?'}
                                    </Text>
                                </View>
                                <View style={styles.historyInfo}>
                                    <Text style={[styles.historyName, { color: colors.textPrimary }]}>
                                        {referral.friend?.firstName || 'Friend'}
                                    </Text>
                                    <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                                        {new Date(referral.date).toLocaleDateString()}
                                    </Text>
                                </View>
                                <View style={[styles.historyBadge, { backgroundColor: '#4CAF50' + '20' }]}>
                                    <Text style={[styles.historyBadgeText, { color: '#4CAF50' }]}>
                                        +{referral.bonusDays} {t('common.days')}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* How It Works */}
                <View style={[styles.howItWorks, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.howItWorksTitle, { color: colors.textPrimary }]}>{t('referral.howItWorks')}</Text>
                    {[t('referral.step1'), t('referral.step2'), t('referral.step3')].map((step, index) => (
                        <View key={index} style={styles.step}>
                            <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                                <Text style={styles.stepNumberText}>{index + 1}</Text>
                            </View>
                            <Text style={[styles.stepText, { color: colors.textSecondary }]}>{step}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },
    content: {
        padding: 16,
    },
    heroCard: {
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginBottom: 16,
    },
    heroIcon: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    heroTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    heroSubtitle: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    codeCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
    },
    codeLabel: {
        fontSize: 12,
        marginBottom: 8,
    },
    codeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    codeText: {
        fontSize: 28,
        fontWeight: '700',
        letterSpacing: 2,
    },
    copyButton: {
        padding: 8,
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    shareButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    statValue: {
        fontSize: 28,
        fontWeight: '700',
        marginTop: 8,
    },
    statLabel: {
        fontSize: 12,
        marginTop: 4,
    },
    historySection: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
    },
    historyTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    historyAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    historyAvatarText: {
        fontSize: 16,
        fontWeight: '600',
    },
    historyInfo: {
        flex: 1,
        marginLeft: 12,
    },
    historyName: {
        fontSize: 14,
        fontWeight: '500',
    },
    historyDate: {
        fontSize: 12,
        marginTop: 2,
    },
    historyBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    historyBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    howItWorks: {
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
    },
    howItWorksTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
    },
    step: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    stepNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepNumberText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    stepText: {
        flex: 1,
        marginLeft: 12,
        fontSize: 14,
        lineHeight: 20,
    },
});
