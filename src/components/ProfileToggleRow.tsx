import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface ProfileToggleRowProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export const ProfileToggleRow: React.FC<ProfileToggleRowProps> = ({
  label,
  value,
  onChange,
}) => {
  const { colors, tokens } = useTheme();

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.textPrimary || tokens.colors.textPrimary }]}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{
          false: colors.borderMuted || tokens.colors.borderMuted,
          true: colors.primary || tokens.colors.primary,
        }}
        thumbColor={colors.onPrimary || tokens.states.primary.on}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  label: {
    fontSize: 14,
    flex: 1,
  },
});

