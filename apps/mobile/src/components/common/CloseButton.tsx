/**
 * Standard CloseButton component for modal screens and dialogs
 * Position: top-left corner (consistent across the app)
 */
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

interface CloseButtonProps {
  onPress: () => void;
  style?: ViewStyle;
  size?: number;
  color?: string;
}

export function CloseButton({
  onPress,
  style,
  size = 24,
  color,
}: CloseButtonProps) {
  const { colors } = useTheme();
  const iconColor = color || colors.text;

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: colors.backgroundMuted || colors.surface }, style]}
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityLabel="Close"
      accessibilityRole="button"
    >
      <Ionicons name="close" size={size} color={iconColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});

export default CloseButton;
