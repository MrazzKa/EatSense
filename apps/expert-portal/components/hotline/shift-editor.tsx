'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n/context';
import { weekdayShortNames } from '@/lib/i18n/format';
import type { Locale } from '@/lib/i18n/messages';
import { useToast } from '@/components/toast';

interface ShiftRow {
  weekday: number;
  start: string;
  end: string;
  timezone: string;
}

interface ApiShift {
  weekday: number;
  startMinute: number;
  endMinute: number;
  timezone: string;
}

/** Monday first: a rota reads as a working week. Values stay 0 = Sunday, as the API stores them. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DEFAULT_ROW = { weekday: 1, start: '18:00', end: '21:00' };

const toClock = (minute: number) => {
  // 24:00 is a valid end of day on the server but not a valid <input type="time">.
  const clamped = Math.min(minute, 24 * 60 - 1);
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
};

const toMinute = (clock: string) => {
  const [hours, minutes] = clock.split(':').map(Number);
  return hours * 60 + minutes;
};

const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

/**
 * Recurring duty windows: the hours the app promises users someone will answer.
 *
 * Saved as a whole because that is how the server stores a rota — a window
 * removed here must actually stop putting the expert on the line. Each window
 * keeps the timezone it was written in, so "Tuesday 18:00" means the same hour
 * whichever machine the expert edits it from.
 */
export function ShiftEditor() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const weekdays = useMemo(() => weekdayShortNames(locale as Locale), [locale]);
  const localZone = useMemo(browserTimezone, []);

  const [rows, setRows] = useState<ShiftRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch<ApiShift[]>('/hotline/expert/shifts')
      .then((shifts) => {
        if (cancelled) return;
        // Ordered once on load, not on every keystroke: a row that jumps while
        // its time is being typed is a row edited by mistake.
        setRows(
          shifts
            .map((shift) => ({
              weekday: shift.weekday,
              start: toClock(shift.startMinute),
              end: toClock(shift.endMinute),
              timezone: shift.timezone,
            }))
            .sort(
              (a, b) =>
                WEEK_ORDER.indexOf(a.weekday) - WEEK_ORDER.indexOf(b.weekday) ||
                a.start.localeCompare(b.start),
            ),
        );
      })
      .catch(() => toast(t('common', 'error'), 'error'))
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [t, toast]);

  const update = useCallback((index: number, patch: Partial<ShiftRow>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setDirty(true);
  }, []);

  const add = useCallback(() => {
    setRows((prev) => [...prev, { ...DEFAULT_ROW, timezone: localZone }]);
    setDirty(true);
  }, [localZone]);

  const remove = useCallback((index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  }, []);

  const invalid = rows.some((row) => !row.start || !row.end || toMinute(row.start) >= toMinute(row.end));

  const save = useCallback(async () => {
    if (invalid || saving) return;
    setSaving(true);
    try {
      await apiFetch('/hotline/expert/shifts', {
        method: 'PUT',
        body: JSON.stringify({
          shifts: rows.map((row) => ({
            weekday: row.weekday,
            startMinute: toMinute(row.start),
            endMinute: toMinute(row.end),
            timezone: row.timezone,
          })),
        }),
      });
      setDirty(false);
      toast(t('hotline', 'shiftsSaved'), 'success');
    } catch {
      toast(t('common', 'error'), 'error');
    } finally {
      setSaving(false);
    }
  }, [invalid, saving, rows, toast, t]);

  return (
    <section className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <CalendarClock size={16} />
        {t('hotline', 'shifts')}
      </h2>
      <p className="mt-1 text-xs text-[var(--text2)]">
        {t('hotline', 'shiftsHint')} {t('hotline', 'shiftsTimezone').replace('{{zone}}', localZone)}
      </p>

      {loaded && rows.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text2)]">{t('hotline', 'noShifts')}</p>
      ) : null}

      <ul className="mt-4 space-y-2">
        {rows.map((row, index) => {
          const rowInvalid = Boolean(row.start && row.end) && toMinute(row.start) >= toMinute(row.end);
          return (
            <li key={index} className="flex flex-wrap items-center gap-2">
              <select
                value={row.weekday}
                onChange={(event) => update(index, { weekday: Number(event.target.value) })}
                aria-label={t('hotline', 'shiftDay')}
                className="rounded-lg border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm"
              >
                {WEEK_ORDER.map((day) => (
                  <option key={day} value={day}>
                    {weekdays[day]}
                  </option>
                ))}
              </select>
              <input
                type="time"
                value={row.start}
                onChange={(event) => update(index, { start: event.target.value })}
                aria-label={t('hotline', 'shiftFrom')}
                aria-invalid={rowInvalid}
                className="rounded-lg border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm"
              />
              <span className="text-[var(--text2)]">–</span>
              <input
                type="time"
                value={row.end}
                onChange={(event) => update(index, { end: event.target.value })}
                aria-label={t('hotline', 'shiftTo')}
                aria-invalid={rowInvalid}
                className={`rounded-lg border bg-transparent px-2 py-1.5 text-sm ${
                  rowInvalid ? 'border-red-500' : 'border-[var(--border)]'
                }`}
              />
              {row.timezone !== localZone ? (
                <span className="text-xs text-[var(--text2)]">{row.timezone}</span>
              ) : null}
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={t('hotline', 'removeShift')}
                className="rounded-lg p-1.5 text-[var(--text2)] hover:text-red-500"
              >
                <Trash2 size={15} />
              </button>
            </li>
          );
        })}
      </ul>

      {invalid ? <p className="mt-2 text-xs text-red-500">{t('hotline', 'shiftInvalid')}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--text2)]"
        >
          <Plus size={15} />
          {t('hotline', 'addShift')}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || invalid || saving}
          className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? t('hotline', 'savingShifts') : t('hotline', 'saveShifts')}
        </button>
      </div>
    </section>
  );
}
