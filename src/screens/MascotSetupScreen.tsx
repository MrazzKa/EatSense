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

export default function MascotSetupScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const tokens = useDesignTokens();
  const { t } = useI18n();
  const { createMascot } = useMascot();

  const [selectedType, setSelectedType] = useState<MascotType>('CAT');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  const handleCreate = async () => {
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
    const result = await createMascot(selectedType, trimmedName);
    setSaving(false);
    if (result) {
      navigation.goBack();
    } else {
      Alert.alert(t('common.error', 'Error'), t('mascot.setup.createFailed', 'Failed to create mascot'));
    }
  };

  const SelectedMascot = MASCOT_COMPONENTS[selectedType];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('mascot.setup.title', 'Choose Your Companion')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Preview — show level 2 (baby) so user sees the cute character, not an egg */}
        <View style={[styles.previewContainer, { backgroundColor: (MASCOT_COLORS[selectedType]?.light || '#F5F5F5') + '80', borderRadius: 24 }]}>
          <SelectedMascot size="large" level={2} mood="happy" />
          {name.trim() ? (
            <Text style={styles.previewName}>{name.trim()}</Text>
          ) : null}
        </View>

        {/* Mascot selection carousel */}
        <Text style={styles.sectionTitle}>{t('mascot.setup.choose', 'Choose a mascot')}</Text>
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
        <Text style={styles.sectionTitle}>{t('mascot.setup.nameLabel', 'Give it a name')}</Text>
        <TextInput
          style={styles.nameInput}
          placeholder={t('mascot.setup.namePlaceholder', 'Enter name...')}
          placeholderTextColor={colors.textTertiary || '#AAA'}
          value={name}
          onChangeText={setName}
          maxLength={20}
          autoCapitalize="words"
        />

        {/* Create button */}
        <TouchableOpacity
          style={[styles.createButton, !name.trim() && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={saving || !name.trim()}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.createButtonText}>
              {t('mascot.setup.create', 'Adopt Companion')}
            </Text>
          )}
        </TouchableOpacity>
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
      paddingVertical: 32,
    },
    previewName: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
      marginTop: 12,
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
      borderRadius: tokens.radii.lg || 16,
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
      borderRadius: tokens.radii.md || 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: colors.border || '#E0E0E0',
      marginBottom: 24,
    },
    createButton: {
      backgroundColor: colors.primary || '#4CAF50',
      borderRadius: tokens.radii.md || 12,
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
  });
