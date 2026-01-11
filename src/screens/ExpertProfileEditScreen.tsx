import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import MarketplaceService from '../services/marketplaceService';

interface ExpertProfileEditScreenProps {
    navigation: any;
}

export default function ExpertProfileEditScreen({ navigation }: ExpertProfileEditScreenProps) {
    const { colors } = useTheme();
    const { t } = useI18n();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasProfile, setHasProfile] = useState(false);

    // Profile fields
    const [displayName, setDisplayName] = useState('');
    const [type, setType] = useState<'dietitian' | 'nutritionist'>('nutritionist');
    const [title, setTitle] = useState('');
    const [bio, setBio] = useState('');
    const [education, setEducation] = useState('');
    const [experienceYears, setExperienceYears] = useState('0');
    const [specializations, setSpecializations] = useState('');
    const [languages, setLanguages] = useState('ru, en');
    const [contactPolicy, setContactPolicy] = useState('');
    const [isPublished, setIsPublished] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadProfile();
        }, [])
    );

    const loadProfile = async () => {
        try {
            setLoading(true);
            const profile = await MarketplaceService.getMyExpertProfile();
            if (profile) {
                setHasProfile(true);
                setDisplayName(profile.displayName || '');
                setType(profile.type || 'nutritionist');
                setTitle(profile.title || '');
                setBio(profile.bio || '');
                setEducation(profile.education || '');
                setExperienceYears(String(profile.experienceYears || 0));
                setSpecializations(profile.specializations?.join(', ') || '');
                setLanguages(profile.languages?.join(', ') || 'ru, en');
                setContactPolicy(profile.contactPolicy || '');
                setIsPublished(profile.isPublished || false);
            }
        } catch {
            // Profile doesn't exist yet - that's OK
            console.log('No expert profile yet, will create new');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!displayName.trim()) {
            Alert.alert(t('common.error'), t('experts.edit.nameRequired', 'Display name is required'));
            return;
        }

        try {
            setSaving(true);

            const profileData = {
                displayName: displayName.trim(),
                type,
                title: title.trim() || undefined,
                bio: bio.trim() || undefined,
                education: education.trim() || undefined,
                experienceYears: parseInt(experienceYears) || 0,
                specializations: specializations.split(',').map(s => s.trim()).filter(Boolean),
                languages: languages.split(',').map(l => l.trim().toLowerCase()).filter(Boolean),
                contactPolicy: contactPolicy.trim() || undefined,
            };

            if (hasProfile) {
                await MarketplaceService.updateExpertProfile(profileData);
            } else {
                await MarketplaceService.createExpertProfile(profileData);
                setHasProfile(true);
            }

            Alert.alert(
                t('common.success'),
                t('experts.edit.saved', 'Profile saved successfully'),
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error: any) {
            console.error('Failed to save profile:', error);
            Alert.alert(t('common.error'), error.message || t('common.errorGeneric'));
        } finally {
            setSaving(false);
        }
    };

    const handlePublish = async () => {
        try {
            setSaving(true);
            await MarketplaceService.publishExpertProfile(!isPublished);
            setIsPublished(!isPublished);
        } catch (error) {
            console.error('Failed to toggle publish:', error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                    {hasProfile ? t('experts.edit.editProfile', 'Edit Profile') : t('experts.edit.createProfile', 'Create Profile')}
                </Text>
                <TouchableOpacity onPress={handleSave} disabled={saving}>
                    {saving ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <Text style={[styles.saveButton, { color: colors.primary }]}>
                            {t('common.save', 'Save')}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Publish Toggle */}
                {hasProfile && (
                    <View style={[styles.publishRow, { backgroundColor: isPublished ? '#4CAF5015' : colors.surface, borderColor: isPublished ? '#4CAF50' : colors.border }]}>
                        <View style={styles.publishInfo}>
                            <Ionicons name={isPublished ? 'eye' : 'eye-off'} size={24} color={isPublished ? '#4CAF50' : colors.textSecondary} />
                            <Text style={[styles.publishText, { color: colors.textPrimary }]}>
                                {isPublished ? t('experts.edit.published', 'Published') : t('experts.edit.unpublished', 'Unpublished')}
                            </Text>
                        </View>
                        <Switch
                            value={isPublished}
                            onValueChange={handlePublish}
                            trackColor={{ false: colors.border, true: '#4CAF5050' }}
                            thumbColor={isPublished ? '#4CAF50' : colors.textSecondary}
                        />
                    </View>
                )}

                {/* Basic Info */}
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    {t('experts.edit.basicInfo', 'Basic Information')}
                </Text>

                <View style={[styles.inputGroup, { borderColor: colors.border }]}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                        {t('experts.edit.displayName', 'Display Name')} *
                    </Text>
                    <TextInput
                        style={[styles.input, { color: colors.textPrimary }]}
                        value={displayName}
                        onChangeText={setDisplayName}
                        placeholder={t('experts.edit.displayNamePlaceholder', 'e.g. Anna Smith, RD')}
                        placeholderTextColor={colors.textTertiary}
                    />
                </View>

                <View style={[styles.inputGroup, { borderColor: colors.border }]}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                        {t('experts.edit.type', 'Specialist Type')}
                    </Text>
                    <View style={styles.typeSelector}>
                        <TouchableOpacity
                            style={[
                                styles.typeOption,
                                { borderColor: colors.primary, backgroundColor: type === 'dietitian' ? colors.primary : 'transparent' }
                            ]}
                            onPress={() => setType('dietitian')}
                        >
                            <Text style={{ color: type === 'dietitian' ? '#FFF' : colors.primary }}>
                                {t('experts.dietitian.title', 'Dietitian')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.typeOption,
                                { borderColor: colors.primary, backgroundColor: type === 'nutritionist' ? colors.primary : 'transparent' }
                            ]}
                            onPress={() => setType('nutritionist')}
                        >
                            <Text style={{ color: type === 'nutritionist' ? '#FFF' : colors.primary }}>
                                {t('experts.nutritionist.title', 'Nutritionist')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={[styles.inputGroup, { borderColor: colors.border }]}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                        {t('experts.edit.title', 'Professional Title')}
                    </Text>
                    <TextInput
                        style={[styles.input, { color: colors.textPrimary }]}
                        value={title}
                        onChangeText={setTitle}
                        placeholder={t('experts.edit.titlePlaceholder', 'e.g. Certified Dietitian')}
                        placeholderTextColor={colors.textTertiary}
                    />
                </View>

                <View style={[styles.inputGroup, { borderColor: colors.border }]}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                        {t('experts.edit.bio', 'Bio')}
                    </Text>
                    <TextInput
                        style={[styles.textArea, { color: colors.textPrimary }]}
                        value={bio}
                        onChangeText={setBio}
                        placeholder={t('experts.edit.bioPlaceholder', 'Tell clients about yourself...')}
                        placeholderTextColor={colors.textTertiary}
                        multiline
                        numberOfLines={4}
                    />
                </View>

                {/* Experience */}
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    {t('experts.edit.experience', 'Experience')}
                </Text>

                <View style={[styles.inputGroup, { borderColor: colors.border }]}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                        {t('experts.edit.education', 'Education')}
                    </Text>
                    <TextInput
                        style={[styles.textArea, { color: colors.textPrimary }]}
                        value={education}
                        onChangeText={setEducation}
                        placeholder={t('experts.edit.educationPlaceholder', 'Degrees, certifications...')}
                        placeholderTextColor={colors.textTertiary}
                        multiline
                        numberOfLines={3}
                    />
                </View>

                <View style={[styles.inputGroup, { borderColor: colors.border }]}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                        {t('experts.edit.experienceYears', 'Years of Experience')}
                    </Text>
                    <TextInput
                        style={[styles.input, { color: colors.textPrimary }]}
                        value={experienceYears}
                        onChangeText={setExperienceYears}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor={colors.textTertiary}
                    />
                </View>

                <View style={[styles.inputGroup, { borderColor: colors.border }]}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                        {t('experts.edit.specializations', 'Specializations')}
                    </Text>
                    <TextInput
                        style={[styles.input, { color: colors.textPrimary }]}
                        value={specializations}
                        onChangeText={setSpecializations}
                        placeholder={t('experts.edit.specializationsPlaceholder', 'Weight loss, Diabetes, Sports...')}
                        placeholderTextColor={colors.textTertiary}
                    />
                    <Text style={[styles.hint, { color: colors.textTertiary }]}>
                        {t('experts.edit.commaSeparated', 'Comma-separated')}
                    </Text>
                </View>

                <View style={[styles.inputGroup, { borderColor: colors.border }]}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                        {t('experts.edit.languages', 'Languages')}
                    </Text>
                    <TextInput
                        style={[styles.input, { color: colors.textPrimary }]}
                        value={languages}
                        onChangeText={setLanguages}
                        placeholder="ru, en, kk"
                        placeholderTextColor={colors.textTertiary}
                    />
                    <Text style={[styles.hint, { color: colors.textTertiary }]}>
                        {t('experts.edit.commaSeparated', 'Comma-separated')}
                    </Text>
                </View>

                {/* Contact Policy */}
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    {t('experts.edit.contactSection', 'Contact Policy')}
                </Text>

                <View style={[styles.inputGroup, { borderColor: colors.border }]}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                        {t('experts.edit.contactPolicy', 'Response Time & Availability')}
                    </Text>
                    <TextInput
                        style={[styles.textArea, { color: colors.textPrimary }]}
                        value={contactPolicy}
                        onChangeText={setContactPolicy}
                        placeholder={t('experts.edit.contactPolicyPlaceholder', 'e.g. I reply within 24 hours on weekdays')}
                        placeholderTextColor={colors.textTertiary}
                        multiline
                        numberOfLines={2}
                    />
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
        fontWeight: '600',
    },
    saveButton: {
        fontSize: 16,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
    },
    publishRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 20,
    },
    publishInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    publishText: {
        fontSize: 16,
        fontWeight: '500',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
        marginTop: 8,
    },
    inputGroup: {
        marginBottom: 16,
        borderBottomWidth: 1,
        paddingBottom: 8,
    },
    label: {
        fontSize: 13,
        marginBottom: 6,
    },
    input: {
        fontSize: 16,
        paddingVertical: 8,
    },
    textArea: {
        fontSize: 16,
        paddingVertical: 8,
        textAlignVertical: 'top',
        minHeight: 80,
    },
    hint: {
        fontSize: 12,
        marginTop: 4,
    },
    typeSelector: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    typeOption: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
    },
});
