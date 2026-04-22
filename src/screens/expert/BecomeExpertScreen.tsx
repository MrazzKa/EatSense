import React, { useState, useMemo, useCallback } from 'react';
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
import { useTheme, useDesignTokens } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../../app/i18n/hooks';
import MarketplaceService from '../../services/marketplaceService';
import ApiService from '../../services/apiService';

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
    type EducationEntry = { degree: string; institution: string; year: string };
    const [educationEntries, setEducationEntries] = useState<EducationEntry[]>([
        { degree: '', institution: '', year: '' },
    ]);
    const [experienceYears, setExperienceYears] = useState('');

    const composedEducation = useMemo(() => {
        return educationEntries
            .filter(e => e.degree.trim() || e.institution.trim())
            .map(e => {
                const main = [e.degree.trim(), e.institution.trim()].filter(Boolean).join(', ');
                return e.year.trim() ? `${main} (${e.year.trim()})` : main;
            })
            .join('\n');
    }, [educationEntries]);

    const updateEducationEntry = useCallback((index: number, field: keyof EducationEntry, value: string) => {
        setEducationEntries(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
    }, []);
    const addEducationEntry = useCallback(() => {
        setEducationEntries(prev => [...prev, { degree: '', institution: '', year: '' }]);
    }, []);
    const removeEducationEntry = useCallback((index: number) => {
        setEducationEntries(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
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

    const [profileCreated, setProfileCreated] = useState(false);

    const canGoNext = useMemo(() => {
        switch (step) {
            case 1: return disclaimerAccepted;
            case 2: return displayName.trim().length > 0 && bio.trim().length >= 50;
            case 3: return selectedSpecs.length > 0 && selectedLangs.length > 0;
            case 4: return documents.length >= 1;
            case 5: return true; // preview
            default: return false;
        }
    }, [step, disclaimerAccepted, displayName, bio, selectedSpecs, selectedLangs, documents.length]);

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
            setDocuments(prev => [...prev, {
                uri: asset.uri,
                name: asset.fileName || `document_${prev.length + 1}.jpg`,
                mimeType: asset.mimeType || 'image/jpeg',
                kind: 'image',
            }]);
        }
    }, [t]);

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
            setDocuments(prev => [...prev, {
                uri: asset.uri,
                name: asset.fileName || `document_${prev.length + 1}.jpg`,
                mimeType: asset.mimeType || 'image/jpeg',
                kind: 'image',
            }]);
        }
    }, [t]);

    const pickPdf = useCallback(async () => {
        setPickerOpen(false);
        const result = await DocumentPicker.getDocumentAsync({
            type: 'application/pdf',
            multiple: false,
            copyToCacheDirectory: true,
        });
        if (!result.canceled && result.assets?.[0]) {
            const asset = result.assets[0];
            setDocuments(prev => [...prev, {
                uri: asset.uri,
                name: asset.name || `document_${prev.length + 1}.pdf`,
                mimeType: asset.mimeType || 'application/pdf',
                kind: 'pdf',
            }]);
        }
    }, []);

    const removeDocument = useCallback((index: number) => {
        setDocuments(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleSubmit = useCallback(async () => {
        if (documents.length === 0) {
            Alert.alert(t('experts.onboarding.uploadFailed'), t('experts.onboarding.documentsRequired'));
            return;
        }

        setLoading(true);
        try {
            // 1. Create expert profile
            await MarketplaceService.createExpertProfile({
                type,
                displayName: displayName.trim(),
                bio: bio.trim(),
                education: composedEducation || undefined,
                experienceYears: parseInt(experienceYears) || 0,
                specializations: selectedSpecs,
                languages: selectedLangs,
            });

            // 2. Upload documents — fail the whole submission if any fail
            const failures: string[] = [];
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
                    failures.push(doc.name);
                }
            }

            if (failures.length === documents.length && documents.length > 0) {
                Alert.alert(
                    t('experts.onboarding.uploadFailed'),
                    (t('experts.onboarding.allCredentialsFailed') as string)
                        || 'All documents failed to upload. Without credentials the admin will likely reject your profile. Please retry.',
                );
                return;
            }

            if (failures.length > 0) {
                Alert.alert(
                    t('experts.onboarding.uploadFailed'),
                    t('experts.onboarding.uploadFailedMessage') + '\n\n' + failures.join(', '),
                );
            }

            await refreshUser();
            setProfileCreated(true);
            setStep(6);
        } catch (error: any) {
            Alert.alert(
                t('common.error'),
                error?.message || 'Failed to create profile',
            );
        } finally {
            setLoading(false);
        }
    }, [type, displayName, bio, composedEducation, experienceYears, selectedSpecs, selectedLangs, documents, refreshUser, t]);

    const handleNext = useCallback(() => {
        if (step === 5) {
            handleSubmit();
        } else {
            setStep(s => s + 1);
        }
    }, [step, handleSubmit]);

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
                </View>
            ))}
            <TouchableOpacity onPress={addEducationEntry} style={styles.educationAddBtn}>
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={styles.educationAddText}>
                    {t('experts.edit.addEducation') || 'Add another entry'}
                </Text>
            </TouchableOpacity>

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

            <TouchableOpacity style={styles.uploadButton} onPress={() => setPickerOpen(true)}>
                <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
                <Text style={styles.uploadButtonText}>{t('experts.onboarding.uploadDocument')}</Text>
            </TouchableOpacity>

            {documents.length === 0 && (
                <Text style={styles.helperText}>{t('experts.onboarding.documentsRequired')}</Text>
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
                    </View>
                </View>

                <Text style={styles.previewSectionTitle}>{t('experts.about')}</Text>
                <Text style={styles.previewText}>{bio}</Text>

                {composedEducation ? (
                    <>
                        <Text style={styles.previewSectionTitle}>{t('experts.edit.education')}</Text>
                        <Text style={styles.previewText}>{composedEducation}</Text>
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
                    <TouchableOpacity
                        style={[styles.primaryButton, !canGoNext && styles.primaryButtonDisabled]}
                        onPress={handleNext}
                        disabled={!canGoNext || loading}
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
    });
