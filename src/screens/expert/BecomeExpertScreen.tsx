import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, useDesignTokens } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../../app/i18n/hooks';
import MarketplaceService from '../../services/marketplaceService';
import ApiService from '../../services/apiService';

const DRAFT_STORAGE_KEY = 'expert_application_draft_v1';

const SPECIALIZATIONS = [
    'weightManagement',
    'sportsNutrition',
    'clinicalNutrition',
    'pediatricNutrition',
    'eatingDisorders',
    'diabetesManagement',
    'foodAllergies',
    'vegetarianVegan',
    'pregnancyNutrition',
    'geriatricNutrition',
    'gutHealth',
    'mentalHealthNutrition',
];

const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'ru', label: 'Русский' },
    { code: 'kk', label: 'Қазақша' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
    { code: 'es', label: 'Español' },
];

const TOTAL_STEPS = 6;

export default function BecomeExpertScreen({ navigation }: any) {
    const { colors } = useTheme();
    const tokens = useDesignTokens();
    const { t } = useI18n();
    const { refreshUser } = useAuth();
    const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Step 1: Disclaimer
    const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

    // Step 2: Profile info
    const [displayName, setDisplayName] = useState('');
    const [type, setType] = useState<'dietitian' | 'nutritionist'>('nutritionist');
    const [bio, setBio] = useState('');
    type EducationDocument = {
        uri: string;
        name: string;
        mimeType: string;
        kind: 'image' | 'pdf';
    };
    type EducationEntry = {
        degree: string;
        institution: string;
        year: string;
        document: EducationDocument | null;
    };
    const [educationEntries, setEducationEntries] = useState<EducationEntry[]>([
        { degree: '', institution: '', year: '', document: null },
    ]);
    const [experienceYears, setExperienceYears] = useState('');
    const [educationPickerIndex, setEducationPickerIndex] = useState<number | null>(null);
    const [country, setCountry] = useState<string>(''); // ISO 3166-1 alpha-2
    const [countryPickerOpen, setCountryPickerOpen] = useState(false);

    const COUNTRY_OPTIONS: Array<{ code: string; name: string }> = [
        { code: 'KZ', name: 'Kazakhstan' },
        { code: 'RU', name: 'Russia' },
        { code: 'UA', name: 'Ukraine' },
        { code: 'UZ', name: 'Uzbekistan' },
        { code: 'DE', name: 'Germany' },
        { code: 'FR', name: 'France' },
        { code: 'IT', name: 'Italy' },
        { code: 'ES', name: 'Spain' },
        { code: 'CH', name: 'Switzerland' },
        { code: 'GB', name: 'United Kingdom' },
        { code: 'US', name: 'United States' },
        { code: 'AE', name: 'United Arab Emirates' },
        { code: 'TR', name: 'Turkey' },
    ];

    const MAX_EDUCATION_ENTRIES = 5;
    const EDUCATION_FILE_MAX_MB = 10;

    const composedEducation = useMemo(() => {
        return educationEntries
            .filter(e => e.degree.trim() || e.institution.trim())
            .map(e => {
                const main = [e.degree.trim(), e.institution.trim()].filter(Boolean).join(', ');
                return e.year.trim() ? `${main} (${e.year.trim()})` : main;
            })
            .join('\n');
    }, [educationEntries]);

    const updateEducationEntry = useCallback((index: number, field: keyof Omit<EducationEntry, 'document'>, value: string) => {
        setEducationEntries(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
    }, []);
    const addEducationEntry = useCallback(() => {
        setEducationEntries(prev =>
            prev.length < MAX_EDUCATION_ENTRIES
                ? [...prev, { degree: '', institution: '', year: '', document: null }]
                : prev
        );
    }, []);
    const removeEducationEntry = useCallback((index: number) => {
        setEducationEntries(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
    }, []);
    const setEducationDocument = useCallback((index: number, doc: EducationDocument | null) => {
        setEducationEntries(prev => prev.map((e, i) => i === index ? { ...e, document: doc } : e));
    }, []);

    // Step 3: Specializations & languages
    const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
    const [selectedLangs, setSelectedLangs] = useState<string[]>(['en']);

    // Step 4: Documents
    type PickedDocument = {
        uri: string;
        name: string;
        mimeType: string;
        kind: 'image' | 'pdf';
    };
    const [documents, setDocuments] = useState<PickedDocument[]>([]);
    const [pickerOpen, setPickerOpen] = useState(false);

    // Draft auto-save: hydrate on mount, save on changes, clear on successful submit.
    const [draftHydrated, setDraftHydrated] = useState(false);
    const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const raw = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
                if (!cancelled && raw) {
                    const draft = JSON.parse(raw);
                    if (typeof draft.step === 'number') setStep(draft.step);
                    if (typeof draft.disclaimerAccepted === 'boolean') setDisclaimerAccepted(draft.disclaimerAccepted);
                    if (typeof draft.displayName === 'string') setDisplayName(draft.displayName);
                    if (draft.type === 'dietitian' || draft.type === 'nutritionist') setType(draft.type);
                    if (typeof draft.bio === 'string') setBio(draft.bio);
                    if (Array.isArray(draft.educationEntries) && draft.educationEntries.length > 0) {
                        setEducationEntries(draft.educationEntries);
                    }
                    if (typeof draft.experienceYears === 'string') setExperienceYears(draft.experienceYears);
                    if (Array.isArray(draft.selectedSpecs)) setSelectedSpecs(draft.selectedSpecs);
                    if (Array.isArray(draft.selectedLangs) && draft.selectedLangs.length > 0) setSelectedLangs(draft.selectedLangs);
                    if (Array.isArray(draft.documents)) setDocuments(draft.documents);
                    if (typeof draft.country === 'string') setCountry(draft.country);
                }
            } catch (err) {
                console.warn('[BecomeExpert] Failed to hydrate draft:', err);
            } finally {
                if (!cancelled) setDraftHydrated(true);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!draftHydrated) return;
        if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
        draftSaveTimer.current = setTimeout(() => {
            const draft = {
                step,
                disclaimerAccepted,
                displayName,
                type,
                bio,
                educationEntries,
                experienceYears,
                selectedSpecs,
                selectedLangs,
                documents,
                country,
            };
            AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft)).catch((err) =>
                console.warn('[BecomeExpert] Failed to save draft:', err),
            );
        }, 500);
        return () => {
            if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
        };
    }, [draftHydrated, step, disclaimerAccepted, displayName, type, bio, educationEntries, experienceYears, selectedSpecs, selectedLangs, documents, country]);

    const clearDraft = useCallback(() => {
        AsyncStorage.removeItem(DRAFT_STORAGE_KEY).catch(() => {});
    }, []);

    const validationError = useMemo<string | null>(() => {
        switch (step) {
            case 1:
                return disclaimerAccepted ? null : (t('experts.onboarding.errorAcceptDisclaimer') || 'Please accept the disclaimer to continue.');
            case 2: {
                if (displayName.trim().length === 0) {
                    return t('experts.onboarding.errorDisplayNameRequired') || 'Please enter your display name.';
                }
                if (!country) {
                    return t('experts.onboarding.errorCountryRequired') || 'Please select your country.';
                }
                if (bio.trim().length < 50) {
                    return (t('experts.onboarding.errorBioTooShort', { count: 50 - bio.trim().length }) as string)
                        || `Please write at least 50 characters about yourself (need ${50 - bio.trim().length} more).`;
                }
                // Validate only filled education entries; ignore empty placeholder rows.
                const filled = educationEntries.filter(e => e.degree.trim() || e.institution.trim() || e.document);
                if (filled.length === 0) {
                    return t('experts.onboarding.errorEducationRequired') || 'Please add at least one education entry.';
                }
                for (const entry of filled) {
                    if (!entry.degree.trim() || !entry.institution.trim()) {
                        return t('experts.onboarding.errorEducationIncomplete') || 'Please fill degree and institution for each education entry.';
                    }
                    if (!entry.document) {
                        return t('experts.onboarding.errorEducationDocRequired') || 'Please attach a document for each education entry.';
                    }
                }
                return null;
            }
            case 3:
                if (selectedSpecs.length === 0) return t('experts.onboarding.errorSpecsRequired') || 'Please select at least one specialization.';
                if (selectedLangs.length === 0) return t('experts.onboarding.errorLangsRequired') || 'Please select at least one language.';
                return null;
            case 4:
                return documents.length >= 1 ? null : (t('experts.onboarding.errorDocsRequired') || 'Please attach at least one document.');
            case 5:
                return null;
            default:
                return 'Invalid step';
        }
    }, [step, disclaimerAccepted, displayName, country, bio, educationEntries, selectedSpecs, selectedLangs, documents.length, t]);

    const canGoNext = validationError === null;

    const toggleSpec = useCallback((spec: string) => {
        setSelectedSpecs(prev =>
            prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
        );
    }, []);

    const toggleLang = useCallback((lang: string) => {
        setSelectedLangs(prev =>
            prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
        );
    }, []);

    const pickEducationImage = useCallback(async (index: number) => {
        setEducationPickerIndex(null);
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(
                t('common.permissionNeeded') || 'Permission',
                t('experts.onboarding.galleryPermission') || 'Please allow access to your photo library.',
            );
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.85,
        });
        if (!result.canceled && result.assets?.[0]) {
            const asset = result.assets[0];
            if (asset.fileSize && asset.fileSize > EDUCATION_FILE_MAX_MB * 1024 * 1024) {
                Alert.alert(
                    t('experts.onboarding.fileTooLarge') || 'File too large',
                    (t('experts.onboarding.fileTooLargeMessage', { mb: EDUCATION_FILE_MAX_MB }) as string)
                        || `Maximum file size is ${EDUCATION_FILE_MAX_MB} MB.`,
                );
                return;
            }
            setEducationDocument(index, {
                uri: asset.uri,
                name: asset.fileName || `education_${index + 1}.jpg`,
                mimeType: asset.mimeType || 'image/jpeg',
                kind: 'image',
            });
        }
    }, [t, setEducationDocument]);

    const pickEducationPdf = useCallback(async (index: number) => {
        setEducationPickerIndex(null);
        const result = await DocumentPicker.getDocumentAsync({
            type: 'application/pdf',
            multiple: false,
            copyToCacheDirectory: true,
        });
        if (!result.canceled && result.assets?.[0]) {
            const asset = result.assets[0];
            if (asset.size && asset.size > EDUCATION_FILE_MAX_MB * 1024 * 1024) {
                Alert.alert(
                    t('experts.onboarding.fileTooLarge') || 'File too large',
                    (t('experts.onboarding.fileTooLargeMessage', { mb: EDUCATION_FILE_MAX_MB }) as string)
                        || `Maximum file size is ${EDUCATION_FILE_MAX_MB} MB.`,
                );
                return;
            }
            setEducationDocument(index, {
                uri: asset.uri,
                name: asset.name || `education_${index + 1}.pdf`,
                mimeType: asset.mimeType || 'application/pdf',
                kind: 'pdf',
            });
        }
    }, [t, setEducationDocument]);

    const showFileTooLarge = useCallback(() => {
        Alert.alert(
            t('experts.onboarding.fileTooLarge') || 'File too large',
            (t('experts.onboarding.fileTooLargeMessage', { mb: EDUCATION_FILE_MAX_MB }) as string)
                || `Maximum file size is ${EDUCATION_FILE_MAX_MB} MB.`,
        );
    }, [t]);

    const pickFromCamera = useCallback(async () => {
        setPickerOpen(false);
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(t('common.permissionNeeded') || 'Permission', t('experts.onboarding.cameraPermission'));
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.85,
        });
        if (!result.canceled && result.assets?.[0]) {
            const asset = result.assets[0];
            if (asset.fileSize && asset.fileSize > EDUCATION_FILE_MAX_MB * 1024 * 1024) {
                showFileTooLarge();
                return;
            }
            setDocuments(prev => [...prev, {
                uri: asset.uri,
                name: asset.fileName || `document_${prev.length + 1}.jpg`,
                mimeType: asset.mimeType || 'image/jpeg',
                kind: 'image',
            }]);
        }
    }, [t, showFileTooLarge]);

    const pickFromGallery = useCallback(async () => {
        setPickerOpen(false);
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(
                t('common.permissionNeeded') || 'Permission',
                t('experts.onboarding.galleryPermission') || 'Please allow access to your photo library.',
            );
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.85,
        });
        if (!result.canceled && result.assets?.[0]) {
            const asset = result.assets[0];
            if (asset.fileSize && asset.fileSize > EDUCATION_FILE_MAX_MB * 1024 * 1024) {
                showFileTooLarge();
                return;
            }
            setDocuments(prev => [...prev, {
                uri: asset.uri,
                name: asset.fileName || `document_${prev.length + 1}.jpg`,
                mimeType: asset.mimeType || 'image/jpeg',
                kind: 'image',
            }]);
        }
    }, [t, showFileTooLarge]);

    const pickPdf = useCallback(async () => {
        setPickerOpen(false);
        const result = await DocumentPicker.getDocumentAsync({
            type: 'application/pdf',
            multiple: false,
            copyToCacheDirectory: true,
        });
        if (!result.canceled && result.assets?.[0]) {
            const asset = result.assets[0];
            if (asset.size && asset.size > EDUCATION_FILE_MAX_MB * 1024 * 1024) {
                showFileTooLarge();
                return;
            }
            setDocuments(prev => [...prev, {
                uri: asset.uri,
                name: asset.name || `document_${prev.length + 1}.pdf`,
                mimeType: asset.mimeType || 'application/pdf',
                kind: 'pdf',
            }]);
        }
    }, [showFileTooLarge]);

    const removeDocument = useCallback((index: number) => {
        setDocuments(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleSubmit = useCallback(async () => {
        if (documents.length === 0) {
            Alert.alert(t('experts.onboarding.uploadFailed'), t('experts.onboarding.documentsRequired'));
            return;
        }

        // Validate all education entries have a document (defence in depth — UI already blocks submit)
        for (const entry of educationEntries) {
            if (!entry.degree.trim() || !entry.institution.trim() || !entry.document) {
                Alert.alert(
                    t('experts.onboarding.uploadFailed') || 'Upload failed',
                    t('experts.onboarding.educationIncomplete') || 'Each education entry requires a degree, institution and an attached document.',
                );
                return;
            }
        }

        setLoading(true);
        try {
            // 1. Create or reuse expert profile.
            // If the user retries submit after a previous partial failure (uploads failed
            // but profile got created), skip profile creation and just retry uploads.
            // Without this, retries hit `BadRequestException('Expert profile already exists')`.
            let profileExists = false;
            try {
                const existingProfile = await MarketplaceService.getMyExpertProfile();
                profileExists = !!existingProfile?.id;
            } catch {
                profileExists = false; // 404 → no profile yet, proceed with create
            }

            if (!profileExists) {
                await MarketplaceService.createExpertProfile({
                    type,
                    displayName: displayName.trim(),
                    bio: bio.trim(),
                    education: composedEducation || undefined,
                    experienceYears: parseInt(experienceYears) || 0,
                    specializations: selectedSpecs,
                    languages: selectedLangs,
                    country: country || undefined,
                });
            } else {
                // Update existing profile with the latest form values.
                await MarketplaceService.updateExpertProfile({
                    type,
                    displayName: displayName.trim(),
                    bio: bio.trim(),
                    education: composedEducation || undefined,
                    experienceYears: parseInt(experienceYears) || 0,
                    specializations: selectedSpecs,
                    languages: selectedLangs,
                    country: country || undefined,
                });
                // Wipe existing education entries + credentials so retry doesn't pile up
                // duplicates (e.g. retrying with 3 educations when 2 were already uploaded
                // would otherwise create 5 entries total).
                try {
                    const [existingEducation, existingCredentials] = await Promise.all([
                        MarketplaceService.getMyEducation().catch(() => []),
                        MarketplaceService.getMyCredentials().catch(() => []),
                    ]);
                    await Promise.all([
                        ...((existingEducation || []) as any[]).map((e) =>
                            MarketplaceService.deleteEducation(e.id).catch(() => {}),
                        ),
                        ...((existingCredentials || []) as any[]).map((c) =>
                            MarketplaceService.deleteCredential(c.id).catch(() => {}),
                        ),
                    ]);
                } catch (cleanupErr) {
                    console.warn('[BecomeExpert] Cleanup before retry failed:', cleanupErr);
                }
            }

            // 2. Upload education documents + create structured education entries
            const educationFailures: string[] = [];
            for (const entry of educationEntries) {
                if (!entry.document) continue;
                try {
                    const uploadResult = await ApiService.uploadDocument(entry.document.uri, entry.document.mimeType, entry.document.name);
                    if (!uploadResult?.url) {
                        throw new Error('No URL returned from upload');
                    }
                    await MarketplaceService.createEducation({
                        institution: entry.institution.trim(),
                        degree: entry.degree.trim(),
                        year: entry.year.trim() || undefined,
                        documentUrl: uploadResult.url,
                        documentType: entry.document.kind,
                        documentName: entry.document.name,
                    });
                } catch (err: any) {
                    console.warn('Education upload failed:', entry.document.name, err?.message);
                    educationFailures.push(entry.document.name);
                }
            }

            // 3. Upload credentials (diplomas/licenses from step 4)
            const credentialFailures: string[] = [];
            for (const doc of documents) {
                try {
                    const uploadResult = await ApiService.uploadDocument(doc.uri, doc.mimeType, doc.name);
                    if (!uploadResult?.url) {
                        throw new Error('No URL returned from upload');
                    }
                    await MarketplaceService.uploadCredential({
                        name: doc.name,
                        fileUrl: uploadResult.url,
                        fileType: doc.kind,
                    });
                } catch (err: any) {
                    console.warn('Credential upload failed:', doc.name, err?.message);
                    credentialFailures.push(doc.name);
                }
            }

            const allFailed = credentialFailures.length === documents.length && educationFailures.length === educationEntries.length;
            if (allFailed) {
                Alert.alert(
                    t('experts.onboarding.uploadFailed'),
                    (t('experts.onboarding.allCredentialsFailed') as string)
                        || 'All documents failed to upload. Without credentials the admin will likely reject your profile. Please retry.',
                );
                return;
            }

            const allFailures = [...educationFailures, ...credentialFailures];
            if (allFailures.length > 0) {
                Alert.alert(
                    t('experts.onboarding.uploadFailed'),
                    t('experts.onboarding.uploadFailedMessage') + '\n\n' + allFailures.join(', '),
                );
            }

            await refreshUser();
            clearDraft();
            setStep(6);
        } catch (error: any) {
            Alert.alert(
                t('common.error'),
                error?.message || t('experts.onboarding.profileCreateFailed') || 'Failed to create profile',
            );
        } finally {
            setLoading(false);
        }
    }, [type, displayName, bio, composedEducation, experienceYears, selectedSpecs, selectedLangs, documents, educationEntries, refreshUser, t, clearDraft]);

    const handleNext = useCallback(() => {
        if (validationError) {
            Alert.alert(
                t('experts.onboarding.cannotProceed') || 'Almost there',
                validationError,
            );
            return;
        }
        if (step === 5) {
            handleSubmit();
        } else {
            setStep(s => s + 1);
        }
    }, [step, handleSubmit, validationError, t]);

    const handleBack = useCallback(() => {
        if (step === 1) {
            navigation.goBack();
        } else {
            setStep(s => s - 1);
        }
    }, [step, navigation]);

    const renderStepIndicator = () => (
        <View style={styles.stepIndicator}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <View
                    key={i}
                    style={[
                        styles.stepDot,
                        i + 1 <= step && styles.stepDotActive,
                    ]}
                />
            ))}
        </View>
    );

    const renderStep1 = () => (
        <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepContentInner}>
            <Ionicons name="shield-checkmark-outline" size={56} color={colors.primary} />
            <Text style={styles.stepTitle}>{t('experts.onboarding.step1Title')}</Text>
            <Text style={styles.stepSubtitle}>{t('experts.onboarding.step1Sub')}</Text>

            <View style={styles.disclaimerBox}>
                <Text style={styles.disclaimerText}>{t('disclaimer.point1')}</Text>
                <Text style={styles.disclaimerText}>{t('disclaimer.point2')}</Text>
                <Text style={styles.disclaimerText}>{t('disclaimer.point3')}</Text>
            </View>

            <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setDisclaimerAccepted(!disclaimerAccepted)}
                activeOpacity={0.7}
            >
                <Ionicons
                    name={disclaimerAccepted ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={disclaimerAccepted ? colors.primary : colors.textSecondary}
                />
                <Text style={styles.checkboxLabel}>
                    {t('experts.onboarding.acceptDisclaimer')}
                </Text>
            </TouchableOpacity>
        </ScrollView>
    );

    const renderStep2 = () => (
        <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepContentInner}>
            <Text style={styles.stepTitle}>{t('experts.onboarding.step2Title')}</Text>
            <Text style={styles.stepSubtitle}>{t('experts.onboarding.step2Sub')}</Text>

            <Text style={styles.label}>{t('experts.edit.displayName')}</Text>
            <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder={t('experts.edit.displayNamePlaceholder')}
                placeholderTextColor={colors.textTertiary}
            />

            <Text style={styles.label}>{t('experts.edit.type')}</Text>
            <View style={styles.typeRow}>
                {(['nutritionist', 'dietitian'] as const).map(t_type => (
                    <TouchableOpacity
                        key={t_type}
                        style={[styles.typeButton, type === t_type && styles.typeButtonActive]}
                        onPress={() => setType(t_type)}
                    >
                        <Text style={[styles.typeButtonText, type === t_type && styles.typeButtonTextActive]}>
                            {t(`experts.${t_type}.title`)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.label}>{t('experts.edit.country') || 'Country'}</Text>
            <TouchableOpacity
                style={styles.input}
                onPress={() => setCountryPickerOpen(true)}
                activeOpacity={0.7}
            >
                <Text style={{ color: country ? colors.text : colors.textTertiary, paddingVertical: 4 }}>
                    {country
                        ? COUNTRY_OPTIONS.find(c => c.code === country)?.name || country
                        : (t('experts.edit.countryPlaceholder') || 'Select your country')}
                </Text>
            </TouchableOpacity>

            <Text style={styles.label}>
                {t('experts.edit.bio')} ({t('experts.onboarding.bioMinHint', { count: bio.length }) || `${bio.length}/50 min`})
            </Text>
            <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder={t('experts.edit.bioPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
            />

            <Text style={styles.label}>{t('experts.edit.education')}</Text>
            <Text style={styles.helperText}>
                {t('experts.onboarding.educationDocumentHint') || 'Attach a diploma (PDF, JPG or PNG, up to 10 MB) for each entry.'}
            </Text>
            {educationEntries.map((entry, index) => (
                <View key={index} style={styles.educationEntry}>
                    <TextInput
                        style={styles.input}
                        value={entry.degree}
                        onChangeText={(v) => updateEducationEntry(index, 'degree', v)}
                        placeholder={t('experts.edit.educationDegreePlaceholder') || 'Degree (e.g. MSc Nutrition)'}
                        placeholderTextColor={colors.textTertiary}
                    />
                    <TextInput
                        style={[styles.input, { marginTop: tokens.spacing.sm }]}
                        value={entry.institution}
                        onChangeText={(v) => updateEducationEntry(index, 'institution', v)}
                        placeholder={t('experts.edit.educationInstitutionPlaceholder') || 'Institution (e.g. ETH Zürich)'}
                        placeholderTextColor={colors.textTertiary}
                    />
                    <View style={styles.educationYearRow}>
                        <TextInput
                            style={[styles.input, { flex: 1 }]}
                            value={entry.year}
                            onChangeText={(v) => updateEducationEntry(index, 'year', v)}
                            placeholder={t('experts.edit.educationYearPlaceholder') || 'Year (e.g. 2020)'}
                            placeholderTextColor={colors.textTertiary}
                            keyboardType="numeric"
                            maxLength={9}
                        />
                        {educationEntries.length > 1 && (
                            <TouchableOpacity
                                onPress={() => removeEducationEntry(index)}
                                style={styles.educationRemoveBtn}
                            >
                                <Ionicons name="close-circle" size={24} color={colors.error || '#FF3B30'} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Document attachment */}
                    {entry.document ? (
                        <View style={styles.educationDocumentRow}>
                            {entry.document.kind === 'pdf' ? (
                                <View style={[styles.documentThumb, styles.pdfThumb]}>
                                    <Ionicons name="document-text" size={20} color={colors.primary} />
                                </View>
                            ) : (
                                <Image source={{ uri: entry.document.uri }} style={styles.documentThumb} />
                            )}
                            <Text style={styles.documentName} numberOfLines={1}>{entry.document.name}</Text>
                            <TouchableOpacity onPress={() => setEducationDocument(index, null)}>
                                <Ionicons name="close-circle" size={22} color={colors.error || '#FF3B30'} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.educationAttachBtn}
                            onPress={() => setEducationPickerIndex(index)}
                        >
                            <Ionicons name="attach-outline" size={18} color={colors.primary} />
                            <Text style={styles.educationAttachText}>
                                {t('experts.onboarding.attachDocument') || 'Attach document'}
                                {'  *'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            ))}
            {educationEntries.length < MAX_EDUCATION_ENTRIES && (
                <TouchableOpacity onPress={addEducationEntry} style={styles.educationAddBtn}>
                    <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                    <Text style={styles.educationAddText}>
                        {t('experts.edit.addEducation') || 'Add another entry'}
                    </Text>
                </TouchableOpacity>
            )}

            {educationPickerIndex !== null && (
                <>
                    <TouchableOpacity
                        style={styles.pickerBackdrop}
                        activeOpacity={1}
                        onPress={() => setEducationPickerIndex(null)}
                    />
                    <View style={styles.pickerSheet}>
                        <Text style={styles.pickerTitle}>{t('experts.onboarding.chooseDocumentSource') || 'Choose source'}</Text>
                        <TouchableOpacity style={styles.pickerOption} onPress={() => pickEducationImage(educationPickerIndex)}>
                            <Ionicons name="images-outline" size={22} color={colors.primary} />
                            <Text style={styles.pickerOptionText}>{t('experts.onboarding.sourceGallery')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.pickerOption} onPress={() => pickEducationPdf(educationPickerIndex)}>
                            <Ionicons name="document-text-outline" size={22} color={colors.primary} />
                            <Text style={styles.pickerOptionText}>{t('experts.onboarding.sourcePdf')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.pickerCancel} onPress={() => setEducationPickerIndex(null)}>
                            <Text style={styles.pickerCancelText}>{t('experts.onboarding.cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}

            <Text style={styles.label}>{t('experts.edit.experienceYears')}</Text>
            <TextInput
                style={styles.input}
                value={experienceYears}
                onChangeText={setExperienceYears}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
            />

            {countryPickerOpen && (
                <>
                    <TouchableOpacity
                        style={styles.pickerBackdrop}
                        activeOpacity={1}
                        onPress={() => setCountryPickerOpen(false)}
                    />
                    <View style={styles.pickerSheet}>
                        <Text style={styles.pickerTitle}>{t('experts.edit.countryPlaceholder') || 'Select your country'}</Text>
                        <ScrollView style={{ maxHeight: 360 }}>
                            {COUNTRY_OPTIONS.map(opt => (
                                <TouchableOpacity
                                    key={opt.code}
                                    style={styles.pickerOption}
                                    onPress={() => { setCountry(opt.code); setCountryPickerOpen(false); }}
                                >
                                    <Ionicons
                                        name={country === opt.code ? 'radio-button-on' : 'radio-button-off'}
                                        size={20}
                                        color={colors.primary}
                                    />
                                    <Text style={styles.pickerOptionText}>{opt.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity style={styles.pickerCancel} onPress={() => setCountryPickerOpen(false)}>
                            <Text style={styles.pickerCancelText}>{t('experts.onboarding.cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </ScrollView>
    );

    const renderStep3 = () => (
        <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepContentInner}>
            <Text style={styles.stepTitle}>{t('experts.onboarding.step3Title')}</Text>
            <Text style={styles.stepSubtitle}>{t('experts.onboarding.step3Sub')}</Text>

            <Text style={styles.sectionLabel}>{t('experts.edit.specializations')}</Text>
            <View style={styles.chipContainer}>
                {SPECIALIZATIONS.map(spec => (
                    <TouchableOpacity
                        key={spec}
                        style={[styles.chip, selectedSpecs.includes(spec) && styles.chipActive]}
                        onPress={() => toggleSpec(spec)}
                    >
                        <Text style={[styles.chipText, selectedSpecs.includes(spec) && styles.chipTextActive]}>
                            {t(`experts.specializations.${spec}`)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: tokens.spacing.xl }]}>{t('experts.edit.languages')}</Text>
            <View style={styles.chipContainer}>
                {LANGUAGES.map(lang => (
                    <TouchableOpacity
                        key={lang.code}
                        style={[styles.chip, selectedLangs.includes(lang.code) && styles.chipActive]}
                        onPress={() => toggleLang(lang.code)}
                    >
                        <Text style={[styles.chipText, selectedLangs.includes(lang.code) && styles.chipTextActive]}>
                            {lang.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );

    const renderStep4 = () => (
        <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepContentInner}>
            <Text style={styles.stepTitle}>{t('experts.onboarding.step4Title')}</Text>
            <Text style={styles.stepSubtitle}>{t('experts.onboarding.step4Sub')}</Text>

            {documents.map((doc, index) => (
                <View key={index} style={styles.documentRow}>
                    {doc.kind === 'pdf' ? (
                        <View style={[styles.documentThumb, styles.pdfThumb]}>
                            <Ionicons name="document-text" size={24} color={colors.primary} />
                        </View>
                    ) : (
                        <Image source={{ uri: doc.uri }} style={styles.documentThumb} />
                    )}
                    <Text style={styles.documentName} numberOfLines={1}>{doc.name}</Text>
                    <TouchableOpacity onPress={() => removeDocument(index)}>
                        <Ionicons name="close-circle" size={24} color={colors.error || '#FF3B30'} />
                    </TouchableOpacity>
                </View>
            ))}

            <TouchableOpacity
                style={[styles.uploadButton, documents.length === 0 && styles.uploadButtonRequired]}
                onPress={() => setPickerOpen(true)}
            >
                <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
                <Text style={styles.uploadButtonText}>
                    {t('experts.onboarding.uploadDocument')}{documents.length === 0 ? '  *' : ''}
                </Text>
            </TouchableOpacity>

            {documents.length === 0 && (
                <Text style={[styles.helperText, styles.helperTextRequired]}>
                    {t('experts.onboarding.documentsRequired')}
                </Text>
            )}

            {pickerOpen && (
                <>
                    <TouchableOpacity
                        style={styles.pickerBackdrop}
                        activeOpacity={1}
                        onPress={() => setPickerOpen(false)}
                    />
                    <View style={styles.pickerSheet}>
                        <Text style={styles.pickerTitle}>{t('experts.onboarding.chooseDocumentSource')}</Text>
                        <TouchableOpacity style={styles.pickerOption} onPress={pickFromCamera}>
                            <Ionicons name="camera-outline" size={22} color={colors.primary} />
                            <Text style={styles.pickerOptionText}>{t('experts.onboarding.sourceCamera')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.pickerOption} onPress={pickFromGallery}>
                            <Ionicons name="images-outline" size={22} color={colors.primary} />
                            <Text style={styles.pickerOptionText}>{t('experts.onboarding.sourceGallery')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.pickerOption} onPress={pickPdf}>
                            <Ionicons name="document-text-outline" size={22} color={colors.primary} />
                            <Text style={styles.pickerOptionText}>{t('experts.onboarding.sourcePdf')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.pickerCancel} onPress={() => setPickerOpen(false)}>
                            <Text style={styles.pickerCancelText}>{t('experts.onboarding.cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </ScrollView>
    );

    const renderStep5 = () => (
        <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepContentInner}>
            <Text style={styles.stepTitle}>{t('experts.onboarding.step5Title')}</Text>
            <Text style={styles.stepSubtitle}>{t('experts.onboarding.step5Sub')}</Text>

            <View style={styles.previewCard}>
                <View style={styles.previewRow}>
                    <View style={styles.previewAvatar}>
                        <Ionicons name="person" size={32} color={colors.textSecondary} />
                    </View>
                    <View style={styles.previewInfo}>
                        <Text style={styles.previewName}>{displayName}</Text>
                        <Text style={styles.previewType}>{t(`experts.${type}.title`)}</Text>
                        {country ? (
                            <Text style={[styles.previewType, { fontSize: 12 }]}>
                                {`${COUNTRY_OPTIONS.find(c => c.code === country)?.name || country}`}
                            </Text>
                        ) : null}
                    </View>
                </View>

                <Text style={styles.previewSectionTitle}>{t('experts.about')}</Text>
                <Text style={styles.previewText}>{bio}</Text>

                {educationEntries.some(e => e.degree.trim() || e.institution.trim()) ? (
                    <>
                        <Text style={styles.previewSectionTitle}>{t('experts.edit.education')}</Text>
                        {educationEntries
                            .filter(e => e.degree.trim() || e.institution.trim())
                            .map((e, idx) => (
                                <View key={idx} style={{ marginBottom: tokens.spacing.xs }}>
                                    <Text style={styles.previewText}>
                                        {[e.degree.trim(), e.institution.trim()].filter(Boolean).join(', ')}
                                        {e.year.trim() ? ` (${e.year.trim()})` : ''}
                                    </Text>
                                    {e.document && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                            <Ionicons
                                                name={e.document.kind === 'pdf' ? 'document-text-outline' : 'image-outline'}
                                                size={14}
                                                color={colors.primary}
                                            />
                                            <Text style={[styles.previewText, { fontSize: 12, color: colors.primary }]} numberOfLines={1}>
                                                {e.document.name}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            ))}
                    </>
                ) : null}

                {experienceYears ? (
                    <Text style={styles.previewMeta}>
                        {t('experts.yearsExperience', { count: parseInt(experienceYears) || 0 })}
                    </Text>
                ) : null}

                <Text style={styles.previewSectionTitle}>{t('experts.edit.specializations')}</Text>
                <View style={styles.chipContainer}>
                    {selectedSpecs.map(spec => (
                        <View key={spec} style={[styles.chip, styles.chipActive]}>
                            <Text style={[styles.chipText, styles.chipTextActive]}>
                                {t(`experts.specializations.${spec}`)}
                            </Text>
                        </View>
                    ))}
                </View>

                <Text style={styles.previewSectionTitle}>{t('experts.edit.languages')}</Text>
                <Text style={styles.previewText}>
                    {selectedLangs.map(code => LANGUAGES.find(l => l.code === code)?.label).filter(Boolean).join(', ')}
                </Text>

                {documents.length > 0 && (
                    <>
                        <Text style={styles.previewSectionTitle}>{t('experts.credentials')}</Text>
                        <Text style={styles.previewText}>{documents.length} {t('experts.onboarding.documentUploaded').toLowerCase()}</Text>
                    </>
                )}
            </View>
        </ScrollView>
    );

    const renderStep6 = () => (
        <View style={[styles.stepContent, styles.centeredContent]}>
            <Ionicons name="hourglass-outline" size={64} color={colors.primary} />
            <Text style={styles.stepTitle}>{t('experts.onboarding.step6Title')}</Text>
            <Text style={styles.stepSubtitle}>{t('experts.onboarding.step6Description')}</Text>
            <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => navigation.popToTop()}
            >
                <Text style={styles.primaryButtonText}>{t('common.done') || 'Done'}</Text>
            </TouchableOpacity>
        </View>
    );

    const renderCurrentStep = () => {
        switch (step) {
            case 1: return renderStep1();
            case 2: return renderStep2();
            case 3: return renderStep3();
            case 4: return renderStep4();
            case 5: return renderStep5();
            case 6: return renderStep6();
            default: return null;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                {step < 6 && (
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                )}
                <Text style={styles.headerTitle}>{t('experts.becomeExpert')}</Text>
                <View style={{ width: 40 }} />
            </View>

            {renderStepIndicator()}

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {renderCurrentStep()}
            </KeyboardAvoidingView>

            {/* Bottom buttons */}
            {step < 6 && (
                <View style={styles.bottomBar}>
                    {validationError && (
                        <Text style={styles.validationHint} numberOfLines={2}>
                            {validationError}
                        </Text>
                    )}
                    <TouchableOpacity
                        style={[styles.primaryButton, !canGoNext && styles.primaryButtonDisabled]}
                        onPress={handleNext}
                        disabled={loading}
                        activeOpacity={canGoNext ? 0.8 : 1}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.primaryButtonText}>
                                {step === 5 ? t('experts.onboarding.submitForReview') : (t('common.next') || 'Next')}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
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
            paddingHorizontal: tokens.spacing.lg,
            paddingVertical: tokens.spacing.md,
        },
        backButton: {
            width: 40,
            height: 40,
            justifyContent: 'center',
        },
        headerTitle: {
            fontSize: 18,
            fontWeight: '600',
            color: colors.text,
        },
        stepIndicator: {
            flexDirection: 'row',
            justifyContent: 'center',
            gap: tokens.spacing.sm,
            paddingBottom: tokens.spacing.md,
        },
        stepDot: {
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.border,
        },
        stepDotActive: {
            backgroundColor: colors.primary,
            width: 24,
        },
        stepContent: {
            flex: 1,
        },
        stepContentInner: {
            padding: tokens.spacing.xl,
            paddingBottom: tokens.spacing.xxxl,
        },
        centeredContent: {
            justifyContent: 'center',
            alignItems: 'center',
            padding: tokens.spacing.xl,
        },
        stepTitle: {
            fontSize: 24,
            fontWeight: '700',
            color: colors.text,
            marginTop: tokens.spacing.lg,
            textAlign: 'center',
        },
        stepSubtitle: {
            fontSize: 15,
            color: colors.textSecondary,
            marginTop: tokens.spacing.sm,
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: tokens.spacing.xl,
        },
        disclaimerBox: {
            backgroundColor: colors.surface,
            borderRadius: tokens.radii.sm,
            padding: tokens.spacing.lg,
            gap: tokens.spacing.md,
            marginBottom: tokens.spacing.xl,
        },
        disclaimerText: {
            fontSize: 14,
            color: colors.textSecondary,
            lineHeight: 20,
        },
        checkboxRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: tokens.spacing.md,
        },
        checkboxLabel: {
            flex: 1,
            fontSize: 14,
            color: colors.text,
            lineHeight: 20,
        },
        label: {
            fontSize: 14,
            fontWeight: '600',
            color: colors.text,
            marginBottom: tokens.spacing.xs,
            marginTop: tokens.spacing.lg,
        },
        sectionLabel: {
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
            marginBottom: tokens.spacing.md,
        },
        input: {
            backgroundColor: colors.surface,
            borderRadius: tokens.radii.xs,
            paddingHorizontal: tokens.spacing.lg,
            paddingVertical: tokens.spacing.md,
            fontSize: 15,
            color: colors.text,
            borderWidth: 1,
            borderColor: colors.border,
        },
        textArea: {
            minHeight: 100,
            paddingTop: tokens.spacing.md,
        },
        typeRow: {
            flexDirection: 'row',
            gap: tokens.spacing.md,
        },
        typeButton: {
            flex: 1,
            paddingVertical: tokens.spacing.md,
            borderRadius: tokens.radii.xs,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
        },
        typeButtonActive: {
            borderColor: colors.primary,
            backgroundColor: colors.primary + '15',
        },
        typeButtonText: {
            fontSize: 15,
            color: colors.textSecondary,
            fontWeight: '500',
        },
        typeButtonTextActive: {
            color: colors.primary,
            fontWeight: '600',
        },
        chipContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: tokens.spacing.sm,
        },
        chip: {
            paddingHorizontal: tokens.spacing.lg,
            paddingVertical: tokens.spacing.sm,
            borderRadius: tokens.radii.pill,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
        },
        chipActive: {
            borderColor: colors.primary,
            backgroundColor: colors.primary + '15',
        },
        chipText: {
            fontSize: 14,
            color: colors.textSecondary,
        },
        chipTextActive: {
            color: colors.primary,
            fontWeight: '600',
        },
        documentRow: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: tokens.radii.xs,
            padding: tokens.spacing.md,
            marginBottom: tokens.spacing.sm,
            gap: tokens.spacing.md,
        },
        documentThumb: {
            width: 48,
            height: 48,
            borderRadius: tokens.radii.xs,
            backgroundColor: colors.border,
        },
        documentName: {
            flex: 1,
            fontSize: 14,
            color: colors.text,
        },
        uploadButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: tokens.spacing.sm,
            paddingVertical: tokens.spacing.lg,
            borderRadius: tokens.radii.xs,
            borderWidth: 1,
            borderColor: colors.primary,
            borderStyle: 'dashed',
            marginTop: tokens.spacing.md,
        },
        uploadButtonText: {
            fontSize: 15,
            color: colors.primary,
            fontWeight: '500',
        },
        pdfThumb: {
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: colors.primary + '15',
        },
        helperText: {
            marginTop: tokens.spacing.sm,
            fontSize: 13,
            color: colors.textSecondary,
            textAlign: 'center',
        },
        helperTextRequired: {
            color: colors.error || '#FF3B30',
            fontWeight: '500',
        },
        uploadButtonRequired: {
            borderColor: colors.error || '#FF3B30',
        },
        pickerBackdrop: {
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
        },
        pickerSheet: {
            position: 'absolute',
            left: tokens.spacing.lg,
            right: tokens.spacing.lg,
            bottom: tokens.spacing.lg,
            backgroundColor: colors.surface,
            borderRadius: tokens.radii.md,
            padding: tokens.spacing.md,
        },
        pickerTitle: {
            fontSize: 13,
            fontWeight: '600',
            color: colors.textSecondary,
            textAlign: 'center',
            paddingVertical: tokens.spacing.sm,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        pickerOption: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.spacing.md,
            paddingVertical: tokens.spacing.lg,
            paddingHorizontal: tokens.spacing.md,
            borderTopWidth: 1,
            borderTopColor: colors.border,
        },
        pickerOptionText: {
            fontSize: 16,
            color: colors.text,
        },
        pickerCancel: {
            marginTop: tokens.spacing.sm,
            paddingVertical: tokens.spacing.md,
            alignItems: 'center',
            borderTopWidth: 1,
            borderTopColor: colors.border,
        },
        pickerCancelText: {
            fontSize: 16,
            color: colors.primary,
            fontWeight: '600',
        },
        previewCard: {
            backgroundColor: colors.surface,
            borderRadius: tokens.radii.sm,
            padding: tokens.spacing.xl,
        },
        previewRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.spacing.md,
            marginBottom: tokens.spacing.lg,
        },
        previewAvatar: {
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.border,
            justifyContent: 'center',
            alignItems: 'center',
        },
        previewInfo: {
            flex: 1,
        },
        previewName: {
            fontSize: 18,
            fontWeight: '700',
            color: colors.text,
        },
        previewType: {
            fontSize: 14,
            color: colors.textSecondary,
            marginTop: 2,
        },
        previewSectionTitle: {
            fontSize: 14,
            fontWeight: '600',
            color: colors.text,
            marginTop: tokens.spacing.lg,
            marginBottom: tokens.spacing.sm,
        },
        previewText: {
            fontSize: 14,
            color: colors.textSecondary,
            lineHeight: 20,
        },
        previewMeta: {
            fontSize: 13,
            color: colors.textSecondary,
            marginTop: tokens.spacing.sm,
        },
        bottomBar: {
            paddingHorizontal: tokens.spacing.xl,
            paddingVertical: tokens.spacing.md,
            borderTopWidth: 1,
            borderTopColor: colors.border,
        },
        primaryButton: {
            backgroundColor: colors.primary,
            borderRadius: tokens.radii.xs,
            paddingVertical: tokens.spacing.lg,
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 50,
        },
        primaryButtonDisabled: {
            opacity: 0.5,
        },
        validationHint: {
            fontSize: 13,
            color: colors.error || '#FF3B30',
            marginBottom: tokens.spacing.sm,
            textAlign: 'center',
        },
        primaryButtonText: {
            fontSize: 16,
            fontWeight: '600',
            color: '#FFFFFF',
        },
        educationEntry: {
            backgroundColor: colors.surface,
            borderRadius: tokens.radii.sm,
            padding: tokens.spacing.md,
            marginBottom: tokens.spacing.sm,
        },
        educationYearRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.spacing.sm,
            marginTop: tokens.spacing.sm,
        },
        educationRemoveBtn: {
            padding: tokens.spacing.xs,
        },
        educationAddBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: tokens.spacing.sm,
            paddingVertical: tokens.spacing.md,
            marginTop: tokens.spacing.xs,
        },
        educationAddText: {
            fontSize: 14,
            color: colors.primary,
            fontWeight: '500',
        },
        educationAttachBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.spacing.xs,
            paddingVertical: tokens.spacing.sm,
            paddingHorizontal: tokens.spacing.sm,
            marginTop: tokens.spacing.sm,
            borderRadius: tokens.radii.xs,
            borderWidth: 1,
            borderColor: colors.primary,
            borderStyle: 'dashed',
            alignSelf: 'flex-start',
        },
        educationAttachText: {
            fontSize: 13,
            color: colors.primary,
            fontWeight: '500',
        },
        educationDocumentRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.spacing.sm,
            marginTop: tokens.spacing.sm,
            paddingHorizontal: tokens.spacing.sm,
            paddingVertical: tokens.spacing.xs,
            backgroundColor: colors.background,
            borderRadius: tokens.radii.xs,
        },
    });
