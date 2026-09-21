import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import ApiService from '../services/apiService';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { BodySilhouette } from '../features/bodymap/BodySilhouette';
import { SEVERITY_COLORS, severityColor } from '../features/bodymap/severity';
import type { SilhouettePalette } from '../features/bodymap/BodySilhouette';
import type { BodyView, Question } from '../features/bodymap/catalog';
import {
  BODY_VIEWBOX,
  MAX_NOTE_LENGTH,
  MAX_ZONES_PER_REPORT,
  RED_FLAGS,
  SEVERITY_MAX,
  SEVERITY_MIN,
  getZone,
  questionsForZone,
  severityBand,
  zoneNameKey,
} from '../features/bodymap/catalog';

/**
 * "What is bothering you" — the body map.
 *
 * Four steps: mark zones on the silhouette, rate and describe each one, tick the
 * emergency checklist, save. The result is a diary entry and nothing more.
 *
 * The screen deliberately never tells the user what their symptoms might mean.
 * That is not a missing feature — interpreting symptoms is what makes software a
 * regulated medical device, and the value we are after (symptoms sitting on the
 * same timeline as meals, medication and lab results) needs no interpretation at
 * all. The only judgement it makes is the emergency checklist, and that is a
 * refusal to help rather than help.
 */

type Step = 'pick' | 'detail' | 'check' | 'saved';

/**
 * Whatever `useI18n` hands back, rather than a hand-written signature — i18next's
 * `t` is a set of overloads that no simplified type matches, and pinning it here
 * keeps the memoised cards compiling if the hook ever changes.
 */
type Translate = ReturnType<typeof useI18n>['t'];

interface ZoneState {
  severity: number;
  answers: Record<string, string>;
}

interface HistoryReport {
  id: string;
  reportedAt: string;
  maxSeverity: number;
  entries: { zoneId: string; severity: number; answers?: Record<string, string> }[];
}

/**
 * Vertical chrome above and below the silhouette (header, hint, view toggle,
 * footer, safe areas). Used to size the body so the whole of it fits without
 * scrolling — hunting for a leg by scrolling makes the map feel broken.
 */
const PICK_STEP_CHROME = 340;

// ---------------------------------------------------------------------------
// Module-level sub-components. Declared here rather than inside the screen so
// React keeps their identity across renders — defining them inline remounts the
// subtree on every keystroke and every slider tick.
// ---------------------------------------------------------------------------

/**
 * One question with its answer chips.
 *
 * Memoised, and it takes the stable `onAnswer` rather than a freshly-built
 * closure, so dragging the severity slider re-renders the slider card only.
 * Six of these re-rendering on every pixel of a drag is exactly the kind of
 * waste that makes the app feel like a web page.
 */
const QuestionCard = memo(function QuestionCard({
  zoneId,
  question,
  value,
  onAnswer,
  t,
  styles,
}: {
  zoneId: string;
  question: Question;
  value?: string;
  onAnswer: (zoneId: string, questionId: string, answerId: string) => void;
  t: Translate;
  styles: any;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>
        {t(`bodyMap.questions.${question.id}.label`, question.id)}
      </Text>
      <View style={styles.chipWrap}>
        {question.options.map((option) => {
          const active = value === option;
          return (
            <TouchableOpacity
              key={option}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onAnswer(zoneId, question.id, option)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {t(`bodyMap.questions.${question.id}.options.${option}`, option)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

const CheckRow = memo(function CheckRow({
  flagId,
  label,
  checked,
  onToggle,
  styles,
  colors,
}: {
  flagId: string;
  label: string;
  checked: boolean;
  onToggle: (flagId: string) => void;
  styles: any;
  colors: any;
}) {
  return (
    <TouchableOpacity
      style={styles.checkRow}
      onPress={() => onToggle(flagId)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      activeOpacity={0.75}
    >
      <Ionicons
        name={checked ? 'checkbox' : 'square-outline'}
        size={22}
        color={checked ? colors.error : colors.textTertiary}
      />
      <Text style={[styles.checkText, checked && styles.checkTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
})

// ---------------------------------------------------------------------------

export default function BodyMapScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scrollRef = useRef<ScrollView>(null);

  const [step, setStep] = useState<Step>('pick');
  const [view, setView] = useState<BodyView>('front');
  const [zones, setZones] = useState<Record<string, ZoneState>>({});
  const [detailIndex, setDetailIndex] = useState(0);
  const [redFlags, setRedFlags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<HistoryReport[]>([]);

  const zoneIds = useMemo(() => Object.keys(zones), [zones]);
  const severityByZone = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [id, state] of Object.entries(zones)) out[id] = state.severity;
    return out;
  }, [zones]);

  const emergency = redFlags.length > 0;

  /** Fit the whole body on screen, but never smaller than a thumb can aim at. */
  const silhouetteWidth = useMemo(() => {
    const byWidth = Math.min(screenWidth - 72, 264);
    const byHeight =
      ((screenHeight - PICK_STEP_CHROME) * BODY_VIEWBOX.width) / BODY_VIEWBOX.height;
    return Math.max(150, Math.min(byWidth, byHeight));
  }, [screenWidth, screenHeight]);

  // Recent reports, so the screen opens with something to look at rather than an
  // empty body. Failure here is not worth an alert — the screen still works.
  useEffect(() => {
    let cancelled = false;
    ApiService.getSymptomReports(3)
      .then((res: any) => {
        if (!cancelled) setHistory(Array.isArray(res?.reports) ? res.reports : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Every step is a new page. Without this the user arrives at "Area 2 of 3"
  // already scrolled to wherever they left the previous one.
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [step, detailIndex]);

  const silhouettePalette = useMemo<SilhouettePalette>(
    () => ({
      // `surface` against the page background, not `surfaceMuted`: the muted
      // token is a hair away from the page colour in the light theme (#F8FAFC on
      // #F4F5F7), which left the body all but invisible until something was
      // selected. Inert parts take the page colour so they read as outline-only
      // ghosts — that is what tells a thumb not to bother tapping them.
      idle: colors.surface,
      outline: colors.borderStrong,
      inert: colors.background,
      inertOutline: colors.borderMuted,
      selectedOutline: colors.textPrimary,
      ...SEVERITY_COLORS,
    }),
    [colors],
  );

  const zoneLabel = useCallback((zoneId: string) => t(zoneNameKey(zoneId), zoneId), [t]);

  /**
   * What a screen reader announces for a zone. The severity has to live in the
   * label because react-native-svg drops `accessibilityState`, so "selected"
   * would never be spoken otherwise.
   */
  const zoneA11yLabel = useCallback(
    (zoneId: string, severity?: number) =>
      severity
        ? `${zoneLabel(zoneId)}, ${t('bodyMap.severityAria', '{{value}} out of {{max}}')
            .replace('{{value}}', String(severity))
            .replace('{{max}}', String(SEVERITY_MAX))}`
        : zoneLabel(zoneId),
    [zoneLabel, t],
  );

  const toggleZone = useCallback(
    (zoneId: string) => {
      // Decide and fire the side effects out here, and keep the updater pure.
      // Alerts and haptics inside a setState updater fire twice the moment React
      // double-invokes it, which it is entitled to do — the user would get two
      // stacked "up to three areas" dialogs from one tap.
      const alreadyMarked = !!zones[zoneId];

      if (!alreadyMarked && zoneIds.length >= MAX_ZONES_PER_REPORT) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        Alert.alert(
          t('bodyMap.maxZonesTitle', 'Enough for one report'),
          t('bodyMap.maxZonesBody', 'You can mark up to three areas at a time.'),
        );
        return;
      }

      Haptics.selectionAsync().catch(() => {});
      setZones((prev) => {
        if (prev[zoneId]) {
          const next = { ...prev };
          delete next[zoneId];
          return next;
        }
        // Middle of the scale: a default of 1 or 10 would bias what people report.
        return { ...prev, [zoneId]: { severity: 5, answers: {} } };
      });
    },
    [zones, zoneIds.length, t],
  );

  const setSeverity = useCallback((zoneId: string, severity: number) => {
    setZones((prev) =>
      prev[zoneId] ? { ...prev, [zoneId]: { ...prev[zoneId], severity } } : prev,
    );
  }, []);

  const setAnswer = useCallback((zoneId: string, questionId: string, answerId: string) => {
    setZones((prev) => {
      const current = prev[zoneId];
      if (!current) return prev;
      // Tapping the selected chip again clears it — every question is optional.
      const answers = { ...current.answers };
      if (answers[questionId] === answerId) delete answers[questionId];
      else answers[questionId] = answerId;
      return { ...prev, [zoneId]: { ...current, answers } };
    });
  }, []);

  const toggleRedFlag = useCallback((flagId: string) => {
    setRedFlags((prev) =>
      prev.includes(flagId) ? prev.filter((f) => f !== flagId) : [...prev, flagId],
    );
  }, []);

  /** Re-open a past report as a starting point — repeat complaints repeat. */
  const repeatReport = useCallback((report: HistoryReport) => {
    const next: Record<string, ZoneState> = {};
    for (const entry of (report.entries || []).slice(0, MAX_ZONES_PER_REPORT)) {
      // A zone retired from the catalogue since that report would have no name
      // and no place on the silhouette, so it is dropped rather than crashed on.
      if (!getZone(entry.zoneId)) continue;
      next[entry.zoneId] = { severity: entry.severity, answers: { ...(entry.answers || {}) } };
    }
    const first = Object.keys(next)[0];
    if (!first) return;
    Haptics.selectionAsync().catch(() => {});
    setZones(next);
    setView(getZone(first)!.view);
  }, []);

  const confirmDeleteReport = useCallback(
    (report: HistoryReport) => {
      Alert.alert(
        t('bodyMap.deleteTitle', 'Delete this report?'),
        t('bodyMap.deleteBody', 'It will be removed from your diary. This cannot be undone.'),
        [
          { text: t('common.cancel', 'Cancel'), style: 'cancel' },
          {
            text: t('common.delete', 'Delete'),
            style: 'destructive',
            onPress: async () => {
              // Optimistic, then put the row back if the server disagrees.
              setHistory((prev) => prev.filter((r) => r.id !== report.id));
              try {
                await ApiService.deleteSymptomReport(report.id);
              } catch {
                setHistory((prev) => [report, ...prev]);
                Alert.alert(
                  t('common.error', 'Error'),
                  t('bodyMap.deleteFailed', 'Could not delete. Check your connection and try again.'),
                );
              }
            },
          },
        ],
      );
    },
    [t],
  );

  const save = useCallback(async () => {
    if (zoneIds.length === 0 || saving) return;
    setSaving(true);
    try {
      await ApiService.createSymptomReport({
        entries: zoneIds.map((zoneId) => ({
          zoneId,
          severity: zones[zoneId].severity,
          answers: zones[zoneId].answers,
        })),
        redFlags,
        note: note.trim() || undefined,
        locale: language,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setStep('saved');
    } catch (error: any) {
      Alert.alert(
        t('common.error', 'Error'),
        error?.message || t('bodyMap.saveFailed', 'Could not save. Check your connection and try again.'),
      );
    } finally {
      setSaving(false);
    }
  }, [zoneIds, zones, redFlags, note, language, saving, t]);

  const callEmergency = useCallback(() => {
    const number = t('bodyMap.emergencyNumber', '112');
    Linking.openURL(`tel:${number}`).catch(() => {});
  }, [t]);

  // ---------------------------------------------------------------- steps ---

  const renderPick = () => (
    <>
      <Text style={styles.stepHint}>
        {t('bodyMap.hintPick', 'Tap the areas that bother you — up to three.')}
      </Text>

      <View style={styles.viewToggle}>
        {(['front', 'back'] as BodyView[]).map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.viewTab, view === v && styles.viewTabActive]}
            onPress={() => setView(v)}
            accessibilityRole="button"
            accessibilityState={{ selected: view === v }}
          >
            <Text style={[styles.viewTabText, view === v && styles.viewTabTextActive]}>
              {v === 'front' ? t('bodyMap.viewFront', 'Front') : t('bodyMap.viewBack', 'Back')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <BodySilhouette
        view={view}
        selected={severityByZone}
        onToggleZone={toggleZone}
        labelFor={zoneA11yLabel}
        palette={silhouettePalette}
        width={silhouetteWidth}
      />

      {zoneIds.length > 0 && (
        <View style={styles.selectedList}>
          {zoneIds.map((zoneId) => (
            <View key={zoneId} style={styles.selectedPill}>
              <View
                style={[
                  styles.selectedDot,
                  { backgroundColor: severityColor(zones[zoneId].severity) },
                ]}
              />
              <Text style={styles.selectedPillText}>{zoneLabel(zoneId)}</Text>
              <TouchableOpacity
                onPress={() => toggleZone(zoneId)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`${t('common.remove', 'Remove')}: ${zoneLabel(zoneId)}`}
              >
                <Ionicons name="close" size={15} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {history.length > 0 && zoneIds.length === 0 && (
        <View style={styles.historyBlock}>
          <Text style={styles.sectionLabel}>{t('bodyMap.historyTitle', 'Recent reports')}</Text>
          <Text style={styles.historyHint}>
            {t('bodyMap.historyHint', 'Tap one to log the same areas again.')}
          </Text>
          {history.map((report) => (
            <TouchableOpacity
              key={report.id}
              style={styles.historyRow}
              onPress={() => repeatReport(report)}
              onLongPress={() => confirmDeleteReport(report)}
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.selectedDot,
                  { backgroundColor: severityColor(report.maxSeverity || 1) },
                ]}
              />
              <Text style={styles.historyText} numberOfLines={1}>
                {(report.entries || []).map((e) => zoneLabel(e.zoneId)).join(', ')}
              </Text>
              <Text style={styles.historyDate}>
                {new Date(report.reportedAt).toLocaleDateString(language || undefined)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </>
  );

  const renderDetail = () => {
    const zoneId = zoneIds[detailIndex];
    if (!zoneId) return null;
    const state = zones[zoneId];
    const questions = questionsForZone(zoneId);
    const band = severityBand(state.severity);

    return (
      <>
        <Text style={styles.stepCounter}>
          {t('bodyMap.stepOf', 'Area {{current}} of {{total}}')
            .replace('{{current}}', String(detailIndex + 1))
            .replace('{{total}}', String(zoneIds.length))}
        </Text>
        <Text style={styles.zoneTitle}>{zoneLabel(zoneId)}</Text>

        <View style={styles.card}>
          <View style={styles.severityHead}>
            <Text style={styles.cardLabel}>{t('bodyMap.severityLabel', 'How strong is it?')}</Text>
            <Text style={[styles.severityValue, { color: SEVERITY_COLORS[band] }]}>
              {state.severity} · {t(`bodyMap.severityBands.${band}`, band)}
            </Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={SEVERITY_MIN}
            maximumValue={SEVERITY_MAX}
            step={1}
            value={state.severity}
            onValueChange={(v: number) => setSeverity(zoneId, Math.round(v))}
            minimumTrackTintColor={SEVERITY_COLORS[band]}
            maximumTrackTintColor={colors.borderMuted}
            thumbTintColor={SEVERITY_COLORS[band]}
            accessibilityLabel={t('bodyMap.severityLabel', 'How strong is it?')}
          />
          <View style={styles.scaleLegend}>
            <Text style={styles.scaleLegendText}>{t('bodyMap.severityBands.mild', 'Mild')}</Text>
            <Text style={styles.scaleLegendText}>{t('bodyMap.severityBands.extreme', 'Unbearable')}</Text>
          </View>
        </View>

        {questions.map((question) => (
          <QuestionCard
            key={question.id}
            zoneId={zoneId}
            question={question}
            value={state.answers[question.id]}
            onAnswer={setAnswer}
            t={t}
            styles={styles}
          />
        ))}
      </>
    );
  };

  const renderCheck = () => (
    <>
      <View style={[styles.card, styles.checkCard]}>
        <Text style={styles.checkTitle}>
          {t('bodyMap.checkTitle', 'Is any of this happening right now?')}
        </Text>
        <Text style={styles.checkSubtitle}>
          {t('bodyMap.checkSubtitle', 'Tick anything that applies. If nothing does, just continue.')}
        </Text>
        {RED_FLAGS.map((flagId) => (
          <CheckRow
            key={flagId}
            flagId={flagId}
            label={t(`bodyMap.redFlags.${flagId}`, flagId)}
            checked={redFlags.includes(flagId)}
            onToggle={toggleRedFlag}
            styles={styles}
            colors={colors}
          />
        ))}
      </View>

      {emergency && (
        <View style={styles.emergencyBox}>
          <Ionicons name="warning" size={22} color={colors.error} />
          <View style={styles.emergencyTextWrap}>
            <Text style={styles.emergencyTitle}>
              {t('bodyMap.emergencyTitle', 'This needs a person, not an app')}
            </Text>
            <Text style={styles.emergencyBody}>
              {t(
                'bodyMap.emergencyBody',
                'What you ticked can be urgent. Call emergency services or go to A&E now. We will still save this report for you.',
              )}
            </Text>
            <TouchableOpacity style={styles.emergencyBtn} onPress={callEmergency} activeOpacity={0.85}>
              <Ionicons name="call" size={16} color={colors.onPrimary} />
              <Text style={styles.emergencyBtnText}>
                {t('bodyMap.emergencyCall', 'Call {{number}}').replace(
                  '{{number}}',
                  t('bodyMap.emergencyNumber', '112'),
                )}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardLabel}>{t('bodyMap.noteLabel', 'Anything else worth writing down?')}</Text>
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder={t('bodyMap.notePlaceholder', 'Optional — in your own words')}
          placeholderTextColor={colors.textTertiary}
          multiline
          maxLength={MAX_NOTE_LENGTH}
          textAlignVertical="top"
          accessibilityLabel={t('bodyMap.noteLabel', 'Anything else worth writing down?')}
        />
      </View>

      <Text style={styles.disclaimer}>
        {t(
          'bodyMap.disclaimer',
          'This is a diary, not a diagnosis. EatSense does not interpret symptoms — take this record to a doctor.',
        )}
      </Text>
    </>
  );

  const renderSaved = () => (
    <View style={styles.savedBox}>
      <View style={styles.savedIcon}>
        <Ionicons name="checkmark" size={30} color={colors.onPrimary} />
      </View>
      <Text style={styles.savedTitle}>{t('bodyMap.savedTitle', 'Saved to your diary')}</Text>
      <Text style={styles.savedBody}>
        {t(
          'bodyMap.savedBody',
          'It now sits on the same timeline as your meals, medication and lab results.',
        )}
      </Text>
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => navigation.goBack()}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <Text style={styles.primaryBtnText}>{t('common.done', 'Done')}</Text>
      </TouchableOpacity>
    </View>
  );

  // --------------------------------------------------------------- footer ---

  const goBackStep = () => {
    if (step === 'detail') {
      if (detailIndex > 0) setDetailIndex(detailIndex - 1);
      else setStep('pick');
      return;
    }
    if (step === 'check') {
      setDetailIndex(Math.max(zoneIds.length - 1, 0));
      setStep('detail');
    }
  };

  const goNextStep = () => {
    if (step === 'pick') {
      setDetailIndex(0);
      setStep('detail');
      return;
    }
    if (step === 'detail') {
      if (detailIndex < zoneIds.length - 1) setDetailIndex(detailIndex + 1);
      else setStep('check');
    }
  };

  const renderFooter = () => {
    if (step === 'saved') return null;

    const isLast = step === 'check';
    const canAdvance = step === 'pick' ? zoneIds.length > 0 : true;

    return (
      <View style={styles.footer}>
        {step !== 'pick' && (
          <TouchableOpacity style={styles.secondaryBtn} onPress={goBackStep} activeOpacity={0.8}>
            <Text style={styles.secondaryBtnText}>{t('common.back', 'Back')}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.primaryBtn, styles.primaryBtnGrow, !canAdvance && styles.primaryBtnDisabled]}
          onPress={isLast ? save : goNextStep}
          disabled={!canAdvance || saving}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canAdvance || saving }}
        >
          {saving ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.primaryBtnText}>
              {isLast ? t('bodyMap.save', 'Save to diary') : t('common.next', 'Next')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={t('common.close', 'Close')}
        >
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('bodyMap.title', 'What is bothering you')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* The note field sits near the bottom of the last step, right where the
          keyboard would otherwise cover both it and the save button. */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 'pick' && renderPick()}
          {step === 'detail' && renderDetail()}
          {step === 'check' && renderCheck()}
          {step === 'saved' && renderSaved()}
        </ScrollView>

        {renderFooter()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
    body: { paddingHorizontal: 20, paddingBottom: 28 },

    stepHint: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 16 },
    stepCounter: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 6,
    },
    zoneTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginBottom: 16 },

    viewToggle: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceMuted,
      borderRadius: 12,
      padding: 3,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: colors.borderMuted,
    },
    viewTab: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
    viewTabActive: { backgroundColor: colors.surface },
    viewTabText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    viewTabTextActive: { color: colors.textPrimary },

    selectedList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 },
    selectedPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderMuted,
      borderRadius: 20,
      paddingVertical: 7,
      paddingHorizontal: 12,
    },
    selectedDot: { width: 9, height: 9, borderRadius: 5 },
    selectedPillText: { fontSize: 13.5, fontWeight: '600', color: colors.textPrimary },

    historyBlock: { marginTop: 28 },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 4,
    },
    historyHint: { fontSize: 12.5, color: colors.textTertiary, marginBottom: 8 },
    historyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderMuted,
    },
    historyText: { flex: 1, fontSize: 14, color: colors.textPrimary },
    historyDate: { fontSize: 12.5, color: colors.textTertiary },

    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.borderMuted,
    },
    cardLabel: { fontSize: 14.5, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },

    severityHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    severityValue: { fontSize: 14.5, fontWeight: '800' },
    slider: { width: '100%', height: 40 },
    scaleLegend: { flexDirection: 'row', justifyContent: 'space-between' },
    scaleLegendText: { fontSize: 11.5, color: colors.textTertiary },

    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 13,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.borderMuted,
      backgroundColor: colors.surfaceMuted,
    },
    chipActive: { backgroundColor: colors.primaryTint, borderColor: colors.primary },
    chipText: { fontSize: 13.5, color: colors.textSecondary, fontWeight: '500' },
    chipTextActive: { color: colors.primary, fontWeight: '700' },

    checkCard: { borderColor: colors.border },
    checkTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginBottom: 6 },
    checkSubtitle: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 12 },
    checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9 },
    checkText: { flex: 1, fontSize: 14, color: colors.textPrimary, lineHeight: 19 },
    checkTextActive: { fontWeight: '700' },

    emergencyBox: {
      flexDirection: 'row',
      gap: 12,
      backgroundColor: colors.errorTint,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
    },
    emergencyTextWrap: { flex: 1 },
    emergencyTitle: { fontSize: 15.5, fontWeight: '800', color: colors.error, marginBottom: 5 },
    emergencyBody: { fontSize: 13.5, color: colors.textPrimary, lineHeight: 19 },
    emergencyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.error,
      borderRadius: 12,
      paddingVertical: 11,
      marginTop: 12,
    },
    emergencyBtnText: { fontSize: 14.5, fontWeight: '700', color: colors.onPrimary },

    noteInput: {
      minHeight: 88,
      fontSize: 14.5,
      color: colors.textPrimary,
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.borderMuted,
    },
    disclaimer: { fontSize: 12.5, color: colors.textTertiary, lineHeight: 18, marginTop: 4 },

    savedBox: { alignItems: 'center', paddingTop: 48 },
    savedIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.success,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    savedTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
    savedBody: {
      fontSize: 14.5,
      color: colors.textSecondary,
      lineHeight: 20,
      textAlign: 'center',
      marginBottom: 28,
      paddingHorizontal: 12,
    },

    footer: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
      borderTopWidth: 1,
      borderTopColor: colors.borderMuted,
      backgroundColor: colors.background,
    },
    primaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBtnGrow: { flex: 1 },
    primaryBtnDisabled: { opacity: 0.45 },
    primaryBtnText: { fontSize: 15.5, fontWeight: '700', color: colors.onPrimary },
    secondaryBtn: {
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderWidth: 1,
      borderColor: colors.borderMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryBtnText: { fontSize: 15.5, fontWeight: '700', color: colors.textSecondary },
  });
