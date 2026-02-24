import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../../app/i18n/hooks';
import { getDisclaimer, shouldShowDisclaimer, markDisclaimerViewed } from '../../legal/disclaimerUtils';

const DisclaimerModal = ({
    disclaimerKey,
    onAccept,
    onCancel,
    visible: propVisible // Control visibility externally if needed
}) => {
    const { colors } = useTheme();
    const { language } = useI18n();
    const [internalVisible, setInternalVisible] = useState(false);
    const [content, setContent] = useState(null);
    const [checked, setChecked] = useState(false);
    const [loading, setLoading] = useState(true);

    // Check visibility logic
    useEffect(() => {
        const checkStatus = async () => {
            if (!disclaimerKey) return;

            const shouldShow = await shouldShowDisclaimer(disclaimerKey);
            if (shouldShow) {
                const disclaimerData = getDisclaimer(disclaimerKey, language);
                if (disclaimerData) {
                    setContent(disclaimerData);
                    setInternalVisible(true);
                } else {
                    // No content found? Skip
                    onAccept && onAccept();
                }
            } else {
                // Already accepted, proceed immediately
                onAccept && onAccept();
            }
            setLoading(false);
        };

        if (propVisible !== false) { // Only run if not explicitly hidden
            checkStatus();
        }
    }, [disclaimerKey, language, propVisible, onAccept]);

    const handleAccept = async () => {
        if (content?._meta?.requires_checkbox && !checked) return;

        await markDisclaimerViewed(disclaimerKey);
        setInternalVisible(false);
        onAccept && onAccept();
    };

    const handleCancel = () => {
        setInternalVisible(false);
        onCancel && onCancel();
    };

    if (!internalVisible || loading || !content) return null;

    return (
        <Modal
            visible={internalVisible}
            transparent
            animationType="fade"
            onRequestClose={handleCancel}
        >
            <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <View style={styles.header}>
                            <Ionicons name="alert-circle-outline" size={32} color={colors.primary} />
                            <Text style={[styles.title, { color: colors.text }]}>{content.title}</Text>
                        </View>

                        <Text style={[styles.body, { color: colors.textSecondary }]}>
                            {content.content}
                        </Text>

                        {/* Checkbox Section */}
                        {content._meta?.requires_checkbox && (
                            <TouchableOpacity
                                style={[styles.checkboxContainer, { borderColor: checked ? colors.primary : colors.border }]}
                                onPress={() => setChecked(!checked)}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.checkbox, {
                                    borderColor: checked ? colors.primary : colors.textSecondary,
                                    backgroundColor: checked ? colors.primary : 'transparent'
                                }]}>
                                    {checked && <Ionicons name="checkmark" size={16} color="#FFF" />}
                                </View>
                                <Text style={[styles.checkboxText, { color: colors.text }]}>
                                    {content.checkbox}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>

                    <View style={[styles.footer, { borderTopColor: colors.border }]}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={handleCancel}
                        >
                            <Text style={[styles.buttonText, { color: colors.textSecondary }]}>
                                {content.button_cancel || 'Cancel'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.button,
                                styles.acceptButton,
                                { backgroundColor: (!content._meta?.requires_checkbox || checked) ? colors.primary : colors.surfaceMuted },
                                (!content._meta?.requires_checkbox || checked) ? {} : { borderWidth: 1, borderColor: colors.border }
                            ]}
                            onPress={handleAccept}
                            disabled={content._meta?.requires_checkbox && !checked}
                        >
                            <Text style={[
                                styles.buttonText,
                                { color: (!content._meta?.requires_checkbox || checked) ? '#FFF' : colors.textSecondary }
                            ]}>
                                {content.button_accept || 'Continue'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: '100%',
        maxHeight: '80%', // Limit height
        borderRadius: 16,
        borderWidth: 1,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        overflow: 'hidden',
    },
    scrollContent: {
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
    },
    body: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 24,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        gap: 12,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    checkboxText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
    },
    footer: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        gap: 12,
    },
    button: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: 'transparent',
    },
    acceptButton: {
        // bg set dynamically
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    }
});

export default DisclaimerModal;
