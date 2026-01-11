import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useI18n } from '../../app/i18n/hooks';
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';
import ApiService from '../services/apiService';
import ExpertCard from '../components/ExpertCard';
import ConsultationCard from '../components/ConsultationCard';

/**
 * ExpertsScreen - Marketplace for specialists/experts
 */
export default function ExpertsScreen({ navigation }) {
    const { t } = useI18n();
    const themeContext = useTheme();
    const tokens = useDesignTokens();

    const [activeTab, setActiveTab] = useState('experts'); // 'experts' | 'chats'
    const [specialists, setSpecialists] = useState([]);
    const [consultations, setConsultations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Filters
    const [filters, setFilters] = useState({
        type: null,
        isFree: false,
    });

    const loadData = useCallback(async () => {
        try {
            if (activeTab === 'experts') {
                const response = await ApiService.getSpecialists(filters);
                if (response?.specialists) {
                    setSpecialists(response.specialists);
                }
            } else if (activeTab === 'chats') {
                const response = await ApiService.getMyConsultations();
                if (Array.isArray(response)) {
                    setConsultations(response);
                }
            }

            // Load unread count
            try {
                const unread = await ApiService.getUnreadMessagesCount();
                if (typeof unread?.count === 'number') {
                    setUnreadCount(unread.count);
                }
            } catch {
                // Ignore unread count errors
            }
        } catch (error) {
            console.error('[ExpertsScreen] Failed to load data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeTab, filters]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const styles = useMemo(() => {
        const colors = themeContext?.colors || {};
        return createStyles(tokens, colors);
    }, [tokens, themeContext?.colors]);

    const renderTabBar = () => (
        <View style={styles.tabBar}>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'experts' && styles.tabActive]}
                onPress={() => setActiveTab('experts')}
            >
                <Ionicons
                    name="people"
                    size={20}
                    color={activeTab === 'experts' ? tokens.colors?.primary || '#4CAF50' : '#999'}
                />
                <Text style={[styles.tabText, activeTab === 'experts' && styles.tabTextActive]}>
                    {t('experts.tab_specialists') || 'Specialists'}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.tab, activeTab === 'chats' && styles.tabActive]}
                onPress={() => setActiveTab('chats')}
            >
                <View style={styles.tabIconContainer}>
                    <Ionicons
                        name="chatbubbles"
                        size={20}
                        color={activeTab === 'chats' ? tokens.colors?.primary || '#4CAF50' : '#999'}
                    />
                    {unreadCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </Text>
                        </View>
                    )}
                </View>
                <Text style={[styles.tabText, activeTab === 'chats' && styles.tabTextActive]}>
                    {t('experts.tab_my_chats') || 'My Chats'}
                </Text>
            </TouchableOpacity>
        </View>
    );

    const renderFilters = () => (
        <View style={styles.filtersContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                    style={[styles.filterChip, !filters.type && styles.filterChipActive]}
                    onPress={() => setFilters(f => ({ ...f, type: null }))}
                >
                    <Text style={[styles.filterChipText, !filters.type && styles.filterChipTextActive]}>
                        {t('experts.filter_all') || 'All'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.filterChip, filters.type === 'dietitian' && styles.filterChipActive]}
                    onPress={() => setFilters(f => ({ ...f, type: 'dietitian' }))}
                >
                    <Text style={[styles.filterChipText, filters.type === 'dietitian' && styles.filterChipTextActive]}>
                        {t('experts.dietitian') || 'Dietitian'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.filterChip, filters.type === 'nutritionist' && styles.filterChipActive]}
                    onPress={() => setFilters(f => ({ ...f, type: 'nutritionist' }))}
                >
                    <Text style={[styles.filterChipText, filters.type === 'nutritionist' && styles.filterChipTextActive]}>
                        {t('experts.nutritionist') || 'Nutritionist'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.filterChip, filters.isFree && styles.filterChipActive]}
                    onPress={() => setFilters(f => ({ ...f, isFree: !f.isFree }))}
                >
                    <Text style={[styles.filterChipText, filters.isFree && styles.filterChipTextActive]}>
                        {t('experts.free_consultation') || 'Free'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );

    const renderContent = () => {
        if (loading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={tokens.colors?.primary || '#4CAF50'} />
                </View>
            );
        }

        if (activeTab === 'experts') {
            return (
                <FlatList
                    data={specialists}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <ExpertCard
                            specialist={item}
                            onPress={() => navigation.navigate('ExpertProfile', { specialistId: item.id })}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="search" size={48} color="#CCC" />
                            <Text style={styles.emptyText}>
                                {t('experts.no_experts_found') || 'No specialists found'}
                            </Text>
                        </View>
                    }
                />
            );
        }

        // Chats tab
        return (
            <FlatList
                data={consultations}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <ConsultationCard
                        consultation={item}
                        onPress={() => navigation.navigate('ConsultationChat', {
                            consultationId: item.id
                        })}
                    />
                )}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="chatbubble-outline" size={48} color="#CCC" />
                        <Text style={styles.emptyText}>
                            {t('experts.no_consultations') || 'No consultations yet'}
                        </Text>
                        <TouchableOpacity
                            style={styles.findExpertButton}
                            onPress={() => setActiveTab('experts')}
                        >
                            <Text style={styles.findExpertButtonText}>
                                {t('experts.find_expert') || 'Find a Specialist'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                }
            />
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>
                    {t('experts.title') || 'Specialists'}
                </Text>
            </View>

            {/* Tab Bar */}
            {renderTabBar()}

            {/* Filters (only for experts tab) */}
            {activeTab === 'experts' && renderFilters()}

            {/* Content */}
            {renderContent()}
        </SafeAreaView>
    );
}

const createStyles = (tokens, _colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: tokens.colors?.background || '#FAFAFA',
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: tokens.colors?.textPrimary || '#212121',
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: tokens.colors?.surface || '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: tokens.colors?.border || '#E0E0E0',
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: tokens.colors?.primary || '#4CAF50',
    },
    tabIconContainer: {
        position: 'relative',
    },
    tabText: {
        fontSize: 14,
        color: '#999',
        marginLeft: 6,
        fontWeight: '500',
    },
    tabTextActive: {
        color: tokens.colors?.primary || '#4CAF50',
    },
    badge: {
        position: 'absolute',
        top: -6,
        right: -10,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '700',
    },
    filtersContainer: {
        backgroundColor: tokens.colors?.surface || '#FFF',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: tokens.colors?.border || '#E0E0E0',
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: tokens.colors?.surfaceSecondary || '#F0F0F0',
        marginRight: 8,
    },
    filterChipActive: {
        backgroundColor: `${tokens.colors?.primary || '#4CAF50'}20`,
    },
    filterChipText: {
        fontSize: 14,
        color: tokens.colors?.textSecondary || '#666',
    },
    filterChipTextActive: {
        color: tokens.colors?.primary || '#4CAF50',
        fontWeight: '600',
    },
    listContent: {
        padding: 16,
        flexGrow: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyText: {
        fontSize: 16,
        color: tokens.colors?.textSecondary || '#999',
        marginTop: 12,
        textAlign: 'center',
    },
    findExpertButton: {
        marginTop: 20,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: tokens.colors?.primary || '#4CAF50',
        borderRadius: 8,
    },
    findExpertButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
