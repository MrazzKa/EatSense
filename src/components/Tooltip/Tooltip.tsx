/**
 * Tooltip - Visual tooltip component for onboarding hints
 * Shows a tooltip with text and optional action button
 */
import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Dimensions,
    LayoutRectangle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../../app/i18n/hooks';
import { useTheme } from '../../contexts/ThemeContext';
import { useTooltip, TooltipId } from './TooltipContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOOLTIP_MAX_WIDTH = SCREEN_WIDTH - 48;

// Arrow direction based on tooltip position
type ArrowPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
    // Unique ID for this tooltip
    id: TooltipId;
    // Text content for the tooltip
    text: string;
    // Optional title
    title?: string;
    // Position of the arrow (where the tooltip points)
    arrowPosition?: ArrowPosition;
    // Custom style for positioning
    style?: object;
    // Target element's layout for positioning the arrow
    targetLayout?: LayoutRectangle;
    // Callback when tooltip is dismissed
    onDismiss?: () => void;
    // Show "Got it" button
    showButton?: boolean;
    // Custom button text
    buttonText?: string;
    // Horizontal offset for arrow (e.g., 'right' to align arrow to right side for right-aligned tooltips)
    arrowHorizontalAlign?: 'left' | 'center' | 'right';
}

export default function Tooltip({
    id,
    text,
    title,
    arrowPosition = 'bottom',
    arrowHorizontalAlign = 'center',
    style,
    onDismiss,
    showButton = true,
    buttonText,
}: TooltipProps) {
    const { t } = useI18n();
    const { colors } = useTheme();
    const { shouldShowTooltip, dismissTooltip } = useTooltip();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    const shouldShow = shouldShowTooltip(id);

    useEffect(() => {
        if (shouldShow) {
            // Animate in
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 100,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [shouldShow, fadeAnim, scaleAnim]);

    const handleDismiss = async () => {
        // Animate out
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 0.9,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(async () => {
            await dismissTooltip(id);
            onDismiss?.();
        });
    };


    if (!shouldShow) {
        return null;
    }

    const arrowStyle = {
        top: styles.arrowTop,
        bottom: styles.arrowBottom,
        left: styles.arrowLeft,
        right: styles.arrowRight,
    }[arrowPosition];

    // Calculate arrow horizontal position based on arrowHorizontalAlign
    const getArrowHorizontalStyle = () => {
        if (arrowPosition === 'left' || arrowPosition === 'right') {
            return {}; // Horizontal alignment doesn't apply to left/right arrows
        }
        switch (arrowHorizontalAlign) {
            case 'left':
                return { left: 20, marginLeft: 0 };
            case 'right':
                return { left: undefined, right: 20, marginLeft: 0 };
            case 'center':
            default:
                return { left: '50%' as const, marginLeft: -10 };
        }
    };

    return (
        <Animated.View
            style={[
                styles.container,
                style,
                {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                },
            ]}
        >
            {/* Arrow */}
            <View
                style={[
                    styles.arrow,
                    arrowStyle,
                    getArrowHorizontalStyle(),
                    { borderBottomColor: colors.primary || '#4CAF50' },
                ]}
            />

            {/* Content */}
            <View style={[styles.content, { backgroundColor: colors.primary || '#4CAF50' }]}>
                {/* Close button */}
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={handleDismiss}
                    hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                >
                    <Ionicons name="close" size={18} color="#FFF" />
                </TouchableOpacity>

                {/* Title */}
                {title && (
                    <Text style={styles.title}>{title}</Text>
                )}

                {/* Text */}
                <Text style={styles.text}>{text}</Text>

                {/* Action button */}
                {showButton && (
                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleDismiss}
                    >
                        <Text style={[styles.buttonText, { color: colors.primary || '#4CAF50' }]}>
                            {buttonText || t('common.gotIt') || 'Got it'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        // FIX: Increased z-index to ensure tooltip is always visible above FAB and other components
        zIndex: 9999,
        elevation: 9999, // Android requires elevation for z-order
        maxWidth: TOOLTIP_MAX_WIDTH,
    },
    content: {
        borderRadius: 12,
        padding: 16,
        paddingRight: 32, // Room for close button
    },
    arrow: {
        width: 0,
        height: 0,
        borderLeftWidth: 10,
        borderRightWidth: 10,
        borderBottomWidth: 10,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        position: 'absolute',
    },
    arrowTop: {
        top: -10,
        alignSelf: 'center',
        left: '50%',
        marginLeft: -10,
    },
    arrowBottom: {
        bottom: -10,
        alignSelf: 'center',
        left: '50%',
        marginLeft: -10,
        transform: [{ rotate: '180deg' }],
    },
    arrowLeft: {
        left: -10,
        top: '50%',
        marginTop: -5,
        transform: [{ rotate: '90deg' }],
    },
    arrowRight: {
        right: -10,
        top: '50%',
        marginTop: -5,
        transform: [{ rotate: '-90deg' }],
    },
    closeButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        padding: 4,
    },
    title: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 6,
    },
    text: {
        color: '#FFF',
        fontSize: 14,
        lineHeight: 20,
    },
    button: {
        marginTop: 12,
        backgroundColor: '#FFF',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
