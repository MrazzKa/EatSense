import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View, AccessibilityState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { GlassSurface } from '../components/glass/GlassSurface';
import { useTheme } from '../contexts/ThemeContext';

const TAB_BAR_HEIGHT = 56;

/**
 * Bottom tab bar rendered as an inline glass surface.
 * - iOS: BlurView + systemMaterial (auto-Liquid Glass on iOS 26+).
 * - Android: tinted fallback with experimental dimezis blur.
 * - Inline (not floating) so screen content doesn't need extra paddingBottom.
 */
export function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();

    const bottom = Math.max(insets.bottom, 8);

    return (
        <View style={[styles.container, { paddingBottom: bottom }]}>
            <GlassSurface
                intensity="strong"
                style={[styles.bar, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)' }]}
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
                            inactiveColor={colors.textTertiary || '#8E8E93'}
                            onPress={onPress}
                            onLongPress={onLongPress}
                            accessibilityLabel={options.tabBarAccessibilityLabel ?? `${label} tab`}
                            accessibilityState={focused ? { selected: true } : { selected: false }}
                        />
                    );
                })}
            </GlassSurface>
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
    const scale = useRef(new Animated.Value(focused ? 1 : 0.92)).current;

    useEffect(() => {
        Animated.spring(scale, {
            toValue: focused ? 1 : 0.92,
            useNativeDriver: true,
            speed: 24,
            bounciness: 8,
        }).start();
    }, [focused, scale]);

    const tintedBg = withAlpha(activeColor, focused ? 0.16 : 0);
    const color = focused ? activeColor : inactiveColor;

    return (
        <Pressable
            onPress={onPress}
            onLongPress={onLongPress}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityState={accessibilityState}
            style={({ pressed }) => [styles.itemBase, pressed && styles.itemPressed]}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        >
            <Animated.View style={[styles.indicator, { backgroundColor: tintedBg, transform: [{ scale }] }]}>
                {renderIcon?.({ focused, color, size: 22 })}
            </Animated.View>
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
        backgroundColor: 'transparent',
    },
    bar: {
        height: TAB_BAR_HEIGHT,
        borderTopWidth: StyleSheet.hairlineWidth,
        ...Platform.select({
            ios: {
                shadowColor: 'rgba(15,23,42,0.10)',
                shadowOpacity: 1,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: -4 },
            },
            android: {
                elevation: 8,
            },
        }),
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
        paddingVertical: 4,
        gap: 2,
    },
    itemPressed: {
        opacity: 0.7,
    },
    indicator: {
        width: 44,
        height: 30,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontSize: 10.5,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
});
