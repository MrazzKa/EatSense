import { useCallback, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import type { BodyMark } from './BodySilhouette';
import type { BodyView, Gender } from './catalog';
import {
  MAX_POINTS_PER_REPORT,
  defaultPointForZone,
  genderFromProfile,
  viewForZone,
  zoneAt,
} from './catalog';

/** Tapping within this many viewBox units of a pin removes it. */
export const PIN_TOUCH_RADIUS = 14;

/** Middle of the scale: a default of 1 or 10 would bias what people report. */
const DEFAULT_SEVERITY = 5;

export interface EditableMark extends BodyMark {
  /** Which silhouette the point was placed on. */
  view: BodyView;
  answers: Record<string, string>;
}

/**
 * A stored entry, as the API hands it back — tolerant, because older reports
 * predate points and carry only a zone.
 */
export interface SymptomEntry {
  zoneId: string;
  severity: number;
  answers?: Record<string, string> | null;
  x?: number | null;
  y?: number | null;
  view?: string | null;
}

interface Options {
  /** Seeds the silhouette. The switch can still override it. */
  profileGender?: string | null;
  maxMarks?: number;
  /** Called when a tap is refused because the report is already full. */
  onLimitReached?: () => void;
}

let markCounter = 0;
const nextMarkId = () => `mark-${++markCounter}`;

/**
 * Placing points on the body.
 *
 * Both the body map and the hotline ask the same question — where does it bother
 * you — so the gesture, the cap and the front/back flip live here once. The last
 * time two screens each owned a copy of a rule like this, they drifted apart and
 * one of them was wrong for a release.
 *
 * Side effects stay outside the state updaters: an alert or a haptic inside a
 * `setState` callback fires twice the moment React double-invokes it, which it is
 * entitled to do.
 */
export function useBodyMarks({
  profileGender,
  maxMarks = MAX_POINTS_PER_REPORT,
  onLimitReached,
}: Options = {}) {
  const [view, setView] = useState<BodyView>('front');
  const [gender, setGender] = useState<Gender>(() => genderFromProfile(profileGender));
  const [marks, setMarks] = useState<EditableMark[]>([]);

  const visibleMarks = useMemo(() => marks.filter((mark) => mark.view === view), [marks, view]);

  const removeMark = useCallback((markId: string) => {
    Haptics.selectionAsync().catch(() => {});
    setMarks((prev) => prev.filter((mark) => mark.id !== markId));
  }, []);

  const refuse = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    onLimitReached?.();
  }, [onLimitReached]);

  /**
   * A tap on the silhouette.
   *
   * Near an existing pin it removes that pin — same gesture, nothing extra to
   * learn. Off the body it does nothing at all: a mark floating beside the figure
   * would be meaningless, and an error message for missing a leg would just be
   * nagging.
   */
  const tapBody = useCallback(
    (x: number, y: number) => {
      const hit = marks.find(
        (mark) => mark.view === view && Math.hypot(mark.x - x, mark.y - y) <= PIN_TOUCH_RADIUS,
      );
      if (hit) {
        removeMark(hit.id);
        return;
      }

      const zoneId = zoneAt(view, gender, x, y);
      if (!zoneId) return;

      if (marks.length >= maxMarks) {
        refuse();
        return;
      }

      Haptics.selectionAsync().catch(() => {});
      setMarks((prev) => [
        ...prev,
        { id: nextMarkId(), zoneId, view, x, y, severity: DEFAULT_SEVERITY, answers: {} },
      ]);
    },
    [marks, view, gender, maxMarks, removeMark, refuse],
  );

  /**
   * The list route into the same thing — for screen readers, which cannot aim at
   * a drawing, and for anyone who would simply rather pick a name.
   */
  const addZone = useCallback(
    (zoneId: string) => {
      if (marks.length >= maxMarks) {
        refuse();
        return;
      }
      const point = defaultPointForZone(view, gender, zoneId);
      if (!point) return;
      Haptics.selectionAsync().catch(() => {});
      setMarks((prev) => [
        ...prev,
        {
          id: nextMarkId(),
          zoneId,
          view,
          x: point.x,
          y: point.y,
          severity: DEFAULT_SEVERITY,
          answers: {},
        },
      ]);
    },
    [marks.length, view, gender, maxMarks, refuse],
  );

  const setSeverity = useCallback((markId: string, severity: number) => {
    setMarks((prev) => prev.map((mark) => (mark.id === markId ? { ...mark, severity } : mark)));
  }, []);

  const setAnswer = useCallback((markId: string, questionId: string, answerId: string) => {
    setMarks((prev) =>
      prev.map((mark) => {
        if (mark.id !== markId) return mark;
        // Tapping the selected chip again clears it — every question is optional.
        const answers = { ...mark.answers };
        if (answers[questionId] === answerId) delete answers[questionId];
        else answers[questionId] = answerId;
        return { ...mark, answers };
      }),
    );
  }, []);

  /** Replaces the marks wholesale and flips to the view the first one sits on. */
  const replaceMarks = useCallback((next: EditableMark[]) => {
    setMarks(next);
    if (next.length > 0) setView(next[0].view);
  }, []);

  return {
    view,
    setView,
    gender,
    setGender,
    marks,
    visibleMarks,
    tapBody,
    addZone,
    removeMark,
    setSeverity,
    setAnswer,
    replaceMarks,
    maxMarks,
  };
}

/** What we send is always complete, unlike what we may read back. */
export interface SymptomEntryPayload {
  zoneId: string;
  severity: number;
  answers: Record<string, string>;
  x: number;
  y: number;
  view: BodyView;
}

/** Marks as the API wants them. */
export function marksToEntries(marks: EditableMark[]): SymptomEntryPayload[] {
  return marks.map((mark) => ({
    zoneId: mark.zoneId,
    severity: mark.severity,
    answers: mark.answers,
    // Rounded: sub-unit precision on a 200-wide body is noise, and whole tenths
    // stay readable in the admin panel.
    x: Math.round(mark.x * 10) / 10,
    y: Math.round(mark.y * 10) / 10,
    view: mark.view,
  }));
}

/**
 * Stored entries back into marks, for re-opening a past report or showing one
 * that is already attached to a request.
 *
 * Entries written before points existed carry only a zone, so the mark is placed
 * at a sensible spot inside it rather than dropped.
 */
export function marksFromEntries(
  entries: SymptomEntry[] | null | undefined,
  gender: Gender,
  limit = MAX_POINTS_PER_REPORT,
): EditableMark[] {
  const out: EditableMark[] = [];
  for (const entry of (entries || []).slice(0, limit)) {
    const view: BodyView = entry.view === 'back' ? 'back' : viewForZone(entry.zoneId);
    const point =
      typeof entry.x === 'number' && typeof entry.y === 'number'
        ? { x: entry.x, y: entry.y }
        : defaultPointForZone(view, gender, entry.zoneId);
    if (!point) continue;
    out.push({
      id: nextMarkId(),
      zoneId: entry.zoneId,
      view,
      x: point.x,
      y: point.y,
      severity: entry.severity,
      answers: { ...(entry.answers || {}) },
    });
  }
  return out;
}
