import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View, AccessibilityState } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { GlassSurface } from '../components/glass/GlassSurface';
import { useTheme } from '../contexts/ThemeContext';

const TAB_BAR_HEIGHT = 74;
const HORIZONTAL_INSET = 8;
// Visible gap above the safe-area inset (home indicator on iOS, nav bar on Android).
const BOTTOM_GAP = 12;
const ANDROID_FALLBACK_INSET = 12;

/** Total vertical space the floating bar reserves at the bottom of the screen. */
export const FLOATING_TAB_BAR_RESERVED = TAB_BAR_HEIGHT + BOTTOM_GAP + 28;
export const FLOATING_TAB_BAR_HEIGHT = TAB_BAR_HEIGHT;
export const FLOATING_TAB_BAR_BOTTOM_GAP = BOTTOM_GAP;

/**
 * Floating glass pill at the bottom — modeled after Telegram / Apple system style.
 * - iOS: BlurView with strong systemMaterial — Liquid Glass on iOS 26+ via expo-blur 55.
 * - Android: dimezisBlurView + tinted fallback for older versions.
 * - Active tab gets a brand-tinted pill behind the icon with spring animation.
 */
export function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();

    // Float the pill above the home indicator / nav bar. Fall back to a small
    // gap on Android phones that report 0 inset so the bar never hugs the edge.
    const safeBottom = Platform.OS === 'android' ? Math.max(insets.bottom, ANDROID_FALLBACK_INSET) : insets.bottom;
    const bottom = safeBottom + BOTTOM_GAP;
    const outline = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.06)';

    return (
        <View
            pointerEvents="box-none"
            style={[
                styles.container,
                {
                    paddingBottom: bottom,
                    paddingHorizontal: HORIZONTAL_INSET,
                    backgroundColor: 'transparent',
                },
            ]}
        >
            <View style={styles.shadow}>
                <GlassSurface
                    intensity="strong"
                    style={[styles.bar, { borderColor: outline }]}
                    contentStyle={styles.row}
                >
                    {state.routes.map((route, index) => {
                        const { options } = descriptors[route.key];
                        const focused = state.index === index;
                        const label = (options.tabBarLabel as string) ?? options.title ?? route.name;

                        const onPress = () => {
                            const event = navigation.emit({
                                type: 'tabPress',
                                target: route.key,
                                canPreventDefault: true,
                            });
                            if (!focused && !event.defaultPrevented) {
                                // Subtle tactile feedback on tab switch (iOS selection click).
                                Haptics.selectionAsync().catch(() => {});
                                navigation.navigate(route.name as never);
                            }
                        };

                        const onLongPress = () => {
                            navigation.emit({ type: 'tabLongPress', target: route.key });
                        };

                        return (
                            <TabItem
                                key={route.key}
                                focused={focused}
                                label={label}
                                renderIcon={options.tabBarIcon}
                                activeColor={colors.primary || '#4CAF50'}
                                inactiveColor={isDark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)'}
                                onPress={onPress}
                                onLongPress={onLongPress}
                                accessibilityLabel={options.tabBarAccessibilityLabel ?? `${label} tab`}
                                accessibilityState={focused ? { selected: true } : { selected: false }}
                            />
                        );
                    })}
                </GlassSurface>
            </View>
        </View>
    );
}

interface TabItemProps {
    focused: boolean;
    label: string;
    renderIcon?: (props: { focused: boolean; color: string; size: number }) => React.ReactNode;
    activeColor: string;
    inactiveColor: string;
    onPress: () => void;
    onLongPress: () => void;
    accessibilityLabel: string;
    accessibilityState: AccessibilityState;
}

function TabItem({
    focused,
    label,
    renderIcon,
    activeColor,
    inactiveColor,
    onPress,
    onLongPress,
    accessibilityLabel,
    accessibilityState,
}: TabItemProps) {
    const indicatorScale = useRef(new Animated.Value(focused ? 1 : 0.7)).current;
    const indicatorOpacity = useRef(new Animated.Value(focused ? 1 : 0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(indicatorScale, {
                toValue: focused ? 1 : 0.7,
                useNativeDriver: true,
                speed: 22,
                bounciness: 6,
            }),
            Animated.timing(indicatorOpacity, {
                toValue: focused ? 1 : 0,
                useNativeDriver: true,
                duration: 180,
            }),
        ]).start();
    }, [focused, indicatorScale, indicatorOpacity]);

    const color = focused ? activeColor : inactiveColor;

    return (
        <Pressable
            onPress={onPress}
            onLongPress={onLongPress}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityState={accessibilityState}
            style={({ pressed }) => [styles.itemBase, pressed && styles.itemPressed]}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
            <View style={styles.iconWrap}>
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.indicator,
                        {
                            backgroundColor: withAlpha(activeColor, 0.18),
                            opacity: indicatorOpacity,
                            transform: [{ scale: indicatorScale }],
                        },
                    ]}
                />
                {renderIcon?.({ focused, color, size: 22 })}
            </View>
            <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
                style={[styles.label, { color }]}
            >
                {label}
            </Text>
        </Pressable>
    );
}

function withAlpha(hex: string, alpha: number): string {
    if (!hex.startsWith('#') || hex.length < 7) return hex;
    const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
        .toString(16)
        .padStart(2, '0')
        .toUpperCase();
    return hex.slice(0, 7) + a;
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
    },
    shadow: {
        borderRadius: 999,
        ...Platform.select({
            ios: {
                // Soft, large shadow + small offset = clear "floating" look without
                // looking heavy. Drop the pill ~16px to enhance the levitation.
                shadowColor: '#000',
                shadowOpacity: 0.18,
                shadowRadius: 32,
                shadowOffset: { width: 0, height: 16 },
            },
            android: {
                elevation: 16,
            },
        }),
    },
    bar: {
        height: TAB_BAR_HEIGHT,
        borderRadius: 999,
        borderWidth: StyleSheet.hairlineWidth,
    },
    row: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 4,
    },
    itemBase: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 0,
        gap: 4,
    },
    itemPressed: {
        opacity: 0.6,
    },
    iconWrap: {
        width: 48,
        height: 31,
        alignItems: 'center',
        justifyContent: 'center',
    },
    indicator: {
        position: 'absolute',
        width: 48,
        height: 31,
        borderRadius: 16,
    },
    label: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0,
        textAlign: 'center',
        width: '100%',
        paddingHorizontal: 1,
    },
});
