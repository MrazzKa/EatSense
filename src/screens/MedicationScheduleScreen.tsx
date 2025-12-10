import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../services/apiService';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';

type MedicationDose = {
  id?: string;
  timeOfDay: string; // "08:00"
  beforeMeal?: boolean;
  afterMeal?: boolean;
};

type Medication = {
  id: string;
  name: string;
  dosage?: string | null;
  instructions?: string | null;
  startDate: string;
  endDate?: string | null;
  timezone: string;
  isActive: boolean;
  doses: MedicationDose[];
};

const MedicationScheduleScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useI18n();

  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [isModalVisible, setModalVisible] = useState(false);

  const [formName, setFormName] = useState('');
  const [formDosage, setFormDosage] = useState('');
  const [formInstructions, setFormInstructions] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formTimezone, setFormTimezone] = useState('');
  const [formDoses, setFormDoses] = useState<MedicationDose[]>([]);

  const loadMedications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ApiService.getMedications();
      setMedications(data || []);
      setError(null);
    } catch (e: any) {
      console.error('[MedicationScheduleScreen] getMedications error', e);
      setError(t('medications.error.load') || 'Failed to load medications');
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadMedications();
  }, [loadMedications]);

  const openCreateModal = () => {
    setEditingMed(null);
    setFormName('');
    setFormDosage('');
    setFormInstructions('');
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    setFormStartDate(today);
    setFormEndDate('');
    setFormTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    setFormDoses([{ timeOfDay: '09:00', beforeMeal: false, afterMeal: false }]);
    setModalVisible(true);
  };

  const openEditModal = (med: Medication) => {
    setEditingMed(med);
    setFormName(med.name);
    setFormDosage(med.dosage || '');
    setFormInstructions(med.instructions || '');
    setFormStartDate(med.startDate.slice(0, 10));
    setFormEndDate(med.endDate ? med.endDate.slice(0, 10) : '');
    setFormTimezone(med.timezone || (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'));
    setFormDoses(
      med.doses && med.doses.length
        ? med.doses.map((d) => ({
            timeOfDay: d.timeOfDay,
            beforeMeal: d.beforeMeal,
            afterMeal: d.afterMeal,
          }))
        : [{ timeOfDay: '09:00', beforeMeal: false, afterMeal: false }],
    );
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const addDoseRow = () => {
    setFormDoses((prev) => [
      ...prev,
      { timeOfDay: '09:00', beforeMeal: false, afterMeal: false },
    ]);
  };

  const updateDoseField = (index: number, patch: Partial<MedicationDose>) => {
    setFormDoses((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };

  const removeDoseRow = (index: number) => {
    setFormDoses((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setError(t('medications.error.nameRequired') || 'Medication name is required');
      return;
    }

    const payload = {
      name: formName.trim(),
      dosage: formDosage.trim() || undefined,
      instructions: formInstructions.trim() || undefined,
      startDate: new Date(formStartDate).toISOString(),
      endDate: formEndDate ? new Date(formEndDate).toISOString() : undefined,
      timezone: formTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      isActive: true,
      doses: formDoses
        .filter((d) => d.timeOfDay)
        .map((d) => ({
          timeOfDay: d.timeOfDay,
          beforeMeal: !!d.beforeMeal,
          afterMeal: !!d.afterMeal,
        })),
    };

    try {
      setLoading(true);
      if (editingMed) {
        await ApiService.updateMedication(editingMed.id, payload);
      } else {
        await ApiService.createMedication(payload);
      }
      await loadMedications();
      setModalVisible(false);
      setError(null);
    } catch (e: any) {
      console.error('[MedicationScheduleScreen] save error', e);
      setError(t('medications.error.save') || 'Failed to save medication');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (med: Medication) => {
    Alert.alert(
      t('medications.deleteConfirm') || 'Delete medication',
      t('medications.deleteMessage') || 'Are you sure you want to delete this medication?',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('common.delete') || 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await ApiService.deleteMedication(med.id);
              await loadMedications();
            } catch (e: any) {
              console.error('[MedicationScheduleScreen] delete error', e);
              setError(t('medications.error.delete') || 'Failed to delete medication');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const renderMedicationItem = ({ item }: { item: Medication }) => {
    const dosesText =
      item.doses && item.doses.length
        ? item.doses.map((d) => d.timeOfDay).join(', ')
        : t('medications.noDoses') || 'No times specified';

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card || colors.surface }]}
        onPress={() => openEditModal(item)}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary || colors.text }]}>
            {item.name}
          </Text>
          <TouchableOpacity onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={20} color={colors.error || colors.danger || '#FF3B30'} />
          </TouchableOpacity>
        </View>
        {item.dosage ? (
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            {item.dosage}
          </Text>
        ) : null}
        <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
          {t('medications.times') || 'Times'}: {dosesText}
        </Text>
        {item.instructions ? (
          <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
            {item.instructions}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: colors.border || '#E5E5EA',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
    },
    card: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      flex: 1,
    },
    cardSubtitle: {
      fontSize: 14,
      marginBottom: 2,
    },
    cardMeta: {
      fontSize: 13,
      marginTop: 2,
    },
    errorText: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      fontSize: 13,
    },
    modalBackdrop: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    modalContent: {
      borderRadius: 16,
      maxHeight: '90%',
      padding: 16,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    modalBody: {
      marginTop: 8,
    },
    label: {
      fontSize: 13,
      marginTop: 10,
      marginBottom: 4,
      fontWeight: '500',
    },
    input: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === 'ios' ? 10 : 8,
      fontSize: 14,
      marginBottom: 4,
    },
    doseRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    doseInput: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: Platform.OS === 'ios' ? 8 : 6,
      marginRight: 6,
      fontSize: 14,
    },
    doseToggle: {
      paddingHorizontal: 8,
      paddingVertical: 6,
      marginRight: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border || '#E5E5EA',
    },
    doseToggleText: {
      fontSize: 12,
    },
    addDoseBtn: {
      marginTop: 6,
      marginBottom: 10,
    },
    addDoseText: {
      fontSize: 14,
      fontWeight: '500',
    },
    modalFooter: {
      marginTop: 16,
    },
    saveButton: {
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    saveButtonText: {
      fontSize: 15,
      fontWeight: '600',
    },
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary || colors.text }]}>
          {t('medications.title') || 'Medication schedule'}
        </Text>
        <TouchableOpacity onPress={openCreateModal}>
          <Ionicons name="add-circle-outline" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {error && (
        <Text style={[styles.errorText, { color: colors.error || '#FF3B30' }]}>{error}</Text>
      )}

      {loading && !medications.length ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={medications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={renderMedicationItem}
          ListEmptyComponent={
            !loading ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
                  {t('medications.empty') || 'No medications yet. Add your first one.'}
                </Text>
              </View>
            ) : null
          }
        />
      )}

      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card || colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary || colors.text }]}>
                {editingMed
                  ? t('medications.edit') || 'Edit medication'
                  : t('medications.add') || 'Add medication'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color={colors.textPrimary || colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: colors.textPrimary || colors.text }]}>
                {t('medications.fields.name') || 'Name'} *
              </Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary || colors.text, borderColor: colors.border || '#E5E5EA', backgroundColor: colors.background }]}
                value={formName}
                onChangeText={setFormName}
                placeholder={t('medications.placeholders.name') || 'Metformin'}
                placeholderTextColor={colors.textTertiary || '#8E8E93'}
              />

              <Text style={[styles.label, { color: colors.textPrimary || colors.text }]}>
                {t('medications.fields.dosage') || 'Dosage'}
              </Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary || colors.text, borderColor: colors.border || '#E5E5EA', backgroundColor: colors.background }]}
                value={formDosage}
                onChangeText={setFormDosage}
                placeholder={t('medications.placeholders.dosage') || '500 mg'}
                placeholderTextColor={colors.textTertiary || '#8E8E93'}
              />

              <Text style={[styles.label, { color: colors.textPrimary || colors.text }]}>
                {t('medications.fields.instructions') || 'Instructions'}
              </Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary || colors.text, borderColor: colors.border || '#E5E5EA', backgroundColor: colors.background }]}
                value={formInstructions}
                onChangeText={setFormInstructions}
                placeholder={t('medications.placeholders.instructions') || 'Before dinner, with water'}
                placeholderTextColor={colors.textTertiary || '#8E8E93'}
              />

              <Text style={[styles.label, { color: colors.textPrimary || colors.text }]}>
                {t('medications.fields.startDate') || 'Start date (YYYY-MM-DD)'}
              </Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary || colors.text, borderColor: colors.border || '#E5E5EA', backgroundColor: colors.background }]}
                value={formStartDate}
                onChangeText={setFormStartDate}
                placeholder="2025-01-01"
                placeholderTextColor={colors.textTertiary || '#8E8E93'}
              />

              <Text style={[styles.label, { color: colors.textPrimary || colors.text }]}>
                {t('medications.fields.endDate') || 'End date (optional)'}
              </Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary || colors.text, borderColor: colors.border || '#E5E5EA', backgroundColor: colors.background }]}
                value={formEndDate}
                onChangeText={setFormEndDate}
                placeholder="2025-12-31"
                placeholderTextColor={colors.textTertiary || '#8E8E93'}
              />

              <Text style={[styles.label, { color: colors.textPrimary || colors.text }]}>
                {t('medications.fields.timezone') || 'Timezone'}
              </Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary || colors.text, borderColor: colors.border || '#E5E5EA', backgroundColor: colors.background }]}
                value={formTimezone}
                onChangeText={setFormTimezone}
                placeholder="Asia/Almaty"
                placeholderTextColor={colors.textTertiary || '#8E8E93'}
              />

              <Text style={[styles.label, { color: colors.textPrimary || colors.text }]}>
                {t('medications.fields.doses') || 'Dose times'}
              </Text>

              {formDoses.map((dose, index) => (
                <View key={index} style={styles.doseRow}>
                  <TextInput
                    style={[
                      styles.doseInput,
                      { color: colors.textPrimary || colors.text, borderColor: colors.border || '#E5E5EA', backgroundColor: colors.background },
                    ]}
                    value={dose.timeOfDay}
                    onChangeText={(value) =>
                      updateDoseField(index, { timeOfDay: value })
                    }
                    placeholder="09:00"
                    placeholderTextColor={colors.textTertiary || '#8E8E93'}
                  />
                  <TouchableOpacity
                    style={[styles.doseToggle, { borderColor: dose.beforeMeal ? colors.primary : colors.border || '#E5E5EA', backgroundColor: dose.beforeMeal ? colors.primary + '20' : 'transparent' }]}
                    onPress={() =>
                      updateDoseField(index, {
                        beforeMeal: !dose.beforeMeal,
                        afterMeal: false,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.doseToggleText,
                        {
                          color: dose.beforeMeal ? colors.primary : colors.textSecondary,
                        },
                      ]}
                    >
                      {t('medications.beforeMeal') || 'Before'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.doseToggle, { borderColor: dose.afterMeal ? colors.primary : colors.border || '#E5E5EA', backgroundColor: dose.afterMeal ? colors.primary + '20' : 'transparent' }]}
                    onPress={() =>
                      updateDoseField(index, {
                        afterMeal: !dose.afterMeal,
                        beforeMeal: false,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.doseToggleText,
                        {
                          color: dose.afterMeal ? colors.primary : colors.textSecondary,
                        },
                      ]}
                    >
                      {t('medications.afterMeal') || 'After'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => removeDoseRow(index)}>
                    <Ionicons name="remove-circle-outline" size={20} color={colors.error || '#FF3B30'} />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={styles.addDoseBtn} onPress={addDoseRow}>
                <Text style={[styles.addDoseText, { color: colors.primary }]}>
                  + {t('medications.addDose') || 'Add time'}
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.saveButtonText, { color: colors.onPrimary || '#fff' }]}>
                    {t('common.save') || 'Save'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default MedicationScheduleScreen;

