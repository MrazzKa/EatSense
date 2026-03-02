import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../../app/i18n/hooks';
import { ShoppingCategory, ShoppingItem } from '../../types/tracker';
import ShoppingItemRow from './ShoppingItem';
import AppCard from '../common/AppCard';

interface ShoppingListProps {
  activeItems: ShoppingItem[];
  boughtItems: ShoppingItem[];
  onAdd: (item: { name: string; category: ShoppingCategory; emoji?: string }) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onClearBought: () => void;
  onShare: () => void;
  recommendations: { name: string; category: ShoppingCategory; emoji: string }[];
  recommendationsLoading: boolean;
  insufficientData: boolean;
  canAddMore: boolean;
  onLimitReached: () => void;
}

const CATEGORIES: { key: ShoppingCategory; label: string }[] = [
  { key: 'protein', label: 'Protein' },
  { key: 'veg', label: 'Vegetables' },
  { key: 'dairy', label: 'Dairy' },
  { key: 'fat', label: 'Fats' },
  { key: 'grain', label: 'Grains' },
  { key: 'other', label: 'Other' },
];

export default function ShoppingList({
  activeItems,
  boughtItems,
  onAdd,
  onToggle,
  onRemove,
  onClearBought,
  onShare,
  recommendations,
  recommendationsLoading,
  insufficientData,
  canAddMore,
  onLimitReached,
}: ShoppingListProps) {
  const { colors, tokens } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showBought, setShowBought] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<ShoppingCategory>('other');

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAdd({ name: newName.trim(), category: newCategory });
    setNewName('');
    setNewCategory('other');
    setShowAddModal(false);
  };

  const handleAddRecommendation = (rec: { name: string; category: ShoppingCategory; emoji: string }) => {
    if (!canAddMore) {
      onLimitReached();
      return;
    }
    onAdd({ name: rec.name, category: rec.category, emoji: rec.emoji });
  };

  return (
    <View>
      {/* Recommendations chips */}
      {!insufficientData && recommendations.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('tracker.shopping.recommendations') || 'Recommended'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipsRow}>
              {recommendations.slice(0, 12).map((rec, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => handleAddRecommendation(rec)}
                  style={[styles.chip, { backgroundColor: colors.primary + '12' }]}
                >
                  <Text style={styles.chipEmoji}>{rec.emoji}</Text>
                  <Text style={[styles.chipText, { color: colors.textPrimary }]}>{rec.name}</Text>
                  <Ionicons name="add" size={14} color={colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Active items */}
      <AppCard style={styles.card}>
        {activeItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 32 }}>🛒</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t('tracker.shopping.emptyState') || 'Your shopping list is empty'}
            </Text>
          </View>
        ) : (
          activeItems.map(item => (
            <ShoppingItemRow key={item.id} item={item} onToggle={onToggle} onRemove={onRemove} />
          ))
        )}
      </AppCard>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            if (!canAddMore) {
              onLimitReached();
              return;
            }
            setShowAddModal(true);
          }}
        >
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={styles.actionBtnText}>{t('tracker.shopping.add') || 'Add'}</Text>
        </TouchableOpacity>
        {activeItems.length > 0 && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.surfaceSecondary || colors.surface }]}
            onPress={onShare}
          >
            <Ionicons name="share-outline" size={16} color={colors.textPrimary} />
            <Text style={[styles.actionBtnTextSecondary, { color: colors.textPrimary }]}>
              {t('tracker.shopping.share') || 'Share'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bought section */}
      {boughtItems.length > 0 && (
        <View style={styles.section}>
          <TouchableOpacity
            onPress={() => setShowBought(prev => !prev)}
            style={styles.boughtHeader}
          >
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t('tracker.shopping.bought') || 'Bought'} ({boughtItems.length})
            </Text>
            <Ionicons
              name={showBought ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          {showBought && (
            <>
              {boughtItems.map(item => (
                <ShoppingItemRow key={item.id} item={item} onToggle={onToggle} onRemove={onRemove} />
              ))}
              <TouchableOpacity onPress={onClearBought} style={styles.clearBtn}>
                <Ionicons name="trash-outline" size={16} color={colors.error} />
                <Text style={[styles.clearText, { color: colors.error }]}>
                  {t('tracker.shopping.clear') || 'Clear bought'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Add modal */}
      <Modal
          visible={showAddModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAddModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowAddModal(false)}
          >
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {t('tracker.shopping.add') || 'Add Item'}
              </Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surfaceSecondary || colors.surface }]}
                value={newName}
                onChangeText={setNewName}
                placeholder={t('tracker.shopping.namePlaceholder') || 'Item name'}
                placeholderTextColor={colors.textTertiary}
                autoFocus
              />
              <View style={styles.categoryRow}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.key}
                    onPress={() => setNewCategory(cat.key)}
                    style={[
                      styles.categoryBtn,
                      newCategory === cat.key && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                    ]}
                  >
                    <Text style={[styles.categoryText, { color: newCategory === cat.key ? colors.primary : colors.textSecondary }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                onPress={handleAdd}
                disabled={!newName.trim()}
                style={[styles.addBtn, { backgroundColor: newName.trim() ? colors.primary : colors.textTertiary }]}
              >
                <Text style={styles.addBtnText}>{t('common.save') || 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
    </View>
  );
}

const createStyles = (tokens: any, colors: any) =>
  StyleSheet.create({
    section: {
      marginTop: tokens.spacing.md,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    card: {
      marginTop: tokens.spacing.sm,
    },
    chipsRow: {
      flexDirection: 'row',
      gap: 8,
      paddingRight: 16,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      gap: 6,
    },
    chipEmoji: {
      fontSize: 16,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '500',
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 24,
      gap: 8,
    },
    emptyText: {
      fontSize: 14,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: tokens.spacing.md,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: tokens.radii.md || 12,
      gap: 6,
    },
    actionBtnText: {
      color: '#FFF',
      fontSize: 14,
      fontWeight: '600',
    },
    actionBtnTextSecondary: {
      fontSize: 14,
      fontWeight: '500',
    },
    boughtHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    clearBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
      padding: 8,
    },
    clearText: {
      fontSize: 14,
      fontWeight: '500',
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: 20,
    },
    modalContent: {
      width: '100%',
      borderRadius: tokens.radii.lg || 16,
      padding: 24,
      gap: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    input: {
      borderWidth: 1,
      borderRadius: tokens.radii.md || 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
    },
    categoryRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    categoryBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    categoryText: {
      fontSize: 13,
      fontWeight: '500',
    },
    addBtn: {
      paddingVertical: 14,
      borderRadius: tokens.radii.md || 12,
      alignItems: 'center',
    },
    addBtnText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });
