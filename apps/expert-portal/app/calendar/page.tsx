'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { apiFetch, apiBaseUrl } from '@/lib/api';
import { useI18n } from '@/lib/i18n/context';
import { useToast } from '@/components/toast';
import { Calendar as CalendarIcon, Clock, Copy, MessageSquare, Plane, Plus, Save, Trash2, Video } from 'lucide-react';
import Link from 'next/link';

interface Rule {
  id?: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
  isActive?: boolean;
}

interface Exception {
  id: string;
  date: string;
  kind: 'closed' | 'custom';
  startMinute?: number | null;
  endMinute?: number | null;
  reason?: string | null;
}

interface ScheduleConsultation {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  conversationId: string | null;
  client?: { email?: string; userProfile?: { firstName?: string; lastName?: string } };
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function fmt(min: number): string {
  const h = Math.floor(min / 60).toString().padStart(2, '0');
  const m = (min % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function parseTime(value: string): number {
  const [h, m] = value.split(':').map((n) => parseInt(n, 10) || 0);
  return h * 60 + m;
}

export default function CalendarPage() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const [rules, setRules] = useState<Rule[]>([]);
  const [timezone, setTimezone] = useState<string>('UTC');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [icalUrl, setIcalUrl] = useState<string>('');
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [newExDate, setNewExDate] = useState('');
  const [awayUntil, setAwayUntil] = useState<string>('');
  const [awayMessage, setAwayMessage] = useState<string>('');
  const [savingAway, setSavingAway] = useState(false);
  const [consultations, setConsultations] = useState<ScheduleConsultation[]>([]);
  const [consultationTab, setConsultationTab] = useState<'upcoming' | 'past'>('upcoming');
  const [view, setView] = useState<'availability' | 'meetings'>('availability');

  useEffect(() => {
    apiFetch('/experts/me/availability')
      .then((data) => {
        setRules(Array.isArray(data?.rules) ? data.rules : []);
        setExceptions(Array.isArray(data?.exceptions) ? data.exceptions : []);
        setTimezone(data?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
    apiFetch('/experts/me/profile')
      .then((data: any) => {
        if (data?.awayUntil) setAwayUntil(new Date(data.awayUntil).toISOString().slice(0, 10));
        if (data?.awayMessage) setAwayMessage(data.awayMessage);
      })
      .catch(() => {});
    apiFetch('/consultations/me/ical-token')
      .then((data) => {
        if (data?.token && typeof window !== 'undefined') {
          setIcalUrl(`${apiBaseUrl()}/consultations/me/ical.ics?token=${encodeURIComponent(data.token)}`);
        }
      })
      .catch(() => {});
    apiFetch('/consultations/me?role=expert')
      .then((data) => setConsultations(Array.isArray(data) ? data : []))
      .catch(() => setConsultations([]));
  }, []);

  function addRule(weekday: number) {
    setRules((rs) => [...rs, { weekday, startMinute: 9 * 60, endMinute: 18 * 60, isActive: true }]);
  }
  function updateRule(idx: number, patch: Partial<Rule>) {
    setRules((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function removeRule(idx: number) {
    setRules((rs) => rs.filter((_, i) => i !== idx));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await apiFetch('/experts/me/availability', {
        method: 'POST',
        body: JSON.stringify({ timezone, rules: rules.map((r) => ({ weekday: r.weekday, startMinute: r.startMinute, endMinute: r.endMinute, isActive: r.isActive !== false })) }),
      });
      setRules(Array.isArray(res?.rules) ? res.rules : []);
    } catch (e) {
      toast((e as any)?.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function addException() {
    if (!newExDate) return;
    try {
      const created = await apiFetch('/experts/me/availability/exceptions', {
        method: 'POST',
        body: JSON.stringify({ date: newExDate, kind: 'closed' }),
      });
      setExceptions((arr) => [...arr, created]);
      setNewExDate('');
    } catch (e) {
      toast((e as any)?.message || 'Failed', 'error');
    }
  }

  async function removeException(id: string) {
    try {
      await apiFetch(`/experts/me/availability/exceptions/${id}`, { method: 'DELETE' });
      setExceptions((arr) => arr.filter((e) => e.id !== id));
    } catch (e) {
      toast((e as any)?.message || 'Failed', 'error');
    }
  }

  async function saveVacation() {
    setSavingAway(true);
    try {
      await apiFetch('/experts/me/vacation', {
        method: 'POST',
        body: JSON.stringify({
          awayUntil: awayUntil ? new Date(awayUntil).toISOString() : null,
          awayMessage: awayMessage || null,
        }),
      });
    } catch (e) {
      toast((e as any)?.message || 'Failed', 'error');
    } finally {
      setSavingAway(false);
    }
  }

  const grouped = WEEKDAYS.map((_, day) => rules.filter((r) => r.weekday === day));
  const calendarCopy = {
    meetings: t('calendar', 'meetings'),
    availability: t('calendar', 'availability'),
    upcoming: t('calendar', 'upcoming'),
    history: t('calendar', 'history'),
    noMeetings: t('calendar', 'noMeetings'),
    manage: t('calendar', 'manage'),
    waiting: t('calendar', 'waiting'),
    start: t('calendar', 'start'),
    chat: t('calendar', 'chat'),
  };
  const visibleConsultations = consultations.filter((c) => {
    const end = new Date(c.endAt).getTime();
    const isFinal = ['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(c.status);
    if (consultationTab === 'upcoming') return end >= Date.now() && !isFinal;
    return end < Date.now() || isFinal;
  }).slice(0, 6);

  function consultationName(item: ScheduleConsultation) {
    const profile = item.client?.userProfile;
    const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');
    return name || item.client?.email || '—';
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:p-6 lg:mx-0 lg:p-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">{t('calendar', 'pageTitle')}</h1>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => setView('availability')}
                className={`rounded-full px-3 py-2 font-semibold transition ${view === 'availability' ? 'bg-[var(--primary)] text-white' : 'border border-[var(--border)] text-[var(--text2)]'}`}
              >
                {calendarCopy.availability}
              </button>
              <button
                type="button"
                onClick={() => setView('meetings')}
                className={`rounded-full px-3 py-2 font-semibold transition ${view === 'meetings' ? 'bg-[var(--primary)] text-white' : 'border border-[var(--border)] text-[var(--text2)]'}`}
              >
                {calendarCopy.meetings}
              </button>
              <Link href="/consultations" className="rounded-full border border-[var(--border)] px-3 py-2 font-semibold text-[var(--text2)]">
                {calendarCopy.manage}
              </Link>
            </div>
          </div>
          {view === 'availability' && (
          <button onClick={save} disabled={saving} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-white disabled:opacity-50">
            <Save size={16} /> {saving ? '…' : t('calendar', 'save')}
          </button>
          )}
        </div>

        {view === 'meetings' && (
        <section className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CalendarIcon size={16} />
              {calendarCopy.meetings}
            </div>
            <div className="flex w-fit gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-0.5">
              {(['upcoming', 'past'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setConsultationTab(tab)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition ${consultationTab === tab ? 'bg-[var(--primary)] text-white' : 'text-[var(--text2)]'}`}
                >
                  {tab === 'upcoming' ? calendarCopy.upcoming : calendarCopy.history}
                </button>
              ))}
            </div>
          </div>
          {visibleConsultations.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--border)] px-4 py-6 text-center text-xs text-[var(--text2)]">
              {calendarCopy.noMeetings}
            </div>
          ) : (
            <ul className="space-y-2">
              {visibleConsultations.map((item) => {
                const start = new Date(item.startAt);
                const end = new Date(item.endAt);
                const inWindow = Date.now() >= start.getTime() - 5 * 60000 && Date.now() < end.getTime() + 10 * 60000;
                return (
                  <li key={item.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{consultationName(item)}</div>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-[var(--text2)]">
                          <span>{start.toLocaleString(locale === 'ru' ? 'ru-RU' : undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="inline-flex items-center gap-1"><Clock size={12} /> {item.durationMinutes} min</span>
                          <span>{item.status}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {inWindow && ['SCHEDULED', 'IN_PROGRESS'].includes(item.status) && (
                          <Link href={`/call/${item.id}`} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-[var(--primary)] px-3 text-xs font-semibold text-white">
                            <Video size={14} /> {Date.now() < start.getTime() ? calendarCopy.waiting : calendarCopy.start}
                          </Link>
                        )}
                        {item.conversationId && (
                          <Link href={`/chats/${item.conversationId}`} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[var(--border)] px-3 text-xs font-semibold">
                            <MessageSquare size={14} /> {calendarCopy.chat}
                          </Link>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <Link href="/consultations" className="mt-3 inline-flex min-h-9 items-center rounded-lg border border-[var(--border)] px-3 text-xs font-semibold text-[var(--text2)] hover:text-[var(--text)]">
            {calendarCopy.manage}
          </Link>
        </section>
        )}

        {view === 'availability' && (
        <>
        {icalUrl && (
          <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <CalendarIcon size={16} /> {t('calendar', 'subscribeTitle')}
            </div>
            <p className="mb-2 text-xs text-[var(--text2)]">
              {t('calendar', 'subscribeHint')}
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={icalUrl}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono text-xs"
              />
              <button
                onClick={() => navigator.clipboard?.writeText(icalUrl).then(() => toast(t('calendar', 'copied'), 'success'))}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-xs hover:bg-[var(--bg)]"
              >
                <Copy size={12} /> {t('calendar', 'copy')}
              </button>
            </div>
          </div>
        )}

        {/* Vacation mode */}
        <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Plane size={16} /> {t('calendar', 'vacationTitle')}
          </div>
          <p className="mb-2 text-xs text-[var(--text2)]">
            {t('calendar', 'vacationHint')}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="text-xs">
              <span className="mb-1 block">{t('calendar', 'awayUntil')}</span>
              <input
                type="date"
                value={awayUntil}
                onChange={(e) => setAwayUntil(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
              />
            </label>
            <label className="flex-1 text-xs">
              <span className="mb-1 block">{t('calendar', 'vacationMessage')}</span>
              <input
                type="text"
                value={awayMessage}
                onChange={(e) => setAwayMessage(e.target.value)}
                placeholder={t('calendar', 'vacationPlaceholder')}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
              />
            </label>
            <button
              onClick={saveVacation}
              disabled={savingAway}
              className="self-end rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              {savingAway ? '…' : t('calendar', 'save')}
            </button>
            {awayUntil && (
              <button
                onClick={() => { setAwayUntil(''); setAwayMessage(''); saveVacation(); }}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs hover:bg-[var(--bg)]"
              >
                {t('calendar', 'clear')}
              </button>
            )}
          </div>
        </div>

        {/* Availability exceptions */}
        <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <CalendarIcon size={16} /> {t('calendar', 'exceptionsTitle')}
          </div>
          <p className="mb-2 text-xs text-[var(--text2)]">
            {t('calendar', 'exceptionsHint')}
          </p>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={newExDate}
              onChange={(e) => setNewExDate(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
            />
            <button
              onClick={addException}
              disabled={!newExDate}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs hover:bg-[var(--bg)] disabled:opacity-50"
            >
              <Plus size={12} /> {t('calendar', 'addClosedDay')}
            </button>
          </div>
          {exceptions.length === 0 ? (
            <div className="text-xs text-[var(--text2)]">
              {t('calendar', 'noExceptions')}
            </div>
          ) : (
            <ul className="space-y-1.5">
              {exceptions.map((ex) => (
                <li key={ex.id} className="flex items-center justify-between text-xs">
                  <span>
                    {new Date(ex.date).toLocaleDateString([], { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    <span className="ml-2 text-[var(--text2)]">
                      {ex.kind === 'closed' ? t('calendar', 'closed') : t('calendar', 'custom')}
                    </span>
                  </span>
                  <button
                    onClick={() => removeException(ex.id)}
                    className="text-[var(--text2)] hover:text-[var(--red)]"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">{t('calendar', 'timezone')}</span>
            <input
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="Europe/Zurich"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
            />
            <span className="mt-1 block text-xs text-[var(--text2)]">IANA timezone (e.g. Europe/Zurich, Asia/Almaty)</span>
          </label>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 rounded-full border-2 border-[var(--primary)] border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-3">
            {WEEKDAYS.map((label, day) => (
              <div key={day} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium">{label}</span>
                  <button onClick={() => addRule(day)} className="text-xs text-[var(--primary)] hover:underline">
                    + {t('calendar', 'addBlock')}
                  </button>
                </div>
                {grouped[day].length === 0 ? (
                  <div className="text-xs text-[var(--text2)]">{t('calendar', 'off')}</div>
                ) : (
                  <ul className="space-y-1.5">
                    {grouped[day].map((r) => {
                      const idx = rules.indexOf(r);
                      return (
                        <li key={idx} className="flex items-center gap-2">
                          <input
                            type="time"
                            value={fmt(r.startMinute)}
                            onChange={(e) => updateRule(idx, { startMinute: parseTime(e.target.value) })}
                            className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                            step={900}
                          />
                          <span className="text-[var(--text2)]">—</span>
                          <input
                            type="time"
                            value={fmt(r.endMinute)}
                            onChange={(e) => updateRule(idx, { endMinute: parseTime(e.target.value) })}
                            className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                            step={900}
                          />
                          <button onClick={() => removeRule(idx)} className="ml-auto text-[var(--text2)] hover:text-[var(--red)]" title="Remove">
                            <Trash2 size={16} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
        </>
        )}
      </div>
    </AppShell>
  );
}
