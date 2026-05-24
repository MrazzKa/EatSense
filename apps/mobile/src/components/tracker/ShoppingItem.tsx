import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { ShoppingItem as ShoppingItemType, ShoppingCategory } from '../../types/tracker';

interface ShoppingItemProps {
  item: ShoppingItemType;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

function getCategoryColor(category: ShoppingCategory, colors: any): string {
  const map: Record<ShoppingCategory, string> = {
    protein: colors.error,
    veg: colors.success,
    dairy: colors.info || colors.primary,
    fat: colors.warning,
    grain: colors.primary,
    other: colors.textSecondary,
  };
  return map[category] || colors.textSecondary;
}

export default function ShoppingItemRow({ item, onToggle, onRemove }: ShoppingItemProps) {
  const { colors, tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);
  const dotColor = getCategoryColor(item.category, colors);

  return (
    <View style={[styles.row, item.bought && styles.boughtRow]}>
      <TouchableOpacity onPress={() => onToggle(item.id)} style={styles.checkArea}>
        <View style={[styles.checkbox, item.bought && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
          {item.bought && <Ionicons name="checkmark" size={14} color={colors.onPrimary || '#FFF'} />}
        </View>
      </TouchableOpacity>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={[
        styles.name,
        { color: colors.textPrimary },
        item.bought && { textDecorationLine: 'line-through', color: colors.textTertiary },
      ]}>
        {item.emoji ? `${item.emoji} ` : ''}{item.name}
      </Text>
      <TouchableOpacity onPress={() => onRemove(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="close-circle-outline" size={20} color={colors.textTertiary} />
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (tokens: any, colors: any) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 4,
      gap: 10,
    },
    boughtRow: {
      opacity: 0.5,
    },
    checkArea: {
      padding: 2,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    name: {
      flex: 1,
      fontSize: 15,
    },
  });

export { getCategoryColor };
