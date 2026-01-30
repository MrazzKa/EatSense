import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../../app/i18n/hooks';
import PrimaryButton from '../../components/common/PrimaryButton';
import { LinearGradient } from 'expo-linear-gradient';

interface PremiumLockModalProps {
    visible: boolean;
    onClose: () => void;
    onUnlock: () => void;
}

export default function PremiumLockModal({ visible, onClose, onUnlock }: PremiumLockModalProps) {
    const { colors, isDark } = useTheme();
    const { t } = useI18n();

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.container}>

                {Platform.OS === 'ios' ? (
                    <BlurView intensity={isDark ? 80 : 40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)' }]} />
                )}

                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose}>
                    <View style={{ flex: 1 }} />
                </TouchableOpacity>

                <View style={[styles.content, { backgroundColor: colors.card || '#FFF' }]}>
                    <LinearGradient
                        colors={[colors.primary + '10', 'transparent']}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                    />

                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Ionicons name="close" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <View style={styles.iconContainer}>
                        <LinearGradient
                            colors={['#FFD700', '#FFA500']}
                            style={styles.iconBackground}
                        >
                            <Ionicons name="lock-closed" size={32} color="#FFF" />
                        </LinearGradient>
                    </View>

                    <Text style={[styles.title, { color: colors.textPrimary }]}>
                        {t('premium.lock_title') || 'Unlock Premium Content'}
                    </Text>

                    <Text style={[styles.description, { color: colors.textSecondary }]}>
                        {t('premium.lock_desc') || 'Get unlimited access to all logic, diets, and features with EatSense Pro.'}
                    </Text>

                    <View style={styles.features}>
                        {[
                            t('premium.feature.diets') || 'All Premium Diets',
                            t('premium.feature.lifestyles') || 'Lifestyle Programs',
                            t('premium.feature.tracker') || 'Advanced Progress Tracking',
                        ].map((feature, i) => (
                            <View key={i} style={styles.featureRow}>
                                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                                <Text style={[styles.featureText, { color: colors.textPrimary }]}>{feature}</Text>
                            </View>
                        ))}
                    </View>

                    <PrimaryButton
                        title={t('premium.start_trial') || 'Start 7-Day Free Trial'}
                        onPress={onUnlock}
                        style={styles.button as any}
                    />

                    <TouchableOpacity onPress={onUnlock} style={styles.restoreButton}>
                        <Text style={[styles.restoreText, { color: colors.textSecondary }]}>
                            {t('premium.restore') || 'Restore Purchases'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    content: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
        overflow: 'hidden',
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
        padding: 4,
    },
    iconContainer: {
        marginBottom: 16,
        shadowColor: '#FFA500',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    iconBackground: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
    },
    description: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    features: {
        width: '100%',
        marginBottom: 24,
        gap: 12,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    featureText: {
        fontSize: 15,
        fontWeight: '500',
    },
    button: {
        width: '100%',
    },
    restoreButton: {
        marginTop: 16,
        padding: 8,
    },
    restoreText: {
        fontSize: 13,
        fontWeight: '500',
    },
});
