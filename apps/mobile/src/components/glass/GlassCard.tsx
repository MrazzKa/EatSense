import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { GlassSurface } from './GlassSurface';
import { useTheme, useDesignTokens } from '../../contexts/ThemeContext';

interface GlassCardProps {
    children?: React.ReactNode;
    style?: ViewStyle | ViewStyle[];
    /** Inner padding preset. Defaults to "lg". Pass null to skip padding. */
    padding?: 'sm' | 'md' | 'lg' | 'xl' | null;
    /** Soft brand tint behind the glass — for streaks, callouts, CTAs. */
    branded?: boolean;
    intensity?: 'subtle' | 'medium' | 'strong';
}

/**
 * High-level card primitive built on GlassSurface.
 * Adds a hairline outline + soft elevation so the surface reads as a "card",
 * not just a backdrop.
 */
export function GlassCard({
    children,
    style,
    padding = 'lg',
    branded = false,
    intensity = 'medium',
}: GlassCardProps) {
    const { colors, isDark } = useTheme();
    const tokens = useDesignTokens();

    const radius = tokens?.radii?.lg ?? 20;
    const padValue = padding ? (tokens?.spacing?.[padding] ?? 16) : 0;

    const outlineColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)';
    const shadow = isDark ? styles.shadowDark : styles.shadowLight;

    return (
        <View style={[styles.shell, shadow, { borderRadius: radius }, style]}>
            <GlassSurface
                intensity={intensity}
                branded={branded}
                style={[styles.surface, { borderRadius: radius, borderColor: outlineColor }]}
                contentStyle={padding ? { padding: padValue } : undefined}
            >
                {children}
            </GlassSurface>
        </View>
    );
}

const styles = StyleSheet.create({
    shell: {
        // Allow shadow to escape; the inner surface clips its own content.
        overflow: 'visible',
    },
    surface: {
        borderWidth: StyleSheet.hairlineWidth,
    },
    shadowLight: {
        shadowColor: 'rgba(15,23,42,0.10)',
        shadowOpacity: 1,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 4,
    },
    shadowDark: {
        shadowColor: 'rgba(0,0,0,0.45)',
        shadowOpacity: 1,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 4,
    },
});
