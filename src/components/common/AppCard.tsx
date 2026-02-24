import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

const AppCard = ({ children, style, padding = 'lg', elevated = true, ...rest }) => {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);
  const paddingValue = tokens.spacing[padding] ?? tokens.spacing.lg;

  return (
    <View
      style={[
        styles.base,
        elevated ? styles.elevated : styles.flat,
        { padding: paddingValue },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
};

const createStyles = (tokens) =>
  StyleSheet.create({
    base: {
      borderRadius: tokens.radii.lg,
      borderWidth: 1,
      borderColor: tokens.colors.borderMuted,
    },
    flat: {
      backgroundColor: tokens.states.surface.base ?? tokens.colors.surface,
    },
    elevated: {
      backgroundColor: tokens.states.surface.elevated ?? tokens.colors.surfaceElevated ?? tokens.colors.surface,
      ...(tokens.states.cardShadow || tokens.elevations.sm),
    },
  });

export default AppCard;
