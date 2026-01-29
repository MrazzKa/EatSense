/**
 * SuggestProgramCard - Card for suggesting new diet/lifestyle programs
 * Shows dashed border with + icon, opens modal for input
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    Modal,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../../app/i18n/hooks';
import ApiService from '../../services/apiService';

interface SuggestProgramCardProps {
    type?: 'diet' | 'lifestyle';
}

export default function SuggestProgramCard({ type: _type = 'lifestyle' }: SuggestProgramCardProps) {
    const { colors } = useTheme();
    const { t } = useI18n();

    const [modalVisible, setModalVisible] = useState(false);
    const [userName, setUserName] = useState('');
    const [request, setRequest] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!userName.trim()) {
            Alert.alert(
                t('common.error') || 'Ошибка',
                t('suggest.name_required') || 'Введите ваше имя',
            );
            return;
        }
        if (!request.trim()) {
            Alert.alert(
                t('common.error') || 'Ошибка',
                t('suggest.request_required') || 'Введите ваш запрос',
            );
            return;
        }

        setSubmitting(true);
        try {
            await ApiService.sendContactRequest(userName.trim(), request.trim());
            Alert.alert('🎉', t('suggest.contact_success') || 'Ваш запрос отправлен');
            setModalVisible(false);
            setUserName('');
            setRequest('');
        } catch (error: any) {
            console.error('[SuggestProgram] Error:', error);
            Alert.alert(
                t('common.error') || 'Ошибка',
                error?.message || t('suggest.error') || 'Не удалось отправить запрос',
            );
        } finally {
            setSubmitting(false);
        }
    };

    const styles = StyleSheet.create({
        card: {
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 20,
            marginHorizontal: 16,
            marginVertical: 12,
            borderWidth: 1, // Solid border looks better than dashed usually, but sticking to existing design if preferred. User said "crooked", let's make it cleaner.
            borderColor: colors.primary,
            borderStyle: 'dashed',
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
        },
        cardContent: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        icon: {
            marginRight: 16,
            backgroundColor: colors.primary + '15',
            padding: 8,
            borderRadius: 12,
        },
        textContainer: {
            flex: 1,
        },
        title: {
            fontSize: 16,
            fontWeight: '600',
            color: colors.textPrimary,
            marginBottom: 4,
        },
        subtitle: {
            fontSize: 14,
            color: colors.textSecondary,
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
        },
        keyboardAvoid: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
        },
        modalContentWrapper: {
            width: '100%',
            maxWidth: 400,
        },
        modalContent: {
            backgroundColor: colors.background,
            borderRadius: 24,
            padding: 24,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 8,
        },
        modalTitle: {
            fontSize: 22,
            fontWeight: '700',
            color: colors.textPrimary,
            marginBottom: 20,
            textAlign: 'center',
        },
        input: {
            backgroundColor: colors.surfaceSecondary || colors.surface,
            borderRadius: 12,
            padding: 16,
            fontSize: 16,
            color: colors.textPrimary,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.border,
        },
        textArea: {
            height: 120,
            textAlignVertical: 'top',
        },
        buttonRow: {
            flexDirection: 'row',
            gap: 12,
            marginTop: 8,
        },
        cancelButton: {
            flex: 1,
            padding: 16,
            borderRadius: 12,
            backgroundColor: colors.surfaceSecondary,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
        },
        submitButton: {
            flex: 1,
            padding: 16,
            borderRadius: 12,
            backgroundColor: colors.primary,
            alignItems: 'center',
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 3,
        },
        cancelText: {
            color: colors.textPrimary,
            fontWeight: '600',
            fontSize: 16,
        },
        submitText: {
            color: '#FFF',
            fontWeight: '600',
            fontSize: 16,
        },
    });

    return (
        <>
            <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => setModalVisible(true)}>
                <View style={styles.cardContent}>
                    <Ionicons
                        name="bulb-outline"
                        size={28}
                        color={colors.primary}
                        style={styles.icon}
                    />
                    <View style={styles.textContainer}>
                        <Text style={styles.title}>
                            {t('suggest.title') || 'Предложения'}
                        </Text>
                        <Text style={styles.subtitle}>
                            {t('suggest.subtitle') || 'Напишите нам — имя и запрос'}
                        </Text>
                    </View>
                    <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={colors.textSecondary}
                    />
                </View>
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={styles.keyboardAvoid}
                    >
                        <TouchableOpacity
                            activeOpacity={1}
                            onPress={() => setModalVisible(false)} // Close when clicking outside
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.modalContentWrapper}>
                            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                                <View style={styles.modalContent}>
                                    <Text style={styles.modalTitle}>
                                        {t('suggest.modal_title') || 'Предложения'}
                                    </Text>

                                    <TextInput
                                        style={styles.input}
                                        placeholder={t('suggest.name_placeholder') || 'Ваше имя'}
                                        placeholderTextColor={colors.textTertiary}
                                        value={userName}
                                        onChangeText={setUserName}
                                    />

                                    <TextInput
                                        style={[styles.input, styles.textArea]}
                                        placeholder={t('suggest.request_placeholder') || 'Ваш запрос'}
                                        placeholderTextColor={colors.textTertiary}
                                        value={request}
                                        onChangeText={setRequest}
                                        multiline
                                    />

                                    <View style={styles.buttonRow}>
                                        <TouchableOpacity
                                            style={styles.cancelButton}
                                            onPress={() => setModalVisible(false)}
                                        >
                                            <Text style={styles.cancelText}>
                                                {t('common.cancel') || 'Отмена'}
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.submitButton, submitting && { opacity: 0.6 }]}
                                            onPress={handleSubmit}
                                            disabled={submitting}
                                        >
                                            {submitting ? (
                                                <ActivityIndicator color="#FFF" size="small" />
                                            ) : (
                                                <Text style={styles.submitText}>
                                                    {t('suggest.submit') || 'Отправить'}
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </>
    );
}
