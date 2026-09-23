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
  Modal,
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
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../../app/i18n/hooks';
import { BodySilhouette } from '../features/bodymap/BodySilhouette';
import type { BodyMark, SilhouettePalette } from '../features/bodymap/BodySilhouette';
import { SEVERITY_COLORS, severityColor } from '../features/bodymap/severity';
import type { BodyView, Gender, Question } from '../features/bodymap/catalog';
import {
  BODY_VIEWBOX,
  MAX_NOTE_LENGTH,
  MAX_POINTS_PER_REPORT,
  RED_FLAGS,
  SEVERITY_MAX,
  SEVERITY_MIN,
  defaultPointForZone,
  genderFromProfile,
  markableZones,
  questionsForZone,
  severityBand,
  viewForZone,
  zoneAt,
  zoneNameKey,
} from '../features/bodymap/catalog';

/**
 * "What is bothering you" — the body map.
 *
 * Four steps: put points on the silhouette, describe each one, tick the
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

interface Mark extends BodyMark {
  /** Which silhouette the point was placed on. */
  view: BodyView;
  answers: Record<string, string>;
}

interface HistoryReport {
  id: string;
  reportedAt: string;
  maxSeverity: number;
  entries: {
    zoneId: string;
    severity: number;
    answers?: Record<string, string> | null;
    x?: number | null;
    y?: number | null;
    view?: string | null;
  }[];
}

/**
 * Vertical chrome above and below the silhouette (header, hint, controls,
 * footer, safe areas). Used to size the body so the whole of it fits without
 * scrolling — hunting for a leg by scrolling makes the map feel broken.
 */
const PICK_STEP_CHROME = 360;

/** Tapping within this many viewBox units of a pin removes it. */
const PIN_TOUCH_RADIUS = 14;

let markCounter = 0;
const nextMarkId = () => `mark-${++markCounter}`;

/**
 * Whatever `useI18n` hands back, rather than a hand-written signature — i18next's
 * `t` is a set of overloads that no simplified type matches.
 */
type Translate = ReturnType<typeof useI18n>['t'];

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
 */
const QuestionCard = memo(function QuestionCard({
  markId,
  question,
  value,
  onAnswer,
  t,
  styles,
}: {
  markId: string;
  question: Question;
  value?: string;
  onAnswer: (markId: string, questionId: string, answerId: string) => void;
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
              onPress={() => onAnswer(markId, question.id, option)}
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
});

// ---------------------------------------------------------------------------

export default function BodyMapScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { t, language } = useI18n();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scrollRef = useRef<ScrollView>(null);

  const [step, setStep] = useState<Step>('pick');
  const [view, setView] = useState<BodyView>('front');
  // Seeded from the profile so most people never touch the switch, but still a
  // switch: the profile can be wrong, empty, or simply not how someone wants to
  // be drawn.
  const [gender, setGender] = useState<Gender>(() => genderFromProfile((user as any)?.gender));
  const [marks, setMarks] = useState<Mark[]>([]);
  const [detailIndex, setDetailIndex] = useState(0);
  const [redFlags, setRedFlags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<HistoryReport[]>([]);
  const [zonePickerOpen, setZonePickerOpen] = useState(false);
  const [savedReportId, setSavedReportId] = useState<string | null>(null);

  const emergency = redFlags.length > 0;
  const visibleMarks = useMemo(() => marks.filter((m) => m.view === view), [marks, view]);

  /** Fit the whole body on screen, but never smaller than a thumb can aim at. */
  const silhouetteWidth = useMemo(() => {
    const byWidth = Math.min(screenWidth - 72, 250);
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
      body: colors.surface,
      outline: colors.borderStrong,
      pinRing: colors.surface,
      ...SEVERITY_COLORS,
    }),
    [colors],
  );

  const zoneLabel = useCallback((zoneId: string) => t(zoneNameKey(zoneId), zoneId), [t]);

  const warnFull = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    Alert.alert(
      t('bodyMap.maxZonesTitle', 'Enough for one report'),
      t('bodyMap.maxZonesBody', 'You can mark up to three places at a time.'),
    );
  }, [t]);

  const removeMark = useCallback((markId: string) => {
    Haptics.selectionAsync().catch(() => {});
    setMarks((prev) => prev.filter((m) => m.id !== markId));
  }, []);

  /**
   * A tap on the silhouette.
   *
   * Near an existing pin it removes that pin — same gesture, nothing extra to
   * learn. Off the body it does nothing at all: a mark floating beside the
   * figure would be meaningless, and an error message for missing a leg would
   * just be nagging.
   *
   * Note the side effects sit out here and the state updater stays pure. Alerts
   * and haptics inside a setState updater fire twice the moment React
   * double-invokes it, which it is entitled to do.
   */
  const handleTapBody = useCallback(
    (x: number, y: number) => {
      const hit = marks.find(
        (m) => m.view === view && Math.hypot(m.x - x, m.y - y) <= PIN_TOUCH_RADIUS,
      );
      if (hit) {
        removeMark(hit.id);
        return;
      }

      const zoneId = zoneAt(view, gender, x, y);
      if (!zoneId) return;

      if (marks.length >= MAX_POINTS_PER_REPORT) {
        warnFull();
        return;
      }

      Haptics.selectionAsync().catch(() => {});
      // Middle of the scale: a default of 1 or 10 would bias what people report.
      setMarks((prev) => [
        ...prev,
        { id: nextMarkId(), zoneId, view, x, y, severity: 5, answers: {} },
      ]);
    },
    [marks, view, gender, removeMark, warnFull],
  );

  /**
   * The list route into the same thing — for screen readers, which cannot aim at
   * a drawing, and for anyone who would simply rather pick a name.
   */
  const addMarkForZone = useCallback(
    (zoneId: string) => {
      setZonePickerOpen(false);
      if (marks.length >= MAX_POINTS_PER_REPORT) {
        warnFull();
        return;
      }
      const point = defaultPointForZone(view, gender, zoneId);
      if (!point) return;
      Haptics.selectionAsync().catch(() => {});
      setMarks((prev) => [
        ...prev,
        { id: nextMarkId(), zoneId, view, x: point.x, y: point.y, severity: 5, answers: {} },
      ]);
    },
    [marks.length, view, gender, warnFull],
  );

  const setSeverity = useCallback((markId: string, severity: number) => {
    setMarks((prev) => prev.map((m) => (m.id === markId ? { ...m, severity } : m)));
  }, []);

  const setAnswer = useCallback((markId: string, questionId: string, answerId: string) => {
    setMarks((prev) =>
      prev.map((m) => {
        if (m.id !== markId) return m;
        // Tapping the selected chip again clears it — every question is optional.
        const answers = { ...m.answers };
        if (answers[questionId] === answerId) delete answers[questionId];
        else answers[questionId] = answerId;
        return { ...m, answers };
      }),
    );
  }, []);

  const toggleRedFlag = useCallback((flagId: string) => {
    setRedFlags((prev) =>
      prev.includes(flagId) ? prev.filter((f) => f !== flagId) : [...prev, flagId],
    );
  }, []);

  /** Re-open a past report as a starting point — repeat complaints repeat. */
  const repeatReport = useCallback(
    (report: HistoryReport) => {
      const next: Mark[] = [];
      for (const entry of (report.entries || []).slice(0, MAX_POINTS_PER_REPORT)) {
        const entryView: BodyView = entry.view === 'back' ? 'back' : viewForZone(entry.zoneId);
        // Reports written before points existed carry only a zone, so the mark
        // is placed at a sensible spot inside it rather than dropped.
        const point =
          typeof entry.x === 'number' && typeof entry.y === 'number'
            ? { x: entry.x, y: entry.y }
            : defaultPointForZone(entryView, gender, entry.zoneId);
        if (!point) continue;
        next.push({
          id: nextMarkId(),
          zoneId: entry.zoneId,
          view: entryView,
          x: point.x,
          y: point.y,
          severity: entry.severity,
          answers: { ...(entry.answers || {}) },
        });
      }
      if (next.length === 0) return;
      Haptics.selectionAsync().catch(() => {});
      setMarks(next);
      setView(next[0].view);
    },
    [gender],
  );

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
    if (marks.length === 0 || saving) return;
    setSaving(true);
    try {
      const report = (await ApiService.createSymptomReport({
        entries: marks.map((mark) => ({
          zoneId: mark.zoneId,
          severity: mark.severity,
          answers: mark.answers,
          // Rounded: sub-unit precision on a 200-wide body is noise, and whole
          // tenths stay readable in the admin panel.
          x: Math.round(mark.x * 10) / 10,
          y: Math.round(mark.y * 10) / 10,
          view: mark.view,
        })),
        redFlags,
        note: note.trim() || undefined,
        locale: language,
      })) as { id?: string } | null;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setSavedReportId(report?.id ?? null);
      setStep('saved');
    } catch (error: any) {
      Alert.alert(
        t('common.error', 'Error'),
        error?.message ||
          t('bodyMap.saveFailed', 'Could not save. Check your connection and try again.'),
      );
    } finally {
      setSaving(false);
    }
  }, [marks, redFlags, note, language, saving, t]);

  const callEmergency = useCallback(() => {
    const number = t('bodyMap.emergencyNumber', '112');
    Linking.openURL(`tel:${number}`).catch(() => {});
  }, [t]);

  // ---------------------------------------------------------------- steps ---

  const renderPick = () => (
    <>
      <Text style={styles.stepHint}>
        {marks.length > 0
          ? t('bodyMap.hintTapAgain', 'Tap a point again to remove it.')
          : t('bodyMap.hintPick', 'Tap the body where it bothers you — up to three points.')}
      </Text>

      <View style={styles.controlsRow}>
        <View style={[styles.segment, styles.segmentGrow]}>
          {(['front', 'back'] as BodyView[]).map((v) => (
            <TouchableOpacity
              key={v}
              style={[styles.segmentTab, view === v && styles.segmentTabActive]}
              onPress={() => setView(v)}
              accessibilityRole="button"
              accessibilityState={{ selected: view === v }}
            >
              <Text style={[styles.segmentText, view === v && styles.segmentTextActive]}>
                {v === 'front' ? t('bodyMap.viewFront', 'Front') : t('bodyMap.viewBack', 'Back')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.segment}>
          {(['male', 'female'] as Gender[]).map((g) => (
            <TouchableOpacity
              key={g}
              style={[
                styles.segmentTab,
                styles.segmentTabNarrow,
                gender === g && styles.segmentTabActive,
              ]}
              onPress={() => setGender(g)}
              accessibilityRole="button"
              accessibilityState={{ selected: gender === g }}
              accessibilityLabel={
                g === 'male'
                  ? t('bodyMap.genderMale', 'Male body')
                  : t('bodyMap.genderFemale', 'Female body')
              }
            >
              <Ionicons
                name={g === 'male' ? 'male' : 'female'}
                size={17}
                color={gender === g ? colors.textPrimary : colors.textTertiary}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <BodySilhouette
        view={view}
        gender={gender}
        marks={visibleMarks}
        onTapBody={handleTapBody}
        palette={silhouettePalette}
        width={silhouetteWidth}
        accessibilityLabel={t(
          'bodyMap.bodyA11y',
          'Body diagram. Use “Choose from a list” below to mark a place.',
        )}
      />

      <TouchableOpacity
        style={styles.listLink}
        onPress={() => setZonePickerOpen(true)}
        accessibilityRole="button"
        activeOpacity={0.7}
      >
        <Ionicons name="list-outline" size={16} color={colors.primary} />
        <Text style={styles.listLinkText}>{t('bodyMap.chooseFromList', 'Choose from a list')}</Text>
      </TouchableOpacity>

      {marks.length > 0 && (
        <View style={styles.selectedList}>
          {marks.map((mark) => (
            <View key={mark.id} style={styles.selectedPill}>
              <View style={[styles.selectedDot, { backgroundColor: severityColor(mark.severity) }]} />
              <Text style={styles.selectedPillText}>{zoneLabel(mark.zoneId)}</Text>
              <TouchableOpacity
                onPress={() => removeMark(mark.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`${t('common.remove', 'Remove')}: ${zoneLabel(mark.zoneId)}`}
              >
                <Ionicons name="close" size={15} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {history.length > 0 && marks.length === 0 && (
        <View style={styles.historyBlock}>
          <Text style={styles.sectionLabel}>{t('bodyMap.historyTitle', 'Recent reports')}</Text>
          <Text style={styles.historyHint}>
            {t('bodyMap.historyHint', 'Tap one to log the same places again.')}
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
    const mark = marks[detailIndex];
    if (!mark) return null;
    const questions = questionsForZone(mark.zoneId);
    const band = severityBand(mark.severity);

    return (
      <>
        <Text style={styles.stepCounter}>
          {t('bodyMap.stepOf', 'Area {{current}} of {{total}}')
            .replace('{{current}}', String(detailIndex + 1))
            .replace('{{total}}', String(marks.length))}
        </Text>
        <Text style={styles.zoneTitle}>{zoneLabel(mark.zoneId)}</Text>

        <View style={styles.card}>
          <View style={styles.severityHead}>
            <Text style={styles.cardLabel}>{t('bodyMap.severityLabel', 'How strong is it?')}</Text>
            <Text style={[styles.severityValue, { color: SEVERITY_COLORS[band] }]}>
              {mark.severity} · {t(`bodyMap.severityBands.${band}`, band)}
            </Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={SEVERITY_MIN}
            maximumValue={SEVERITY_MAX}
            step={1}
            value={mark.severity}
            onValueChange={(v: number) => setSeverity(mark.id, Math.round(v))}
            minimumTrackTintColor={SEVERITY_COLORS[band]}
            maximumTrackTintColor={colors.borderMuted}
            thumbTintColor={SEVERITY_COLORS[band]}
            accessibilityLabel={t('bodyMap.severityLabel', 'How strong is it?')}
          />
          <View style={styles.scaleLegend}>
            <Text style={styles.scaleLegendText}>{t('bodyMap.severityBands.mild', 'Mild')}</Text>
            <Text style={styles.scaleLegendText}>
              {t('bodyMap.severityBands.extreme', 'Unbearable')}
            </Text>
          </View>
        </View>

        {questions.map((question) => (
          <QuestionCard
            key={question.id}
            markId={mark.id}
            question={question}
            value={mark.answers[question.id]}
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
            <TouchableOpacity
              style={styles.emergencyBtn}
              onPress={callEmergency}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
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
        <Text style={styles.cardLabel}>
          {t('bodyMap.noteLabel', 'Anything else worth writing down?')}
        </Text>
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
        style={[styles.primaryBtn, styles.savedPrimary]}
        onPress={() =>
          navigation.replace('Hotline', {
            symptomReportId: savedReportId ?? undefined,
            reason: note.trim() || undefined,
          })
        }
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <Ionicons name="chatbubbles-outline" size={18} color={colors.onPrimary} />
        <Text style={styles.primaryBtnText}>
          {t('bodyMap.showSpecialist', 'Show this to a specialist')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.savedSecondary}
        onPress={() => navigation.goBack()}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <Text style={styles.savedSecondaryText}>{t('common.done', 'Done')}</Text>
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
      setDetailIndex(Math.max(marks.length - 1, 0));
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
      if (detailIndex < marks.length - 1) setDetailIndex(detailIndex + 1);
      else setStep('check');
    }
  };

  const renderFooter = () => {
    if (step === 'saved') return null;

    const isLast = step === 'check';
    const canAdvance = step === 'pick' ? marks.length > 0 : true;

    return (
      <View style={styles.footer}>
        {step !== 'pick' && (
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={goBackStep}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
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

      <Modal
        visible={zonePickerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setZonePickerOpen(false)}
      >
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => setZonePickerOpen(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={t('common.close', 'Close')}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {t('bodyMap.chooseFromList', 'Choose from a list')}
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={styles.body}>
            {markableZones(view).map((zoneId) => (
              <TouchableOpacity
                key={zoneId}
                style={styles.zoneRow}
                onPress={() => addMarkForZone(zoneId)}
                accessibilityRole="button"
                activeOpacity={0.7}
              >
                <Text style={styles.zoneRowText}>{zoneLabel(zoneId)}</Text>
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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

    stepHint: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 14 },
    stepCounter: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 6,
    },
    zoneTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginBottom: 16 },

    controlsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    segment: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceMuted,
      borderRadius: 12,
      padding: 3,
      borderWidth: 1,
      borderColor: colors.borderMuted,
    },
    segmentGrow: { flex: 1 },
    segmentTab: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
    segmentTabNarrow: { flex: 0, paddingHorizontal: 14 },
    segmentTabActive: { backgroundColor: colors.surface },
    segmentText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    segmentTextActive: { color: colors.textPrimary },

    listLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      marginTop: 14,
      paddingVertical: 8,
    },
    listLinkText: { fontSize: 14, fontWeight: '600', color: colors.primary },

    zoneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderMuted,
    },
    zoneRowText: { fontSize: 15.5, color: colors.textPrimary },

    selectedList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
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

    historyBlock: { marginTop: 24 },
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
    savedPrimary: { flexDirection: 'row', gap: 9, alignSelf: 'stretch' },
    savedSecondary: { marginTop: 12, paddingVertical: 12, alignSelf: 'stretch', alignItems: 'center' },
    savedSecondaryText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
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
