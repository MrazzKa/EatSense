import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View, AccessibilityState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { GlassSurface } from '../components/glass/GlassSurface';
import { useTheme } from '../contexts/ThemeContext';

const TAB_BAR_HEIGHT = 62;
const HORIZONTAL_INSET = 14;
const BOTTOM_GAP = 6;

/** Total vertical space the floating bar reserves at the bottom of the screen. */
export const FLOATING_TAB_BAR_RESERVED = TAB_BAR_HEIGHT + BOTTOM_GAP + 8;

/**
 * Floating glass pill at the bottom — modeled after Telegram / Apple system style.
 * - iOS: BlurView with strong systemMaterial — Liquid Glass on iOS 26+ via expo-blur 55.
 * - Android: dimezisBlurView + tinted fallback for older versions.
 * - Active tab gets a brand-tinted pill behind the icon with spring animation.
 */
export function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();

    const bottom = Math.max(insets.bottom, BOTTOM_GAP);
    const outline = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.06)';

    return (
        <View
            pointerEvents="box-none"
            style={[styles.container, { paddingBottom: bottom, paddingHorizontal: HORIZONTAL_INSET }]}
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
            <Text numberOfLines={1} style={[styles.label, { color }]}>
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
                shadowColor: 'rgba(15,23,42,0.22)',
                shadowOpacity: 1,
                shadowRadius: 28,
                shadowOffset: { width: 0, height: 14 },
            },
            android: {
                elevation: 14,
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
        paddingHorizontal: 6,
    },
    itemBase: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        gap: 2,
    },
    itemPressed: {
        opacity: 0.6,
    },
    iconWrap: {
        width: 48,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    indicator: {
        position: 'absolute',
        width: 48,
        height: 30,
        borderRadius: 16,
    },
    label: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
});
