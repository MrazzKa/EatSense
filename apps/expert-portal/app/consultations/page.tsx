'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { apiFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n/context';
import { Calendar as CalendarIcon, CalendarClock, Clock, Plus, Video, X } from 'lucide-react';

interface Consultation {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  initiatedBy: string;
  livekitRoom: string | null;
  conversationId: string | null;
  proposedStartAt?: string | null;
  proposedEndAt?: string | null;
  proposedBy?: string | null;
  client: { id: string; email: string; userProfile?: { firstName?: string; lastName?: string } };
}

interface ClientLink {
  id: string;
  client: { id: string; email: string; userProfile?: { firstName?: string; lastName?: string } };
  conversation: { id: string } | null;
}

function fmtName(c: Consultation): string {
  const p = c.client?.userProfile;
  if (p?.firstName || p?.lastName) return [p.firstName, p.lastName].filter(Boolean).join(' ');
  return c.client?.email || '—';
}

function fmtTime(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'text-blue-600 bg-blue-50',
  PENDING_RESCHEDULE: 'text-amber-700 bg-amber-50',
  IN_PROGRESS: 'text-green-700 bg-green-50',
  COMPLETED: 'text-gray-600 bg-gray-100',
  CANCELLED: 'text-gray-500 bg-gray-100 line-through',
  NO_SHOW: 'text-red-700 bg-red-50',
};

export default function ConsultationsPage() {
  const { locale } = useI18n();
  const [items, setItems] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  // "+ New consultation" modal
  const [createOpen, setCreateOpen] = useState(false);
  const [clients, setClients] = useState<ClientLink[]>([]);
  const [createClientId, setCreateClientId] = useState('');
  const [createStartAt, setCreateStartAt] = useState('');
  const [createDuration, setCreateDuration] = useState(60);
  const [creating, setCreating] = useState(false);

  // Reschedule propose modal
  const [reschedOpenFor, setReschedOpenFor] = useState<Consultation | null>(null);
  const [reschedStartAt, setReschedStartAt] = useState('');
  const [reschedSaving, setReschedSaving] = useState(false);

  function openCreate() {
    setCreateOpen(true);
    apiFetch('/experts/me/clients').then((data) => {
      if (Array.isArray(data)) setClients(data);
    }).catch(() => {});
  }

  async function submitCreate() {
    if (!createClientId || !createStartAt) {
      alert(locale === 'ru' ? 'Выберите клиента и время' : 'Pick a client and a time');
      return;
    }
    setCreating(true);
    try {
      const conv = clients.find((c) => c.client.id === createClientId)?.conversation;
      await apiFetch('/consultations', {
        method: 'POST',
        body: JSON.stringify({
          clientId: createClientId,
          conversationId: conv?.id,
          startAt: new Date(createStartAt).toISOString(),
          durationMinutes: createDuration,
        }),
      });
      setCreateOpen(false);
      setCreateClientId('');
      setCreateStartAt('');
      setCreateDuration(60);
      load();
    } catch (e) {
      alert((e as any)?.message || 'Failed');
    } finally {
      setCreating(false);
    }
  }

  function openReschedule(c: Consultation) {
    setReschedOpenFor(c);
    if (!c.startAt) {
      setReschedStartAt('');
      return;
    }
    const d = new Date(c.startAt);
    if (isNaN(d.getTime())) {
      setReschedStartAt('');
      return;
    }
    setReschedStartAt(d.toISOString().slice(0, 16));
  }

  async function submitReschedule() {
    if (!reschedOpenFor || !reschedStartAt) return;
    setReschedSaving(true);
    try {
      await apiFetch(`/consultations/${reschedOpenFor.id}/reschedule`, {
        method: 'PATCH',
        body: JSON.stringify({
          startAt: new Date(reschedStartAt).toISOString(),
          durationMinutes: reschedOpenFor.durationMinutes,
        }),
      });
      setReschedOpenFor(null);
      setReschedStartAt('');
      load();
    } catch (e) {
      alert((e as any)?.message || 'Failed');
    } finally {
      setReschedSaving(false);
    }
  }

  async function respondReschedule(c: Consultation, accept: boolean) {
    try {
      await apiFetch(`/consultations/${c.id}/reschedule/respond`, {
        method: 'POST',
        body: JSON.stringify({ accept }),
      });
      load();
    } catch (e) {
      alert((e as any)?.message || 'Failed');
    }
  }

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetch('/consultations/me?role=expert');
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const now = Date.now();
    return items.filter((c) => {
      const end = new Date(c.endAt).getTime();
      if (tab === 'upcoming') return end >= now && !['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(c.status);
      return end < now || ['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(c.status);
    });
  }, [items, tab]);

  async function cancel(id: string) {
    if (!confirm(locale === 'ru' ? 'Отменить консультацию?' : 'Cancel consultation?')) return;
    try {
      await apiFetch(`/consultations/${id}`, { method: 'DELETE', body: JSON.stringify({ reason: 'expert_cancelled' }) });
      load();
    } catch (e) {
      alert((e as any)?.message || 'Failed');
    }
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:p-6 lg:mx-0 lg:p-8">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon size={24} /> {locale === 'ru' ? 'Консультации' : 'Consultations'}
          </h1>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-medium text-white"
          >
            <Plus size={14} /> {locale === 'ru' ? 'Назначить' : 'New'}
          </button>
        </div>

        <div className="mb-4 flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5 w-fit">
          {(['upcoming', 'past'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${tab === t ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-secondary)]'}`}
            >
              {t === 'upcoming' ? (locale === 'ru' ? 'Предстоящие' : 'Upcoming') : locale === 'ru' ? 'Прошлые' : 'Past'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 rounded-full border-2 border-[var(--primary)] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--text-secondary)]">
            {locale === 'ru' ? 'Нет консультаций' : 'No consultations'}
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((c) => {
              const inWindow = Date.now() >= new Date(c.startAt).getTime() - 5 * 60000 && Date.now() < new Date(c.endAt).getTime() + 10 * 60000;
              return (
                <li key={c.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{fmtName(c)}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${STATUS_COLORS[c.status] || ''}`}>{c.status}</span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                        <span className="inline-flex items-center gap-1">
                          <CalendarIcon size={12} /> {fmtTime(c.startAt, locale)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={12} /> {c.durationMinutes} min
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {inWindow && ['SCHEDULED', 'IN_PROGRESS'].includes(c.status) && (
                        <Link href={`/call/${c.id}`} className="inline-flex items-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white">
                          <Video size={14} /> {locale === 'ru' ? 'Начать' : 'Start'}
                        </Link>
                      )}
                      {c.conversationId && (
                        <Link href={`/chats/${c.conversationId}`} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs">
                          {locale === 'ru' ? 'Чат' : 'Chat'}
                        </Link>
                      )}
                      {c.status === 'SCHEDULED' && (
                        <button onClick={() => openReschedule(c)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs" title={locale === 'ru' ? 'Перенести' : 'Reschedule'}>
                          <CalendarClock size={12} />
                        </button>
                      )}
                      {['SCHEDULED', 'PENDING_RESCHEDULE'].includes(c.status) && (
                        <button onClick={() => cancel(c.id)} className="rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs text-red-600" title="Cancel">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  {c.status === 'PENDING_RESCHEDULE' && c.proposedStartAt && (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2">
                      <div className="mb-1 text-xs text-amber-900">
                        {c.proposedBy === 'expert'
                          ? (locale === 'ru' ? 'Вы предложили перенос на:' : 'You proposed reschedule to:')
                          : (locale === 'ru' ? 'Клиент предложил перенос на:' : 'Client proposed reschedule to:')}
                        {' '}<strong>{fmtTime(c.proposedStartAt, locale)}</strong>
                      </div>
                      {c.proposedBy !== 'expert' && (
                        <div className="mt-1 flex gap-2">
                          <button onClick={() => respondReschedule(c, true)} className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white">
                            {locale === 'ru' ? 'Принять' : 'Accept'}
                          </button>
                          <button onClick={() => respondReschedule(c, false)} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs">
                            {locale === 'ru' ? 'Отклонить' : 'Decline'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* Create-consultation modal */}
        {createOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setCreateOpen(false)}>
            <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-5" onClick={(e) => e.stopPropagation()}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">{locale === 'ru' ? 'Назначить консультацию' : 'New consultation'}</h2>
                <button onClick={() => setCreateOpen(false)} className="text-[var(--text2)]"><X size={18} /></button>
              </div>
              <div className="space-y-3">
                <label className="block text-sm">
                  <span className="mb-1 block">{locale === 'ru' ? 'Клиент' : 'Client'}</span>
                  <select
                    value={createClientId}
                    onChange={(e) => setCreateClientId(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {clients.map((c) => {
                      const p = c.client.userProfile;
                      const name = p?.firstName || p?.lastName
                        ? [p.firstName, p.lastName].filter(Boolean).join(' ')
                        : c.client.email;
                      return <option key={c.id} value={c.client.id}>{name}</option>;
                    })}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block">{locale === 'ru' ? 'Когда' : 'When'}</span>
                  <input
                    type="datetime-local"
                    value={createStartAt}
                    onChange={(e) => setCreateStartAt(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block">{locale === 'ru' ? 'Длительность' : 'Duration'}</span>
                  <div className="flex gap-1.5">
                    {[30, 60, 90].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setCreateDuration(d)}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm ${createDuration === d ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'border-[var(--border)]'}`}
                      >
                        {d} min
                      </button>
                    ))}
                  </div>
                </label>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setCreateOpen(false)} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm">
                  {locale === 'ru' ? 'Отмена' : 'Cancel'}
                </button>
                <button onClick={submitCreate} disabled={creating} className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                  {creating ? '…' : locale === 'ru' ? 'Создать' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reschedule-propose modal */}
        {reschedOpenFor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setReschedOpenFor(null)}>
            <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-5" onClick={(e) => e.stopPropagation()}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">{locale === 'ru' ? 'Перенести консультацию' : 'Reschedule'}</h2>
                <button onClick={() => setReschedOpenFor(null)} className="text-[var(--text2)]"><X size={18} /></button>
              </div>
              <p className="mb-3 text-xs text-[var(--text2)]">
                {locale === 'ru'
                  ? 'Клиент получит запрос на новое время. Он сможет принять или отклонить.'
                  : 'The client will receive the new time as a proposal and can accept or decline.'}
              </p>
              <label className="block text-sm">
                <span className="mb-1 block">{locale === 'ru' ? 'Новое время' : 'New time'}</span>
                <input
                  type="datetime-local"
                  value={reschedStartAt}
                  onChange={(e) => setReschedStartAt(e.target.value)}
                  min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                />
              </label>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setReschedOpenFor(null)} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm">
                  {locale === 'ru' ? 'Отмена' : 'Cancel'}
                </button>
                <button onClick={submitReschedule} disabled={reschedSaving} className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                  {reschedSaving ? '…' : locale === 'ru' ? 'Отправить' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
