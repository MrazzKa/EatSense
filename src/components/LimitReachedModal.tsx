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

import { LinearGradient } from 'expo-linear-gradient';

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
                    <View style={[styles.iconContainer, { backgroundColor: (tokens.colors?.warning || '#F59E0B') + '20' }]}>
                        <Ionicons name="flash" size={32} color={tokens.colors?.warning || '#F59E0B'} />
                    </View>

                    {/* Title */}
                    <Text style={[styles.title, { color: tokens.colors?.textPrimary || '#111827' }]}>
                        {t('limits.title', 'Daily Limit Reached')}
                    </Text>

                    {/* Description */}
                    <Text style={[styles.description, { color: tokens.colors?.textSecondary || '#4B5563' }]}>
                        {t('limits.description', `You've used all ${limit} free analyses for today.`)}
                    </Text>

                    {resetAt && (
                        <Text style={[styles.resetTime, { color: tokens.colors?.textSecondary || '#4B5563' }]}>
                            {t('limits.resetsAt', 'Resets at')} {formatResetTime(resetAt)}
                        </Text>
                    )}

                    {/* Upgrade benefit */}
                    <View style={[styles.benefitBox, { backgroundColor: (tokens.colors?.primary || '#2563EB') + '10' }]}>
                        <Ionicons name="infinite" size={20} color={tokens.colors?.primary || '#2563EB'} />
                        <Text style={[styles.benefitText, { color: tokens.colors?.textPrimary || '#111827' }]}>
                            {t('limits.unlimitedBenefit', 'Premium users get unlimited analyses')}
                        </Text>
                    </View>

                    {/* Buttons */}
                    <TouchableOpacity
                        style={styles.upgradeButtonContainer}
                        onPress={onUpgrade}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#7C3AED', '#5B21B6']} // Purple gradient for premium
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.upgradeButton}
                        >
                            <Ionicons name="star" size={18} color="#FFF" style={{ marginRight: 8 }} />
                            <Text style={styles.upgradeButtonText}>
                                {t('limits.upgradeToPremium', 'Upgrade to Premium')}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.7}>
                        <Text style={[styles.cancelButtonText, { color: tokens.colors?.textSecondary || '#4B5563' }]}>
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
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    container: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
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
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 4,
        lineHeight: 22,
    },
    resetTime: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 16,
    },
    benefitBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
        marginBottom: 24,
        gap: 8,
        width: '100%',
    },
    benefitText: {
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    upgradeButtonContainer: {
        width: '100%',
        borderRadius: 14,
        marginBottom: 12,
        // Premium shadow
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    upgradeButton: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    upgradeButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },
    cancelButton: {
        paddingVertical: 10,
        width: '100%',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '500',
    },
});
