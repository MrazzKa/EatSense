import { act, renderHook } from '@testing-library/react-native';
import {
  marksFromEntries,
  marksToEntries,
  useBodyMarks,
} from '../../features/bodymap/useBodyMarks';
import { MAX_POINTS_PER_REPORT, zoneAt } from '../../features/bodymap/catalog';

/**
 * These rules used to live inside BodyMapScreen, where they could only be
 * checked by rendering the whole screen. They are now shared with the hotline,
 * so a regression would be wrong in two places at once.
 */

/** A point the lookup agrees is the chest, so the tests do not hardcode a guess. */
const CHEST = { x: 100, y: 110 };
const BELLY = { x: 100, y: 155 };

describe('useBodyMarks', () => {
  it('places a mark where the body was tapped and resolves its zone', () => {
    const { result } = renderHook(() => useBodyMarks());

    act(() => result.current.tapBody(CHEST.x, CHEST.y));

    expect(result.current.marks).toHaveLength(1);
    const [mark] = result.current.marks;
    expect(mark.x).toBe(CHEST.x);
    expect(mark.y).toBe(CHEST.y);
    expect(mark.zoneId).toBe(zoneAt('front', 'male', CHEST.x, CHEST.y));
    expect(mark.view).toBe('front');
  });

  it('ignores a tap that misses the body', () => {
    const { result } = renderHook(() => useBodyMarks());
    act(() => result.current.tapBody(2, 2));
    expect(result.current.marks).toHaveLength(0);
  });

  it('removes the mark when the same spot is tapped again', () => {
    const { result } = renderHook(() => useBodyMarks());
    act(() => result.current.tapBody(CHEST.x, CHEST.y));
    act(() => result.current.tapBody(CHEST.x + 3, CHEST.y + 3));
    expect(result.current.marks).toHaveLength(0);
  });

  it('keeps a second mark that is far enough from the first', () => {
    const { result } = renderHook(() => useBodyMarks());
    act(() => result.current.tapBody(CHEST.x, CHEST.y));
    act(() => result.current.tapBody(BELLY.x, BELLY.y));
    expect(result.current.marks).toHaveLength(2);
  });

  it('refuses a mark past the cap and says so exactly once', () => {
    const onLimitReached = jest.fn();
    const { result } = renderHook(() => useBodyMarks({ maxMarks: 2, onLimitReached }));

    act(() => result.current.tapBody(CHEST.x, CHEST.y));
    act(() => result.current.tapBody(BELLY.x, BELLY.y));
    act(() => result.current.tapBody(100, 210));

    expect(result.current.marks).toHaveLength(2);
    // Once, not twice: React is entitled to double-invoke a state updater, so a
    // side effect placed inside one fires twice.
    expect(onLimitReached).toHaveBeenCalledTimes(1);
  });

  it('defaults to the middle of the severity scale rather than either end', () => {
    const { result } = renderHook(() => useBodyMarks());
    act(() => result.current.tapBody(CHEST.x, CHEST.y));
    expect(result.current.marks[0].severity).toBe(5);
  });

  it('only shows the marks placed on the silhouette being looked at', () => {
    const { result } = renderHook(() => useBodyMarks());
    act(() => result.current.tapBody(CHEST.x, CHEST.y));
    expect(result.current.visibleMarks).toHaveLength(1);

    act(() => result.current.setView('back'));
    expect(result.current.marks).toHaveLength(1);
    expect(result.current.visibleMarks).toHaveLength(0);
  });

  it('adds a mark from the list without the user aiming at anything', () => {
    const { result } = renderHook(() => useBodyMarks());
    act(() => result.current.addZone('chest'));

    expect(result.current.marks).toHaveLength(1);
    const [mark] = result.current.marks;
    // The placed point has to read back as the zone that was asked for.
    expect(zoneAt(mark.view, result.current.gender, mark.x, mark.y)).toBe('chest');
  });

  it('clears an answer when the same option is chosen twice', () => {
    const { result } = renderHook(() => useBodyMarks());
    act(() => result.current.tapBody(CHEST.x, CHEST.y));
    const id = result.current.marks[0].id;

    act(() => result.current.setAnswer(id, 'onset', 'days'));
    expect(result.current.marks[0].answers).toEqual({ onset: 'days' });

    act(() => result.current.setAnswer(id, 'onset', 'days'));
    expect(result.current.marks[0].answers).toEqual({});
  });

  it('flips to the view a replaced set of marks sits on', () => {
    const { result } = renderHook(() => useBodyMarks());
    act(() => result.current.replaceMarks(marksFromEntries([{ zoneId: 'back_lower', severity: 8 }], 'male')));
    expect(result.current.view).toBe('back');
  });
});

describe('marksToEntries', () => {
  it('rounds coordinates to tenths and keeps the view', () => {
    const entries = marksToEntries([
      { id: 'm1', zoneId: 'chest', view: 'front', x: 100.4567, y: 110.4321, severity: 6, answers: {} },
    ]);
    expect(entries).toEqual([
      { zoneId: 'chest', severity: 6, answers: {}, x: 100.5, y: 110.4, view: 'front' },
    ]);
  });
});

describe('marksFromEntries', () => {
  it('keeps a stored point exactly as it was placed', () => {
    const [mark] = marksFromEntries(
      [{ zoneId: 'chest', severity: 4, x: 97.5, y: 108, view: 'front' }],
      'male',
    );
    expect(mark.x).toBe(97.5);
    expect(mark.y).toBe(108);
    expect(mark.severity).toBe(4);
  });

  it('places a point for an entry that predates points instead of dropping it', () => {
    const [mark] = marksFromEntries([{ zoneId: 'abdomen_epigastrium', severity: 7 }], 'male');
    expect(mark).toBeDefined();
    expect(zoneAt(mark.view, 'male', mark.x, mark.y)).toBe('abdomen_epigastrium');
  });

  it('never returns more marks than a report can hold', () => {
    const entries = Array.from({ length: 10 }, () => ({ zoneId: 'chest', severity: 5 }));
    expect(marksFromEntries(entries, 'male')).toHaveLength(MAX_POINTS_PER_REPORT);
  });

  it('survives a missing entry list', () => {
    expect(marksFromEntries(null, 'male')).toEqual([]);
    expect(marksFromEntries(undefined, 'male')).toEqual([]);
  });
});
