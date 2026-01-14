import React from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../app/i18n/hooks';
import { useDesignTokens } from '../contexts/ThemeContext';

interface LimitReachedModalProps {
    visible: boolean;
    limit: number;
    resetAt?: string;
    onUpgrade: () => void;
    onClose: () => void;
}

/**
 * Modal shown when user reaches their daily analysis limit
 * Prompts them to upgrade to Premium
 */
export default function LimitReachedModal({
    visible,
    limit,
    resetAt,
    onUpgrade,
    onClose,
}: LimitReachedModalProps) {
    const { t } = useI18n();
    const tokens = useDesignTokens();

    const formatResetTime = (isoDate?: string) => {
        if (!isoDate) return '';
        const date = new Date(isoDate);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: tokens.colors?.surface || '#fff' }]}>
                    {/* Icon */}
                    <View style={[styles.iconContainer, { backgroundColor: (tokens.colors?.warning || '#FF9800') + '20' }]}>
                        <Ionicons name="flash" size={32} color={tokens.colors?.warning || '#FF9800'} />
                    </View>

                    {/* Title */}
                    <Text style={[styles.title, { color: tokens.colors?.textPrimary || '#212121' }]}>
                        {t('limits.title', 'Daily Limit Reached')}
                    </Text>

                    {/* Description */}
                    <Text style={[styles.description, { color: tokens.colors?.textSecondary || '#666' }]}>
                        {t('limits.description', `You've used all ${limit} free analyses for today.`)}
                    </Text>

                    {resetAt && (
                        <Text style={[styles.resetTime, { color: tokens.colors?.textSecondary || '#666' }]}>
                            {t('limits.resetsAt', 'Resets at')} {formatResetTime(resetAt)}
                        </Text>
                    )}

                    {/* Upgrade benefit */}
                    <View style={[styles.benefitBox, { backgroundColor: (tokens.colors?.primary || '#4CAF50') + '10' }]}>
                        <Ionicons name="infinite" size={20} color={tokens.colors?.primary || '#4CAF50'} />
                        <Text style={[styles.benefitText, { color: tokens.colors?.textPrimary || '#212121' }]}>
                            {t('limits.unlimitedBenefit', 'Premium users get unlimited analyses')}
                        </Text>
                    </View>

                    {/* Buttons */}
                    <TouchableOpacity
                        style={[styles.upgradeButton, { backgroundColor: tokens.colors?.primary || '#4CAF50' }]}
                        onPress={onUpgrade}
                    >
                        <Text style={styles.upgradeButtonText}>
                            {t('limits.upgradeToPremium', 'Upgrade to Premium')}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                        <Text style={[styles.cancelButtonText, { color: tokens.colors?.textSecondary || '#666' }]}>
                            {t('common.cancel', 'Cancel')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    container: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    description: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 4,
    },
    resetTime: {
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 16,
    },
    benefitBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
        gap: 8,
    },
    benefitText: {
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
    upgradeButton: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
    },
    upgradeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButton: {
        paddingVertical: 8,
    },
    cancelButtonText: {
        fontSize: 14,
    },
});
