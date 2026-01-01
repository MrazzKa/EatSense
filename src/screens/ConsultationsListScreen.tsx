import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import MarketplaceService from '../services/marketplaceService';

interface ConsultationsListScreenProps {
    navigation: any;
}

export default function ConsultationsListScreen({ navigation }: ConsultationsListScreenProps) {
    const { colors } = useTheme();
    const { t } = useI18n();
    const [consultations, setConsultations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            loadConsultations();
        }, [])
    );

    const loadConsultations = async () => {
        try {
            setLoading(true);
            const data = await MarketplaceService.getMyConsultations();
            setConsultations(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load consultations:', error);
            setConsultations([]);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (consultation: any) => {
        if (consultation.status !== 'active') return colors.textSecondary;
        const daysRemaining = Math.ceil(
            (new Date(consultation.endsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysRemaining <= 0) return colors.textSecondary;
        if (daysRemaining <= 2) return '#FF9800';
        return '#4CAF50';
    };

    const getStatusText = (consultation: any) => {
        if (consultation.status !== 'active') return t('chat.consultationEnded');
        const daysRemaining = Math.ceil(
            (new Date(consultation.endsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysRemaining <= 0) return t('chat.consultationEnded');
        return `${daysRemaining} ${t('chat.daysRemaining')}`;
    };

    const renderConsultation = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Chat', { consultationId: item.id })}
        >
            <View style={styles.cardHeader}>
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons name="person" size={24} color={colors.primary} />
                </View>
                <View style={styles.cardInfo}>
                    <Text style={[styles.specialistName, { color: colors.textPrimary }]}>
                        {item.specialist?.displayName || 'Specialist'}
                    </Text>
                    <Text style={[styles.specialistType, { color: colors.textSecondary }]}>
                        {item.specialist?.type === 'dietitian' ? t('experts.dietitian.title') : t('experts.nutritionist.title')}
                    </Text>
                </View>
                <View style={styles.statusContainer}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(item) }]} />
                    <Text style={[styles.statusText, { color: getStatusColor(item) }]}>{getStatusText(item)}</Text>
                </View>
            </View>
            {item.messages?.[0] && (
                <Text style={[styles.lastMessage, { color: colors.textSecondary }]} numberOfLines={2}>
                    {item.messages[0].content}
                </Text>
            )}
            <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                <Text style={[styles.date, { color: colors.textSecondary }]}>
                    {new Date(item.createdAt).toLocaleDateString()}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
        </TouchableOpacity>
    );

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
                <Text style={[styles.title, { color: colors.textPrimary }]}>{t('experts.myConsultations')}</Text>
                <View style={{ width: 24 }} />
            </View>
            <FlatList
                data={consultations}
                renderItem={renderConsultation}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="chatbubbles-outline" size={48} color={colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('experts.noSpecialists')}</Text>
                        <TouchableOpacity
                            style={[styles.findButton, { backgroundColor: colors.primary }]}
                            onPress={() => navigation.navigate('SpecialistList')}
                        >
                            <Text style={styles.findButtonText}>{t('experts.findSpecialist')}</Text>
                        </TouchableOpacity>
                    </View>
                }
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
    list: {
        padding: 16,
    },
    card: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardInfo: {
        flex: 1,
        marginLeft: 12,
    },
    specialistName: {
        fontSize: 16,
        fontWeight: '600',
    },
    specialistType: {
        fontSize: 13,
        marginTop: 2,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
    },
    lastMessage: {
        fontSize: 14,
        marginTop: 12,
        lineHeight: 20,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
    },
    date: {
        fontSize: 13,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 12,
        marginBottom: 24,
    },
    findButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    findButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
