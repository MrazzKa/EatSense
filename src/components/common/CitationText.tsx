import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../../app/i18n/hooks';

interface CitationTextProps {
  textKey: string;
  style?: object;
  onViewSources?: () => void;
}

const CitationText: React.FC<CitationTextProps> = ({ textKey, style, onViewSources }) => {
  const { colors } = useTheme();
  const { t } = useI18n();

  const text = t(textKey);

  if (onViewSources) {
    return (
      <TouchableOpacity onPress={onViewSources} activeOpacity={0.7}>
        <Text style={[styles.text, { color: colors.textTertiary }, style]}>
          {text}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <Text style={[styles.text, { color: colors.textTertiary }, style]}>
      {text}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    fontSize: 10,
    lineHeight: 14,
  },
});

export default CitationText;
