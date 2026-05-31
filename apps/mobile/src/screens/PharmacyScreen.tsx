import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import ApiService from '../services/apiService';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { ListSkeleton } from '../components/common/Skeleton';
import { BottomSheet } from '../components/common/BottomSheet';

// --- Types ---

type PharmacyConnection = {
  id: string;
  pharmacyName: string;
  pharmacyCode?: string;
  pharmacyAddress?: string;
  pharmacyPhone?: string;
  pharmacyEmail?: string;
  pharmacyWebsite?: string;
  isActive: boolean;
};

type OrderItem = {
  name: string;
  dosage?: string;
  quantity?: string;
};

type Medication = {
  id: string;
  name: string;
  dosage?: string;
  remainingStock?: number;
  isActive: boolean;
};

type PharmacyOrder = {
  id: string;
  status: string;
  items: OrderItem[];
  prescriptionUrl?: string;
  notes?: string;
  createdAt: string;
  pharmacyConnection?: PharmacyConnection;
};

// ==================== CONNECT PHARMACY MODAL ====================

const ConnectPharmacyModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  colors: any;
  t: any;
  editing?: PharmacyConnection | null;
}> = ({ visible, onClose, onSave, colors, t, editing }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setName(editing.pharmacyName || '');
      setCode(editing.pharmacyCode || '');
      setAddress(editing.pharmacyAddress || '');
      setPhone(editing.pharmacyPhone || '');
      setEmail(editing.pharmacyEmail || '');
      setWebsite(editing.pharmacyWebsite || '');
    } else {
      setName('');
      setCode('');
      setAddress('');
      setPhone('');
      setEmail('');
      setWebsite('');
    }
  }, [editing, visible]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.error', 'Error'), t('pharmacy.error.nameRequired', 'Pharmacy name is required'));
      return;
    }
    setSaving(true);
    try {
      await onSave({
        pharmacyName: name.trim(),
        pharmacyCode: code.trim() || undefined,
        pharmacyAddress: address.trim() || undefined,
        pharmacyPhone: phone.trim() || undefined,
        pharmacyEmail: email.trim() || undefined,
        pharmacyWebsite: website.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom', 'left', 'right']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border || '#E5E7EB' }]}>
            <TouchableOpacity onPress={onClose} style={styles.modalHeaderBtn}>
              <Text style={{ color: colors.primary, fontSize: 16 }}>{t('common.cancel', 'Cancel')}</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.textPrimary || colors.text }]}>
              {editing
                ? t('pharmacy.editPharmacy', 'Edit Pharmacy')
                : t('pharmacy.connectPharmacy', 'Connect Pharmacy')}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.modalHeaderBtn}>
              {saving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>
                  {t('common.save', 'Save')}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Name */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              {t('pharmacy.fields.name', 'Pharmacy Name')} *
            </Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary || colors.text, borderColor: colors.border || '#E5E7EB', backgroundColor: colors.cardBackground || colors.surface || '#F9FAFB' }]}
              value={name}
              onChangeText={setName}
              placeholder={t('pharmacy.placeholders.name', 'e.g. Amavita Apotheke')}
              placeholderTextColor={colors.textTertiary || '#9CA3AF'}
            />

            {/* Code */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              {t('pharmacy.fields.code', 'Pharmacy Code')}
            </Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary || colors.text, borderColor: colors.border || '#E5E7EB', backgroundColor: colors.cardBackground || colors.surface || '#F9FAFB' }]}
              value={code}
              onChangeText={setCode}
              placeholder={t('pharmacy.placeholders.code', 'e.g. AMA-1234')}
              placeholderTextColor={colors.textTertiary || '#9CA3AF'}
            />

            {/* Address */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              {t('pharmacy.fields.address', 'Address')}
            </Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary || colors.text, borderColor: colors.border || '#E5E7EB', backgroundColor: colors.cardBackground || colors.surface || '#F9FAFB' }]}
              value={address}
              onChangeText={setAddress}
              placeholder={t('pharmacy.placeholders.address', 'e.g. Marktgasse 12, 3011 Bern')}
              placeholderTextColor={colors.textTertiary || '#9CA3AF'}
            />

            {/* Phone */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              {t('pharmacy.fields.phone', 'Phone')}
            </Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary || colors.text, borderColor: colors.border || '#E5E7EB', backgroundColor: colors.cardBackground || colors.surface || '#F9FAFB' }]}
              value={phone}
              onChangeText={setPhone}
              placeholder={t('pharmacy.placeholders.phone', '+41 31 311 22 33')}
              placeholderTextColor={colors.textTertiary || '#9CA3AF'}
              keyboardType="phone-pad"
            />

            {/* Email */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              {t('pharmacy.fields.email', 'Email')}
            </Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary || colors.text, borderColor: colors.border || '#E5E7EB', backgroundColor: colors.cardBackground || colors.surface || '#F9FAFB' }]}
              value={email}
              onChangeText={setEmail}
              placeholder={t('pharmacy.placeholders.email', 'pharmacy@example.ch')}
              placeholderTextColor={colors.textTertiary || '#9CA3AF'}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {/* Website — used in low-stock emails so the pharmacy can jump
                straight to their own stock-check page. */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              {t('pharmacy.fields.website', 'Website')}
            </Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary || colors.text, borderColor: colors.border || '#E5E7EB', backgroundColor: colors.cardBackground || colors.surface || '#F9FAFB' }]}
              value={website}
              onChangeText={setWebsite}
              placeholder={t('pharmacy.placeholders.website', 'https://example-pharmacy.ch')}
              placeholderTextColor={colors.textTertiary || '#9CA3AF'}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

// ==================== ORDER MODAL ====================

const OrderModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  pharmacies: PharmacyConnection[];
  medications: Medication[];
  initialItem?: OrderItem | null;
  colors: any;
  t: any;
}> = ({ visible, onClose, onSubmit, pharmacies, medications, initialItem, colors, t }) => {
  const [selectedPharmacy, setSelectedPharmacy] = useState<string | null>(null);
  const [items, setItems] = useState<OrderItem[]>([{ name: '', dosage: '', quantity: '' }]);
  const [prescriptionUrl, setPrescriptionUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showMedPicker, setShowMedPicker] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      setSelectedPharmacy(pharmacies.length > 0 ? pharmacies[0].id : null);
      // Pre-fill the first row when opened from a low-stock refill nudge.
      setItems(initialItem && initialItem.name
        ? [{ name: initialItem.name, dosage: initialItem.dosage || '', quantity: initialItem.quantity || '1' }]
        : [{ name: '', dosage: '', quantity: '' }]);
      setPrescriptionUrl(null);
      setNotes('');
    }
  }, [visible, pharmacies, initialItem]);

  const addItem = () => {
    setItems([...items, { name: '', dosage: '', quantity: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof OrderItem, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const selectMedication = (index: number, med: Medication) => {
    const updated = [...items];
    updated[index] = { name: med.name, dosage: med.dosage || '', quantity: '1' };
    setItems(updated);
    setShowMedPicker(null);
  };

  const processPickedImage = async (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled && result.assets[0]) {
      try {
        setUploadingPhoto(true);
        const uploadResult = await ApiService.uploadImage(result.assets[0].uri);
        if (uploadResult?.url) {
          setPrescriptionUrl(uploadResult.url);
        } else if (uploadResult?.id) {
          setPrescriptionUrl(uploadResult.id);
        }
      } catch (err) {
        console.error('[Pharmacy] Photo upload error:', err);
        Alert.alert(t('common.error', 'Error'), t('pharmacy.error.photoUpload', 'Failed to upload photo'));
      } finally {
        setUploadingPhoto(false);
      }
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error', 'Error'), t('pharmacy.error.cameraPermission', 'Camera permission is required'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });
    await processPickedImage(result);
  };

  const handleChooseFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });
    await processPickedImage(result);
  };

  const handlePhotoAction = () => {
    Alert.alert(
      t('pharmacy.prescription', 'Prescription'),
      t('pharmacy.prescriptionPhotoPrompt', 'Add prescription photo'),
      [
        { text: t('medications.takePhoto', 'Take Photo'), onPress: handleTakePhoto },
        { text: t('medications.chooseFromGallery', 'Choose from Gallery'), onPress: handleChooseFromGallery },
        ...(prescriptionUrl ? [{ text: t('pharmacy.removePrescription', 'Remove'), style: 'destructive' as const, onPress: () => setPrescriptionUrl(null) }] : []),
        { text: t('common.cancel', 'Cancel'), style: 'cancel' as const },
      ],
    );
  };

  const handleSubmit = async () => {
    const validItems = items.filter(i => i.name.trim());
    if (validItems.length === 0) {
      Alert.alert(t('common.error', 'Error'), t('pharmacy.error.noItems', 'Add at least one medication'));
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        pharmacyConnectionId: selectedPharmacy || undefined,
        items: validItems,
        prescriptionUrl: prescriptionUrl || undefined,
        notes: notes.trim() || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom', 'left', 'right']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border || '#E5E7EB' }]}>
            <TouchableOpacity onPress={onClose} style={styles.modalHeaderBtn}>
              <Text style={{ color: colors.primary, fontSize: 16 }}>{t('common.cancel', 'Cancel')}</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.textPrimary || colors.text }]}>
              {t('pharmacy.orderMedications', 'Order Medications')}
            </Text>
            <View style={styles.modalHeaderBtn} />
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 100 }}>
            {/* Select Pharmacy */}
            {pharmacies.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary || colors.text }]}>
                  {t('pharmacy.selectPharmacy', 'Select Pharmacy')}
                </Text>
                {pharmacies.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.pharmacyOption,
                      {
                        borderColor: selectedPharmacy === p.id ? colors.primary : (colors.border || '#E5E7EB'),
                        backgroundColor: selectedPharmacy === p.id ? (colors.primaryLight || colors.primary + '10') : (colors.cardBackground || colors.surface || '#F9FAFB'),
                      },
                    ]}
                    onPress={() => setSelectedPharmacy(p.id)}
                  >
                    <Ionicons
                      name={selectedPharmacy === p.id ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={selectedPharmacy === p.id ? colors.primary : colors.textTertiary}
                    />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={[styles.pharmacyOptionName, { color: colors.textPrimary || colors.text }]}>
                        {p.pharmacyName}
                      </Text>
                      {p.pharmacyAddress ? (
                        <Text style={[styles.pharmacyOptionAddress, { color: colors.textSecondary }]}>
                          {p.pharmacyAddress}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Medications */}
            <Text style={[styles.sectionTitle, { color: colors.textPrimary || colors.text, marginTop: 20 }]}>
              {t('pharmacy.medications', 'Medications')}
            </Text>

            {items.map((item, index) => (
              <View key={index} style={[styles.orderItemCard, { backgroundColor: colors.cardBackground || colors.surface || '#F9FAFB', borderColor: colors.border || '#E5E7EB' }]}>
                <View style={styles.orderItemHeader}>
                  <Text style={[styles.orderItemNumber, { color: colors.textSecondary }]}>
                    #{index + 1}
                  </Text>
                  {items.length > 1 && (
                    <TouchableOpacity onPress={() => removeItem(index)}>
                      <Ionicons name="close-circle" size={22} color={colors.error || '#EF4444'} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Name input + medication picker */}
                <View style={styles.nameRow}>
                  <TextInput
                    style={[styles.input, styles.nameInput, { color: colors.textPrimary || colors.text, borderColor: colors.border || '#E5E7EB' }]}
                    value={item.name}
                    onChangeText={(v) => updateItem(index, 'name', v)}
                    placeholder={t('pharmacy.placeholders.medicationName', 'Medication name')}
                    placeholderTextColor={colors.textTertiary || '#9CA3AF'}
                  />
                  {medications.length > 0 && (
                    <TouchableOpacity
                      style={[styles.pickMedBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
                      onPress={() => setShowMedPicker(showMedPicker === index ? null : index)}
                    >
                      <Ionicons name="list" size={18} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Medication picker dropdown */}
                {showMedPicker === index && medications.length > 0 && (
                  <View style={[styles.medPickerDropdown, { backgroundColor: colors.cardBackground || '#FFF', borderColor: colors.border || '#E5E7EB' }]}>
                    {medications.map(med => (
                      <TouchableOpacity
                        key={med.id}
                        style={[styles.medPickerItem, { borderBottomColor: colors.border || '#E5E7EB' }]}
                        onPress={() => selectMedication(index, med)}
                      >
                        <Ionicons name="medkit" size={16} color={colors.primary} />
                        <Text style={[styles.medPickerName, { color: colors.textPrimary || colors.text }]}>
                          {med.name}
                        </Text>
                        {med.dosage ? (
                          <Text style={[styles.medPickerDosage, { color: colors.textSecondary }]}>
                            {med.dosage}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Dosage + Quantity row */}
                <View style={styles.dosageRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.miniLabel, { color: colors.textTertiary }]}>
                      {t('pharmacy.fields.dosage', 'Dosage')}
                    </Text>
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary || colors.text, borderColor: colors.border || '#E5E7EB' }]}
                      value={item.dosage}
                      onChangeText={(v) => updateItem(index, 'dosage', v)}
                      placeholder="500 mg"
                      placeholderTextColor={colors.textTertiary || '#9CA3AF'}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.miniLabel, { color: colors.textTertiary }]}>
                      {t('pharmacy.fields.quantity', 'Quantity')}
                    </Text>
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary || colors.text, borderColor: colors.border || '#E5E7EB' }]}
                      value={item.quantity}
                      onChangeText={(v) => updateItem(index, 'quantity', v)}
                      placeholder="1"
                      placeholderTextColor={colors.textTertiary || '#9CA3AF'}
                    />
                  </View>
                </View>
              </View>
            ))}

            {/* Add item button */}
            <TouchableOpacity
              style={[styles.addItemBtn, { borderColor: colors.primary + '40' }]}
              onPress={addItem}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={{ color: colors.primary, marginLeft: 8, fontWeight: '500' }}>
                {t('pharmacy.addMedication', 'Add Medication')}
              </Text>
            </TouchableOpacity>

            {/* Prescription photo */}
            <Text style={[styles.sectionTitle, { color: colors.textPrimary || colors.text, marginTop: 24 }]}>
              {t('pharmacy.prescription', 'Prescription')}
              <Text style={{ color: colors.textTertiary, fontWeight: '400', fontSize: 13 }}>
                {' '}({t('common.optional', 'optional')})
              </Text>
            </Text>

            <TouchableOpacity
              style={[styles.prescriptionBtn, { borderColor: colors.border || '#E5E7EB', backgroundColor: colors.cardBackground || colors.surface || '#F9FAFB' }]}
              onPress={handlePhotoAction}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : prescriptionUrl ? (
                <View style={styles.prescriptionAttached}>
                  <Ionicons name="document-attach" size={24} color={colors.success || '#10B981'} />
                  <Text style={[styles.prescriptionText, { color: colors.success || '#10B981' }]}>
                    {t('pharmacy.prescriptionAttached', 'Prescription attached')}
                  </Text>
                  <Ionicons name="pencil" size={16} color={colors.textTertiary} />
                </View>
              ) : (
                <View style={styles.prescriptionPlaceholder}>
                  <Ionicons name="camera-outline" size={28} color={colors.textTertiary} />
                  <Text style={[styles.prescriptionPlaceholderText, { color: colors.textSecondary }]}>
                    {t('pharmacy.addPrescription', 'Add prescription photo')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Notes */}
            <Text style={[styles.sectionTitle, { color: colors.textPrimary || colors.text, marginTop: 24 }]}>
              {t('pharmacy.notes', 'Notes')}
              <Text style={{ color: colors.textTertiary, fontWeight: '400', fontSize: 13 }}>
                {' '}({t('common.optional', 'optional')})
              </Text>
            </Text>
            <TextInput
              style={[styles.input, styles.notesInput, { color: colors.textPrimary || colors.text, borderColor: colors.border || '#E5E7EB', backgroundColor: colors.cardBackground || colors.surface || '#F9FAFB' }]}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('pharmacy.placeholders.notes', 'Any additional notes...')}
              placeholderTextColor={colors.textTertiary || '#9CA3AF'}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </ScrollView>

          {/* Submit button */}
          <View style={[styles.submitContainer, { backgroundColor: colors.background, borderTopColor: colors.border || '#E5E7EB' }]}>
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.submitBtnText}>
                    {t('pharmacy.submitOrder', 'Submit Order')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

// ==================== MAIN SCREEN ====================

const PharmacyScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { t } = useI18n();

  const [pharmacies, setPharmacies] = useState<PharmacyConnection[]>([]);
  const [orders, setOrders] = useState<PharmacyOrder[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  const [connectModalVisible, setConnectModalVisible] = useState(false);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [orderPrefillItem, setOrderPrefillItem] = useState<OrderItem | null>(null);
  const [editingPharmacy, setEditingPharmacy] = useState<PharmacyConnection | null>(null);
  const [codeModalVisible, setCodeModalVisible] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [applyingCode, setApplyingCode] = useState(false);

  // Deep-link from a low-stock refill nudge (push or the "Order refill" button
  // on the medication card): open the order modal with the medication pre-filled.
  useEffect(() => {
    const prefill = route.params?.prefillMedication;
    if (route.params?.autoOpenOrder && prefill?.name) {
      setOrderPrefillItem({ name: prefill.name, dosage: prefill.dosage || '', quantity: '1' });
      setOrderModalVisible(true);
      // Clear params so it doesn't re-open on every focus/re-render.
      navigation.setParams({ autoOpenOrder: undefined, prefillMedication: undefined } as never);
    }
  }, [route.params?.autoOpenOrder, route.params?.prefillMedication, navigation]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [pharmacyData, orderData, medData] = await Promise.all([
        ApiService.getPharmacyConnections().catch(() => []),
        ApiService.getPharmacyOrders().catch(() => []),
        ApiService.getMedications().catch(() => []),
      ]);
      setPharmacies(pharmacyData || []);
      setOrders(orderData || []);
      setMedications((medData || []).filter((m: Medication) => m.isActive));
    } catch (e) {
      console.error('[Pharmacy] Load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleConnectPharmacy = async (data: any) => {
    try {
      if (editingPharmacy) {
        await ApiService.updatePharmacyConnection(editingPharmacy.id, data);
      } else {
        await ApiService.connectPharmacy(data);
      }
      await loadData();
      setConnectModalVisible(false);
      setEditingPharmacy(null);
    } catch (e) {
      console.error('[Pharmacy] Connect error:', e);
      Alert.alert(t('common.error', 'Error'), t('pharmacy.error.connect', 'Failed to connect pharmacy'));
    }
  };

  const handleApplyCode = async () => {
    const code = codeInput.replace(/[^a-z0-9-]/gi, '').toUpperCase();
    if (code.length < 4) {
      Alert.alert(t('pharmacy.codeInvalidTitle', 'Check the code'), t('pharmacy.codeInvalidBody', 'Check the pharmacy code and try again.'));
      return;
    }
    setApplyingCode(true);
    try {
      await ApiService.connectPharmacyByCode(code);
      await loadData();
      setCodeModalVisible(false);
      setCodeInput('');
      Alert.alert(t('pharmacy.codeAppliedTitle', 'Pharmacy linked'), t('pharmacy.codeAppliedBody', 'This pharmacy is now connected.'));
    } catch (e) {
      console.error('[Pharmacy] Apply code error:', e);
      Alert.alert(t('pharmacy.codeInvalidTitle', 'Check the code'), t('pharmacy.codeInvalidBody', 'Check the pharmacy code and try again.'));
    } finally {
      setApplyingCode(false);
    }
  };

  const handleDisconnect = (pharmacy: PharmacyConnection) => {
    Alert.alert(
      t('pharmacy.disconnectTitle', 'Disconnect Pharmacy'),
      t('pharmacy.disconnectConfirm', `Disconnect from ${pharmacy.pharmacyName}?`),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('pharmacy.disconnect', 'Disconnect'),
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiService.disconnectPharmacy(pharmacy.id);
              await loadData();
            } catch (e) {
              console.error('[Pharmacy] Disconnect error:', e);
              Alert.alert(t('common.error', 'Error'), t('pharmacy.error.disconnect', 'Failed to disconnect pharmacy'));
            }
          },
        },
      ],
    );
  };

  const handleSubmitOrder = async (data: any) => {
    try {
      await ApiService.createPharmacyOrder(data);
      await loadData();
      setOrderModalVisible(false);
      setOrderPrefillItem(null);
      Alert.alert(
        t('pharmacy.orderSentTitle', 'Order Sent!'),
        t('pharmacy.orderSentMessage', 'Your order has been sent. We will notify the pharmacy.'),
      );
    } catch (e) {
      console.error('[Pharmacy] Order error:', e);
      Alert.alert(t('common.error', 'Error'), t('pharmacy.error.order', 'Failed to send order'));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return colors.info || '#3B82F6';
      case 'processing': return colors.warning || '#F59E0B';
      case 'ready': return colors.success || '#10B981';
      case 'completed': return colors.textTertiary || '#9CA3AF';
      default: return colors.textSecondary || '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: t('pharmacy.status.pending', 'Pending'),
      sent: t('pharmacy.status.sent', 'Sent'),
      processing: t('pharmacy.status.processing', 'Processing'),
      ready: t('pharmacy.status.ready', 'Ready'),
      completed: t('pharmacy.status.completed', 'Completed'),
    };
    return labels[status] || status;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border || '#E5E7EB' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary || colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary || colors.text }]}>
          {t('pharmacy.title', 'My Pharmacy')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ListSkeleton count={4} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Connected Pharmacies Section */}
          <Text style={[styles.sectionTitle, { color: colors.textPrimary || colors.text }]}>
            {t('pharmacy.connectedPharmacies', 'Connected Pharmacies')}
          </Text>

          {pharmacies.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.cardBackground || colors.surface || '#F9FAFB', borderColor: colors.border || '#E5E7EB' }]}>
              <Ionicons name="storefront-outline" size={40} color={colors.textTertiary || '#9CA3AF'} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('pharmacy.noPharmacy', 'No pharmacy connected yet')}
              </Text>
            </View>
          ) : (
            pharmacies.map(p => (
              <View
                key={p.id}
                style={[styles.pharmacyCard, { backgroundColor: colors.cardBackground || colors.surface || '#F9FAFB', borderColor: colors.border || '#E5E7EB' }]}
              >
                <View style={styles.pharmacyCardHeader}>
                  <View style={[styles.pharmacyIcon, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name="storefront" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.pharmacyName, { color: colors.textPrimary || colors.text }]}>
                      {p.pharmacyName}
                    </Text>
                    {p.pharmacyCode ? (
                      <Text style={[styles.pharmacyDetail, { color: colors.textTertiary }]}>
                        {t('pharmacy.fields.code', 'Code')}: {p.pharmacyCode}
                      </Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingPharmacy(p);
                      setConnectModalVisible(true);
                    }}
                    style={{ padding: 4, marginRight: 4 }}
                  >
                    <Ionicons name="pencil" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDisconnect(p)} style={{ padding: 4 }}>
                    <Ionicons name="trash-outline" size={18} color={colors.error || '#EF4444'} />
                  </TouchableOpacity>
                </View>
                {p.pharmacyAddress ? (
                  <View style={styles.pharmacyDetailRow}>
                    <Ionicons name="location-outline" size={14} color={colors.textTertiary} />
                    <Text style={[styles.pharmacyDetailText, { color: colors.textSecondary }]}>{p.pharmacyAddress}</Text>
                  </View>
                ) : null}
                {p.pharmacyPhone ? (
                  <View style={styles.pharmacyDetailRow}>
                    <Ionicons name="call-outline" size={14} color={colors.textTertiary} />
                    <Text style={[styles.pharmacyDetailText, { color: colors.textSecondary }]}>{p.pharmacyPhone}</Text>
                  </View>
                ) : null}
              </View>
            ))
          )}

          {/* Link by pharmacy code (admin-provisioned pharmacies) */}
          <TouchableOpacity
            style={[styles.codeEntryBtn, { borderColor: colors.primary + '40', backgroundColor: colors.primary + '08' }]}
            onPress={() => { setCodeInput(''); setCodeModalVisible(true); }}
            activeOpacity={0.75}
          >
            <Ionicons name="key-outline" size={18} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ color: colors.textPrimary || colors.text, fontWeight: '700', fontSize: 14 }}>
                {t('pharmacy.haveCodeTitle', 'I have a pharmacy code')}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 1 }}>
                {t('pharmacy.haveCodeSub', 'Link instantly — no address or email to type.')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary || '#9CA3AF'} />
          </TouchableOpacity>

          {/* Connect button */}
          <TouchableOpacity
            style={[styles.connectBtn, { borderColor: colors.primary }]}
            onPress={() => {
              setEditingPharmacy(null);
              setConnectModalVisible(true);
            }}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={{ color: colors.primary, marginLeft: 8, fontWeight: '600', fontSize: 15 }}>
              {t('pharmacy.connectPharmacy', 'Connect Pharmacy')}
            </Text>
          </TouchableOpacity>

          {/* Order Button */}
          <TouchableOpacity
            style={[styles.orderBtn, { backgroundColor: colors.primary }]}
            onPress={() => setOrderModalVisible(true)}
          >
            <Ionicons name="cart-outline" size={22} color="#FFF" style={{ marginRight: 10 }} />
            <Text style={styles.orderBtnText}>
              {t('pharmacy.orderMedications', 'Order Medications')}
            </Text>
          </TouchableOpacity>

          {/* Order History */}
          {orders.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary || colors.text, marginTop: 28 }]}>
                {t('pharmacy.orderHistory', 'Order History')}
              </Text>

              {orders.map(order => (
                <View
                  key={order.id}
                  style={[styles.orderCard, { backgroundColor: colors.cardBackground || colors.surface || '#F9FAFB', borderColor: colors.border || '#E5E7EB' }]}
                >
                  <View style={styles.orderCardHeader}>
                    <Text style={[styles.orderDate, { color: colors.textSecondary }]}>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                        {getStatusLabel(order.status)}
                      </Text>
                    </View>
                  </View>
                  {order.pharmacyConnection && (
                    <Text style={[styles.orderPharmacy, { color: colors.textTertiary }]}>
                      {order.pharmacyConnection.pharmacyName}
                    </Text>
                  )}
                  <View style={styles.orderItemsList}>
                    {(order.items as OrderItem[]).map((item, i) => (
                      <Text key={i} style={[styles.orderItemText, { color: colors.textPrimary || colors.text }]}>
                        • {item.name}{item.dosage ? ` (${item.dosage})` : ''}{item.quantity ? ` × ${item.quantity}` : ''}
                      </Text>
                    ))}
                  </View>
                  {order.prescriptionUrl && (
                    <View style={styles.orderPrescription}>
                      <Ionicons name="document-attach" size={14} color={colors.success || '#10B981'} />
                      <Text style={[styles.orderPrescriptionText, { color: colors.success || '#10B981' }]}>
                        {t('pharmacy.prescriptionAttached', 'Prescription attached')}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* Modals */}
      <ConnectPharmacyModal
        visible={connectModalVisible}
        onClose={() => {
          setConnectModalVisible(false);
          setEditingPharmacy(null);
        }}
        onSave={handleConnectPharmacy}
        colors={colors}
        t={t}
        editing={editingPharmacy}
      />

      <OrderModal
        visible={orderModalVisible}
        onClose={() => { setOrderModalVisible(false); setOrderPrefillItem(null); }}
        onSubmit={handleSubmitOrder}
        pharmacies={pharmacies}
        medications={medications}
        initialItem={orderPrefillItem}
        colors={colors}
        t={t}
      />

      {/* Pharmacy code entry */}
      <BottomSheet visible={codeModalVisible} onClose={() => setCodeModalVisible(false)}>
        <Text style={[styles.codeTitle, { color: colors.textPrimary || colors.text }]}>{t('pharmacy.enterCodeTitle', 'Pharmacy code')}</Text>
        <Text style={[styles.codeSub, { color: colors.textSecondary }]}>{t('pharmacy.enterCodeBody', 'Enter the code your pharmacy shared with you.')}</Text>
        <TextInput
          value={codeInput}
          onChangeText={(v) => setCodeInput(v.replace(/[^a-z0-9-]/gi, '').toUpperCase().slice(0, 32))}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder={t('pharmacy.codePlaceholder', 'AMAVITA-GENEVE')}
          placeholderTextColor={colors.textTertiary || '#9CA3AF'}
          style={[styles.codeInput, { borderColor: colors.border || '#E5E7EB', color: colors.textPrimary || colors.text, backgroundColor: colors.background }]}
          maxLength={32}
        />
        <View style={styles.codeActions}>
          <TouchableOpacity style={[styles.codeCancel, { borderColor: colors.border || '#E5E7EB' }]} onPress={() => setCodeModalVisible(false)} disabled={applyingCode}>
            <Text style={{ color: colors.textPrimary || colors.text, fontWeight: '700' }}>{t('common.cancel', 'Cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.codeApply, { backgroundColor: colors.primary, opacity: applyingCode ? 0.6 : 1 }]} onPress={handleApplyCode} disabled={applyingCode}>
            {applyingCode ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: '800' }}>{t('pharmacy.applyCode', 'Link pharmacy')}</Text>}
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
};

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // Section
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },

  // Empty state
  emptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: { marginTop: 8, fontSize: 14, textAlign: 'center' },

  // Pharmacy card
  pharmacyCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  pharmacyCardHeader: { flexDirection: 'row', alignItems: 'center' },
  pharmacyIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pharmacyName: { fontSize: 15, fontWeight: '600' },
  pharmacyDetail: { fontSize: 12, marginTop: 2 },
  pharmacyDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingLeft: 48,
  },
  pharmacyDetailText: { fontSize: 13, marginLeft: 6 },

  // Connect button
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    borderStyle: 'dashed',
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 20,
  },
  codeEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 4,
    marginBottom: 10,
  },
  codeTitle: { fontSize: 18, fontWeight: '800' },
  codeSub: { fontSize: 13, lineHeight: 19, marginTop: 6 },
  codeInput: {
    height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16,
    marginTop: 16, fontSize: 18, fontWeight: '800', letterSpacing: 1,
  },
  codeActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  codeCancel: { flex: 1, minHeight: 46, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  codeApply: { flex: 1.4, minHeight: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  // Order button
  orderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 8,
  },
  orderBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Order card
  orderCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderDate: { fontSize: 13 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },
  orderPharmacy: { fontSize: 12, marginBottom: 6 },
  orderItemsList: { marginTop: 4 },
  orderItemText: { fontSize: 14, marginBottom: 2 },
  orderPrescription: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  orderPrescriptionText: { fontSize: 12, marginLeft: 4 },

  // Modal
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalHeaderBtn: { width: 70 },
  modalTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center', flex: 1 },
  modalBody: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

  // Fields
  fieldLabel: { fontSize: 13, fontWeight: '500', marginBottom: 6, marginTop: 14 },
  miniLabel: { fontSize: 11, fontWeight: '500', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
  },
  notesInput: {
    minHeight: 80,
    paddingTop: 12,
  },

  // Order modal
  pharmacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  pharmacyOptionName: { fontSize: 15, fontWeight: '500' },
  pharmacyOptionAddress: { fontSize: 12, marginTop: 2 },

  orderItemCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  orderItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderItemNumber: { fontSize: 13, fontWeight: '600' },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  nameInput: { flex: 1 },
  pickMedBtn: {
    marginLeft: 8,
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dosageRow: { flexDirection: 'row', marginTop: 10 },

  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 8,
  },

  medPickerDropdown: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 8,
    overflow: 'hidden',
  },
  medPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  medPickerName: { fontSize: 14, fontWeight: '500', marginLeft: 8, flex: 1 },
  medPickerDosage: { fontSize: 12 },

  // Prescription
  prescriptionBtn: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  prescriptionAttached: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prescriptionText: { marginLeft: 8, fontWeight: '500', flex: 1 },
  prescriptionPlaceholder: { alignItems: 'center' },
  prescriptionPlaceholderText: { marginTop: 6, fontSize: 14 },

  // Submit
  submitContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 16,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default PharmacyScreen;
