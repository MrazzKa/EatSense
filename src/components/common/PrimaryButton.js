import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

const PrimaryButton = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon = null,
  style = null,
  textStyle = null,
  androidRipple = true,
}) => {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      android_ripple={androidRipple ? { color: tokens.states.primary.pressed, borderless: false } : undefined}
      style={({ pressed }) => [
        styles.button,
        pressed && !isDisabled && styles.buttonPressed,
        isDisabled && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tokens.states.primary.on} />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, isDisabled && styles.labelDisabled, textStyle]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
};

const createStyles = (tokens) =>
  StyleSheet.create({
    button: {
      backgroundColor: tokens.states.primary.base,
      borderRadius: tokens.radii.md,
      paddingVertical: tokens.spacing.md,
      paddingHorizontal: tokens.spacing.xl,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: tokens.spacing.sm,
      borderWidth: 1,
      borderColor: tokens.states.primary.border || 'transparent',
      ...(tokens.states?.cardShadow ?? tokens.elevations.sm),
    },
    buttonPressed: {
      backgroundColor: tokens.states.primary.pressed,
    },
    buttonDisabled: {
      backgroundColor: tokens.states.primary.disabled,
      borderColor: tokens.states.primary.disabledBorder || tokens.states.primary.disabled,
      ...(tokens.states?.cardShadow
        ? {
          shadowColor: tokens.states.cardShadow.shadowColor,
          shadowOpacity: 0.3,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 0,
          elevation: 0,
        }
        : { opacity: 1 }),
    },
    label: {
      color: tokens.states.primary.on,
      fontSize: tokens.typography.bodyStrong.fontSize,
      lineHeight: tokens.typography.bodyStrong.lineHeight,
      fontWeight: tokens.typography.bodyStrong.fontWeight,
    },
    labelDisabled: {
      color: tokens.states.primary.disabledText,
    },
  });

export default PrimaryButton;
