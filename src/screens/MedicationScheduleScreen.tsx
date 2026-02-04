import React, { useEffect, useState, useCallback, useRef } from 'react';
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
    Keyboard,
    Animated,
    Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import ApiService from '../services/apiService';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { localNotificationService, NotificationCategories } from '../services/localNotificationService';
import DisclaimerModal from '../components/common/DisclaimerModal';

// --- Types ---

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
    imageUrl?: string | null; // FIX 2026-02-04: Photo of medication
};

// --- Constants ---

// Dosage unit keys for medications
const DOSAGE_UNIT_KEYS = ['mg', 'g', 'ml', 'drops', 'tablets', 'capsules', 'puffs', 'sprays', 'IU'] as const;

type DosageUnitKey = typeof DOSAGE_UNIT_KEYS[number];

// Helper to get localized label for dosage unit
const getDosageUnitLabel = (key: DosageUnitKey, t: (key: string) => string): string => {
    const translated = t(`medications.dosageUnits.${key}`);
    // Fallback to key if translation not found
    return translated && !translated.includes('dosageUnits') ? translated : key;
};

// Map of countable units that need pluralization
const COUNTABLE_UNITS: Record<string, string> = {
    tablets: 'tablet',
    capsules: 'capsule',
    drops: 'drop',
    puffs: 'puff',
    sprays: 'spray',
};

// Helper to get pluralized unit label based on count
const getPluralizedUnitLabel = (
    key: DosageUnitKey,
    count: number,
    t: (key: string, options?: object) => string
): string => {
    // Check if this is a countable unit that needs pluralization
    const singularKey = COUNTABLE_UNITS[key];
    if (singularKey) {
        // Determine Russian plural form manually
        // Russian rules: 1 -> one, 2-4 -> few, 5-20 -> many, 21 -> one, 22-24 -> few, etc.
        const getRuPluralSuffix = (n: number): string => {
            const abs = Math.abs(n);
            const lastTwo = abs % 100;
            const lastOne = abs % 10;

            if (lastTwo >= 11 && lastTwo <= 19) return '_many';
            if (lastOne === 1) return '_one';
            if (lastOne >= 2 && lastOne <= 4) return '_few';
            return '_many';
        };

        const suffix = getRuPluralSuffix(count);
        const pluralKey = `medications.dosagePlural.${singularKey}${suffix}`;
        const pluralized = t(pluralKey);

        // Check if translation was found (not a fallback key)
        if (pluralized && !pluralized.includes('dosagePlural') && pluralized !== pluralKey) {
            return pluralized;
        }

        // Fallback: try i18next automatic pluralization
        const autoPlural = t(`medications.dosagePlural.${singularKey}`, { count });
        if (autoPlural && !autoPlural.includes('dosagePlural')) {
            return autoPlural;
        }
    }
    // Fall back to regular unit label for non-countable units (mg, g, ml, IU)
    return getDosageUnitLabel(key, t);
};

// --- Helper Functions ---

const formatTimeInput = (text: string): string => {
    // Remove non-numeric characters
    const clean = text.replace(/[^0-9]/g, '');
    if (clean.length === 0) return '';

    // Auto-insert colon
    if (clean.length <= 2) return clean;
    return `${clean.slice(0, 2)}:${clean.slice(2, 4)}`;
};

const validateTime = (time: string): boolean => {
    if (!/^\d{2}:\d{2}$/.test(time)) return false;
    const [h, m] = time.split(':').map(Number);
    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
};

// --- Components ---

// 1. Header Component
const Header = ({ title, onAdd, onBack, colors }: any) => (
    <View style={[styles.header, { borderBottomColor: colors.border || '#E5E5EA' }]}>
        <TouchableOpacity
            onPress={onBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.headerButton}
        >
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary || '#000'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary || '#000' }]}>
            {title}
        </Text>
        <TouchableOpacity onPress={onAdd} style={styles.headerButton}>
            <Ionicons name="add" size={28} color={colors.primary} />
        </TouchableOpacity>
    </View>
);

// 2. Medication Card Component
const MedicationCard = ({ item, onPress, onDelete, onTake, colors, t }: any) => {
    const dosesText = item.doses && item.doses.length
        ? item.doses.map((d: any) => d.timeOfDay).join(', ')
        : t('medications.noDoses') || 'No times';

    // Stock logic
    const dosesPerDay = item.doses?.length || 0;
    const daysRemaining = item.remainingStock && dosesPerDay > 0
        ? Math.floor(item.remainingStock / dosesPerDay)
        : null;

    // Safety check for localization keys in name
    const displayName = item.name.includes('.') && item.name.includes('_')
        ? item.name.split('.').pop().replace(/_/g, ' ')
        : item.name;

    return (
        <TouchableOpacity
            style={[
                styles.card,
                { backgroundColor: colors.card || '#FFF', shadowColor: colors.shadow || '#000' }
            ]}
            onPress={() => onPress(item)}
            activeOpacity={0.7}
        >
            <View style={styles.cardInternal}>
                <View style={styles.iconContainer}>
                    {/* FIX 2026-02-04: Show medication photo if available */}
                    {item.imageUrl ? (
                        <Image
                            source={{ uri: item.imageUrl }}
                            style={styles.medicationPhoto}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[styles.iconCircle, { backgroundColor: (colors.primary || '#4CAF50') + '20' }]}>
                            <Ionicons name="medkit" size={20} color={colors.primary || '#4CAF50'} />
                        </View>
                    )}
                </View>

                <View style={styles.cardContent}>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary || '#000' }]}>
                        {displayName}
                    </Text>
                    {item.dosage ? (
                        <Text style={[styles.cardSubtitle, { color: colors.textSecondary || '#666' }]}>
                            {item.dosage}
                        </Text>
                    ) : null}

                    <View style={styles.cardFooter}>
                        <View style={[styles.timeChip, { backgroundColor: (colors.surfaceSecondary || '#F5F5F5') }]}>
                            <Ionicons name="time-outline" size={12} color={colors.textSecondary || '#666'} />
                            <Text style={[styles.timeText, { color: colors.textSecondary || '#666' }]}>
                                {dosesText}
                            </Text>
                        </View>
                        {/* FIX 2026-02-04: Show remaining stock */}
                        {item.remainingStock !== null && item.remainingStock !== undefined && (
                            <View style={[styles.timeChip, { backgroundColor: (colors.surfaceSecondary || '#F5F5F5') }]}>
                                <Ionicons name="cube-outline" size={12} color={colors.textSecondary || '#666'} />
                                <Text style={[styles.timeText, { color: colors.textSecondary || '#666' }]}>
                                    {item.remainingStock}{item.quantity ? `/${item.quantity}` : ''} {t('medications.stock.remaining') || 'left'}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Low Stock Warning */}
                    {daysRemaining !== null && daysRemaining <= (item.lowStockThreshold || 5) && (
                        <View style={styles.alertRow}>
                            <Ionicons name="warning" size={12} color="#FF9500" />
                            <Text style={[styles.alertText, { color: '#FF9500' }]}>
                                {t('medications.stock.lowStock') || 'Low stock'} ({daysRemaining}d)
                            </Text>
                        </View>
                    )}
                </View>

                <TouchableOpacity onPress={() => onDelete(item)} hitSlop={15}>
                    <Ionicons name="trash-outline" size={20} color={colors.error || '#FF3B30'} />
                </TouchableOpacity>

                {/* Take Button */}
                <TouchableOpacity
                    style={[styles.takeButton, { backgroundColor: (colors.primary || '#4CAF50') + '15' }]}
                    onPress={() => onTake && onTake(item)}
                    hitSlop={10}
                >
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary || '#4CAF50'} />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
};

// 3. Edit Modal Component
const EditMedicationModal = ({
    visible,
    medication,
    onClose,
    onSave,
    colors,
    t
}: any) => {
    const [name, setName] = useState('');
    const [dosageAmount, setDosageAmount] = useState('');
    const [dosageUnit, setDosageUnit] = useState<DosageUnitKey>('mg');
    const [instructions, setInstructions] = useState('');
    const [startDate, setStartDate] = useState(''); // YYYY-MM-DD
    const [endDate, setEndDate] = useState('');
    const [doses, setDoses] = useState<MedicationDose[]>([]);
    const [quantity, setQuantity] = useState('');
    const [remainingStock, setRemainingStock] = useState('');
    const [imageUrl, setImageUrl] = useState<string | null>(null); // FIX 2026-02-04: Medication photo
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [loading, setLoading] = useState(false);

    // Helper to parse existing dosage string (e.g., "500 мг" -> { amount: "500", unit: "mg" })
    const parseDosage = (dosageStr: string | null | undefined): { amount: string; unit: DosageUnitKey } => {
        if (!dosageStr) return { amount: '', unit: 'mg' };
        const match = dosageStr.match(/^([\d.,]+)\s*(.*)$/);
        if (match) {
            const amount = match[1].trim();
            const unitStr = match[2].trim().toLowerCase();
            // Find matching unit by key, localized label, or any plural form
            const foundUnit = DOSAGE_UNIT_KEYS.find(key => {
                if (key.toLowerCase() === unitStr) return true;
                if (getDosageUnitLabel(key, t).toLowerCase() === unitStr) return true;
                // Also check all plural forms for countable units
                const singularKey = COUNTABLE_UNITS[key];
                if (singularKey) {
                    // Check _one, _few, _many forms
                    const pluralForms = ['_one', '_few', '_many', '_other'].map(
                        suffix => t(`medications.dosagePlural.${singularKey}${suffix}`)?.toLowerCase()
                    ).filter(Boolean);
                    if (pluralForms.includes(unitStr)) return true;
                }
                return false;
            });
            return { amount, unit: foundUnit || 'mg' };
        }
        return { amount: dosageStr, unit: 'mg' };
    };

    // Helper to combine amount and unit with proper pluralization
    const combineDosage = (amount: string, unit: DosageUnitKey): string => {
        if (!amount.trim()) return '';
        // Parse the amount to get the count for pluralization
        const count = parseFloat(amount.replace(',', '.')) || 1;
        const unitLabel = getPluralizedUnitLabel(unit, count, t);
        return `${amount.trim()} ${unitLabel}`;
    };

    // Initialize form
    useEffect(() => {
        if (visible) {
            if (medication) {
                setName(medication.name || '');
                // Parse existing dosage into amount and unit
                const parsed = parseDosage(medication.dosage);
                setDosageAmount(parsed.amount);
                setDosageUnit(parsed.unit);
                setInstructions(medication.instructions || '');
                setStartDate(medication.startDate?.slice(0, 10) || new Date().toISOString().slice(0, 10));
                setEndDate(medication.endDate?.slice(0, 10) || '');
                setDoses(medication.doses ? [...medication.doses] : [{ timeOfDay: '09:00', beforeMeal: false, afterMeal: false }]);
                setQuantity(medication.quantity?.toString() || '');
                setRemainingStock(medication.remainingStock?.toString() || '');
                setImageUrl(medication.imageUrl || null);
            } else {
                // New medication default state
                setName('');
                setDosageAmount('');
                setDosageUnit('mg');
                setInstructions('');
                setStartDate(new Date().toISOString().slice(0, 10));
                setEndDate('');
                setDoses([{ timeOfDay: '09:00', beforeMeal: false, afterMeal: false }]);
                setQuantity('');
                setRemainingStock('');
                setImageUrl(null);
            }
        }
    }, [visible, medication]);

    const handleAddDose = () => {
        setDoses([...doses, { timeOfDay: '', beforeMeal: false, afterMeal: false }]);
    };

    const handleRemoveDose = (index: number) => {
        const newDoses = [...doses];
        newDoses.splice(index, 1);
        setDoses(newDoses);
    };

    const handleDoseChange = (index: number, field: keyof MedicationDose, value: any) => {
        const newDoses = [...doses];

        if (field === 'timeOfDay') {
            // Smart formatting for time input
            const formatted = formatTimeInput(value);
            // Validate length limit
            if (formatted.length > 5) return;
            newDoses[index] = { ...newDoses[index], [field]: formatted };
        } else if (field === 'beforeMeal') {
            newDoses[index] = { ...newDoses[index], beforeMeal: value, afterMeal: false };
        } else if (field === 'afterMeal') {
            newDoses[index] = { ...newDoses[index], afterMeal: value, beforeMeal: false };
        } else {
            // @ts-ignore
            newDoses[index] = { ...newDoses[index], [field]: value };
        }
        setDoses(newDoses);
    };

    // FIX 2026-02-04: Photo picker for medication
    const handlePickPhoto = async () => {
        try {
            setUploadingPhoto(true);
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                // Upload image to server
                const uploadResult = await ApiService.uploadImage(result.assets[0].uri);
                if (uploadResult?.url) {
                    setImageUrl(uploadResult.url);
                } else if (uploadResult?.id) {
                    // Some APIs return id instead of url
                    setImageUrl(uploadResult.id);
                }
            }
        } catch (err) {
            console.error('[MedicationSchedule] Photo pick error:', err);
            Alert.alert(t('common.error'), t('medications.error.photoUpload') || 'Failed to upload photo');
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleSaveInternal = async () => {
        // Validation
        if (!name.trim()) {
            Alert.alert(t('common.error'), t('medications.error.nameRequired') || 'Name is required');
            return;
        }

        // Validate times
        for (let i = 0; i < doses.length; i++) {
            if (!validateTime(doses[i].timeOfDay)) {
                Alert.alert(t('common.error'), `${t('medications.error.invalidTime') || 'Invalid time'}: ${doses[i].timeOfDay} (Use HH:MM)`);
                return;
            }
        }

        setLoading(true);
        const payload = {
            name,
            dosage: combineDosage(dosageAmount, dosageUnit),
            instructions,
            startDate: new Date(startDate).toISOString(),
            endDate: endDate ? new Date(endDate).toISOString() : undefined,
            doses: doses.filter(d => d.timeOfDay).map(d => ({
                timeOfDay: d.timeOfDay,
                beforeMeal: !!d.beforeMeal,
                afterMeal: !!d.afterMeal
            })),
            isActive: true, // Default to active
            quantity: quantity ? parseInt(quantity, 10) : undefined,
            remainingStock: remainingStock ? parseInt(remainingStock, 10) : undefined,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            imageUrl: imageUrl || undefined, // FIX 2026-02-04: Include medication photo
        };

        await onSave(payload, medication?.id);
        setLoading(false);
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                {/* Modal Header */}
                <View style={[styles.modalHeader, { borderBottomColor: colors.border || '#E5E5EA' }]}>
                    <TouchableOpacity onPress={onClose} style={styles.modalCancelBtn}>
                        <Text style={{ color: colors.primary, fontSize: 16 }}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                        {medication ? (t('medications.edit') || 'Edit Medication') : (t('medications.add') || 'Add Medication')}
                    </Text>
                    <TouchableOpacity onPress={handleSaveInternal} disabled={loading} style={styles.modalSaveBtn}>
                        {loading ? <ActivityIndicator color={colors.primary} /> : (
                            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 16 }}>{t('common.save')}</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">

                        {/* Section: Basic Info */}
                        <View style={[styles.sectionContainer, { backgroundColor: colors.card || '#FFF' }]}>
                            <View style={styles.inputRow}>
                                <Text style={[styles.label, { color: colors.textPrimary }]}>{t('medications.fields.name')}</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.textPrimary, borderBottomColor: colors.border }]}
                                    placeholder={t('medications.placeholders.name') || 'e.g. Vitamin C'}
                                    placeholderTextColor={colors.textTertiary || '#999'}
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>
                            <View style={styles.inputRow}>
                                <Text style={[styles.label, { color: colors.textPrimary }]}>{t('medications.fields.dosage')}</Text>
                                <View style={styles.dosageRow}>
                                    <TextInput
                                        style={[styles.dosageInput, { color: colors.textPrimary, borderBottomColor: colors.border }]}
                                        placeholder={t('medications.placeholders.dosageAmount') || '500'}
                                        placeholderTextColor={colors.textTertiary || '#999'}
                                        value={dosageAmount}
                                        onChangeText={setDosageAmount}
                                        keyboardType="numeric"
                                    />
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        style={styles.unitsScroll}
                                        contentContainerStyle={styles.unitsContainer}
                                    >
                                        {DOSAGE_UNIT_KEYS.map((unitKey) => (
                                            <TouchableOpacity
                                                key={unitKey}
                                                style={[
                                                    styles.unitChip,
                                                    dosageUnit === unitKey && { backgroundColor: colors.primary }
                                                ]}
                                                onPress={() => setDosageUnit(unitKey)}
                                            >
                                                <Text style={[
                                                    styles.unitChipText,
                                                    dosageUnit === unitKey ? { color: '#FFF' } : { color: colors.textSecondary }
                                                ]}>
                                                    {getDosageUnitLabel(unitKey, t)}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            </View>
                        </View>

                        {/* FIX 2026-02-04: Section: Medication Photo */}
                        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{t('medications.photo') || 'PHOTO'}</Text>
                        <View style={[styles.sectionContainer, { backgroundColor: colors.card || '#FFF' }]}>
                            <View style={styles.photoSection}>
                                {imageUrl ? (
                                    <View style={styles.photoPreviewContainer}>
                                        <Image
                                            source={{ uri: imageUrl }}
                                            style={styles.photoPreview}
                                            resizeMode="cover"
                                        />
                                        <TouchableOpacity
                                            style={styles.removePhotoBtn}
                                            onPress={() => setImageUrl(null)}
                                        >
                                            <Ionicons name="close-circle" size={24} color={colors.error || '#FF3B30'} />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={[styles.addPhotoBtn, { borderColor: colors.primary }]}
                                        onPress={handlePickPhoto}
                                        disabled={uploadingPhoto}
                                    >
                                        {uploadingPhoto ? (
                                            <ActivityIndicator color={colors.primary} />
                                        ) : (
                                            <>
                                                <Ionicons name="camera-outline" size={24} color={colors.primary} />
                                                <Text style={[styles.addPhotoText, { color: colors.primary }]}>
                                                    {t('medications.addPhoto') || 'Add photo'}
                                                </Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {/* Section: Schedule */}
                        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{t('medications.schedule') || 'SCHEDULE'}</Text>
                        <View style={[styles.sectionContainer, { backgroundColor: colors.card || '#FFF', paddingVertical: 8 }]}>
                            {doses.map((dose, index) => (
                                <View key={index} style={[styles.doseRow, { borderBottomColor: colors.border }]}>
                                    <View style={styles.timeInputContainer}>
                                        <Ionicons name="time-outline" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
                                        <TextInput
                                            style={[styles.timeInput, { color: colors.textPrimary }]}
                                            placeholder="08:00"
                                            placeholderTextColor={colors.textTertiary || '#CCC'}
                                            keyboardType="number-pad"
                                            maxLength={5}
                                            value={dose.timeOfDay}
                                            onChangeText={(text) => handleDoseChange(index, 'timeOfDay', text)}
                                        />
                                    </View>

                                    <View style={styles.doseOptions}>
                                        <TouchableOpacity
                                            style={[styles.chip, dose.beforeMeal && { backgroundColor: colors.primary }]}
                                            onPress={() => handleDoseChange(index, 'beforeMeal', !dose.beforeMeal)}
                                        >
                                            <Text style={[styles.chipText, dose.beforeMeal ? { color: '#FFF' } : { color: colors.textSecondary }]}>
                                                {t('medications.beforeMeal') || 'Before Meal'}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.chip, dose.afterMeal && { backgroundColor: colors.primary }]}
                                            onPress={() => handleDoseChange(index, 'afterMeal', !dose.afterMeal)}
                                        >
                                            <Text style={[styles.chipText, dose.afterMeal ? { color: '#FFF' } : { color: colors.textSecondary }]}>
                                                {t('medications.afterMeal') || 'After Meal'}
                                            </Text>
                                        </TouchableOpacity>

                                        {doses.length > 1 && (
                                            <TouchableOpacity onPress={() => handleRemoveDose(index)} style={{ padding: 4 }}>
                                                <Ionicons name="close-circle" size={20} color={colors.error || '#FF3B30'} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            ))}

                            <TouchableOpacity onPress={handleAddDose} style={styles.addDoseButton}>
                                <Ionicons name="add-circle" size={22} color={colors.primary} />
                                <Text style={[styles.addDoseText, { color: colors.primary }]}>{t('medications.addDose') || 'Add another time'}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Section: Supply Wrapper */}
                        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{t('medications.supply') || 'SUPPLY TRACKING'}</Text>
                        <View style={[styles.sectionContainer, { backgroundColor: colors.card || '#FFF' }]}>
                            <View style={styles.inputRow}>
                                <Text style={[styles.label, { color: colors.textPrimary }]}>{t('medications.fields.quantity')}</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.textPrimary, borderBottomColor: colors.border }]}
                                    placeholder={t('medications.placeholders.quantity') || 'Total pills (e.g. 30)'}
                                    placeholderTextColor={colors.textTertiary || '#999'}
                                    keyboardType="numeric"
                                    value={quantity}
                                    onChangeText={setQuantity}
                                />
                            </View>
                            <View style={styles.inputRow}>
                                <Text style={[styles.label, { color: colors.textPrimary }]}>{t('medications.fields.remainingStock')}</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.textPrimary, borderBottomColor: colors.border }]}
                                    placeholder={t('medications.placeholders.remainingStock') || 'Current stock'}
                                    placeholderTextColor={colors.textTertiary || '#999'}
                                    keyboardType="numeric"
                                    value={remainingStock}
                                    onChangeText={setRemainingStock}
                                />
                            </View>
                        </View>

                        {/* Section: Additional Info */}
                        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{t('medications.notes') || 'NOTES'}</Text>
                        <View style={[styles.sectionContainer, { backgroundColor: colors.card || '#FFF' }]}>
                            <TextInput
                                style={[styles.textArea, { color: colors.textPrimary, minHeight: 80 }]}
                                placeholder={t('medications.placeholders.instructions') || 'Notes, instructions...'}
                                placeholderTextColor={colors.textTertiary || '#999'}
                                multiline
                                value={instructions}
                                onChangeText={setInstructions}
                            />
                        </View>

                        <View style={{ height: 100 }} />
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

const MedicationScheduleScreen: React.FC = () => {
    const navigation = useNavigation();
    const { colors } = useTheme();
    const { t } = useI18n();

    const [medications, setMedications] = useState<Medication[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modal state
    const [isModalVisible, setModalVisible] = useState(false);
    const [editingMed, setEditingMed] = useState<Medication | null>(null);

    const loadMedications = useCallback(async () => {
        try {
            setLoading(true);
            const data = await ApiService.getMedications();
            setMedications(data || []);
            setError(null);
        } catch (e: any) {
            console.error('[MedicationSchedule] Load error:', e);
            setError(t('medications.error.load') || 'Failed to load medications');
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        loadMedications();
    }, [loadMedications]);

    const handleOpenAdd = () => {
        setEditingMed(null);
        setModalVisible(true);
    };

    const handleOpenEdit = (med: Medication) => {
        setEditingMed(med);
        setModalVisible(true);
    };

    const handleSaveMedication = async (payload: any, id?: string) => {
        try {
            if (id) {
                await ApiService.updateMedication(id, payload);
            } else {
                await ApiService.createMedication(payload);
            }

            // Reload list
            const freshData = await ApiService.getMedications();
            setMedications(freshData || []);
            setModalVisible(false);

            // --- Update Notifications ---
            // 1. Cancel all medication reminders first to avoid duplicates
            await localNotificationService.cancelNotificationsByCategory(NotificationCategories.MEDICATION_REMINDER);

            // 2. Reschedule for ALL active medications
            const hasPermission = await localNotificationService.checkPermissions() || await localNotificationService.requestPermissions();

            if (hasPermission && freshData) {
                for (const med of freshData) {
                    if (!med.isActive || !med.doses) continue;

                    for (const dose of med.doses) {
                        if (!dose.timeOfDay) continue;
                        const [hStr, mStr] = dose.timeOfDay.split(':');
                        const h = parseInt(hStr, 10);
                        const m = parseInt(mStr, 10);

                        if (!isNaN(h) && !isNaN(m)) {
                            await localNotificationService.scheduleMedicationReminder(
                                med.name,
                                h,
                                m,
                                med.id,
                                med.dosage || undefined
                            );
                            console.log(`[MedicationSchedule] Scheduled ${med.name} at ${h}:${m} (${med.dosage || 'no dosage'})`);
                        }
                    }
                }
            }

        } catch (e) {
            console.error('[MedicationSchedule] Save error:', e);
            Alert.alert(t('common.error'), t('medications.error.save') || 'Failed to save');
        }
    };

    const handleDelete = (med: Medication) => {
        Alert.alert(
            t('medications.deleteConfirm') || 'Delete?',
            t('medications.deleteMessage') || 'This cannot be undone.',
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await ApiService.deleteMedication(med.id);
                            loadMedications();
                        } catch (e) {
                            console.error('[MedicationSchedule] Delete error:', e);
                        }
                    }
                }
            ]
        );
    };

    const handleTake = async (med: Medication) => {
        try {
            // Optimistic update
            setMedications(prev => prev.map(m => {
                if (m.id === med.id && m.remainingStock !== null && m.remainingStock !== undefined) {
                    return { ...m, remainingStock: Math.max(0, m.remainingStock - 1) };
                }
                return m;
            }));

            await ApiService.takeMedication(med.id);
        } catch (e) {
            console.error('[MedicationSchedule] Take error:', e);
            Alert.alert(t('common.error'), t('medications.error.take') || 'Failed to update stock');
            // Revert on error
            loadMedications();
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <Header
                title={t('medications.title') || 'Medication Schedule'}
                onAdd={handleOpenAdd}
                onBack={() => navigation.goBack()}
                colors={colors}
            />

            {/* Main Content */}
            {loading && medications.length === 0 ? (
                <View style={styles.centerLoading}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={medications}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <MedicationCard
                            item={item}
                            onPress={handleOpenEdit}
                            onDelete={handleDelete}
                            onTake={handleTake}
                            colors={colors}
                            t={t}
                        />
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="medical-outline" size={64} color={colors.textTertiary || '#CCC'} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                {t('medications.empty') || 'No medications yet. tap + to add.'}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Edit Component Modal */}
            <EditMedicationModal
                visible={isModalVisible}
                medication={editingMed}
                onClose={() => setModalVisible(false)}
                onSave={handleSaveMedication}
                colors={colors}
                t={t}
            />

            {/* @ts-ignore */}
            <DisclaimerModal disclaimerKey="medications" />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerLoading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    headerButton: {
        padding: 4,
    },
    listContent: {
        padding: 16,
        paddingBottom: 40,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        textAlign: 'center',
    },
    // Card Styles
    card: {
        borderRadius: 16,
        marginBottom: 16,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardInternal: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
    },
    iconContainer: {
        marginRight: 16,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardContent: {
        flex: 1,
        marginRight: 8,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 14,
        marginBottom: 8,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    timeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    timeText: {
        fontSize: 12,
        fontWeight: '500',
    },
    alertRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        gap: 4,
    },
    alertText: {
        fontSize: 12,
        fontWeight: '600',
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    modalCancelBtn: {
        padding: 8,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    modalSaveBtn: {
        padding: 8,
    },
    formContent: {
        padding: 16,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: 24,
        marginBottom: 8,
        marginLeft: 4,
        letterSpacing: 0.5,
    },
    sectionContainer: {
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 4,
    },
    inputRow: {
        paddingVertical: 12,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    input: {
        fontSize: 16,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    // Dosage row styles
    dosageRow: {
        flexDirection: 'column',
        gap: 10,
    },
    dosageInput: {
        fontSize: 16,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        width: 100,
    },
    unitsScroll: {
        flexGrow: 0,
    },
    unitsContainer: {
        flexDirection: 'row',
        gap: 8,
        paddingVertical: 4,
    },
    unitChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#F2F2F7',
    },
    unitChipText: {
        fontSize: 13,
        fontWeight: '500',
    },
    textArea: {
        fontSize: 16,
        paddingVertical: 12,
        textAlignVertical: 'top',
    },
    // Dose Row Styles
    doseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: '#EEE',
    },
    timeInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        minWidth: 140,
    },
    timeInput: {
        fontSize: 18,
        fontWeight: '600',
        minWidth: 60,
        textAlign: 'center',
    },
    doseOptions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#F2F2F7',
    },
    chipText: {
        fontSize: 12,
        fontWeight: '500',
    },
    addDoseButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    addDoseText: {
        fontSize: 16,
        fontWeight: '600',
    },
    // FIX 2026-02-04: Photo styles
    medicationPhoto: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    // FIX: Take button style
    takeButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    } as const,
    photoSection: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    photoPreviewContainer: {
        position: 'relative',
    },
    photoPreview: {
        width: 100,
        height: 100,
        borderRadius: 12,
    },
    removePhotoBtn: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#FFF',
        borderRadius: 12,
    },
    addPhotoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        paddingHorizontal: 24,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderRadius: 12,
        gap: 8,
    },
    addPhotoText: {
        fontSize: 14,
        fontWeight: '500',
    },
});

export default MedicationScheduleScreen;
