import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface ProfileSegmentedControlOption {
  value: string;
  label: string;
}

interface ProfileSegmentedControlProps {
  label: string;
  value: string;
  options: ProfileSegmentedControlOption[];
  onChange: (value: string) => void;
}

export const ProfileSegmentedControl: React.FC<ProfileSegmentedControlProps> = ({
  label,
  value,
  options,
  onChange,
}) => {
  const { colors, tokens } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.optionsContainer}>
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionButton,
                {
                  backgroundColor: isSelected
                    ? colors.primary || tokens.colors.primary
                    : colors.surfaceMuted || colors.surface,
                  borderColor: isSelected
                    ? colors.primary || tokens.colors.primary
                    : colors.border || tokens.colors.borderMuted,
                },
              ]}
              onPress={() => onChange(option.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionText,
                  {
                    color: isSelected
                      ? colors.onPrimary || tokens.states.primary.on
                      : colors.textPrimary || tokens.colors.textPrimary,
                  },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

