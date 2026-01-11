import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import MarketplaceService from '../services/marketplaceService';

interface ReportBlockModalProps {
    visible: boolean;
    onClose: () => void;
    userId: string;
    userName: string;
    conversationId?: string;
}

const REPORT_REASONS = [
    { id: 'inappropriate', labelKey: 'report.reason.inappropriate' },
    { id: 'harassment', labelKey: 'report.reason.harassment' },
    { id: 'spam', labelKey: 'report.reason.spam' },
    { id: 'scam', labelKey: 'report.reason.scam' },
    { id: 'unprofessional', labelKey: 'report.reason.unprofessional' },
    { id: 'other', labelKey: 'report.reason.other' },
];

/**
 * ReportBlockModal - Report abuse or block a user
 */
export default function ReportBlockModal({
    visible,
    onClose,
    userId,
    userName,
    conversationId
}: ReportBlockModalProps) {
    const { colors } = useTheme();
    const { t } = useI18n();
    const [mode, setMode] = useState<'menu' | 'report' | 'block'>('menu');
    const [selectedReason, setSelectedReason] = useState<string | null>(null);
    const [details, setDetails] = useState('');
    const [loading, setLoading] = useState(false);

    const resetState = () => {
        setMode('menu');
        setSelectedReason(null);
        setDetails('');
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleReport = async () => {
        if (!selectedReason) return;

        try {
            setLoading(true);
            await MarketplaceService.createAbuseReport({
                reportedId: userId,
                reason: selectedReason,
                description: details.trim() || undefined,
                conversationId: conversationId || undefined,
            });

            Alert.alert(
                t('report.success.title', 'Report Submitted'),
                t('report.success.message', 'Thank you for your report. We will review it shortly.'),
                [{ text: 'OK', onPress: handleClose }]
            );
        } catch (error) {
            console.error('Failed to submit report:', error);
            Alert.alert(t('common.error'), t('report.error', 'Failed to submit report'));
        } finally {
            setLoading(false);
        }
    };

    const handleBlock = async () => {
        try {
            setLoading(true);
            await MarketplaceService.blockUser(userId);

            Alert.alert(
                t('block.success.title', 'User Blocked'),
                t('block.success.message', 'You will no longer receive messages from this user.'),
                [{ text: 'OK', onPress: handleClose }]
            );
        } catch (error) {
            console.error('Failed to block user:', error);
            Alert.alert(t('common.error'), t('block.error', 'Failed to block user'));
        } finally {
            setLoading(false);
        }
    };

    const renderMenu = () => (
        <>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                    {userName}
                </Text>
                <TouchableOpacity onPress={handleClose}>
                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <View style={styles.menuOptions}>
                <TouchableOpacity
                    style={[styles.menuOption, { borderColor: colors.border }]}
                    onPress={() => setMode('report')}
                >
                    <View style={[styles.menuIcon, { backgroundColor: '#EF444415' }]}>
                        <Ionicons name="flag" size={22} color="#EF4444" />
                    </View>
                    <View style={styles.menuInfo}>
                        <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
                            {t('report.title', 'Report User')}
                        </Text>
                        <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>
                            {t('report.subtitle', 'Report inappropriate behavior')}
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.menuOption, { borderColor: colors.border }]}
                    onPress={() => setMode('block')}
                >
                    <View style={[styles.menuIcon, { backgroundColor: '#64748B15' }]}>
                        <Ionicons name="ban" size={22} color="#64748B" />
                    </View>
                    <View style={styles.menuInfo}>
                        <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
                            {t('block.title', 'Block User')}
                        </Text>
                        <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>
                            {t('block.subtitle', 'Stop receiving messages')}
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>
        </>
    );

    const renderReport = () => (
        <>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setMode('menu')}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                    {t('report.title', 'Report User')}
                </Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    {t('report.selectReason', 'Select a reason')}
                </Text>

                <View style={styles.reasonList}>
                    {REPORT_REASONS.map((reason) => (
                        <TouchableOpacity
                            key={reason.id}
                            style={[
                                styles.reasonOption,
                                { borderColor: selectedReason === reason.id ? colors.primary : colors.border },
                                selectedReason === reason.id && { backgroundColor: colors.primary + '10' }
                            ]}
                            onPress={() => setSelectedReason(reason.id)}
                        >
                            <View style={[
                                styles.radioButton,
                                { borderColor: selectedReason === reason.id ? colors.primary : colors.border }
                            ]}>
                                {selectedReason === reason.id && (
                                    <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                                )}
                            </View>
                            <Text style={[styles.reasonText, { color: colors.textPrimary }]}>
                                {t(reason.labelKey, reason.id)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    {t('report.additionalDetails', 'Additional details (optional)')}
                </Text>
                <TextInput
                    style={[styles.textArea, { borderColor: colors.border, color: colors.textPrimary }]}
                    value={details}
                    onChangeText={setDetails}
                    placeholder={t('report.detailsPlaceholder', 'Describe what happened...')}
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    maxLength={500}
                />
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: selectedReason ? '#EF4444' : colors.border }]}
                    onPress={handleReport}
                    disabled={!selectedReason || loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <Text style={styles.submitButtonText}>
                            {t('report.submit', 'Submit Report')}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </>
    );

    const renderBlock = () => (
        <>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setMode('menu')}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                    {t('block.title', 'Block User')}
                </Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                <View style={[styles.warningBox, { backgroundColor: '#64748B10' }]}>
                    <Ionicons name="information-circle" size={24} color="#64748B" />
                    <Text style={[styles.warningText, { color: colors.textSecondary }]}>
                        {t('block.warning', `Blocking ${userName} will:\n\n• Stop all messages from them\n• Hide your profile from them\n• End any active conversations\n\nYou can unblock users anytime in settings.`)}
                    </Text>
                </View>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.cancelButton, { borderColor: colors.border }]}
                    onPress={() => setMode('menu')}
                >
                    <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                        {t('common.cancel', 'Cancel')}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.blockButton, { backgroundColor: '#64748B' }]}
                    onPress={handleBlock}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <Text style={styles.blockButtonText}>
                            {t('block.confirm', 'Block User')}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: colors.surface }]}>
                    {mode === 'menu' && renderMenu()}
                    {mode === 'report' && renderReport()}
                    {mode === 'block' && renderBlock()}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    container: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
    },
    title: { fontSize: 18, fontWeight: '600' },
    menuOptions: { padding: 16 },
    menuOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
    },
    menuIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    menuInfo: { flex: 1, marginLeft: 12 },
    menuTitle: { fontSize: 16, fontWeight: '600' },
    menuSubtitle: { fontSize: 13, marginTop: 2 },
    content: { padding: 16 },
    sectionLabel: { fontSize: 13, marginBottom: 8, fontWeight: '500' },
    reasonList: { marginBottom: 16 },
    reasonOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 8,
    },
    radioButton: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    radioInner: { width: 10, height: 10, borderRadius: 5 },
    reasonText: { marginLeft: 12, fontSize: 15 },
    textArea: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    warningBox: { padding: 16, borderRadius: 12, flexDirection: 'row', gap: 12 },
    warningText: { flex: 1, fontSize: 14, lineHeight: 22 },
    actions: { flexDirection: 'row', padding: 16, gap: 12 },
    submitButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
    cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
    cancelButtonText: { fontSize: 16, fontWeight: '600' },
    blockButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    blockButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
