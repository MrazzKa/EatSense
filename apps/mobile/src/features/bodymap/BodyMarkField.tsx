import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../../app/i18n/hooks';
import { BodySilhouette } from './BodySilhouette';
import type { SilhouettePalette } from './BodySilhouette';
import { SEVERITY_COLORS, severityColor } from './severity';
import { BODY_VIEWBOX, markableZones, zoneNameKey } from './catalog';
import type { BodyView, Gender } from './catalog';
import type { useBodyMarks } from './useBodyMarks';

interface Props {
  /** The marks and the rules that govern them, from `useBodyMarks`. */
  controller: ReturnType<typeof useBodyMarks>;
  label: string;
  hint?: string;
  /** For a report that is already saved: the body is shown, not edited. */
  readOnly?: boolean;
}

/**
 * The body as one field inside a longer form.
 *
 * The body map owns a whole screen for this, with a question set per point. Here
 * the same gesture has to fit above a text box and a button, because the point of
 * the hotline is to reach a person quickly — so this asks only *where*, and lets
 * the rest be said out loud.
 *
 * The rules (what a tap means, the cap, which view a mark belongs to) are not
 * reimplemented: they come from the shared controller, so the two screens cannot
 * disagree about them.
 */
export function BodyMarkField({ controller, label, hint, readOnly = false }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { width: screenWidth } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [zonePickerOpen, setZonePickerOpen] = useState(false);

  const { view, setView, gender, setGender, marks, visibleMarks, tapBody, addZone, removeMark } =
    controller;

  const palette = useMemo<SilhouettePalette>(
    () => ({
      body: colors.surface,
      outline: colors.borderStrong,
      pinRing: colors.surface,
      ...SEVERITY_COLORS,
    }),
    [colors],
  );

  /** Narrower than on the body map: this sits above a text box and a button. */
  const silhouetteWidth = useMemo(
    () => Math.max(132, Math.min(screenWidth - 120, 176)),
    [screenWidth],
  );

  const zoneLabel = useCallback((zoneId: string) => t(zoneNameKey(zoneId), zoneId), [t]);

  const handleTap = useCallback(
    (x: number, y: number) => {
      if (!readOnly) tapBody(x, y);
    },
    [readOnly, tapBody],
  );

  const pickZone = useCallback(
    (zoneId: string) => {
      setZonePickerOpen(false);
      addZone(zoneId);
    },
    [addZone],
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      <View style={styles.controls}>
        <View style={[styles.segment, styles.segmentGrow]}>
          {(['front', 'back'] as BodyView[]).map((candidate) => (
            <TouchableOpacity
              key={candidate}
              style={[styles.tab, view === candidate && styles.tabActive]}
              onPress={() => setView(candidate)}
              accessibilityRole="button"
              accessibilityState={{ selected: view === candidate }}
            >
              <Text style={[styles.tabText, view === candidate && styles.tabTextActive]}>
                {candidate === 'front'
                  ? t('bodyMap.viewFront', 'Front')
                  : t('bodyMap.viewBack', 'Back')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.segment}>
          {(['male', 'female'] as Gender[]).map((candidate) => (
            <TouchableOpacity
              key={candidate}
              style={[styles.tab, styles.tabNarrow, gender === candidate && styles.tabActive]}
              onPress={() => setGender(candidate)}
              accessibilityRole="button"
              accessibilityState={{ selected: gender === candidate }}
              accessibilityLabel={
                candidate === 'male'
                  ? t('bodyMap.genderMale', 'Male body')
                  : t('bodyMap.genderFemale', 'Female body')
              }
            >
              <Ionicons
                name={candidate === 'male' ? 'male' : 'female'}
                size={15}
                color={gender === candidate ? colors.textPrimary : colors.textTertiary}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <BodySilhouette
        gender={gender}
        marks={visibleMarks}
        onTapBody={handleTap}
        palette={palette}
        width={silhouetteWidth}
        accessibilityLabel={
          readOnly
            ? t('bodyMap.diaryA11y', 'Symptoms: {{zones}}').replace(
                '{{zones}}',
                marks.map((mark) => zoneLabel(mark.zoneId)).join(', '),
              )
            : t('bodyMap.bodyA11y', 'Body diagram. Use “Choose from a list” below to mark a place.')
        }
      />

      {!readOnly ? (
        <TouchableOpacity
          style={styles.listLink}
          onPress={() => setZonePickerOpen(true)}
          accessibilityRole="button"
          activeOpacity={0.7}
        >
          <Ionicons name="list-outline" size={15} color={colors.primary} />
          <Text style={styles.listLinkText}>{t('bodyMap.chooseFromList', 'Choose from a list')}</Text>
        </TouchableOpacity>
      ) : null}

      {marks.length > 0 ? (
        <View style={styles.pills}>
          {marks.map((mark) => (
            <View key={mark.id} style={styles.pill}>
              <View style={[styles.pillDot, { backgroundColor: severityColor(mark.severity) }]} />
              <Text style={styles.pillText}>{zoneLabel(mark.zoneId)}</Text>
              {!readOnly ? (
                <TouchableOpacity
                  onPress={() => removeMark(mark.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('common.delete', 'Delete')} ${zoneLabel(mark.zoneId)}`}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={14} color={colors.textTertiary} />
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      <Modal
        visible={zonePickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setZonePickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t('bodyMap.chooseFromList', 'Choose from a list')}
              </Text>
              <TouchableOpacity
                onPress={() => setZonePickerOpen(false)}
                accessibilityRole="button"
                accessibilityLabel={t('common.close', 'Close')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {markableZones(view).map((zoneId) => (
                <TouchableOpacity
                  key={zoneId}
                  style={styles.modalRow}
                  onPress={() => pickZone(zoneId)}
                  accessibilityRole="button"
                >
                  <Text style={styles.modalRowText}>{zoneLabel(zoneId)}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    wrap: { alignItems: 'center', width: '100%' },
    label: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      alignSelf: 'flex-start',
      marginBottom: 4,
    },
    hint: {
      fontSize: 12,
      color: colors.textTertiary,
      alignSelf: 'flex-start',
      marginBottom: 10,
      lineHeight: 17,
    },
    controls: { flexDirection: 'row', gap: 8, width: '100%', marginBottom: 8 },
    segment: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceMuted,
      borderRadius: 10,
      padding: 2,
    },
    segmentGrow: { flex: 1 },
    tab: {
      flex: 1,
      paddingVertical: 7,
      paddingHorizontal: 10,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabNarrow: { flex: 0, paddingHorizontal: 13 },
    tabActive: { backgroundColor: colors.surface },
    tabText: { fontSize: 13, fontWeight: '600', color: colors.textTertiary },
    tabTextActive: { color: colors.textPrimary },
    listLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    listLinkText: { fontSize: 13, fontWeight: '600', color: colors.primary },
    pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, alignSelf: 'stretch' },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: colors.surfaceMuted,
    },
    pillDot: { width: 8, height: 8, borderRadius: 4 },
    pillText: { fontSize: 13, color: colors.textPrimary },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingBottom: 28,
      maxHeight: '72%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
    },
    modalTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
    modalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    modalRowText: { fontSize: 15, color: colors.textPrimary },
  });
