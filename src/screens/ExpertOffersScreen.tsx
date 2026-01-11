import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
    Switch,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import MarketplaceService from '../services/marketplaceService';

interface ExpertOffersScreenProps {
    navigation: any;
}

const OFFER_FORMATS = [
    { id: 'CHAT_CONSULTATION', icon: 'chatbubbles', labelKey: 'offers.format.chat' },
    { id: 'MEAL_PLAN', icon: 'restaurant', labelKey: 'offers.format.mealPlan' },
    { id: 'REPORT_REVIEW', icon: 'document-text', labelKey: 'offers.format.reportReview' },
    { id: 'MONTHLY_SUPPORT', icon: 'calendar', labelKey: 'offers.format.monthlySupport' },
    { id: 'CUSTOM', icon: 'options', labelKey: 'offers.format.custom' },
];

export default function ExpertOffersScreen({ navigation }: ExpertOffersScreenProps) {
    const { colors } = useTheme();
    const { t, language } = useI18n();
    const locale = language; // alias for locale
    const [offers, setOffers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingOffer, setEditingOffer] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [offerName, setOfferName] = useState('');
    const [offerDescription, setOfferDescription] = useState('');
    const [offerFormat, setOfferFormat] = useState('CHAT_CONSULTATION');
    const [isFree, setIsFree] = useState(true);
    const [isPublished, setIsPublished] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadOffers();
        }, [])
    );

    const loadOffers = async () => {
        try {
            setLoading(true);
            const data = await MarketplaceService.getMyOffers();
            setOffers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load offers:', error);
            setOffers([]);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setOfferName('');
        setOfferDescription('');
        setOfferFormat('CHAT_CONSULTATION');
        setIsFree(true);
        setIsPublished(false);
        setEditingOffer(null);
    };

    const openCreateModal = () => {
        resetForm();
        setShowModal(true);
    };

    const openEditModal = (offer: any) => {
        setEditingOffer(offer);
        setOfferName((offer.name as any)?.[locale] || (offer.name as any)?.en || '');
        setOfferDescription((offer.description as any)?.[locale] || (offer.description as any)?.en || '');
        setOfferFormat(offer.format || 'CHAT_CONSULTATION');
        setIsFree(offer.priceType === 'FREE');
        setIsPublished(offer.isPublished);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!offerName.trim()) {
            Alert.alert(t('common.error'), t('offers.nameRequired', 'Offer name is required'));
            return;
        }

        try {
            setSaving(true);

            const offerData = {
                name: { [locale]: offerName.trim(), en: offerName.trim() },
                description: offerDescription ? { [locale]: offerDescription.trim(), en: offerDescription.trim() } : undefined,
                format: offerFormat,
                priceType: isFree ? 'FREE' : 'CONTACT',
                isPublished,
            };

            if (editingOffer) {
                await MarketplaceService.updateOffer(editingOffer.id, offerData);
            } else {
                await MarketplaceService.createOffer(offerData);
            }

            setShowModal(false);
            loadOffers();
        } catch (error: any) {
            console.error('Failed to save offer:', error);
            Alert.alert(t('common.error'), error.message || t('common.errorGeneric'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (offer: any) => {
        Alert.alert(
            t('common.confirm'),
            t('offers.deleteConfirm', 'Are you sure you want to delete this offer?'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await MarketplaceService.deleteOffer(offer.id);
                            loadOffers();
                        } catch (error) {
                            console.error('Failed to delete offer:', error);
                        }
                    },
                },
            ]
        );
    };

    const togglePublish = async (offer: any) => {
        try {
            await MarketplaceService.publishOffer(offer.id, !offer.isPublished);
            loadOffers();
        } catch (error) {
            console.error('Failed to toggle publish:', error);
        }
    };

    const getFormatInfo = (formatId: string) => {
        return OFFER_FORMATS.find(f => f.id === formatId) || OFFER_FORMATS[0];
    };

    const renderOffer = ({ item }: { item: any }) => {
        const formatInfo = getFormatInfo(item.format);
        const displayName = (item.name as any)?.[locale] || (item.name as any)?.en || t('offers.untitled', 'Untitled');

        return (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                    <View style={[styles.formatIcon, { backgroundColor: colors.primary + '20' }]}>
                        <Ionicons name={formatInfo.icon as any} size={20} color={colors.primary} />
                    </View>
                    <View style={styles.cardInfo}>
                        <Text style={[styles.offerName, { color: colors.textPrimary }]}>{displayName}</Text>
                        <Text style={[styles.offerFormat, { color: colors.textSecondary }]}>
                            {t(formatInfo.labelKey, formatInfo.id)}
                        </Text>
                    </View>
                    <View style={styles.cardActions}>
                        <TouchableOpacity
                            style={[styles.statusBadge, { backgroundColor: item.isPublished ? '#4CAF5020' : colors.border + '50' }]}
                            onPress={() => togglePublish(item)}
                        >
                            <Ionicons
                                name={item.isPublished ? 'eye' : 'eye-off'}
                                size={14}
                                color={item.isPublished ? '#4CAF50' : colors.textSecondary}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {item.description && (
                    <Text style={[styles.offerDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                        {(item.description as any)?.[locale] || (item.description as any)?.en}
                    </Text>
                )}

                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                    <View style={[styles.priceBadge, { backgroundColor: colors.primary + '15' }]}>
                        <Text style={[styles.priceText, { color: colors.primary }]}>
                            {item.priceType === 'FREE' ? t('common.free', 'Free') : t('offers.contactForPrice', 'Contact for price')}
                        </Text>
                    </View>
                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(item)}>
                            <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
                            <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

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
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                    {t('experts.expert.myOffers', 'My Offers')}
                </Text>
                <TouchableOpacity onPress={openCreateModal}>
                    <Ionicons name="add-circle" size={28} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={offers}
                renderItem={renderOffer}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="pricetags-outline" size={48} color={colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            {t('offers.noOffers', 'No offers yet')}
                        </Text>
                        <TouchableOpacity
                            style={[styles.createButton, { backgroundColor: colors.primary }]}
                            onPress={openCreateModal}
                        >
                            <Text style={styles.createButtonText}>
                                {t('offers.createFirst', 'Create Your First Offer')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                }
            />

            {/* Create/Edit Modal */}
            <Modal visible={showModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                                {editingOffer ? t('offers.edit', 'Edit Offer') : t('offers.create', 'Create Offer')}
                            </Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                                {t('offers.name', 'Name')} *
                            </Text>
                            <TextInput
                                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                                value={offerName}
                                onChangeText={setOfferName}
                                placeholder={t('offers.namePlaceholder', 'e.g. Weekly Consultation')}
                                placeholderTextColor={colors.textTertiary}
                            />

                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                                {t('offers.description', 'Description')}
                            </Text>
                            <TextInput
                                style={[styles.inputMultiline, { borderColor: colors.border, color: colors.textPrimary }]}
                                value={offerDescription}
                                onChangeText={setOfferDescription}
                                placeholder={t('offers.descriptionPlaceholder', 'What clients will get...')}
                                placeholderTextColor={colors.textTertiary}
                                multiline
                            />

                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                                {t('offers.format', 'Service Type')}
                            </Text>
                            <View style={styles.formatGrid}>
                                {OFFER_FORMATS.map((format) => (
                                    <TouchableOpacity
                                        key={format.id}
                                        style={[
                                            styles.formatOption,
                                            { borderColor: offerFormat === format.id ? colors.primary : colors.border },
                                            offerFormat === format.id && { backgroundColor: colors.primary + '15' }
                                        ]}
                                        onPress={() => setOfferFormat(format.id)}
                                    >
                                        <Ionicons
                                            name={format.icon as any}
                                            size={20}
                                            color={offerFormat === format.id ? colors.primary : colors.textSecondary}
                                        />
                                        <Text style={[
                                            styles.formatOptionText,
                                            { color: offerFormat === format.id ? colors.primary : colors.textSecondary }
                                        ]}>
                                            {t(format.labelKey, format.id.replace('_', ' '))}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.toggleRow}>
                                <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                                    {t('offers.freeOffer', 'Free Consultation')}
                                </Text>
                                <Switch
                                    value={isFree}
                                    onValueChange={setIsFree}
                                    trackColor={{ false: colors.border, true: colors.primary + '50' }}
                                    thumbColor={isFree ? colors.primary : colors.textSecondary}
                                />
                            </View>

                            <View style={styles.toggleRow}>
                                <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                                    {t('offers.published', 'Published')}
                                </Text>
                                <Switch
                                    value={isPublished}
                                    onValueChange={setIsPublished}
                                    trackColor={{ false: colors.border, true: '#4CAF5050' }}
                                    thumbColor={isPublished ? '#4CAF50' : colors.textSecondary}
                                />
                            </View>
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Text style={styles.saveBtnText}>{t('common.save', 'Save')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    title: { fontSize: 18, fontWeight: '600' },
    list: { padding: 16 },
    card: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    formatIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    cardInfo: { flex: 1, marginLeft: 12 },
    offerName: { fontSize: 16, fontWeight: '600' },
    offerFormat: { fontSize: 13, marginTop: 2 },
    offerDescription: { fontSize: 14, marginTop: 10, lineHeight: 20 },
    cardActions: { flexDirection: 'row' },
    statusBadge: { padding: 6, borderRadius: 6 },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
    },
    priceBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    priceText: { fontSize: 13, fontWeight: '500' },
    actionButtons: { flexDirection: 'row', gap: 8 },
    actionBtn: { padding: 6 },
    emptyContainer: { alignItems: 'center', paddingTop: 60 },
    emptyText: { fontSize: 16, marginTop: 12, marginBottom: 24 },
    createButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    createButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    modalTitle: { fontSize: 18, fontWeight: '600' },
    modalBody: { padding: 16 },
    inputLabel: { fontSize: 13, marginBottom: 6, marginTop: 12 },
    input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
    inputMultiline: {
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    formatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    formatOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1
    },
    formatOptionText: { fontSize: 13 },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 16,
        paddingVertical: 8,
    },
    toggleLabel: { fontSize: 15 },
    saveBtn: { margin: 16, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
