import React from 'react';
import { Platform, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../contexts/ThemeContext';

type GlassIntensity = 'subtle' | 'medium' | 'strong';

interface GlassSurfaceProps extends ViewProps {
    intensity?: GlassIntensity;
    /** Override style of the outer wrapper. Use this for layout (margin/position). */
    style?: ViewStyle | ViewStyle[];
    /** Override style of the inner content layer. Use this for padding/border. */
    contentStyle?: ViewStyle | ViewStyle[];
    /** When true, surface uses the brand-tinted glass for emphasis. */
    branded?: boolean;
}

const INTENSITY_MAP: Record<GlassIntensity, { ios: number; android: number; tintAlpha: number }> = {
    subtle: { ios: 24, android: 14, tintAlpha: 0.55 },
    medium: { ios: 40, android: 22, tintAlpha: 0.7 },
    strong: { ios: 60, android: 32, tintAlpha: 0.82 },
};

/**
 * Cross-platform translucent surface.
 * iOS: native UIVisualEffectView (systemMaterial / systemThinMaterial).
 * Android: expo-blur experimentalBlurMethod when supported, else tinted solid surface.
 *
 * On iOS 26+ devices the system blur picks up Liquid Glass automatically through
 * the `systemUltraThinMaterial` tint family.
 */
export function GlassSurface({
    intensity = 'medium',
    branded = false,
    style,
    contentStyle,
    children,
    ...rest
}: GlassSurfaceProps) {
    const { colors, isDark } = useTheme();
    const conf = INTENSITY_MAP[intensity];
    const tint = isDark ? 'dark' : 'light';

    const surfaceColor = branded
        ? (colors.primary || '#4CAF50')
        : (colors.surface || (isDark ? '#1C1C1E' : '#FFFFFF'));

    const tintedFallback: ViewStyle = {
        backgroundColor: hexWithAlpha(surfaceColor, conf.tintAlpha),
    };

    if (Platform.OS === 'ios') {
        return (
            <View style={[styles.wrapper, style]} {...rest}>
                <BlurView
                    intensity={conf.ios}
                    tint={branded ? tint : 'systemMaterial' as any}
                    style={StyleSheet.absoluteFill}
                />
                {branded && (
                    <View
                        pointerEvents="none"
                        style={[StyleSheet.absoluteFill, { backgroundColor: hexWithAlpha(surfaceColor, 0.18) }]}
                    />
                )}
                <View style={[styles.content, contentStyle]}>{children}</View>
            </View>
        );
    }

    // Android: try real blur, but always paint a tinted fallback so it never reads as transparent.
    return (
        <View style={[styles.wrapper, tintedFallback, style]} {...rest}>
            <BlurView
                intensity={conf.android}
                tint={tint}
                experimentalBlurMethod="dimezisBlurView"
                style={StyleSheet.absoluteFill}
            />
            {branded && (
                <View
                    pointerEvents="none"
                    style={[StyleSheet.absoluteFill, { backgroundColor: hexWithAlpha(surfaceColor, 0.22) }]}
                />
            )}
            <View style={[styles.content, contentStyle]}>{children}</View>
        </View>
    );
}

function hexWithAlpha(hex: string, alpha: number): string {
    if (!hex.startsWith('#')) return hex;
    const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
        .toString(16)
        .padStart(2, '0')
        .toUpperCase();
    if (hex.length === 7) return hex + a;
    if (hex.length === 9) return hex.slice(0, 7) + a;
    return hex;
}

const styles = StyleSheet.create({
    wrapper: {
        overflow: 'hidden',
    },
    content: {
        position: 'relative',
    },
});
