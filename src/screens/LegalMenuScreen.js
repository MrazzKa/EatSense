import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, SafeAreaView } from 'react-native'; // Removed SafeAreaView import causing conflict if already imported or similar
import { SafeAreaView as SafeAreaContext } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { openLegalLink } from '../utils/legal';

export default function LegalMenuScreen() {
    const navigation = useNavigation();
    const { colors, tokens } = useTheme();
    const { t } = useI18n();

    const styles = React.useMemo(() => createStyles(tokens, colors), [tokens, colors]);

    const menuItems = [
        {
            id: 'privacy',
            label: t('legal.privacyLink') || 'Privacy Policy',
            icon: 'shield-checkmark-outline',
            action: () => openLegalLink('privacy'),
        },
        {
            id: 'terms',
            label: t('legal.termsLink') || 'Terms of Use',
            icon: 'document-text-outline',
            action: () => openLegalLink('terms'),
        },
        {
            id: 'support',
            label: t('legal.supportLink') || 'Support',
            icon: 'help-buoy-outline',
            action: () => openLegalLink('support'),
        },
    ];

    return (
        <SafeAreaContext style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary || colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.textPrimary || colors.text }]}>
                    {t('profile.legal') || 'Legal'}
                </Text>
                <View style={styles.backButton} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[
                                styles.menuItem,
                                {
                                    backgroundColor: colors.surface,
                                    borderBottomWidth: index < menuItems.length - 1 ? 1 : 0,
                                    borderBottomColor: colors.borderMuted || '#E0E0E0'
                                }
                            ]}
                            onPress={item.action}
                        >
                            <View style={styles.menuItemContent}>
                                <Ionicons name={item.icon} size={24} color={colors.textSecondary || '#666'} style={styles.menuIcon} />
                                <Text style={[styles.menuLabel, { color: colors.textPrimary || colors.text }]}>
                                    {item.label}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary || '#999'} />
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaContext>
    );
}

const createStyles = (tokens, colors) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
        },
        backButton: {
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
        },
        headerTitle: {
            fontSize: 18,
            fontWeight: '600',
            flex: 1,
            textAlign: 'center',
        },
        content: {
            padding: 16,
        },
        section: {
            borderRadius: 12,
            overflow: 'hidden',
        },
        menuItem: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
        },
        menuItemContent: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        menuIcon: {
            marginRight: 12,
        },
        menuLabel: {
            fontSize: 16,
            fontWeight: '500',
        },
    });
