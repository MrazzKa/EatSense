/**
 * SuggestProgramCard - Community voting for lifestyle/diet suggestions
 * Users can propose new programs and vote on existing suggestions.
 * Top-voted suggestions may be implemented as real programs.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    Modal,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../../app/i18n/hooks';
import ApiService from '../../services/apiService';

interface Suggestion {
    id: string;
    name: string;
    description?: string;
    type: string;
    votes: number;
    createdAt: string;
    hasVoted?: boolean;
    status?: 'pending' | 'approved' | 'rejected';
}

interface SuggestProgramCardProps {
    type?: 'diet' | 'lifestyle';
}

// Get days remaining in current voting round (end of month)
function getDaysRemaining(): number {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return Math.max(1, lastDay.getDate() - now.getDate());
}

function getCurrentRoundLabel(): string {
    const now = new Date();
    return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function SuggestProgramCard({ type = 'lifestyle' }: SuggestProgramCardProps) {
    const { colors } = useTheme();
    const { t } = useI18n();

    const [modalVisible, setModalVisible] = useState(false);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [votingId, setVotingId] = useState<string | null>(null);

    // New suggestion form
    const [showNewForm, setShowNewForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const loadSuggestions = useCallback(async () => {
        try {
            setLoading(true);
            const data = await ApiService.getSuggestions(type, 20);
            setSuggestions(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('[SuggestProgram] Load error:', error);
        } finally {
            setLoading(false);
        }
    }, [type]);

    useEffect(() => {
        if (modalVisible) {
            loadSuggestions();
        }
    }, [modalVisible, loadSuggestions]);

    const handleVote = async (suggestion: Suggestion) => {
        setVotingId(suggestion.id);
        try {
            const result = await ApiService.suggestProgram(suggestion.name, suggestion.description || '', type);
            if (result?.alreadyVoted) {
                Alert.alert('', t('suggest.already_voted', 'You have already voted for this'));
                // Mark as voted in local state even if already voted server-side
                setSuggestions(prev =>
                    prev.map(s => s.id === suggestion.id ? { ...s, hasVoted: true } : s)
                );
            } else {
                // Update local state
                setSuggestions(prev =>
                    prev.map(s =>
                        s.id === suggestion.id
                            ? { ...s, votes: (s.votes || 0) + 1, hasVoted: true }
                            : s
                    )
                );
            }
        } catch (error: any) {
            Alert.alert(t('common.error', 'Error'), error?.message || t('suggest.error', 'Failed'));
        } finally {
            setVotingId(null);
        }
    };

    const handleSubmitNew = async () => {
        if (!newName.trim()) {
            Alert.alert(t('common.error', 'Error'), t('suggest.name_required', 'Enter a name'));
            return;
        }

        setSubmitting(true);
        try {
            const result = await ApiService.suggestProgram(newName.trim(), newDescription.trim(), type);
            if (result?.created) {
                Alert.alert('', t('suggest.success', 'Your suggestion has been submitted!'));
            } else if (result?.voted) {
                Alert.alert('', t('suggest.voted', 'Vote counted!'));
            } else if (result?.alreadyVoted) {
                Alert.alert('', t('suggest.already_voted', 'You have already voted for this'));
            }
            setNewName('');
            setNewDescription('');
            setShowNewForm(false);
            loadSuggestions();
        } catch (error: any) {
            Alert.alert(t('common.error', 'Error'), error?.message || t('suggest.error', 'Failed'));
        } finally {
            setSubmitting(false);
        }
    };

    const topCount = suggestions.length;
    const topVotes = suggestions.length > 0 ? suggestions[0]?.votes || 0 : 0;

    const renderSuggestionItem = ({ item, index }: { item: Suggestion; index: number }) => {
        const isTop = index === 0 && item.votes > 1;
        const isVoting = votingId === item.id;

        return (
            <View style={[
                styles.suggestionItem,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isTop && { borderColor: colors.primary, borderWidth: 1.5 },
            ]}>
                <View style={styles.suggestionContent}>
                    <View style={styles.suggestionLeft}>
                        <View style={[
                            styles.rankBadge,
                            { backgroundColor: isTop ? colors.primary : colors.border },
                        ]}>
                            <Text style={[
                                styles.rankText,
                                { color: isTop ? '#fff' : colors.textSecondary },
                            ]}>
                                {index + 1}
                            </Text>
                        </View>
                        <View style={styles.suggestionInfo}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={[styles.suggestionName, { color: colors.textPrimary }]} numberOfLines={1}>
                                    {item.name}
                                </Text>
                                {item.status === 'approved' && (
                                    <View style={[styles.statusBadge, { backgroundColor: '#4CAF50' + '20' }]}>
                                        <Ionicons name="checkmark-circle" size={10} color="#4CAF50" />
                                        <Text style={{ fontSize: 9, color: '#4CAF50', fontWeight: '600', marginLeft: 2 }}>
                                            {t('suggest.approved', 'Approved')}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            {item.description ? (
                                <Text style={[styles.suggestionDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                                    {item.description}
                                </Text>
                            ) : null}
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[
                            styles.voteButton,
                            { borderColor: colors.primary },
                            item.hasVoted && { backgroundColor: colors.primary },
                        ]}
                        onPress={() => handleVote(item)}
                        disabled={isVoting}
                        activeOpacity={0.7}
                    >
                        {isVoting ? (
                            <ActivityIndicator size="small" color={item.hasVoted ? '#fff' : colors.primary} />
                        ) : (
                            <>
                                <Ionicons
                                    name={item.hasVoted ? 'checkmark' : 'arrow-up'}
                                    size={16}
                                    color={item.hasVoted ? '#fff' : colors.primary}
                                />
                                <Text style={[
                                    styles.voteCount,
                                    { color: item.hasVoted ? '#fff' : colors.primary },
                                ]}>
                                    {item.votes || 0}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
                {isTop && (
                    <View style={[styles.leaderTag, { backgroundColor: colors.primary + '15' }]}>
                        <Ionicons name="trophy" size={12} color={colors.primary} />
                        <Text style={[styles.leaderTagText, { color: colors.primary }]}>
                            {t('suggest.leader', 'Top voted')}
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <>
            <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                activeOpacity={0.7}
                onPress={() => setModalVisible(true)}
            >
                <View style={styles.cardContent}>
                    <View style={[styles.iconWrap, { backgroundColor: colors.primary + '15' }]}>
                        <Ionicons name="people" size={24} color={colors.primary} />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={[styles.title, { color: colors.textPrimary }]}>
                            {t('suggest.title', 'Community Suggestions')}
                        </Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            {topCount > 0
                                ? t('suggest.subtitle_count', '{{count}} ideas — vote or add yours!').replace('{{count}}', String(topCount))
                                : t('suggest.subtitle_empty', 'Suggest a lifestyle — community votes!')
                            }
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>
                            {getDaysRemaining()} {t('suggest.days_left', 'days left')} · {getCurrentRoundLabel()}
                        </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                        <Ionicons name="arrow-up" size={14} color="#fff" />
                        <Text style={styles.badgeText}>{topVotes}</Text>
                    </View>
                </View>
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    {/* Header */}
                    <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Ionicons name="close" size={24} color={colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                            {t('suggest.modal_title', 'Community Suggestions')}
                        </Text>
                        <View style={{ width: 24 }} />
                    </View>

                    {/* Reward banner */}
                    <View style={[styles.rewardBanner, { backgroundColor: '#7C3AED' }]}>
                        <View style={styles.rewardBannerTop}>
                            <View style={styles.rewardIconWrap}>
                                <Ionicons name="trophy" size={28} color="#FFD700" />
                            </View>
                            <View style={styles.rewardTextWrap}>
                                <Text style={styles.rewardTitle}>
                                    {t('suggest.reward_title', '6 months PRO free!')}
                                </Text>
                                <Text style={styles.rewardDesc}>
                                    {t('suggest.reward_info', 'Top-voted suggestions get implemented! The author receives 6 months of PRO free!')}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Round timer */}
                    <View style={[styles.roundBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.roundLeft}>
                            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                            <View style={{ marginLeft: 8 }}>
                                <Text style={[styles.roundLabel, { color: colors.textPrimary }]}>
                                    {getCurrentRoundLabel()}
                                </Text>
                                <Text style={[styles.roundSub, { color: colors.textSecondary }]}>
                                    {t('suggest.round_info', 'Monthly voting round')}
                                </Text>
                            </View>
                        </View>
                        <View style={[styles.daysLeftBadge, { backgroundColor: colors.primary + '15' }]}>
                            <Text style={[styles.daysLeftNum, { color: colors.primary }]}>
                                {getDaysRemaining()}
                            </Text>
                            <Text style={[styles.daysLeftLabel, { color: colors.primary }]}>
                                {t('suggest.days_left', 'days left')}
                            </Text>
                        </View>
                    </View>

                    {/* Suggestions list */}
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : (
                        <FlatList
                            data={suggestions}
                            renderItem={renderSuggestionItem}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={styles.listContent}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="bulb-outline" size={48} color={colors.textTertiary} />
                                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                        {t('suggest.empty', 'No suggestions yet. Be the first!')}
                                    </Text>
                                </View>
                            }
                        />
                    )}

                    {/* New suggestion form */}
                    {showNewForm ? (
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                            keyboardVerticalOffset={100}
                        >
                            <View style={[styles.newFormContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                                    placeholder={t('suggest.name_placeholder', 'Program name')}
                                    placeholderTextColor={colors.textTertiary}
                                    value={newName}
                                    onChangeText={setNewName}
                                    maxLength={60}
                                />
                                <TextInput
                                    style={[styles.input, styles.textArea, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                                    placeholder={t('suggest.description_placeholder', 'Describe your idea...')}
                                    placeholderTextColor={colors.textTertiary}
                                    value={newDescription}
                                    onChangeText={setNewDescription}
                                    multiline
                                    maxLength={300}
                                />
                                <View style={styles.formButtons}>
                                    <TouchableOpacity
                                        style={[styles.formCancelBtn, { borderColor: colors.border }]}
                                        onPress={() => { setShowNewForm(false); setNewName(''); setNewDescription(''); }}
                                    >
                                        <Text style={[styles.formCancelText, { color: colors.textPrimary }]}>
                                            {t('common.cancel', 'Cancel')}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.formSubmitBtn, { backgroundColor: colors.primary }, submitting && { opacity: 0.6 }]}
                                        onPress={handleSubmitNew}
                                        disabled={submitting}
                                    >
                                        {submitting ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : (
                                            <Text style={styles.formSubmitText}>
                                                {t('suggest.submit', 'Submit')}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </KeyboardAvoidingView>
                    ) : (
                        <View style={[styles.addButtonContainer, { borderTopColor: colors.border }]}>
                            <TouchableOpacity
                                style={[styles.addButton, { backgroundColor: colors.primary }]}
                                onPress={() => setShowNewForm(true)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="add" size={22} color="#fff" />
                                <Text style={styles.addButtonText}>
                                    {t('suggest.add_new', 'Suggest a program')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    // Card on DietsScreen
    card: {
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 12,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 13,
        lineHeight: 18,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 4,
        gap: 3,
    },
    badgeText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },

    // Modal
    modalContainer: {
        flex: 1,
        paddingTop: Platform.OS === 'ios' ? 50 : 0,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    rewardBanner: {
        marginHorizontal: 16,
        marginTop: 12,
        padding: 16,
        borderRadius: 16,
    },
    rewardBannerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    rewardIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    rewardTextWrap: {
        flex: 1,
    },
    rewardTitle: {
        color: '#FFD700',
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 4,
    },
    rewardDesc: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 13,
        lineHeight: 18,
    },
    roundBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: 16,
        marginTop: 12,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    roundLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    roundLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    roundSub: {
        fontSize: 11,
        marginTop: 1,
    },
    daysLeftBadge: {
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    daysLeftNum: {
        fontSize: 18,
        fontWeight: '800',
    },
    daysLeftLabel: {
        fontSize: 9,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
        paddingBottom: 8,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 60,
        gap: 12,
    },
    emptyText: {
        fontSize: 15,
        textAlign: 'center',
    },

    // Suggestion item
    suggestionItem: {
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
    },
    suggestionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    suggestionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 12,
    },
    rankBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    rankText: {
        fontSize: 13,
        fontWeight: '700',
    },
    suggestionInfo: {
        flex: 1,
    },
    suggestionName: {
        fontSize: 15,
        fontWeight: '600',
    },
    suggestionDesc: {
        fontSize: 12,
        marginTop: 2,
        lineHeight: 16,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    voteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 4,
        minWidth: 56,
        justifyContent: 'center',
    },
    voteCount: {
        fontSize: 14,
        fontWeight: '700',
    },
    leaderTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    leaderTagText: {
        fontSize: 11,
        fontWeight: '600',
    },

    // New form
    newFormContainer: {
        padding: 16,
        borderTopWidth: 1,
    },
    input: {
        borderRadius: 10,
        padding: 12,
        fontSize: 15,
        marginBottom: 10,
        borderWidth: 1,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    formButtons: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 4,
    },
    formCancelBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
    },
    formCancelText: {
        fontWeight: '600',
        fontSize: 15,
    },
    formSubmitBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    formSubmitText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },

    // Add button
    addButtonContainer: {
        padding: 16,
        borderTopWidth: 1,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
