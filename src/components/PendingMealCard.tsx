import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import type { PendingAnalysis } from '../contexts/AnalysisContext';
import { formatCalories, formatMacro } from '../utils/nutritionFormat';

interface PendingMealCardProps {
    analysis: PendingAnalysis;
    onPress: () => void;
    onRetry?: () => void;

}

/**
 * Get elapsed time string (e.g., "15 sec ago", "2 min ago")
 */
function getElapsedTime(startedAt: number): string {
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    if (elapsed < 60) {
        return `${elapsed}s`;
    }
    return `${Math.floor(elapsed / 60)}m`;
}

/**
 * Card component for displaying pending/processing analyses in the Diary
 */
export function PendingMealCard({
    analysis,
    onPress,
    onRetry,

}: PendingMealCardProps) {
    const { colors } = useTheme();
    const { t } = useI18n();

    // Fade-out animation for completing analyses
    const fadeAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (analysis.isCompletingAnimation) {
            // Start fade-out animation
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }).start();
        }
    }, [analysis.isCompletingAnimation, fadeAnim]);

    const { status, localPreviewUri, imageUrl, errorMessage } = analysis;

    // Determine display image (prefer server URL, fallback to local preview)
    const displayImage = imageUrl || localPreviewUri;

    // Rotating analysis phrases - moved from inside switch to component level
    const PHRASE_INTERVAL_MS = 6000;
    const phrases = React.useMemo(() => [
        t('analysis.loading.analyzingPhoto') || 'Analyzing photo...',
        t('analysis.loading.detectingFood') || 'Detecting food...',
        t('analysis.loading.identifyingIngredients') || 'Identifying ingredients...',
        t('analysis.loading.measuringPortions') || 'Measuring portions...',
        t('analysis.loading.calculatingCalories') || 'Calculating calories...',
        t('analysis.loading.analyzingProteins') || 'Analyzing proteins...',
        t('analysis.loading.analyzingFats') || 'Analyzing fats...',
        t('analysis.loading.analyzingCarbs') || 'Analyzing carbs...',
        t('analysis.loading.checkingNutrients') || 'Checking nutrients...',
        t('analysis.loading.consultingDatabase') || 'Consulting database...',
        t('analysis.loading.verifyingData') || 'Verifying data...',
        t('analysis.loading.preparingResults') || 'Preparing results...',
        t('analysis.loading.almostDone') || 'Almost done...',
        t('analysis.loading.finishingUp') || 'Finishing up...',
        t('analysis.loading.justAMoment') || 'Just a moment...',
    ], [t]);

    const [phraseIndex, setPhraseIndex] = React.useState(0);

    React.useEffect(() => {
        if (status !== 'processing') return;
        const interval = setInterval(() => {
            setPhraseIndex(prev => {
                if (prev >= phrases.length - 1) {
                    return phrases.length - 3;
                }
                return prev + 1;
            });
        }, PHRASE_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [status, phrases.length]);

    // Status-specific rendering
    const renderStatusContent = () => {
        switch (status) {
            case 'processing':
                return (
                    <View style={styles.statusContainer}>
                        <View style={styles.statusTextContainer}>
                            <Text style={[styles.statusTitle, { color: colors.text }]}>
                                {phrases[phraseIndex]}
                            </Text>
                            <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>
                                {t('dashboard.diary.analyzingHint') || 'This may take up to 2 minutes'}
                            </Text>
                        </View>
                    </View>
                );

            case 'failed':
                return (
                    <View style={styles.statusContainer}>
                        <Ionicons name="alert-circle" size={24} color={colors.error || '#FF3B30'} />
                        <View style={styles.statusTextContainer}>
                            <Text style={[styles.statusTitle, { color: colors.error || '#FF3B30' }]}>
                                {t('dashboard.diary.failed') || 'Analysis failed'}
                            </Text>
                            <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                                {errorMessage || t('dashboard.diary.failedHint') || 'Tap to retry'}
                            </Text>
                        </View>
                        {onRetry && (
                            <TouchableOpacity
                                style={[styles.retryButton, { backgroundColor: colors.primary }]}
                                onPress={onRetry}
                            >
                                <Text style={[styles.retryButtonText, { color: colors.onPrimary }]}>
                                    {t('common.retry') || 'Retry'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                );

            case 'needs_review':
                return (
                    <View style={styles.statusContainer}>
                        <Ionicons name="warning" size={24} color={colors.warning || '#FF9500'} />
                        <View style={styles.statusTextContainer}>
                            <Text style={[styles.statusTitle, { color: colors.warning || '#FF9500' }]}>
                                {t('dashboard.diary.needsReview') || 'Needs review'}
                            </Text>
                            <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                                {t('dashboard.diary.needsReviewHint') || 'Could not calculate nutrition'}
                            </Text>
                        </View>
                        {onRetry && (
                            <TouchableOpacity
                                style={[styles.retryButton, { backgroundColor: colors.primary }]}
                                onPress={onRetry}
                            >
                                <Text style={[styles.retryButtonText, { color: colors.onPrimary }]}>
                                    {t('common.rerun') || 'Re-run'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                );

            case 'completed':

                return (
                    <View style={styles.statusContainer}>
                        <View style={styles.statusTextContainer}>
                            <Text style={[styles.statusTitle, { color: colors.text }]} numberOfLines={1}>
                                {analysis.dishName || t('common.done') || 'Done!'}
                            </Text>
                            {analysis.calories !== null && analysis.calories !== undefined ? (
                                <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>
                                    {formatCalories(analysis.calories)} · P {formatMacro(analysis.protein || 0)} · C {formatMacro(analysis.carbs || 0)} · F {formatMacro(analysis.fat || 0)}
                                </Text>
                            ) : (
                                <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>
                                    {t('dashboard.diary.analysisComplete') || 'Analysis complete'}
                                </Text>
                            )}
                        </View>
                        <Ionicons name="checkmark-circle" size={24} color={colors.success || '#34C759'} />
                    </View>
                );

            default:
                return null;
        }
    };

    return (
        <Animated.View style={{ opacity: fadeAnim }}>
            <TouchableOpacity
                style={[
                    styles.container,
                    {
                        backgroundColor: colors.surface || colors.card,
                        borderColor: status === 'failed' ? (colors.error || '#FF3B30') :
                            status === 'needs_review' ? (colors.warning || '#FF9500') :
                                (colors.border || colors.borderMuted),
                    },
                ]}
                onPress={onPress}
                activeOpacity={0.7}
            >
                {/* Image section */}
                <View style={styles.imageContainer}>
                    {displayImage ? (
                        <Image
                            source={{ uri: displayImage }}
                            style={styles.image}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[styles.imagePlaceholder, { backgroundColor: colors.backgroundMuted }]}>
                            {status === 'processing' ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <Ionicons name="restaurant" size={24} color={colors.textTertiary} />
                            )}
                        </View>
                    )}

                    {/* Processing overlay */}
                    {status === 'processing' && displayImage && (
                        <View style={styles.imageOverlay}>
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        </View>
                    )}

                    {/* Elapsed time badge */}
                    {status === 'processing' && (
                        <View style={[styles.timeBadge, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                            <Text style={styles.timeBadgeText}>{getElapsedTime(analysis.startedAt)}</Text>
                        </View>
                    )}
                </View>

                {/* Content section */}
                <View style={styles.content}>
                    {renderStatusContent()}
                </View>

                {/* Chevron for navigation */}
                <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.textTertiary}
                    style={styles.chevron}
                />
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
    },
    imageContainer: {
        width: 56,
        height: 56,
        borderRadius: 10,
        overflow: 'hidden',
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    timeBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
    },
    timeBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        marginLeft: 12,
        marginRight: 8,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusTextContainer: {
        flex: 1,
        marginLeft: 10,
    },
    statusTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    statusSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    completedContainer: {
        flex: 1,
    },
    dishName: {
        fontSize: 15,
        fontWeight: '600',
    },
    macros: {
        fontSize: 12,
        marginTop: 2,
    },
    retryButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        marginLeft: 8,
    },
    retryButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    chevron: {
        marginLeft: 4,
    },
});

export default PendingMealCard;
