// @ts-nocheck
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { useMascot, MascotType } from '../contexts/MascotContext';
import { MASCOT_COMPONENTS, MASCOT_LIST, MASCOT_COLORS } from '../assets/mascots';

const XP_THRESHOLDS = [0, 100, 300, 600, 1000];

const XP_SOURCES = [
  { icon: 'camera-outline', xp: '2-20', key: 'mascot.xpSource.analysis' as const, fallback: 'Analyze a meal photo' },
  { icon: 'today-outline', xp: '5', key: 'mascot.xpSource.dailyLogin' as const, fallback: 'Daily login' },
  { icon: 'chatbubbles-outline', xp: '8', key: 'mascot.xpSource.communityPost' as const, fallback: 'Create a community post' },
  { icon: 'flame-outline', xp: '10-25', key: 'mascot.xpSource.streak' as const, fallback: 'Daily streak bonus' },
  { icon: 'checkbox-outline', xp: '15', key: 'mascot.xpSource.quest' as const, fallback: 'Complete a quest' },
];

export default function MascotSetupScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const tokens = useDesignTokens();
  const { t } = useI18n();
  const { mascot, createMascot, updateMascot, deleteMascot } = useMascot();

  const isEditing = !!mascot;

  const [selectedType, setSelectedType] = useState<MascotType>(mascot?.mascotType || 'CAT');
  const [name, setName] = useState(mascot?.name || '');
  const [saving, setSaving] = useState(false);

  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  const hasChanges = isEditing
    ? (name.trim() !== mascot.name || selectedType !== mascot.mascotType)
    : name.trim().length > 0;

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert(t('mascot.setup.nameRequired', 'Please enter a name'));
      return;
    }
    if (trimmedName.length > 20) {
      Alert.alert(t('mascot.setup.nameTooLong', 'Name must be 20 characters or less'));
      return;
    }

    setSaving(true);

    if (isEditing) {
      const data: any = {};
      if (trimmedName !== mascot.name) data.name = trimmedName;
      if (selectedType !== mascot.mascotType) data.mascotType = selectedType;

      if (Object.keys(data).length === 0) {
        setSaving(false);
        navigation.goBack();
        return;
      }

      const result = await updateMascot(data);
      setSaving(false);
      if (result) {
        navigation.goBack();
      } else {
        Alert.alert(t('common.error', 'Error'), t('mascot.setup.updateFailed', 'Failed to update mascot'));
      }
    } else {
      const result = await createMascot(selectedType, trimmedName);
      setSaving(false);
      if (result) {
        navigation.goBack();
      } else {
        Alert.alert(t('common.error', 'Error'), t('mascot.setup.createFailed', 'Failed to create mascot'));
      }
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('mascot.setup.deleteTitle', 'Release Companion'),
      t('mascot.setup.deleteConfirm', 'Are you sure? Your companion and all progress will be lost. You can adopt a new one afterwards.'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            const success = await deleteMascot();
            setSaving(false);
            if (success) {
              navigation.goBack();
            } else {
              Alert.alert(t('common.error', 'Error'), t('mascot.setup.deleteFailed', 'Failed to release companion'));
            }
          },
        },
      ],
    );
  };

  const SelectedMascot = MASCOT_COMPONENTS[selectedType];
  const mascotColor = MASCOT_COLORS[selectedType]?.primary || colors.primary;
  const mascotLight = MASCOT_COLORS[selectedType]?.light || '#F5F5F5';

  // For edit mode, show actual level; for create, show baby preview
  const previewLevel = isEditing ? mascot.level : 2;
  const previewSize = isEditing ? (mascot.level >= 5 ? 'large' : mascot.level >= 3 ? 'medium' : 'large') : 'large';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing
            ? t('mascot.setup.editTitle', 'My Companion')
            : t('mascot.setup.title', 'Choose Your Companion')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Preview */}
        <View style={[styles.previewContainer, { backgroundColor: mascotLight + '80', borderRadius: 24 }]}>
          <SelectedMascot size={previewSize} level={previewLevel} mood={isEditing && mascot.level >= 5 ? 'excited' : 'happy'} />
          {name.trim() ? (
            <Text style={styles.previewName}>{name.trim()}</Text>
          ) : null}
          {isEditing && (
            <View style={[styles.levelBadgeLarge, { backgroundColor: mascotColor }]}>
              <Text style={styles.levelBadgeText}>Lv.{mascot.level} — {t(`mascot.stage.${['', 'egg', 'baby', 'teen', 'adult', 'master'][Math.min(mascot.level, 5)]}`, ['', 'Egg', 'Baby', 'Teen', 'Adult', 'Master'][Math.min(mascot.level, 5)])}</Text>
            </View>
          )}
        </View>

        {/* XP Progress (edit mode) */}
        {isEditing && (
          <View style={styles.xpSection}>
            <View style={[styles.xpBarBg, { backgroundColor: mascotColor + '20' }]}>
              {(() => {
                const currentThreshold = XP_THRESHOLDS[mascot.level - 1] || 0;
                const nextThreshold = mascot.nextLevelXp || XP_THRESHOLDS[XP_THRESHOLDS.length - 1];
                const range = nextThreshold - currentThreshold;
                const progress = range > 0 ? ((mascot.xp - currentThreshold) / range) * 100 : 100;
                return <View style={[styles.xpBarFill, { width: `${Math.min(progress, 100)}%`, backgroundColor: mascotColor }]} />;
              })()}
            </View>
            <Text style={[styles.xpText, { color: colors.textSecondary }]}>
              {mascot.nextLevelXp
                ? `${mascot.xp} / ${mascot.nextLevelXp} XP`
                : `${mascot.xp} XP ★ ${t('mascot.stage.master', 'Master')}`}
            </Text>
          </View>
        )}

        {/* Mascot selection carousel */}
        <Text style={styles.sectionTitle}>
          {isEditing
            ? t('mascot.setup.changeType', 'Change mascot')
            : t('mascot.setup.choose', 'Choose a mascot')}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContent}
        >
          {MASCOT_LIST.map((item) => {
            const MascotComp = MASCOT_COMPONENTS[item.type];
            const isSelected = selectedType === item.type;
            return (
              <TouchableOpacity
                key={item.type}
                style={[styles.mascotOption, isSelected && [styles.mascotOptionSelected, { borderColor: MASCOT_COLORS[item.type]?.primary || colors.primary, backgroundColor: (MASCOT_COLORS[item.type]?.light || '#F5F5F5') + '40' }]]}
                onPress={() => setSelectedType(item.type)}
                activeOpacity={0.7}
              >
                <MascotComp size="small" level={2} mood="happy" />
                <Text style={[styles.mascotLabel, isSelected && { color: MASCOT_COLORS[item.type]?.primary || colors.primary }]}>
                  {t(`mascot.type.${item.type.toLowerCase()}`, item.label || item.type)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Name input */}
        <Text style={styles.sectionTitle}>
          {isEditing
            ? t('mascot.setup.rename', 'Rename')
            : t('mascot.setup.nameLabel', 'Give it a name')}
        </Text>
        <TextInput
          style={styles.nameInput}
          placeholder={t('mascot.setup.namePlaceholder', 'Enter name...')}
          placeholderTextColor={colors.textTertiary || '#AAA'}
          value={name}
          onChangeText={setName}
          maxLength={20}
          autoCapitalize="words"
        />

        {/* Save/Create button */}
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: mascotColor }, (!hasChanges || !name.trim()) && styles.createButtonDisabled]}
          onPress={handleSave}
          disabled={saving || !hasChanges || !name.trim()}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.createButtonText}>
              {isEditing
                ? t('mascot.setup.save', 'Save Changes')
                : t('mascot.setup.create', 'Adopt Companion')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Delete mascot (edit mode only) */}
        {isEditing && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Ionicons name="heart-dislike-outline" size={18} color="#FF5252" />
            <Text style={styles.deleteButtonText}>
              {t('mascot.setup.delete', 'Release Companion')}
            </Text>
          </TouchableOpacity>
        )}

        {/* How to grow section */}
        <View style={styles.growthSection}>
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
            {t('mascot.growth.title', 'How your companion grows')}
          </Text>
          <Text style={[styles.growthDescription, { color: colors.textSecondary }]}>
            {t('mascot.growth.description', 'Earn XP by using the app. Your companion evolves through 5 stages as it levels up!')}
          </Text>

          {/* XP Sources */}
          {XP_SOURCES.map((source, index) => (
            <View key={index} style={[styles.xpSourceRow, { backgroundColor: colors.surface || colors.card || '#FFF' }]}>
              <View style={[styles.xpSourceIcon, { backgroundColor: mascotColor + '15' }]}>
                <Ionicons name={source.icon} size={20} color={mascotColor} />
              </View>
              <Text style={[styles.xpSourceText, { color: colors.textPrimary }]} numberOfLines={1}>
                {t(source.key, source.fallback)}
              </Text>
              <View style={[styles.xpBadge, { backgroundColor: mascotColor + '15' }]}>
                <Text style={[styles.xpBadgeText, { color: mascotColor }]}>+{source.xp} XP</Text>
              </View>
            </View>
          ))}

          {/* Evolution stages */}
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
            {t('mascot.growth.stages', 'Evolution stages')}
          </Text>
          <View style={styles.stagesRow}>
            {[1, 2, 3, 4, 5].map((level) => {
              const StageComp = MASCOT_COMPONENTS[selectedType];
              const isReached = isEditing && mascot.level >= level;
              const stageKeys = ['', 'egg', 'baby', 'teen', 'adult', 'master'];
              const stageDefaults = ['', 'Egg', 'Baby', 'Teen', 'Adult', 'Master'];
              return (
                <View key={level} style={[styles.stageItem, !isReached && isEditing && { opacity: 0.35 }]}>
                  <View style={[styles.stageCircle, { backgroundColor: mascotLight + '80' }]}>
                    <StageComp size="small" level={level} mood="happy" />
                  </View>
                  <Text style={[styles.stageItemLabel, { color: isReached ? mascotColor : colors.textTertiary }]}>
                    {t(`mascot.stage.${stageKeys[level]}`, stageDefaults[level])}
                  </Text>
                  <Text style={[styles.stageXp, { color: colors.textTertiary }]}>
                    {XP_THRESHOLDS[level - 1]} XP
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (tokens: any, colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 40,
    },
    previewContainer: {
      alignItems: 'center',
      paddingVertical: 24,
    },
    previewName: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
      marginTop: 10,
    },
    levelBadgeLarge: {
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 5,
      marginTop: 8,
    },
    levelBadgeText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#FFF',
    },
    xpSection: {
      marginBottom: 8,
    },
    xpBarBg: {
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 4,
    },
    xpBarFill: {
      height: 8,
      borderRadius: 4,
    },
    xpText: {
      fontSize: 12,
      textAlign: 'center',
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 12,
      marginTop: 8,
    },
    carouselContent: {
      gap: 12,
      paddingBottom: 16,
    },
    mascotOption: {
      alignItems: 'center',
      padding: 12,
      borderRadius: tokens.radii?.lg || 16,
      borderWidth: 2,
      borderColor: 'transparent',
      backgroundColor: colors.surface || colors.card || '#FFF',
      minWidth: 80,
    },
    mascotOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: (colors.primary || '#4CAF50') + '10',
    },
    mascotLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 6,
    },
    nameInput: {
      fontSize: 16,
      color: colors.textPrimary,
      backgroundColor: colors.surface || colors.card || '#FFF',
      borderRadius: tokens.radii?.md || 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: colors.border || '#E0E0E0',
      marginBottom: 24,
    },
    createButton: {
      backgroundColor: colors.primary || '#4CAF50',
      borderRadius: tokens.radii?.md || 12,
      paddingVertical: 16,
      alignItems: 'center',
    },
    createButtonDisabled: {
      opacity: 0.5,
    },
    createButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFF',
    },
    growthSection: {
      marginTop: 8,
    },
    growthDescription: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 16,
    },
    xpSourceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
    },
    xpSourceIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    xpSourceText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
    },
    xpBadge: {
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    xpBadgeText: {
      fontSize: 13,
      fontWeight: '700',
    },
    stagesRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    stageItem: {
      alignItems: 'center',
      flex: 1,
    },
    stageCircle: {
      borderRadius: 12,
      padding: 4,
      marginBottom: 4,
    },
    stageItemLabel: {
      fontSize: 10,
      fontWeight: '600',
    },
    stageXp: {
      fontSize: 9,
      marginTop: 1,
    },
    deleteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      marginTop: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#FF525230',
      backgroundColor: '#FF52520A',
    },
    deleteButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#FF5252',
    },
  });
