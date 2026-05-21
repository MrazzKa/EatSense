import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
    Linking,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { useIsExpert } from '../hooks/useIsExpert';
import { useAuth } from '../contexts/AuthContext';
import { ProfileAvatarButton } from '../components/ProfileAvatarButton';
import MarketplaceService from '../services/marketplaceService';
import ApiService from '../services/apiService';

const SPECIALIZATIONS = [
    'weightManagement', 'sportsNutrition', 'clinicalNutrition', 'pediatricNutrition',
    'eatingDisorders', 'diabetesManagement', 'foodAllergies', 'vegetarianVegan',
    'pregnancyNutrition', 'geriatricNutrition', 'gutHealth', 'mentalHealthNutrition',
];

const PAGE_SIZE = 20;

// Pilot: hide public catalog & "Become expert" CTA. Only show: code input,
// "My specialists", and "Scheduled consultations". Flip when launching the
// public marketplace.
const EXPERT_CATALOG_VISIBLE = false;

export default function ExpertsScreen({ navigation }: { navigation: any }) {
    const { colors } = useTheme();
    const tokens = useDesignTokens();
    const { t } = useI18n();
    const isExpert = useIsExpert();
    const { user, refreshUser } = useAuth();
    const isApprovedExpert = (user as any)?.expertStatus === 'approved';
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
    const [codeVisible, setCodeVisible] = useState(false);
    const [codeInput, setCodeInput] = useState('');
    const [applyingCode, setApplyingCode] = useState(false);
    const [mySpecialists, setMySpecialists] = useState<any[]>([]);
    const [scheduledConsultations, setScheduledConsultations] = useState<any[]>([]);

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
            // Be paranoid about response shape — anything non-array would crash
            // the spread below ("iterator method is not callable" on iOS).
            const list: any[] = Array.isArray(result?.experts)
                ? result.experts
                : Array.isArray(result)
                    ? result
                    : [];
            const count = typeof result?.total === 'number' ? result.total : list.length;

            if (append) {
                setExperts(prev => {
                    const safePrev = Array.isArray(prev) ? prev : [];
                    return [...safePrev, ...list];
                });
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

    const loadMySpecialists = useCallback(async () => {
        try {
            const result = await MarketplaceService.getMySpecialists();
            // Some endpoints wrap the array in { items: [...] }; tolerate both shapes.
            const arr = Array.isArray(result)
                ? result
                : Array.isArray((result as any)?.items)
                    ? (result as any).items
                    : [];
            setMySpecialists(arr);
        } catch (err) {
            console.warn('[ExpertsScreen] Failed to load linked specialists:', err);
            setMySpecialists([]);
        }
    }, []);

    // Backend default orderBy is [isVerified desc, rating desc, consultationCount desc].
    useEffect(() => {
        setLoading(true);
        Promise.all([loadExperts(0), loadMySpecialists()]).finally(() => setLoading(false));
    }, [loadExperts, loadMySpecialists]);

    useFocusEffect(
        useCallback(() => {
            refreshUser().catch(() => {});
        }, [refreshUser]),
    );

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([
            loadExperts(0),
            loadMySpecialists(),
            refreshUser().catch(() => {}),
        ]);
        setRefreshing(false);
    }, [loadExperts, loadMySpecialists, refreshUser]);

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
    const hasSearchOrFilters = Boolean(searchDebounced || hasFilters);

    const handleRetry = useCallback(async () => {
        setLoading(true);
        await Promise.all([loadExperts(0), loadMySpecialists()]);
        setLoading(false);
    }, [loadExperts, loadMySpecialists]);

    const normalizeCodeInput = (value: string) => value.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 12);

    const handleApplyCode = useCallback(async () => {
        const code = normalizeCodeInput(codeInput);
        if (!code || code.length < 4) {
            Alert.alert(
                t('experts.codeInvalidTitle') || 'Check the code',
                t('experts.codeInvalidBody') || 'Check the specialist code and try again.',
            );
            return;
        }
        setApplyingCode(true);
        try {
            const result = await MarketplaceService.applyExpertCode(code);
            await loadMySpecialists();
            setCodeVisible(false);
            setCodeInput('');
            const expertId = result?.expert?.id;
            const conversationId = result?.conversation?.id;
            Alert.alert(
                t('experts.codeAppliedTitle') || 'Specialist added',
                t('experts.codeAppliedBody') || 'This specialist is now available in My specialists.',
                [
                    {
                        text: t('common.ok') || 'OK',
                        onPress: () => {
                            if (expertId) {
                                navigation.navigate('ExpertProfile', { specialistId: expertId, conversationId });
                            }
                        },
                    },
                ],
            );
        } catch (err: any) {
            console.error('[ExpertsScreen] Apply code failed:', err);
            Alert.alert(
                t('experts.codeInvalidTitle') || 'Check the code',
                t('experts.codeInvalidBody') || 'Check the specialist code and try again.',
            );
        } finally {
            setApplyingCode(false);
        }
    }, [codeInput, loadMySpecialists, navigation, t]);

    const getAvatarUrl = (expert: any) => ApiService.resolveMediaUrl(expert?.avatarUrl);

    const getInitials = (name?: string) => {
        if (!name) return '';
        const parts = name.trim().split(/\s+/).slice(0, 2);
        return parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
    };

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
                        {getInitials(item.displayName) ? (
                            <Text style={styles.avatarInitials}>{getInitials(item.displayName)}</Text>
                        ) : (
                            <Ionicons name="person" size={24} color={colors.textSecondary} />
                        )}
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

    const renderCodeEntry = () => (
        <TouchableOpacity
            style={styles.codeEntry}
            onPress={() => setCodeVisible(true)}
            activeOpacity={0.75}
        >
            <View style={styles.codeEntryIcon}>
                <Ionicons name="key-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.codeEntryText}>
                <Text style={styles.codeEntryTitle}>{t('experts.haveCodeTitle') || 'I have a specialist code'}</Text>
                <Text style={styles.codeEntrySub}>{t('experts.haveCodeSub') || 'Enter a private code to add your specialist.'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
    );

    const renderMySpecialists = () => {
        if (!mySpecialists.length) return null;
        return (
            <View style={styles.mySection}>
                <Text style={styles.sectionTitle}>{t('experts.mySpecialists') || 'My specialists'}</Text>
                {mySpecialists.map((link) => {
                    const expert = link.expert;
                    if (!expert) return null; // expert soft-deleted or missing relation
                    return (
                        <TouchableOpacity
                            key={link.id}
                            style={[styles.card, !link.available && styles.unavailableCard]}
                            onPress={() => {
                                if (link.available && expert.id) {
                                    navigation.navigate('ExpertProfile', { specialistId: expert.id, conversationId: link.conversation?.id });
                                }
                            }}
                            activeOpacity={link.available ? 0.7 : 1}
                        >
                            <View style={styles.cardRow}>
                                {getAvatarUrl(expert) ? (
                                    <Image source={{ uri: getAvatarUrl(expert) }} style={styles.avatar} />
                                ) : (
                                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                        <Text style={styles.avatarInitials}>{getInitials(expert.displayName) || 'E'}</Text>
                                    </View>
                                )}
                                <View style={styles.cardInfo}>
                                    <View style={styles.nameRow}>
                                        <Text style={styles.cardName} numberOfLines={1}>{expert.displayName}</Text>
                                        <View style={styles.linkedBadge}>
                                            <Text style={styles.linkedBadgeText}>{t('experts.linkedByCode') || 'Code'}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.cardType}>
                                        {link.available
                                            ? String(t(`experts.${(expert.type || '').toLowerCase()}.title`, { defaultValue: expert.type }) ?? expert.type ?? '')
                                            : (t('experts.specialistUnavailable') || 'Specialist is currently unavailable')}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

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
        if (isApprovedExpert && !hasSearchOrFilters) {
            return (
                <View style={styles.emptyContainer}>
                    <View style={styles.ownerEmptyIcon}>
                        <Ionicons name="checkmark-circle-outline" size={32} color={colors.primary} />
                    </View>
                    <Text style={styles.emptyTitle}>{t('experts.ownerProfilePublished')}</Text>
                    <Text style={styles.emptySubtitleCentered}>
                        {t('experts.ownerProfilePublishedSub')}
                    </Text>
                    <Text style={styles.ownerEmptyHint}>
                        {t('experts.selfHiddenHint') || 'Your own profile is hidden from your personal list. Other clients can find it in EatSense.'}
                    </Text>
                    <TouchableOpacity
                        style={styles.ownerPortalButton}
                        onPress={() => Linking.openURL('https://experts.eatsense.ch').catch(() => {})}
                        activeOpacity={0.75}
                    >
                        <Text style={styles.ownerPortalButtonText}>{t('experts.ownerOpenPortal')}</Text>
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

    const renderHeader = () => (
        <>
            {renderCodeEntry()}
            {renderMySpecialists()}
            {renderScheduledConsultations()}
        </>
    );

    const refreshScheduledRef = useRef<{ cancelled: boolean } | null>(null);
    const refreshScheduled = useCallback(() => {
        // Cancel any in-flight previous call so stale results can't overwrite
        // newer state (race when user toggles focus quickly).
        if (refreshScheduledRef.current) refreshScheduledRef.current.cancelled = true;
        const token = { cancelled: false };
        refreshScheduledRef.current = token;
        ApiService.request('/consultations/me?role=client').then((data: any) => {
            if (token.cancelled) return;
            // Tolerate { items: [...] } shape in addition to raw array.
            const list = Array.isArray(data)
                ? data
                : Array.isArray(data?.items)
                    ? data.items
                    : [];
            const now = Date.now();
            setScheduledConsultations(
                list.filter((c: any) => c?.endAt && new Date(c.endAt).getTime() > now && !['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(c?.status))
                    .slice(0, 5),
            );
        }).catch((err) => {
            if (token.cancelled) return;
            console.warn('[ExpertsScreen] consultations load failed:', err?.message || err);
            setScheduledConsultations([]);
        });
    }, []);
    useFocusEffect(useCallback(() => {
        refreshScheduled();
        return () => {
            // Unmount/blur: cancel any in-flight request.
            if (refreshScheduledRef.current) refreshScheduledRef.current.cancelled = true;
        };
    }, [refreshScheduled]));

    const respondReschedule = useCallback(async (consultationId: string, accept: boolean) => {
        try {
            await ApiService.request(`/consultations/${consultationId}/reschedule/respond`, {
                method: 'POST',
                body: JSON.stringify({ accept }),
            });
            refreshScheduled();
        } catch (err: any) {
            Alert.alert(t('common.error') || 'Error', err?.message || 'Failed');
        }
    }, [t, refreshScheduled]);

    const cancelConsultation = useCallback((consultationId: string) => {
        Alert.alert(
            t('experts.cancelConfirmTitle') || 'Cancel consultation?',
            t('experts.cancelConfirmBody') || 'The expert will be notified. You will get a full refund.',
            [
                { text: t('common.no') || 'No', style: 'cancel' },
                {
                    text: t('common.yes') || 'Yes',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await ApiService.request(`/consultations/${consultationId}`, {
                                method: 'DELETE',
                                body: JSON.stringify({ reason: 'client_cancelled' }),
                            });
                            refreshScheduled();
                        } catch (err: any) {
                            Alert.alert(t('common.error') || 'Error', err?.message || 'Failed');
                        }
                    },
                },
            ],
        );
    }, [t, refreshScheduled]);

    const openConsultationMenu = useCallback((c: any) => {
        const buttons: any[] = [];
        if (c.status === 'SCHEDULED') {
            buttons.push({
                text: t('experts.proposeReschedule') || 'Propose new time',
                onPress: () => navigation.navigate('ScheduleConsultation', {
                    expertId: c.expert?.id,
                    conversationId: c.conversationId,
                    expertName: c.expert?.displayName,
                    rescheduleConsultationId: c.id,
                    initialDurationMinutes: c.durationMinutes,
                }),
            });
        }
        buttons.push({
            text: t('experts.cancelConsultation') || 'Cancel consultation',
            style: 'destructive',
            onPress: () => cancelConsultation(c.id),
        });
        buttons.push({ text: t('common.cancel') || 'Cancel', style: 'cancel' });
        Alert.alert(t('experts.manageConsultation') || 'Manage consultation', '', buttons);
    }, [t, navigation, cancelConsultation]);

    const renderScheduledConsultations = () => {
        if (!scheduledConsultations.length) return null;
        return (
            <View style={styles.mySection}>
                <Text style={styles.sectionTitle}>{t('experts.scheduledTitle') || 'Scheduled consultations'}</Text>
                {scheduledConsultations.map((c) => {
                    const expert = c.expert || {};
                    const isPending = c.status === 'PENDING_RESCHEDULE';
                    const start = new Date(isPending && c.proposedStartAt ? c.proposedStartAt : c.startAt);
                    const end = new Date(isPending && c.proposedEndAt ? c.proposedEndAt : c.endAt);
                    const inWindow = !isPending && Date.now() >= start.getTime() - 5 * 60000 && Date.now() < end.getTime() + 10 * 60000;
                    const reschedulerIsMe = c.proposedBy === 'client';
                    return (
                        <TouchableOpacity
                            key={c.id}
                            style={styles.card}
                            onPress={() => {
                                if (inWindow && c.id) {
                                    navigation.navigate('VideoCall', { conversationId: c.conversationId, consultationId: c.id });
                                } else if (c.conversationId) {
                                    navigation.navigate('ExpertProfile', { specialistId: expert.id, conversationId: c.conversationId });
                                }
                            }}
                            onLongPress={() => openConsultationMenu(c)}
                            delayLongPress={400}
                            activeOpacity={0.7}
                        >
                            <View style={styles.cardRow}>
                                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                    <Ionicons name={isPending ? 'time' : 'calendar'} size={22} color={isPending ? '#f59e0b' : colors.primary} />
                                </View>
                                <View style={styles.cardInfo}>
                                    <Text style={styles.cardName} numberOfLines={1}>{expert.displayName || t('experts.expertFallback') || 'Specialist'}</Text>
                                    <Text style={styles.cardType}>
                                        {isPending
                                            ? `${t('experts.rescheduleProposed') || 'Reschedule requested'}: ${start.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                                            : `${start.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · ${c.durationMinutes} min`}
                                    </Text>
                                </View>
                                {isPending && !reschedulerIsMe ? null : inWindow ? (
                                    <View style={[styles.linkedBadge, { backgroundColor: colors.primary }]}>
                                        <Text style={[styles.linkedBadgeText, { color: '#fff' }]}>{t('common.join') || 'Join'}</Text>
                                    </View>
                                ) : (
                                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                                )}
                            </View>
                            {isPending && !reschedulerIsMe ? (
                                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                                    <TouchableOpacity
                                        onPress={(e) => { e.stopPropagation(); respondReschedule(c.id, true); }}
                                        style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' }}
                                    >
                                        <Text style={{ color: '#fff', fontWeight: '600' }}>{t('experts.rescheduleAccept') || 'Accept'}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={(e) => { e.stopPropagation(); respondReschedule(c.id, false); }}
                                        style={{ flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
                                    >
                                        <Text style={{ color: colors.text, fontWeight: '600' }}>{t('experts.rescheduleDecline') || 'Decline'}</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : null}
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    const renderFooter = () => (
        <>
            {loadingMore && <ActivityIndicator style={{ paddingVertical: 16 }} color={colors.primary} />}
            {isApprovedExpert && experts.length > 0 ? (
                <TouchableOpacity
                    style={styles.expertBanner}
                    onPress={() => Linking.openURL('https://experts.eatsense.ch').catch(() => {})}
                    activeOpacity={0.7}
                >
                    <View style={styles.expertBannerIcon}>
                        <Ionicons name="checkmark-circle-outline" size={24} color={colors.primary} />
                    </View>
                    <View style={styles.expertBannerText}>
                        <Text style={styles.expertBannerTitle}>{t('experts.ownerProfilePublished')}</Text>
                        <Text style={styles.expertBannerSub}>{t('experts.ownerProfilePublishedSub')}</Text>
                    </View>
                    <Text style={styles.expertBannerLink}>{t('experts.ownerOpenPortal')}</Text>
                </TouchableOpacity>
            ) : !isExpert && EXPERT_CATALOG_VISIBLE && (
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

            {/* Search bar (hidden in pilot when catalog disabled) */}
            {EXPERT_CATALOG_VISIBLE && (
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

            )}
            {/* Active filters chips */}
            {EXPERT_CATALOG_VISIBLE && hasFilters && (
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
                    data={EXPERT_CATALOG_VISIBLE ? experts : []}
                    keyExtractor={item => item.id}
                    renderItem={renderExpertCard}
                    ListHeaderComponent={renderHeader}
                    ListFooterComponent={renderFooter}
                    ListEmptyComponent={EXPERT_CATALOG_VISIBLE ? renderEmpty : null}
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

            <Modal visible={codeVisible} animationType="fade" transparent onRequestClose={() => setCodeVisible(false)}>
                <KeyboardAvoidingView
                    style={styles.codeModalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <TouchableOpacity style={styles.codeModalScrim} activeOpacity={1} onPress={() => setCodeVisible(false)} />
                    <View style={styles.codeModalCard}>
                        <View style={styles.modalGrabber} />
                        <Text style={styles.codeModalTitle}>{t('experts.enterCodeTitle') || 'Specialist code'}</Text>
                        <Text style={styles.codeModalSub}>
                            {t('experts.enterCodeBody') || 'Enter the private code your specialist shared with you.'}
                        </Text>
                        <TextInput
                            value={codeInput}
                            onChangeText={(value) => setCodeInput(normalizeCodeInput(value))}
                            autoCapitalize="characters"
                            autoCorrect={false}
                            placeholder={t('experts.codePlaceholder') || 'A7K9Q2'}
                            placeholderTextColor={colors.textTertiary}
                            style={styles.codeInput}
                            maxLength={12}
                        />
                        <View style={styles.codeActions}>
                            <TouchableOpacity
                                style={styles.codeCancelButton}
                                onPress={() => setCodeVisible(false)}
                                disabled={applyingCode}
                            >
                                <Text style={styles.codeCancelText}>{t('common.cancel') || 'Cancel'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.codeApplyButton, applyingCode && styles.disabledButton]}
                                onPress={handleApplyCode}
                                disabled={applyingCode}
                            >
                                {applyingCode ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.codeApplyText}>{t('experts.applyCode') || 'Add specialist'}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
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
        listContent: { paddingHorizontal: tokens.spacing.lg, paddingBottom: 110 },
        loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        // Card
        card: {
            backgroundColor: colors.surface, borderRadius: tokens.radii.sm,
            padding: tokens.spacing.lg, marginBottom: tokens.spacing.md,
            borderWidth: 1, borderColor: colors.border,
        },
        cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
        avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.border },
        avatarPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary + '22' },
        avatarInitials: { fontSize: 18, fontWeight: '700', color: colors.primary, letterSpacing: 0.5 },
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
        unavailableCard: { opacity: 0.62 },
        codeEntry: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: tokens.spacing.lg,
            marginBottom: tokens.spacing.md,
            borderRadius: tokens.radii.sm,
            borderWidth: 1,
            borderColor: colors.primary + '26',
            backgroundColor: colors.primary + '08',
            gap: tokens.spacing.md,
        },
        codeEntryIcon: {
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary + '14',
        },
        codeEntryText: { flex: 1 },
        codeEntryTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
        codeEntrySub: { fontSize: 13, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
        mySection: { marginTop: tokens.spacing.xs, marginBottom: tokens.spacing.sm },
        sectionTitle: {
            fontSize: 16,
            fontWeight: '700',
            color: colors.text,
            marginBottom: tokens.spacing.sm,
        },
        linkedBadge: {
            paddingHorizontal: tokens.spacing.sm,
            paddingVertical: 2,
            borderRadius: tokens.radii.pill,
            backgroundColor: colors.primary + '16',
        },
        linkedBadgeText: { fontSize: 11, fontWeight: '700', color: colors.primary },
        // Empty
        emptyContainer: { alignItems: 'center', paddingVertical: tokens.spacing.xxxl },
        emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: tokens.spacing.lg },
        emptySubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: tokens.spacing.sm },
        emptySubtitleCentered: {
            fontSize: 14,
            color: colors.textSecondary,
            marginTop: tokens.spacing.sm,
            textAlign: 'center',
            lineHeight: 20,
        },
        clearButton: { marginTop: tokens.spacing.lg },
        clearButtonText: { fontSize: 15, color: colors.primary, fontWeight: '500' },
        ownerEmptyIcon: {
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.primary + '14',
            alignItems: 'center',
            justifyContent: 'center',
        },
        ownerEmptyHint: {
            fontSize: 13,
            color: colors.textTertiary,
            textAlign: 'center',
            lineHeight: 18,
            marginTop: tokens.spacing.md,
            paddingHorizontal: tokens.spacing.md,
        },
        ownerPortalButton: {
            marginTop: tokens.spacing.lg,
            minHeight: 44,
            paddingHorizontal: tokens.spacing.xl,
            paddingVertical: tokens.spacing.sm,
            borderRadius: tokens.radii.xs,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
        },
        ownerPortalButtonText: { fontSize: 15, color: '#FFF', fontWeight: '700' },
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
        expertBannerLink: { fontSize: 13, color: colors.primary, fontWeight: '700' },
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
        codeModalOverlay: { flex: 1, justifyContent: 'flex-end' },
        codeModalScrim: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0,0,0,0.36)',
        },
        codeModalCard: {
            backgroundColor: colors.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: tokens.spacing.xl,
            paddingTop: tokens.spacing.md,
            paddingBottom: tokens.spacing.xl,
            borderWidth: 1,
            borderColor: colors.border,
        },
        modalGrabber: {
            alignSelf: 'center',
            width: 42,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.border,
            marginBottom: tokens.spacing.lg,
        },
        codeModalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
        codeModalSub: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginTop: tokens.spacing.sm },
        codeInput: {
            height: 52,
            borderRadius: tokens.radii.xs,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.background,
            paddingHorizontal: tokens.spacing.lg,
            marginTop: tokens.spacing.lg,
            color: colors.text,
            fontSize: 19,
            fontWeight: '800',
            letterSpacing: 1,
        },
        codeActions: { flexDirection: 'row', gap: tokens.spacing.md, marginTop: tokens.spacing.lg },
        codeCancelButton: {
            flex: 1,
            minHeight: 48,
            borderRadius: tokens.radii.xs,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.border,
        },
        codeCancelText: { fontSize: 15, fontWeight: '700', color: colors.text },
        codeApplyButton: {
            flex: 1.4,
            minHeight: 48,
            borderRadius: tokens.radii.xs,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary,
        },
        codeApplyText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
        disabledButton: { opacity: 0.65 },
    });
