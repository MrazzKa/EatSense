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
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import ApiService from '../services/apiService';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { localNotificationService, NotificationCategories } from '../services/localNotificationService';
import DisclaimerModal from '../components/common/DisclaimerModal';

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
  quantity?: number | null;
  remainingStock?: number | null;
  lowStockThreshold?: number | null;
};

const MedicationScheduleScreen: React.FC = () => {
  const navigation = useNavigation();
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
  const [formQuantity, setFormQuantity] = useState<string>('');
  const [formRemainingStock, setFormRemainingStock] = useState<string>('');

  // TimePicker state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [activeDoseIndex, setActiveDoseIndex] = useState<number | null>(null);

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
    setFormQuantity('');
    setFormRemainingStock('');
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
    setFormQuantity(med.quantity?.toString() || '');
    setFormRemainingStock(med.remainingStock?.toString() || '');
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

  // Time Picker Logic
  const parseTime = (timeStr: string) => {
    const d = new Date();
    const [h, m] = timeStr.split(':').map(Number);
    d.setHours(h || 0);
    d.setMinutes(m || 0);
    d.setSeconds(0);
    return d;
  };

  // FIX #7: Ensure tempDate is properly initialized when opening time picker
  const handleTimeVerify = (index: number) => {
    const dose = formDoses[index];
    if (!dose || !dose.timeOfDay) {
      console.warn(`[MedicationSchedule] Invalid dose at index ${index}`);
      return;
    }
    const date = parseTime(dose.timeOfDay);
    setTempDate(date);
    setActiveDoseIndex(index);
    setShowTimePicker(true);
    console.log(`[MedicationSchedule] Opening time picker for dose ${index}, current time: ${dose.timeOfDay}`);
  };

  // FIX #7: Improved time picker handling for both iOS and Android
  const onTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      // Android: Save immediately when user selects time
      if (event.type === 'set' && selectedDate && activeDoseIndex !== null) {
        const hours = selectedDate.getHours().toString().padStart(2, '0');
        const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
        const timeString = `${hours}:${minutes}`;
        updateDoseField(activeDoseIndex, { timeOfDay: timeString });
        setActiveDoseIndex(null);
        setShowTimePicker(false);
      } else if (event.type === 'dismissed') {
        // User cancelled - close picker without saving
        setShowTimePicker(false);
        setActiveDoseIndex(null);
      }
    } else {
      // iOS: Update tempDate as user scrolls, save on confirm
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const confirmIosTime = () => {
    // FIX #7: Ensure time is saved correctly on iOS
    if (activeDoseIndex !== null && tempDate) {
      const hours = tempDate.getHours().toString().padStart(2, '0');
      const minutes = tempDate.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      updateDoseField(activeDoseIndex, { timeOfDay: timeString });
      console.log(`[MedicationSchedule] Saved time for dose ${activeDoseIndex}: ${timeString}`);
    } else {
      console.warn('[MedicationSchedule] Cannot save time: activeDoseIndex or tempDate is null');
    }
    setShowTimePicker(false);
    setActiveDoseIndex(null);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setError(t('medications.error.nameRequired') || 'Medication name is required');
      return;
    }

    const payload: any = {
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

    // Add quantity and remainingStock if provided
    if (formQuantity.trim()) {
      const quantity = parseInt(formQuantity.trim(), 10);
      if (!isNaN(quantity) && quantity > 0) {
        payload.quantity = quantity;
      }
    }
    if (formRemainingStock.trim()) {
      const remainingStock = parseInt(formRemainingStock.trim(), 10);
      if (!isNaN(remainingStock) && remainingStock >= 0) {
        payload.remainingStock = remainingStock;
      }
    }

    try {
      setLoading(true);
      let savedMedId: string;
      if (editingMed) {
        await ApiService.updateMedication(editingMed.id, payload);
        savedMedId = editingMed.id;
        // Cancel old notifications for this medication
        await localNotificationService.cancelNotificationsByCategory(NotificationCategories.MEDICATION_REMINDER);
      } else {
        const created = await ApiService.createMedication(payload);
        savedMedId = created?.id || '';
      }

      // Schedule notifications for each dose time
      if (savedMedId && payload.doses.length > 0) {
        const hasPermission = await localNotificationService.checkPermissions();
        if (hasPermission) {
          for (const dose of payload.doses) {
            const [hour, minute] = dose.timeOfDay.split(':').map(Number);
            await localNotificationService.scheduleMedicationReminder(
              payload.name,
              hour,
              minute,
              savedMedId
            );
          }
        }
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

  // Helper function to check if a string looks like a localization key
  const isLocalizationKey = (str: string): boolean => {
    if (!str || typeof str !== 'string') return false;
    // Check if it contains dots (like "medications.name") or looks like a key path
    return str.includes('.') && str.length > 3 && str.split('.').length >= 2;
  };

  // Helper function to safely get medication name, avoiding localization keys
  const getMedicationName = (name: string | undefined | null): string => {
    if (!name) return '';
    // If it looks like a localization key, return a fallback
    if (isLocalizationKey(name)) {
      // Try to extract the last part as a fallback
      const parts = name.split('.');
      const fallback = parts[parts.length - 1];
      // Capitalize first letter and replace underscores with spaces
      return fallback.charAt(0).toUpperCase() + fallback.slice(1).replace(/_/g, ' ');
    }
    return name;
  };

  const renderMedicationItem = ({ item }: { item: Medication }) => {
    const dosesText =
      item.doses && item.doses.length
        ? item.doses.map((d) => d.timeOfDay).join(', ')
        : t('medications.noDoses') || 'No times specified';

    const medicationName = getMedicationName(item.name);

    // Calculate days until stock runs out
    const dosesPerDay = item.doses?.length || 0;
    const daysRemaining = item.remainingStock && dosesPerDay > 0
      ? Math.floor(item.remainingStock / dosesPerDay)
      : null;
    
    const isLowStock = item.remainingStock !== null && item.remainingStock !== undefined
      && item.lowStockThreshold !== null && item.lowStockThreshold !== undefined
      && daysRemaining !== null
      && daysRemaining <= item.lowStockThreshold;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: colors.card || colors.surface },
          isLowStock && { borderLeftWidth: 4, borderLeftColor: colors.warning || '#FF9500' },
        ]}
        onPress={() => openEditModal(item)}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary || colors.text }]}>
            {medicationName}
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
        {/* Stock information */}
        {item.quantity !== null && item.quantity !== undefined && (
          <View style={styles.stockContainer}>
            <Text style={[styles.stockLabel, { color: colors.textSecondary }]}>
              {t('medications.stock.total') || 'Total'}: {item.quantity}
            </Text>
            {item.remainingStock !== null && item.remainingStock !== undefined && (
              <>
                <Text style={[styles.stockLabel, { color: colors.textSecondary }]}>
                  {t('medications.stock.remaining') || 'Remaining'}: {item.remainingStock}
                </Text>
                {daysRemaining !== null && (
                  <Text
                    style={[
                      styles.stockLabel,
                      {
                        color: isLowStock
                          ? (colors.warning || '#FF9500')
                          : colors.textSecondary,
                        fontWeight: isLowStock ? '600' : '400',
                      },
                    ]}
                  >
                    {t('medications.stock.daysRemaining') || 'Days remaining'}: {daysRemaining}
                  </Text>
                )}
              </>
            )}
            {isLowStock && (
              <View style={[styles.lowStockWarning, { backgroundColor: (colors.warning || '#FF9500') + '20' }]}>
                <Ionicons name="warning" size={16} color={colors.warning || '#FF9500'} />
                <Text style={[styles.lowStockText, { color: colors.warning || '#FF9500' }]}>
                  {t('medications.stock.lowStock') || 'Low stock! Time to refill'}
                </Text>
              </View>
            )}
          </View>
        )}
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
      flex: 1,
      textAlign: 'center',
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
    stockContainer: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: '#E5E5EA',
    },
    stockLabel: {
      fontSize: 12,
      marginTop: 2,
    },
    lowStockWarning: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      padding: 8,
      borderRadius: 8,
    },
    lowStockText: {
      fontSize: 12,
      marginLeft: 6,
      fontWeight: '500',
    },
    hint: {
      fontSize: 11,
      marginTop: -4,
      marginBottom: 8,
      fontStyle: 'italic',
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
      overflow: 'hidden', // Added to ensure border radius clips content
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
      flex: 1,
    },
    modalCloseButton: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
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
      justifyContent: 'center', // Align text vertically
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
        <TouchableOpacity
          onPress={() => {
            if (navigation && typeof navigation.goBack === 'function') {
              navigation.goBack();
            }
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={24} color={colors.textPrimary || colors.text} />
        </TouchableOpacity>
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

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.card || colors.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary || colors.text }]}>
                  {editingMed
                    ? t('medications.edit') || 'Edit medication'
                    : t('medications.add') || 'Add medication'}
                </Text>
                <TouchableOpacity
                  onPress={closeModal}
                  style={styles.modalCloseButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                >
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
                  {t('medications.fields.quantity') || 'Total quantity (optional)'}
                </Text>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary || colors.text, borderColor: colors.border || '#E5E5EA', backgroundColor: colors.background }]}
                  value={formQuantity}
                  onChangeText={setFormQuantity}
                  placeholder={t('medications.placeholders.quantity') || '30'}
                  placeholderTextColor={colors.textTertiary || '#8E8E93'}
                  keyboardType="numeric"
                />
                <Text style={[styles.hint, { color: colors.textTertiary || '#8E8E93' }]}>
                  {t('medications.hints.quantity') || 'Total number of tablets/pills in package'}
                </Text>

                <Text style={[styles.label, { color: colors.textPrimary || colors.text }]}>
                  {t('medications.fields.remainingStock') || 'Remaining stock (optional)'}
                </Text>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary || colors.text, borderColor: colors.border || '#E5E5EA', backgroundColor: colors.background }]}
                  value={formRemainingStock}
                  onChangeText={setFormRemainingStock}
                  placeholder={t('medications.placeholders.remainingStock') || 'Auto-calculated'}
                  placeholderTextColor={colors.textTertiary || '#8E8E93'}
                  keyboardType="numeric"
                />
                <Text style={[styles.hint, { color: colors.textTertiary || '#8E8E93' }]}>
                  {t('medications.hints.remainingStock') || 'Will be calculated automatically based on doses and days passed'}
                </Text>

                <Text style={[styles.label, { color: colors.textPrimary || colors.text }]}>
                  {t('medications.fields.doses') || 'Dose times'}
                </Text>

                {formDoses.map((dose, index) => (
                  <View key={index} style={styles.doseRow}>
                    <TouchableOpacity
                      style={[
                        styles.doseInput,
                        { borderColor: colors.border || '#E5E5EA', backgroundColor: colors.background, justifyContent: 'center' },
                      ]}
                      onPress={() => handleTimeVerify(index)}
                    >
                      <Text style={{ color: colors.textPrimary || colors.text }}>
                        {dose.timeOfDay}
                      </Text>
                    </TouchableOpacity>

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
        </KeyboardAvoidingView>
      </Modal>

      {/* Date Picker (iOS Modal / Android Inline) */}
      {showTimePicker && (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="fade" visible={showTimePicker}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
              <View style={{ backgroundColor: colors.surface || 'white', padding: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                  <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                    <Text style={{ color: colors.primary || 'blue', fontSize: 17 }}>{t('common.cancel') || 'Cancel'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={confirmIosTime}>
                    <Text style={{ color: colors.primary || 'blue', fontWeight: '600', fontSize: 17 }}>{t('common.done') || 'Done'}</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempDate}
                  mode="time"
                  display="spinner"
                  onChange={onTimeChange}
                  textColor={colors.textPrimary}
                  is24Hour={false}
                  locale="en_US"
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={tempDate}
            mode="time"
            display="default"
            onChange={onTimeChange}
          />
        )
      )}
      {/* Disclaimer Modal */}
      {/* @ts-ignore */}
      <DisclaimerModal disclaimerKey="medications" />
    </SafeAreaView>
  );
};

export default MedicationScheduleScreen;
