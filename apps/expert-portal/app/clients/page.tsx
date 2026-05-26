'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Users, Utensils, MessageSquare, Calendar } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { apiFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n/context';

interface ClientLink {
  id: string;
  source: string | null;
  createdAt: string;
  client: {
    id: string;
    email: string;
    userProfile?: {
      firstName?: string;
      lastName?: string;
      avatarUrl?: string;
    };
  };
  lastMealAt: string | null;
  conversation: { id: string; lastMessageAt: string | null } | null;
}

function clientName(c: ClientLink): string {
  const p = c.client?.userProfile;
  if (p?.firstName || p?.lastName) {
    return [p.firstName, p.lastName].filter(Boolean).join(' ');
  }
  return c.client?.email || '—';
}

function initials(c: ClientLink): string {
  const name = clientName(c);
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('') || '?';
}

function relTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ClientsPage() {
  const { t } = useI18n();
  const [clients, setClients] = useState<ClientLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'code' | 'manual'>('all');

  useEffect(() => {
    let cancelled = false;
    apiFetch('/experts/me/clients')
      .then((data) => {
        if (!cancelled) setClients(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error('Failed to load clients:', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      if (filter !== 'all' && (c.source || '') !== filter) return false;
      if (!q) return true;
      const name = clientName(c).toLowerCase();
      const email = c.client?.email?.toLowerCase() || '';
      return name.includes(q) || email.includes(q);
    });
  }, [clients, query, filter]);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:p-6 lg:mx-0 lg:p-8">
        <div className="mb-5 flex items-center justify-between sm:mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users size={24} />
            {t('clients', 'title') || 'My clients'}
          </h1>
          <span className="text-sm text-[var(--text2)]">{clients.length}</span>
        </div>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text2)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('clients', 'searchPlaceholder') || 'Search by name or email'}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--primary)]"
            />
          </div>
          <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5">
            {(['all', 'code', 'manual'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  filter === f
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-[var(--text2)] hover:text-[var(--text)]'
                }`}
              >
                {t('clients', `filter_${f}`) || f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 rounded-full border-2 border-[var(--primary)] border-t-transparent" />
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--text2)]">
            {clients.length === 0
              ? t('clients', 'emptyState') || 'No clients yet. Share your access code to invite people.'
              : t('clients', 'noMatches') || 'No clients match your filters.'}
          </div>
        ) : (
          <ul className="space-y-2">
            {visible.map((c) => {
              const href = c.conversation?.id ? `/chats/${c.conversation.id}` : `/clients/${c.client.id}`;
              return (
                <li key={c.id}>
                  <Link
                    href={href}
                    className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 transition hover:border-[var(--primary)] hover:shadow-sm"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--primary-soft)] text-sm font-semibold text-[var(--primary)]">
                      {c.client.userProfile?.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.client.userProfile.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        initials(c)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-medium">{clientName(c)}</span>
                        {c.source === 'code' ? (
                          <span className="rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--primary)]">
                            code
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-[var(--text2)]">
                        <span className="inline-flex items-center gap-1">
                          <Utensils size={12} /> {relTime(c.lastMealAt)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare size={12} /> {relTime(c.conversation?.lastMessageAt || null)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={12} /> {relTime(c.createdAt)}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
