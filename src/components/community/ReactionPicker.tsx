// @ts-nocheck
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export const REACTION_TYPES = [
  { type: 'LIKE', emoji: '👍' },
  { type: 'HEART', emoji: '❤️' },
  { type: 'FIRE', emoji: '🔥' },
  { type: 'LAUGH', emoji: '😂' },
  { type: 'CLAP', emoji: '👏' },
];

interface ReactionPickerProps {
  currentType?: string | null;
  onSelect: (type: string) => void;
  onClose: () => void;
}

export function ReactionPicker({ currentType, onSelect, onClose }: ReactionPickerProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {REACTION_TYPES.map((r) => (
        <TouchableOpacity
          key={r.type}
          onPress={() => onSelect(r.type)}
          style={[
            styles.btn,
            currentType === r.type && { backgroundColor: colors.primary + '20' },
          ]}
        >
          <Text style={styles.emoji}>{r.emoji}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function getReactionEmoji(type: string | null | undefined): string | null {
  if (!type) return null;
  return REACTION_TYPES.find(r => r.type === type)?.emoji || '👍';
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 24,
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  btn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  emoji: {
    fontSize: 22,
  },
});
