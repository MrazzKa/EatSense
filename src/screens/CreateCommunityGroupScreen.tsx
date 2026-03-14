// @ts-nocheck
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useI18n } from '../../app/i18n/hooks';
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';
import ApiService from '../services/apiService';

export default function CreateCommunityGroupScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const tokens = useDesignTokens();
  const { t } = useI18n();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  const handleCreate = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert(t('community.error', 'Error'), t('community.emptyGroupName', 'Please enter a group name'));
      return;
    }

    setSubmitting(true);
    try {
      await ApiService.createCommunityGroup({
        name: trimmedName,
        description: description.trim(),
      });
      navigation.goBack();
    } catch (err) {
      console.warn('Failed to create group:', err);
      Alert.alert(t('community.error', 'Error'), t('community.groupFailed', 'Failed to create group'));
    } finally {
      setSubmitting(false);
    }
  }, [name, description, navigation, t]);

  const isValid = name.trim().length > 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
          <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
            {t('common.cancel', 'Cancel')}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary || colors.text }]}>
          {t('community.newGroup', 'New Group')}
        </Text>
        <TouchableOpacity
          onPress={handleCreate}
          disabled={!isValid || submitting}
          style={[styles.createBtn, { backgroundColor: isValid ? colors.primary : colors.primary + '40' }]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.createBtnText}>{t('common.create', 'Create')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.form}>
          {/* Group icon */}
          <View style={styles.iconRow}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="people" size={32} color={colors.primary} />
            </View>
          </View>

          {/* Name */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t('community.groupName', 'Group Name')}
          </Text>
          <TextInput
            style={[styles.input, { color: colors.textPrimary || colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary || colors.surface }]}
            placeholder={t('community.groupNamePlaceholder', 'e.g. Healthy Cooking Club')}
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={setName}
            maxLength={100}
            autoFocus
          />

          {/* Description */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t('community.groupDescription', 'Description (optional)')}
          </Text>
          <TextInput
            style={[styles.textArea, { color: colors.textPrimary || colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary || colors.surface }]}
            placeholder={t('community.groupDescPlaceholder', 'What is this group about?')}
            placeholderTextColor={colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
            maxLength={500}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (tokens: any, colors: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    flex: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    cancelBtn: {
      paddingVertical: 6,
    },
    cancelText: {
      fontSize: 16,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
    },
    createBtn: {
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 18,
      minWidth: 72,
      alignItems: 'center',
    },
    createBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
    form: {
      padding: 24,
    },
    iconRow: {
      alignItems: 'center',
      marginBottom: 24,
    },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
      marginTop: 16,
    },
    input: {
      fontSize: 16,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    textArea: {
      fontSize: 16,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      minHeight: 100,
    },
  });
