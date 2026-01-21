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

  // Local state to handle editing
  const [localValue, setLocalValue] = React.useState(
    value !== undefined && value !== null ? String(value) : ''
  );

  // Sync local state when external value changes (only if not focused or valid logic)
  // Simple approach: Sync only on mount or if external source changes drastically?
  // Actually, standard controlled pattern: sync when prop changes
  React.useEffect(() => {
    if (value !== undefined && value !== null) {
      setLocalValue(String(value));
    }
  }, [value]);

  const handleChangeText = (text: string) => {
    setLocalValue(text); // Always update display

    // Allow empty input or decimal point while typing
    if (text === '' || text === '.') {
      return;
    }

    const num = parseFloat(text);
    if (!isNaN(num)) {
      let finalValue = num;
      if (min !== undefined && finalValue < min) finalValue = min;
      if (max !== undefined && finalValue > max) finalValue = max;
      // Note: we don't apply step during typing as it makes typing difficult (e.g. typing 1.5 with step 0.5)
      // Step validation happens typically on blur or specific slider UI, but here we just pass valid numbers
      // If we enforce step immediately, it might jump. 
      // The requirement was just to fix clearing.
      onChange(finalValue);
    }
  };

  const handleBlur = () => {
    if (localValue === '' || localValue === '.' || isNaN(parseFloat(localValue))) {
      // Reset to min or 0 if invalid
      const safeValue = min ?? 0;
      setLocalValue(String(safeValue));
      onChange(safeValue);
    } else {
      // Apply steps or bounds strictly on blur if needed
      let num = parseFloat(localValue);
      if (min !== undefined && num < min) num = min;
      if (max !== undefined && num > max) num = max;
      if (step && step !== 1) {
        num = Math.round(num / step) * step;
      }
      setLocalValue(String(num));
      onChange(num);
    }
  };

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
          value={localValue}
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

