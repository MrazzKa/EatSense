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
    Modal,
    Platform,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
const SUPPORTED_LANG_CODES = LANGUAGES.map(l => l.code);

const TOTAL_STEPS = 7;

const OFFER_FORMATS = ['CHAT_CONSULTATION', 'VIDEO_CONSULTATION', 'MEAL_PLAN', 'REPORT_REVIEW', 'MONTHLY_SUPPORT', 'CUSTOM'] as const;
const OFFER_CURRENCIES = ['USD', 'EUR', 'CHF', 'RUB', 'KZT'] as const;
const MAX_OFFERS = 5;
type OfferDraft = {
    name: string;
    description: string;
    format: typeof OFFER_FORMATS[number];
    priceType: 'FREE' | 'FIXED';
    priceAmount: string;
    currency: typeof OFFER_CURRENCIES[number];
    durationDays: string;
};
const blankOffer = (): OfferDraft => ({
    name: '',
    description: '',
    format: 'CHAT_CONSULTATION',
    priceType: 'FREE',
    priceAmount: '',
    currency: 'USD',
    durationDays: '',
});

export default function BecomeExpertScreen({ navigation }: any) {
    const { colors } = useTheme();
    const tokens = useDesignTokens();
    const { t } = useI18n();
    const { refreshUser } = useAuth();
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();
    const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Tracks whether the component is still mounted. Used to skip late state
    // updates from handleSubmit promises after the screen was popped — avoids
    // "setState on unmounted component" warnings if the user backs out.
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

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
    const [manualCountryCode, setManualCountryCode] = useState('');

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
    const countryPickerMaxHeight = Math.max(
        320,
        Math.min(windowHeight * 0.72, windowHeight - insets.top - insets.bottom - 96),
    );

    const openCountryPicker = useCallback(() => {
        setManualCountryCode(COUNTRY_OPTIONS.some(o => o.code === country) ? '' : country);
        setCountryPickerOpen(true);
    }, [COUNTRY_OPTIONS, country]);

    const closeCountryPicker = useCallback(() => {
        setCountryPickerOpen(false);
    }, []);

    const applyManualCountry = useCallback(() => {
        if (manualCountryCode.length === 2) {
            setCountry(manualCountryCode);
            setCountryPickerOpen(false);
        }
    }, [manualCountryCode]);

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
    const anyPickerOpen = educationPickerIndex !== null || pickerOpen || countryPickerOpen;

    // Step 5: Offers — services the expert provides. At least one is required.
    const [offers, setOffers] = useState<OfferDraft[]>([blankOffer()]);
    const updateOffer = useCallback((index: number, patch: Partial<OfferDraft>) => {
        setOffers(prev => prev.map((o, i) => (i === index ? { ...o, ...patch } : o)));
    }, []);
    const addOffer = useCallback(() => {
        setOffers(prev => (prev.length < MAX_OFFERS ? [...prev, blankOffer()] : prev));
    }, []);
    const removeOffer = useCallback((index: number) => {
        setOffers(prev => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
    }, []);

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
                    if (Array.isArray(draft.offers) && draft.offers.length > 0) setOffers(draft.offers);
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
                offers,
            };
            AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft)).catch((err) =>
                console.warn('[BecomeExpert] Failed to save draft:', err),
            );
        }, 500);
        return () => {
            if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
        };
    }, [draftHydrated, step, disclaimerAccepted, displayName, type, bio, educationEntries, experienceYears, selectedSpecs, selectedLangs, documents, country, offers]);

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
            case 5: {
                // Offers step — at least 1 offer with name + valid price (if FIXED).
                if (offers.length === 0) {
                    return t('experts.onboarding.errorOffersRequired') || 'Please add at least one service offer.';
                }
                for (let i = 0; i < offers.length; i += 1) {
                    const o = offers[i];
                    if (!o.name.trim()) {
                        return t('experts.onboarding.errorOfferNameRequired') || `Offer #${i + 1}: name is required.`;
                    }
                    if (o.priceType === 'FIXED') {
                        const amount = parseFloat(o.priceAmount);
                        if (!isFinite(amount) || amount <= 0) {
                            return t('experts.onboarding.errorOfferPrice') || `Offer #${i + 1}: enter a valid price (greater than 0).`;
                        }
                    }
                }
                return null;
            }
            case 6:
                return null;
            default:
                return 'Invalid step';
        }
    }, [step, disclaimerAccepted, displayName, country, bio, educationEntries, selectedSpecs, selectedLangs, documents.length, offers, t]);

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

        // Defence in depth — UI already blocks submit, but guard against an empty
        // educationEntries array (e.g. if local state got wiped) and against any
        // entry missing required fields. Both must be satisfied before we POST.
        const filledEducation = educationEntries.filter(
            e => e.degree.trim() && e.institution.trim() && e.document,
        );
        if (filledEducation.length === 0) {
            Alert.alert(
                t('experts.onboarding.uploadFailed') || 'Upload failed',
                t('experts.onboarding.errorEducationRequired') || 'Please add at least one education entry.',
            );
            return;
        }
        for (const entry of filledEducation) {
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
                // Wipe existing education entries + credentials + offers so retry doesn't
                // pile up duplicates (e.g. retrying with 3 educations when 2 were already
                // uploaded would otherwise create 5 entries total).
                try {
                    const [existingEducation, existingCredentials, existingOffers] = await Promise.all([
                        MarketplaceService.getMyEducation().catch(() => []),
                        MarketplaceService.getMyCredentials().catch(() => []),
                        MarketplaceService.getMyOffers().catch(() => []),
                    ]);
                    await Promise.all([
                        ...((existingEducation || []) as any[]).map((e) =>
                            MarketplaceService.deleteEducation(e.id).catch(() => {}),
                        ),
                        ...((existingCredentials || []) as any[]).map((c) =>
                            MarketplaceService.deleteCredential(c.id).catch(() => {}),
                        ),
                        ...((existingOffers || []) as any[]).map((o) =>
                            MarketplaceService.deleteOffer(o.id).catch(() => {}),
                        ),
                    ]);
                } catch (cleanupErr) {
                    console.warn('[BecomeExpert] Cleanup before retry failed:', cleanupErr);
                }
            }

            // 1b. Clean up auto-created offer from profile creation (backend creates
            // a single free chat offer at /me/profile creation time — we replace it
            // with the user's explicit offer list).
            if (!profileExists) {
                try {
                    const autoOffers = await MarketplaceService.getMyOffers();
                    await Promise.all(
                        ((autoOffers || []) as any[]).map((o) =>
                            MarketplaceService.deleteOffer(o.id).catch(() => {}),
                        ),
                    );
                } catch (err) {
                    console.warn('[BecomeExpert] Failed to clear auto-created offer:', err);
                }
            }

            // 2. Upload education documents + create structured education entries
            const educationFailures: string[] = [];
            for (const entry of filledEducation) {
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

            // 4. Create offers (services the expert provides — required since step 5)
            const offerFailures: string[] = [];
            for (let i = 0; i < offers.length; i += 1) {
                const o = offers[i];
                const isFixed = o.priceType === 'FIXED';
                const isVideo = o.format === 'VIDEO_CONSULTATION';
                const durationNum = o.durationDays ? parseInt(o.durationDays, 10) : undefined;
                const payload: any = {
                    // Localized names — provide all 6 languages with the same value so
                    // the marketplace doesn't fall back to '—' for non-English locales.
                    // Expert can later edit per-locale in the portal.
                    name: SUPPORTED_LANG_CODES.reduce((acc, code) => ({ ...acc, [code]: o.name.trim() }), {} as Record<string, string>),
                    description: o.description.trim()
                        ? SUPPORTED_LANG_CODES.reduce((acc, code) => ({ ...acc, [code]: o.description.trim() }), {} as Record<string, string>)
                        : undefined,
                    format: o.format,
                    priceType: o.priceType,
                    priceAmount: isFixed ? parseFloat(o.priceAmount) : undefined,
                    currency: o.currency,
                    // For video consultations the duration input represents per-session
                    // minutes, not days — store it in slotMinutes (backend schema field).
                    durationDays: isVideo ? undefined : durationNum,
                    slotMinutes: isVideo ? durationNum : undefined,
                    isPublished: true,
                    sortOrder: i,
                };
                try {
                    await MarketplaceService.createOffer(payload);
                } catch (err: any) {
                    console.warn('Offer create failed:', o.name, err?.message);
                    offerFailures.push(o.name || `#${i + 1}`);
                }
            }

            // ANY upload/create failure must block the success screen — otherwise the
            // applicant thinks they submitted but the admin will reject for missing
            // documents. Cleanup logic above runs on retry, so re-pressing Submit
            // will redo only the failures (existing successful uploads were wiped
            // and will be re-uploaded fresh — keeps things consistent).
            const allFailures = [...educationFailures, ...credentialFailures, ...offerFailures];
            if (allFailures.length > 0) {
                Alert.alert(
                    t('experts.onboarding.uploadFailed') || 'Upload failed',
                    (t('experts.onboarding.uploadFailedMessage') as string ||
                        'Some documents failed to upload. Please retry — your application will not be submitted until all files are uploaded successfully.') +
                        '\n\n' + allFailures.join(', '),
                );
                return;
            }

            await refreshUser();
            clearDraft();
            if (mountedRef.current) {
                setStep(7);
            }
        } catch (error: any) {
            if (mountedRef.current) {
                Alert.alert(
                    t('common.error'),
                    error?.message || t('experts.onboarding.profileCreateFailed') || 'Failed to create profile',
                );
            }
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    }, [type, displayName, bio, composedEducation, experienceYears, selectedSpecs, selectedLangs, documents, educationEntries, offers, country, refreshUser, t, clearDraft]);

    const handleNext = useCallback(() => {
        if (validationError) {
            Alert.alert(
                t('experts.onboarding.cannotProceed') || 'Almost there',
                validationError,
            );
            return;
        }
        if (step === 6) {
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
        <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepContentInnerWithBottomBar}>
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
        <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepContentInnerWithBottomBar}>
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
                onPress={openCountryPicker}
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

            <Text style={styles.label}>{t('experts.edit.experienceYears')}</Text>
            <TextInput
                style={styles.input}
                value={experienceYears}
                onChangeText={setExperienceYears}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
            />
        </ScrollView>
    );

    const renderStep3 = () => (
        <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepContentInnerWithBottomBar}>
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
        <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepContentInnerWithBottomBar}>
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
        </ScrollView>
    );

    const renderStep5 = () => (
        <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepContentInnerWithBottomBar}>
            <Text style={styles.stepTitle}>{t('experts.onboarding.step5OffersTitle') || 'Your services'}</Text>
            <Text style={styles.stepSubtitle}>
                {t('experts.onboarding.step5OffersSub') ||
                    'Add at least one service you offer. Each becomes a buyable card on your public profile. You can edit prices anytime in your portal.'}
            </Text>

            {offers.map((o, idx) => (
                <View key={idx} style={[styles.previewCard, { marginBottom: 12 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={{ fontWeight: '700', color: colors.text }}>
                            {(t('experts.onboarding.offer') || 'Service')} #{idx + 1}
                        </Text>
                        {offers.length > 1 && (
                            <TouchableOpacity onPress={() => removeOffer(idx)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                                <Ionicons name="close-circle" size={22} color={colors.error || '#FF3B30'} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <Text style={styles.label}>{t('experts.edit.offerName') || 'Name'} *</Text>
                    <TextInput
                        style={styles.input}
                        value={o.name}
                        onChangeText={(v) => updateOffer(idx, { name: v })}
                        placeholder={t('experts.onboarding.offerNamePlaceholder') || 'e.g. 30-min chat consultation'}
                        placeholderTextColor={colors.textSecondary}
                        maxLength={80}
                    />

                    <Text style={styles.label}>{t('experts.edit.description') || 'Description'}</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={o.description}
                        onChangeText={(v) => updateOffer(idx, { description: v })}
                        placeholder={t('experts.onboarding.offerDescPlaceholder') || 'What’s included'}
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        maxLength={400}
                    />

                    <Text style={styles.label}>{t('experts.edit.format') || 'Format'}</Text>
                    <View style={[styles.chipContainer, { marginBottom: 8 }]}>
                        {OFFER_FORMATS.map((f) => (
                            <TouchableOpacity
                                key={f}
                                style={[styles.chip, o.format === f && styles.chipActive]}
                                onPress={() => updateOffer(idx, { format: f })}
                            >
                                <Text style={[styles.chipText, o.format === f && styles.chipTextActive]}>
                                    {t(`experts.offerFormat.${f}`) || f}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>{t('experts.edit.priceType') || 'Price type'}</Text>
                    <View style={[styles.chipContainer, { marginBottom: 8 }]}>
                        {(['FREE', 'FIXED'] as const).map((pt) => (
                            <TouchableOpacity
                                key={pt}
                                style={[styles.chip, o.priceType === pt && styles.chipActive]}
                                onPress={() => updateOffer(idx, { priceType: pt })}
                            >
                                <Text style={[styles.chipText, o.priceType === pt && styles.chipTextActive]}>
                                    {pt === 'FREE' ? (t('experts.priceFree') || 'Free') : (t('experts.priceFixed') || 'Fixed')}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {o.priceType === 'FIXED' && (
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <View style={{ flex: 2 }}>
                                <Text style={styles.label}>{t('experts.edit.price') || 'Price'} *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={o.priceAmount}
                                    onChangeText={(v) => {
                                        // Strip non-numeric chars, then keep only the first decimal point
                                        // (filter "1.2.3" → "1.23", not "1.2" which parseFloat would silently truncate).
                                        const cleaned = v.replace(/[^0-9.]/g, '');
                                        const firstDot = cleaned.indexOf('.');
                                        const normalized = firstDot < 0
                                            ? cleaned
                                            : cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
                                        updateOffer(idx, { priceAmount: normalized });
                                    }}
                                    placeholder="50"
                                    placeholderTextColor={colors.textSecondary}
                                    keyboardType="decimal-pad"
                                    maxLength={10}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>{t('experts.edit.currency') || 'Currency'}</Text>
                                <View style={[styles.chipContainer, { marginBottom: 0 }]}>
                                    {OFFER_CURRENCIES.map((c) => (
                                        <TouchableOpacity
                                            key={c}
                                            style={[styles.chip, o.currency === c && styles.chipActive]}
                                            onPress={() => updateOffer(idx, { currency: c })}
                                        >
                                            <Text style={[styles.chipText, o.currency === c && styles.chipTextActive]}>{c}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>
                    )}

                    <Text style={styles.label}>
                        {o.format === 'VIDEO_CONSULTATION'
                            ? (t('experts.edit.durationMinutes') || 'Session duration (minutes)')
                            : (t('experts.edit.duration') || 'Duration (days)')}
                    </Text>
                    <TextInput
                        style={styles.input}
                        value={o.durationDays}
                        onChangeText={(v) => updateOffer(idx, { durationDays: v.replace(/[^0-9]/g, '') })}
                        placeholder={
                            o.format === 'VIDEO_CONSULTATION'
                                ? (t('experts.onboarding.durationMinutesPlaceholder') || 'e.g. 30')
                                : (t('experts.onboarding.durationPlaceholder') || 'e.g. 7')
                        }
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="number-pad"
                        maxLength={4}
                    />
                </View>
            ))}

            {offers.length < MAX_OFFERS && (
                <TouchableOpacity style={styles.uploadButton} onPress={addOffer}>
                    <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                    <Text style={styles.uploadButtonText}>{t('experts.onboarding.addOffer') || 'Add another service'}</Text>
                </TouchableOpacity>
            )}
        </ScrollView>
    );

    const renderStep6 = () => (
        <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepContentInnerWithBottomBar}>
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

                {offers.length > 0 && (
                    <>
                        <Text style={styles.previewSectionTitle}>{t('experts.offers') || 'Services'}</Text>
                        {offers.map((o, idx) => (
                            <View key={idx} style={{ marginBottom: tokens.spacing.xs }}>
                                <Text style={styles.previewText}>
                                    • {o.name || `(${t('experts.onboarding.offer') || 'service'} #${idx + 1})`}
                                    {' · '}
                                    {t(`experts.offerFormat.${o.format}`)} · {o.priceType === 'FREE'
                                        ? (t('experts.priceFree') || 'Free')
                                        : `${o.currency} ${o.priceAmount || '?'}`}
                                </Text>
                            </View>
                        ))}
                    </>
                )}
            </View>
        </ScrollView>
    );

    const renderStep7 = () => (
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
            case 7: return renderStep7();
            default: return null;
        }
    };

    const renderPickerModals = () => (
        <>
            <Modal
                visible={educationPickerIndex !== null}
                transparent
                animationType="fade"
                presentationStyle="overFullScreen"
                statusBarTranslucent
                onRequestClose={() => setEducationPickerIndex(null)}
            >
                <TouchableOpacity
                    style={styles.pickerBackdrop}
                    activeOpacity={1}
                    onPress={() => setEducationPickerIndex(null)}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        style={[styles.pickerSheet, { paddingBottom: tokens.spacing.lg + insets.bottom }]}
                    >
                        <View style={styles.pickerHandle} />
                        <Text style={styles.pickerTitle}>{t('experts.onboarding.chooseDocumentSource') || 'Add document'}</Text>
                        <Text style={styles.pickerDescription}>
                            {t('experts.onboarding.educationDocumentHint') || 'Attach a diploma (PDF, JPG or PNG, up to 10 MB) for each entry.'}
                        </Text>
                        <TouchableOpacity
                            style={styles.pickerOption}
                            onPress={() => educationPickerIndex !== null && pickEducationImage(educationPickerIndex)}
                        >
                            <Ionicons name="images-outline" size={22} color={colors.primary} />
                            <Text style={styles.pickerOptionText}>{t('experts.onboarding.sourceGallery')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.pickerOption}
                            onPress={() => educationPickerIndex !== null && pickEducationPdf(educationPickerIndex)}
                        >
                            <Ionicons name="document-text-outline" size={22} color={colors.primary} />
                            <Text style={styles.pickerOptionText}>{t('experts.onboarding.sourcePdf')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.pickerCancel} onPress={() => setEducationPickerIndex(null)}>
                            <Text style={styles.pickerCancelText}>{t('experts.onboarding.cancel')}</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            <Modal
                visible={pickerOpen}
                transparent
                animationType="fade"
                presentationStyle="overFullScreen"
                statusBarTranslucent
                onRequestClose={() => setPickerOpen(false)}
            >
                <TouchableOpacity
                    style={styles.pickerBackdrop}
                    activeOpacity={1}
                    onPress={() => setPickerOpen(false)}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        style={[styles.pickerSheet, { paddingBottom: tokens.spacing.lg + insets.bottom }]}
                    >
                        <View style={styles.pickerHandle} />
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
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            <Modal
                visible={countryPickerOpen}
                transparent
                animationType="fade"
                presentationStyle="overFullScreen"
                statusBarTranslucent
                onRequestClose={closeCountryPicker}
            >
                <TouchableOpacity
                    style={styles.pickerBackdrop}
                    activeOpacity={1}
                    onPress={closeCountryPicker}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        style={[
                            styles.pickerSheet,
                            {
                                maxHeight: countryPickerMaxHeight,
                                paddingBottom: tokens.spacing.lg + insets.bottom,
                            },
                        ]}
                    >
                        <View style={styles.pickerHandle} />
                        <Text style={styles.pickerTitle}>{t('experts.edit.countryPlaceholder') || 'Select your country'}</Text>
                        <Text style={styles.pickerDescription}>
                            {t('experts.edit.countryPickerHint') || 'Choose a country from the list, or enter a two-letter ISO code.'}
                        </Text>
                        <ScrollView
                            style={styles.countryList}
                            contentContainerStyle={{ paddingBottom: tokens.spacing.sm }}
                            showsVerticalScrollIndicator={false}
                        >
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
                        <View style={styles.countryManualCard}>
                            <View style={styles.countryManualHeader}>
                                <Ionicons name="globe-outline" size={20} color={colors.primary} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.countryManualTitle}>
                                        {t('experts.edit.countryOther') || 'Other country'}
                                    </Text>
                                    <Text style={styles.countryManualSubtitle}>
                                        {t('experts.edit.countryManualCode') || 'Enter a two-letter ISO country code.'}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.countryManualRow}>
                                <TextInput
                                    style={styles.countryCodeInput}
                                    value={manualCountryCode}
                                    autoCapitalize="characters"
                                    maxLength={2}
                                    placeholder="AR"
                                    placeholderTextColor={colors.textTertiary}
                                    onChangeText={(v) => setManualCountryCode(v.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 2))}
                                />
                                <TouchableOpacity
                                    style={[
                                        styles.countryApplyButton,
                                        manualCountryCode.length !== 2 && styles.countryApplyButtonDisabled,
                                    ]}
                                    disabled={manualCountryCode.length !== 2}
                                    onPress={applyManualCountry}
                                >
                                    <Text style={styles.countryApplyButtonText}>
                                        {t('experts.edit.countryApply') || 'Apply'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.pickerCancel} onPress={closeCountryPicker}>
                            <Text style={styles.pickerCancelText}>{t('experts.onboarding.cancel')}</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                {step < 7 && (
                    <TouchableOpacity
                        onPress={handleBack}
                        style={[styles.backButton, loading && { opacity: 0.4 }]}
                        disabled={loading}
                    >
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
            {step < 7 && !anyPickerOpen && (
                <View style={[styles.bottomBar, { paddingBottom: Math.max(tokens.spacing.md, insets.bottom + tokens.spacing.sm) }]}>
                    {validationError && (
                        <Text style={styles.validationHint} numberOfLines={2}>
                            {validationError}
                        </Text>
                    )}
                    <TouchableOpacity
                        style={[styles.primaryButton, !canGoNext && styles.primaryButtonDisabled]}
                        onPress={handleNext}
                        disabled={loading || anyPickerOpen}
                        activeOpacity={canGoNext ? 0.8 : 1}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.primaryButtonText}>
                                {step === 6 ? t('experts.onboarding.submitForReview') : (t('common.next') || 'Next')}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
            {renderPickerModals()}
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
        stepContentInnerWithBottomBar: {
            padding: tokens.spacing.xl,
            paddingBottom: tokens.spacing.xxxl + 112,
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
            maxWidth: '100%',
        },
        chipActive: {
            borderColor: colors.primary,
            backgroundColor: colors.primary + '15',
        },
        chipText: {
            fontSize: 14,
            color: colors.textSecondary,
            flexShrink: 1,
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
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(15,23,42,0.36)',
        },
        pickerSheet: {
            backgroundColor: colors.surface,
            borderTopLeftRadius: tokens.radii.lg,
            borderTopRightRadius: tokens.radii.lg,
            paddingHorizontal: tokens.spacing.lg,
            paddingTop: tokens.spacing.sm,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -8 },
            shadowOpacity: 0.14,
            shadowRadius: 24,
            elevation: 18,
        },
        pickerHandle: {
            alignSelf: 'center',
            width: 42,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.border,
            marginBottom: tokens.spacing.md,
        },
        pickerTitle: {
            fontSize: 15,
            fontWeight: '700',
            color: colors.text,
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        pickerDescription: {
            fontSize: 13,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 18,
            marginTop: tokens.spacing.xs,
            marginBottom: tokens.spacing.md,
        },
        pickerOption: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.spacing.md,
            minHeight: 56,
            paddingVertical: tokens.spacing.md,
            paddingHorizontal: tokens.spacing.sm,
            borderTopWidth: 1,
            borderTopColor: colors.border,
        },
        pickerOptionText: {
            fontSize: 16,
            color: colors.text,
            flex: 1,
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
        countryList: {
            maxHeight: 320,
        },
        countryManualCard: {
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingTop: tokens.spacing.md,
            gap: tokens.spacing.md,
        },
        countryManualHeader: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: tokens.spacing.md,
        },
        countryManualTitle: {
            fontSize: 15,
            fontWeight: '600',
            color: colors.text,
        },
        countryManualSubtitle: {
            marginTop: 2,
            fontSize: 13,
            color: colors.textSecondary,
            lineHeight: 18,
        },
        countryManualRow: {
            flexDirection: 'row',
            gap: tokens.spacing.sm,
            alignItems: 'center',
        },
        countryCodeInput: {
            width: 88,
            backgroundColor: colors.background,
            borderRadius: tokens.radii.xs,
            borderWidth: 1,
            borderColor: colors.border,
            paddingVertical: tokens.spacing.md,
            paddingHorizontal: tokens.spacing.md,
            fontSize: 16,
            fontWeight: '700',
            letterSpacing: 1,
            color: colors.text,
            textAlign: 'center',
        },
        countryApplyButton: {
            flex: 1,
            minHeight: 48,
            borderRadius: tokens.radii.xs,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
        },
        countryApplyButtonDisabled: {
            opacity: 0.45,
        },
        countryApplyButtonText: {
            color: '#FFFFFF',
            fontSize: 15,
            fontWeight: '700',
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
            backgroundColor: colors.background,
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
