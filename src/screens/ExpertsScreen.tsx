import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    RefreshControl,
    Image,
    Modal,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { useIsExpert } from '../hooks/useIsExpert';
import { ProfileAvatarButton } from '../components/ProfileAvatarButton';
import MarketplaceService from '../services/marketplaceService';
import ApiService from '../services/apiService';

const SPECIALIZATIONS = [
    'weightManagement', 'sportsNutrition', 'clinicalNutrition', 'pediatricNutrition',
    'eatingDisorders', 'diabetesManagement', 'foodAllergies', 'vegetarianVegan',
    'pregnancyNutrition', 'geriatricNutrition', 'gutHealth', 'mentalHealthNutrition',
];

const PAGE_SIZE = 20;

export default function ExpertsScreen({ navigation }: { navigation: any }) {
    const { colors } = useTheme();
    const tokens = useDesignTokens();
    const { t } = useI18n();
    const isExpert = useIsExpert();
    const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

    const [experts, setExperts] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [loadError, setLoadError] = useState(false);

    // Search & filters
    const [search, setSearch] = useState('');
    const [searchDebounced, setSearchDebounced] = useState('');
    const [filterSpec, setFilterSpec] = useState<string | null>(null);
    const [filterLang, setFilterLang] = useState<string | null>(null);
    const [filtersVisible, setFiltersVisible] = useState(false);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setSearchDebounced(search), 400);
        return () => clearTimeout(timer);
    }, [search]);

    const loadExperts = useCallback(async (offset = 0, append = false) => {
        try {
            const filters: any = { limit: PAGE_SIZE, offset };
            if (searchDebounced) filters.search = searchDebounced;
            if (filterSpec) filters.specialization = filterSpec;
            if (filterLang) filters.language = filterLang;

            const result = await MarketplaceService.getExperts(filters);
            const list = result?.experts || result || [];
            const count = result?.total ?? list.length;

            if (append) {
                setExperts(prev => [...prev, ...list]);
            } else {
                setExperts(list);
            }
            setTotal(count);
            setLoadError(false);
        } catch (err) {
            console.error('[ExpertsScreen] Load error:', err);
            if (!append) {
                setExperts([]);
                setTotal(0);
            }
            setLoadError(true);
        }
    }, [searchDebounced, filterSpec, filterLang]);

    // Backend default orderBy is [isVerified desc, rating desc, consultationCount desc].
    useEffect(() => {
        setLoading(true);
        loadExperts(0).finally(() => setLoading(false));
    }, [loadExperts]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadExperts(0);
        setRefreshing(false);
    }, [loadExperts]);

    const handleLoadMore = useCallback(async () => {
        if (loadingMore || experts.length >= total) return;
        setLoadingMore(true);
        await loadExperts(experts.length, true);
        setLoadingMore(false);
    }, [loadingMore, experts.length, total, loadExperts]);

    const clearFilters = useCallback(() => {
        setFilterSpec(null);
        setFilterLang(null);
        setFiltersVisible(false);
    }, []);

    const hasFilters = filterSpec || filterLang;

    const handleRetry = useCallback(async () => {
        setLoading(true);
        await loadExperts(0);
        setLoading(false);
    }, [loadExperts]);

    const getAvatarUrl = (expert: any) => ApiService.resolveMediaUrl(expert?.avatarUrl);

    const renderExpertCard = useCallback(({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ExpertProfile', { specialistId: item.id })}
            activeOpacity={0.7}
        >
            <View style={styles.cardRow}>
                {getAvatarUrl(item) ? (
                    <Image source={{ uri: getAvatarUrl(item) }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <Ionicons name="person" size={24} color={colors.textSecondary} />
                    </View>
                )}
                <View style={styles.cardInfo}>
                    <View style={styles.nameRow}>
                        <Text style={styles.cardName} numberOfLines={1}>{item.displayName}</Text>
                        {item.isVerified && (
                            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                        )}
                    </View>
                    <Text style={styles.cardType}>{String(t(`experts.${(item.type || '').toLowerCase()}.title`, { defaultValue: item.type }) ?? item.type ?? '')}</Text>
                    <View style={styles.cardMeta}>
                        {item.rating > 0 && (
                            <View style={styles.ratingBadge}>
                                <Ionicons name="star" size={12} color="#FFB800" />
                                <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                            </View>
                        )}
                        {item.experienceYears > 0 && (
                            <Text style={styles.metaText}>
                                {t('experts.yearsExperience', { count: item.experienceYears })}
                            </Text>
                        )}
                    </View>
                    {item.specializations?.length > 0 && (
                        <View style={styles.specRow}>
                            {item.specializations.slice(0, 3).map((spec: string) => (
                                <View key={spec} style={styles.specChip}>
                                    <Text style={styles.specChipText} numberOfLines={1}>
                                        {t(`experts.specializations.${spec}`, spec)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
                <View style={styles.cardRight}>
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </View>
            </View>
        </TouchableOpacity>
    ), [styles, colors, t, navigation]);

    const renderEmpty = () => {
        if (loading) return null;
        if (loadError) {
            return (
                <View style={styles.emptyContainer}>
                    <Ionicons name="cloud-offline-outline" size={48} color={colors.textTertiary} />
                    <Text style={styles.emptyTitle}>{t('experts.loadError') || 'Couldn\'t load experts'}</Text>
                    <Text style={styles.emptySubtitle}>{t('experts.loadErrorSub') || 'Check your connection and try again'}</Text>
                    <TouchableOpacity style={styles.clearButton} onPress={handleRetry}>
                        <Text style={styles.clearButtonText}>{t('common.retry') || 'Retry'}</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
                <Text style={styles.emptyTitle}>{t('experts.noResults') || 'No experts found'}</Text>
                <Text style={styles.emptySubtitle}>{t('experts.noResultsSub') || 'Try adjusting your filters or search'}</Text>
                {hasFilters && (
                    <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                        <Text style={styles.clearButtonText}>{t('common.clear') || 'Clear filters'}</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const renderHeader = () => null;

    const renderFooter = () => (
        <>
            {loadingMore && <ActivityIndicator style={{ paddingVertical: 16 }} color={colors.primary} />}
            {/* Expert registration banner */}
            {!isExpert && (
                <TouchableOpacity
                    style={styles.expertBanner}
                    onPress={() => navigation.navigate('BecomeExpert')}
                    activeOpacity={0.7}
                >
                    <View style={styles.expertBannerIcon}>
                        <Ionicons name="school-outline" size={24} color={colors.primary} />
                    </View>
                    <View style={styles.expertBannerText}>
                        <Text style={styles.expertBannerTitle}>{t('experts.becomeExpertBanner')}</Text>
                        <Text style={styles.expertBannerSub}>{t('experts.becomeExpertBannerSub')}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            )}
        </>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('experts.title')}</Text>
                <ProfileAvatarButton />
            </View>

            {/* Search bar */}
            <View style={styles.searchRow}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={18} color={colors.textTertiary} />
                    <TextInput
                        style={styles.searchInput}
                        value={search}
                        onChangeText={setSearch}
                        placeholder={t('experts.search')}
                        placeholderTextColor={colors.textTertiary}
                        returnKeyType="search"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity
                    style={[styles.filterButton, hasFilters && styles.filterButtonActive]}
                    onPress={() => setFiltersVisible(true)}
                >
                    <Ionicons name="options-outline" size={20} color={hasFilters ? '#FFF' : colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* Active filters chips */}
            {hasFilters && (
                <View style={styles.activeFilters}>
                    {filterSpec && (
                        <TouchableOpacity style={styles.filterChip} onPress={() => setFilterSpec(null)}>
                            <Text style={styles.filterChipText}>{t(`experts.specializations.${filterSpec}`)}</Text>
                            <Ionicons name="close" size={14} color={colors.primary} />
                        </TouchableOpacity>
                    )}
                    {filterLang && (
                        <TouchableOpacity style={styles.filterChip} onPress={() => setFilterLang(null)}>
                            <Text style={styles.filterChipText}>{filterLang.toUpperCase()}</Text>
                            <Ionicons name="close" size={14} color={colors.primary} />
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Content */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={experts}
                    keyExtractor={item => item.id}
                    renderItem={renderExpertCard}
                    ListHeaderComponent={renderHeader}
                    ListFooterComponent={renderFooter}
                    ListEmptyComponent={renderEmpty}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
                    }
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.3}
                />
            )}

            {/* Filters Modal */}
            <Modal visible={filtersVisible} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{t('experts.filters')}</Text>
                        <TouchableOpacity onPress={() => setFiltersVisible(false)}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalContent}>
                        <Text style={styles.modalSectionTitle}>{t('experts.edit.specializations')}</Text>
                        <View style={styles.chipContainer}>
                            {SPECIALIZATIONS.map(spec => (
                                <TouchableOpacity
                                    key={spec}
                                    style={[styles.chip, filterSpec === spec && styles.chipActive]}
                                    onPress={() => setFilterSpec(filterSpec === spec ? null : spec)}
                                >
                                    <Text style={[styles.chipText, filterSpec === spec && styles.chipTextActive]}>
                                        {t(`experts.specializations.${spec}`)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.modalSectionTitle, { marginTop: tokens.spacing.xl }]}>
                            {t('experts.edit.languages')}
                        </Text>
                        <View style={styles.chipContainer}>
                            {['en', 'ru', 'kk', 'fr', 'de', 'es'].map(lang => (
                                <TouchableOpacity
                                    key={lang}
                                    style={[styles.chip, filterLang === lang && styles.chipActive]}
                                    onPress={() => setFilterLang(filterLang === lang ? null : lang)}
                                >
                                    <Text style={[styles.chipText, filterLang === lang && styles.chipTextActive]}>
                                        {lang.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.clearModalButton} onPress={clearFilters}>
                            <Text style={styles.clearModalButtonText}>{t('common.clear') || 'Clear'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.applyButton} onPress={() => setFiltersVisible(false)}>
                            <Text style={styles.applyButtonText}>{t('common.apply') || 'Apply'}</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const createStyles = (tokens: any, colors: any) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        header: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: tokens.spacing.lg, paddingVertical: tokens.spacing.md,
        },
        headerTitle: { fontSize: 24, fontWeight: '700', color: colors.text },
        searchRow: {
            flexDirection: 'row', paddingHorizontal: tokens.spacing.lg,
            gap: tokens.spacing.sm, marginBottom: tokens.spacing.sm,
        },
        searchBar: {
            flex: 1, flexDirection: 'row', alignItems: 'center',
            backgroundColor: colors.surface, borderRadius: tokens.radii.xs,
            paddingHorizontal: tokens.spacing.md, height: 44, gap: tokens.spacing.sm,
            borderWidth: 1, borderColor: colors.border,
        },
        searchInput: { flex: 1, fontSize: 15, color: colors.text },
        filterButton: {
            width: 44, height: 44, borderRadius: tokens.radii.xs,
            backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: colors.border,
        },
        filterButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
        activeFilters: {
            flexDirection: 'row', paddingHorizontal: tokens.spacing.lg,
            gap: tokens.spacing.sm, marginBottom: tokens.spacing.sm,
        },
        filterChip: {
            flexDirection: 'row', alignItems: 'center', gap: 4,
            paddingHorizontal: tokens.spacing.md, paddingVertical: tokens.spacing.xs,
            borderRadius: tokens.radii.pill, backgroundColor: colors.primary + '15',
            borderWidth: 1, borderColor: colors.primary + '30',
        },
        filterChipText: { fontSize: 13, color: colors.primary, fontWeight: '500' },
        listContent: { paddingHorizontal: tokens.spacing.lg, paddingBottom: tokens.spacing.xxxl },
        loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        // Card
        card: {
            backgroundColor: colors.surface, borderRadius: tokens.radii.sm,
            padding: tokens.spacing.lg, marginBottom: tokens.spacing.md,
            borderWidth: 1, borderColor: colors.border,
        },
        cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
        avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.border },
        avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
        cardInfo: { flex: 1, marginLeft: tokens.spacing.md },
        nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
        cardName: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1 },
        cardType: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
        cardMeta: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md, marginTop: tokens.spacing.xs },
        ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
        ratingText: { fontSize: 13, fontWeight: '600', color: colors.text },
        metaText: { fontSize: 12, color: colors.textSecondary },
        specRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: tokens.spacing.sm },
        specChip: {
            paddingHorizontal: tokens.spacing.sm, paddingVertical: 2,
            borderRadius: tokens.radii.pill, backgroundColor: colors.primary + '10',
        },
        specChipText: { fontSize: 11, color: colors.primary },
        cardRight: { alignItems: 'center', justifyContent: 'center', marginLeft: tokens.spacing.sm },
        // Empty
        emptyContainer: { alignItems: 'center', paddingVertical: tokens.spacing.xxxl },
        emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: tokens.spacing.lg },
        emptySubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: tokens.spacing.sm },
        clearButton: { marginTop: tokens.spacing.lg },
        clearButtonText: { fontSize: 15, color: colors.primary, fontWeight: '500' },
        // Expert banner
        expertBanner: {
            flexDirection: 'row', alignItems: 'center', padding: tokens.spacing.lg,
            borderRadius: tokens.radii.sm, borderWidth: 1,
            backgroundColor: colors.primary + '08', borderColor: colors.primary + '20',
            marginTop: tokens.spacing.md, gap: tokens.spacing.md,
        },
        expertBannerIcon: {
            width: 44, height: 44, borderRadius: 22,
            backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center',
        },
        expertBannerText: { flex: 1 },
        expertBannerTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
        expertBannerSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
        // Modal
        modalContainer: { flex: 1, backgroundColor: colors.background },
        modalHeader: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: tokens.spacing.xl, paddingVertical: tokens.spacing.lg,
            borderBottomWidth: 1, borderBottomColor: colors.border,
        },
        modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
        modalContent: { flex: 1, padding: tokens.spacing.xl },
        modalSectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: tokens.spacing.md },
        chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm },
        chip: {
            paddingHorizontal: tokens.spacing.lg, paddingVertical: tokens.spacing.sm,
            borderRadius: tokens.radii.pill, borderWidth: 1,
            borderColor: colors.border, backgroundColor: colors.surface,
        },
        chipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
        chipText: { fontSize: 14, color: colors.textSecondary },
        chipTextActive: { color: colors.primary, fontWeight: '600' },
        modalFooter: {
            flexDirection: 'row', paddingHorizontal: tokens.spacing.xl,
            paddingVertical: tokens.spacing.md, gap: tokens.spacing.md,
            borderTopWidth: 1, borderTopColor: colors.border,
        },
        clearModalButton: {
            flex: 1, paddingVertical: tokens.spacing.md, borderRadius: tokens.radii.xs,
            alignItems: 'center', borderWidth: 1, borderColor: colors.border,
        },
        clearModalButtonText: { fontSize: 15, fontWeight: '500', color: colors.text },
        applyButton: {
            flex: 1, paddingVertical: tokens.spacing.md, borderRadius: tokens.radii.xs,
            alignItems: 'center', backgroundColor: colors.primary,
        },
        applyButtonText: { fontSize: 15, fontWeight: '600', color: '#FFF' },
    });
