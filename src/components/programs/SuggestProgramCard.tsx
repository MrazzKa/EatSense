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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../../app/i18n/hooks';
import ApiService from '../../services/apiService';

interface SuggestProgramCardProps {
    type?: 'diet' | 'lifestyle';
}

export default function SuggestProgramCard({ type = 'lifestyle' }: SuggestProgramCardProps) {
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
            Alert.alert('🎉', t('suggest.contact_success') || 'Ваш запрос отправлен на info@eatsense.ch');
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
            backgroundColor: colors.surface || '#FFF',
            borderRadius: 16,
            padding: 20,
            marginHorizontal: 16,
            marginVertical: 8,
            borderWidth: 2,
            borderColor: colors.border || '#E0E0E0',
            borderStyle: 'dashed',
        },
        cardContent: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        icon: {
            marginRight: 12,
        },
        textContainer: {
            flex: 1,
        },
        title: {
            fontSize: 16,
            fontWeight: '600',
            color: colors.textPrimary || '#212121',
        },
        subtitle: {
            fontSize: 14,
            color: colors.textSecondary || '#666',
            marginTop: 2,
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            padding: 20,
        },
        modalContent: {
            backgroundColor: colors.background || '#FFF',
            borderRadius: 20,
            padding: 24,
        },
        modalTitle: {
            fontSize: 20,
            fontWeight: '700',
            color: colors.textPrimary || '#212121',
            marginBottom: 16,
        },
        input: {
            backgroundColor: colors.surface || '#F5F5F5',
            borderRadius: 12,
            padding: 16,
            fontSize: 16,
            color: colors.textPrimary || '#212121',
            marginBottom: 12,
        },
        textArea: {
            height: 100,
            textAlignVertical: 'top',
        },
        buttonRow: {
            flexDirection: 'row',
            marginTop: 16,
        },
        cancelButton: {
            flex: 1,
            padding: 16,
            borderRadius: 12,
            backgroundColor: colors.surface || '#F5F5F5',
            marginRight: 8,
        },
        submitButton: {
            flex: 1,
            padding: 16,
            borderRadius: 12,
            backgroundColor: colors.primary || '#4CAF50',
            marginLeft: 8,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
        },
        cancelText: {
            textAlign: 'center',
            color: colors.textSecondary || '#666',
            fontWeight: '600',
            fontSize: 16,
        },
        submitText: {
            textAlign: 'center',
            color: '#FFF',
            fontWeight: '600',
            fontSize: 16,
        },
    });

    return (
        <>
            <TouchableOpacity style={styles.card} onPress={() => setModalVisible(true)}>
                <View style={styles.cardContent}>
                    <Ionicons
                        name="add-circle-outline"
                        size={32}
                        color={colors.primary || '#4CAF50'}
                        style={styles.icon}
                    />
                    <View style={styles.textContainer}>
                        <Text style={styles.title}>
                            {t('suggest.title') || 'Предложения'}
                        </Text>
                        <Text style={styles.subtitle}>
                            {t('suggest.subtitle') || 'Напишите нам — имя, запрос. Письмо уйдёт на info@eatsense.ch'}
                        </Text>
                    </View>
                    <Ionicons
                        name="chevron-forward"
                        size={24}
                        color={colors.textSecondary || '#999'}
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
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {t('suggest.modal_title') || 'Предложения'}
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder={t('suggest.name_placeholder') || 'Ваше имя'}
                            placeholderTextColor={colors.textSecondary || '#999'}
                            value={userName}
                            onChangeText={setUserName}
                            autoFocus
                        />

                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder={t('suggest.request_placeholder') || 'Ваш запрос'}
                            placeholderTextColor={colors.textSecondary || '#999'}
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
                </View>
            </Modal>
        </>
    );
}
