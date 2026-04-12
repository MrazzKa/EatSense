// @ts-nocheck
import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useDesignTokens } from '../../contexts/ThemeContext';
import { useI18n } from '../../../app/i18n/hooks';
import MarketplaceService from '../../services/marketplaceService';

export default function ReviewModal({ visible, expertId, conversationId, onClose, onSubmitted }) {
    const themeContext = useTheme();
    const tokens = useDesignTokens();
    const colors = themeContext?.colors || {};
    const { t } = useI18n();

    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

    const handleSubmit = async () => {
        if (rating === 0) return;
        setSubmitting(true);
        try {
            await MarketplaceService.createReview(expertId, rating, comment.trim() || undefined, conversationId);
            onSubmitted?.();
            onClose();
            setRating(0);
            setComment('');
        } catch (err) {
            Alert.alert(t('common.error') || 'Error', t('experts.request_error') || 'Failed to submit review');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        onClose();
        setRating(0);
        setComment('');
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.overlay}
            >
                <View style={styles.backdrop}>
                    <TouchableOpacity style={styles.backdropTouch} onPress={handleClose} activeOpacity={1} />
                </View>
                <View style={styles.sheet}>
                    <View style={styles.handle} />
                    <Text style={styles.title}>{t('experts.leaveReview') || 'Leave a Review'}</Text>

                    {/* Stars */}
                    <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity key={star} onPress={() => setRating(star)} style={styles.starButton}>
                                <Ionicons
                                    name={star <= rating ? 'star' : 'star-outline'}
                                    size={36}
                                    color={star <= rating ? '#FFC107' : colors.border || '#D1D5DB'}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>

                    {rating > 0 && (
                        <Text style={styles.ratingLabel}>
                            {rating === 5
                                ? (t('experts.ratingExcellent') || 'Excellent')
                                : rating === 4
                                    ? (t('experts.ratingGood') || 'Good')
                                    : rating === 3
                                        ? (t('experts.ratingAverage') || 'Average')
                                        : rating === 2
                                            ? (t('experts.ratingBelowAverage') || 'Below Average')
                                            : (t('experts.ratingPoor') || 'Poor')}
                        </Text>
                    )}

                    {/* Comment */}
                    <TextInput
                        style={styles.commentInput}
                        placeholder={t('experts.reviewPlaceholder') || 'Share your experience (optional)'}
                        placeholderTextColor={colors.textSecondary || '#9CA3AF'}
                        value={comment}
                        onChangeText={setComment}
                        multiline
                        maxLength={500}
                        textAlignVertical="top"
                    />

                    {/* Buttons */}
                    <View style={styles.buttonsRow}>
                        <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                            <Text style={styles.cancelText}>{t('common.cancel') || 'Cancel'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.submitButton, rating === 0 && styles.submitDisabled]}
                            onPress={handleSubmit}
                            disabled={rating === 0 || submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Text style={styles.submitText}>{t('experts.submitReview') || 'Submit'}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const createStyles = (tokens, colors) => StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    backdropTouch: {
        flex: 1,
    },
    sheet: {
        backgroundColor: colors.surface || '#FFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 24,
        paddingBottom: 40,
        paddingTop: 12,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: colors.border || '#D1D5DB',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary || '#212121',
        textAlign: 'center',
        marginBottom: 20,
    },
    starsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 8,
    },
    starButton: {
        padding: 4,
    },
    ratingLabel: {
        fontSize: 14,
        color: colors.textSecondary || '#6B7280',
        textAlign: 'center',
        marginBottom: 16,
    },
    commentInput: {
        backgroundColor: colors.background || '#F9FAFB',
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        color: colors.textPrimary || '#212121',
        minHeight: 100,
        borderWidth: 1,
        borderColor: colors.border || '#E5E7EB',
        marginBottom: 20,
    },
    buttonsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: colors.surfaceSecondary || '#F3F4F6',
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.textSecondary || '#6B7280',
    },
    submitButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: colors.primary || '#4CAF50',
        alignItems: 'center',
    },
    submitDisabled: {
        opacity: 0.5,
    },
    submitText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
});
