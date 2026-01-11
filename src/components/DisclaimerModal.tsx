import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import MarketplaceService from '../services/marketplaceService';

interface DisclaimerModalProps {
    visible: boolean;
    onAccept: () => void;
    onDecline: () => void;
    disclaimerType?: string;
}

/**
 * DisclaimerModal - Shows legal disclaimer before accessing expert chat
 */
export default function DisclaimerModal({
    visible,
    onAccept,
    onDecline,
    disclaimerType = 'experts_chat'
}: DisclaimerModalProps) {
    const { colors } = useTheme();
    const { t } = useI18n();
    const [loading, setLoading] = useState(false);
    const [checked, setChecked] = useState(false);

    const handleAccept = async () => {
        if (!checked) return;

        try {
            setLoading(true);
            await MarketplaceService.acceptDisclaimer(disclaimerType);
            onAccept();
        } catch (error) {
            console.error('Failed to accept disclaimer:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onDecline}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: colors.surface }]}>
                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: colors.border }]}>
                        <Ionicons name="shield-checkmark" size={28} color={colors.primary} />
                        <Text style={[styles.title, { color: colors.textPrimary }]}>
                            {t('disclaimer.title', 'Important Notice')}
                        </Text>
                    </View>

                    {/* Content */}
                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        <Text style={[styles.paragraph, { color: colors.textPrimary }]}>
                            {t('disclaimer.intro', 'Before starting a consultation with an expert, please read and accept the following terms:')}
                        </Text>

                        <View style={styles.section}>
                            <View style={[styles.bulletPoint, { backgroundColor: colors.primary + '20' }]}>
                                <Ionicons name="information-circle" size={18} color={colors.primary} />
                            </View>
                            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
                                {t('disclaimer.point1', 'Information provided by experts is for general guidance only and should not replace professional medical advice.')}
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <View style={[styles.bulletPoint, { backgroundColor: colors.primary + '20' }]}>
                                <Ionicons name="medkit" size={18} color={colors.primary} />
                            </View>
                            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
                                {t('disclaimer.point2', 'Always consult with your doctor before making significant changes to your diet or health regimen.')}
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <View style={[styles.bulletPoint, { backgroundColor: colors.primary + '20' }]}>
                                <Ionicons name="lock-closed" size={18} color={colors.primary} />
                            </View>
                            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
                                {t('disclaimer.point3', 'Your conversations are private. Do not share sensitive personal information beyond what is necessary.')}
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <View style={[styles.bulletPoint, { backgroundColor: '#EF444420' }]}>
                                <Ionicons name="warning" size={18} color="#EF4444" />
                            </View>
                            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
                                {t('disclaimer.point4', 'If you experience a medical emergency, contact emergency services immediately.')}
                            </Text>
                        </View>
                    </ScrollView>

                    {/* Checkbox */}
                    <TouchableOpacity
                        style={[styles.checkboxRow, { borderTopColor: colors.border }]}
                        onPress={() => setChecked(!checked)}
                    >
                        <View style={[
                            styles.checkbox,
                            { borderColor: checked ? colors.primary : colors.border },
                            checked && { backgroundColor: colors.primary }
                        ]}>
                            {checked && <Ionicons name="checkmark" size={16} color="#FFF" />}
                        </View>
                        <Text style={[styles.checkboxText, { color: colors.textPrimary }]}>
                            {t('disclaimer.accept', 'I have read and accept these terms')}
                        </Text>
                    </TouchableOpacity>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.declineButton, { borderColor: colors.border }]}
                            onPress={onDecline}
                        >
                            <Text style={[styles.declineButtonText, { color: colors.textSecondary }]}>
                                {t('common.cancel', 'Cancel')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.acceptButton,
                                { backgroundColor: checked ? colors.primary : colors.border }
                            ]}
                            onPress={handleAccept}
                            disabled={!checked || loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Text style={styles.acceptButtonText}>
                                    {t('common.continue', 'Continue')}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 20,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    content: {
        padding: 20,
    },
    paragraph: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 20,
    },
    section: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
        gap: 12,
    },
    bulletPoint: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        gap: 12,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxText: {
        flex: 1,
        fontSize: 15,
    },
    actions: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
    },
    declineButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
    },
    declineButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    acceptButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    acceptButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
