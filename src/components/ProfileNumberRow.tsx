import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface ProfileNumberRowProps {
  label: string;
  value?: number;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  onChange: (_value: number) => void;
}

export const ProfileNumberRow: React.FC<ProfileNumberRowProps> = ({
  label,
  value,
  suffix,
  min,
  max,
  step = 1,
  onChange,
}) => {
  const { colors } = useTheme();

  const handleChangeText = (text: string) => {
    // Allow empty input or decimal point while typing
    if (text === '' || text === '.') {
      return;
    }
    const num = parseFloat(text);
    if (isNaN(num)) {
      return;
    }
    let finalValue = num;
    if (min !== undefined && finalValue < min) finalValue = min;
    if (max !== undefined && finalValue > max) finalValue = max;
    // Apply step if provided (for half-hour sleep increments, etc.)
    if (step && step !== 1) {
      finalValue = Math.round(finalValue / step) * step;
    }
    onChange(finalValue);
  };

  const handleBlur = () => {
    if (value === undefined || value === null) {
      onChange(min ?? 0);
    }
  };

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
          value={value !== undefined && value !== null ? String(value) : ''}
          onChangeText={handleChangeText}
          onBlur={handleBlur}
          keyboardType="decimal-pad"
          placeholder={`${min ?? 0}${suffix ? ' ' + suffix : ''}`}
          placeholderTextColor={colors.textTertiary}
        />
        {suffix && (
          <Text style={[styles.suffix, { color: colors.textSecondary }]}>{suffix}</Text>
        )}
      </View>
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 80,
    textAlign: 'right',
    fontSize: 14,
  },
  suffix: {
    fontSize: 14,
  },
});

