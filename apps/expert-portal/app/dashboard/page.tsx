'use client';

import { useEffect, useState } from 'react';
import { Calendar, MessageSquare, Users, Mail, Star, Video, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { OnboardingTour } from '@/components/onboarding-tour';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n/context';

interface ExpertProfile {
  id: string;
  displayName: string;
  isPublished: boolean;
  isVerified: boolean;
  isActive: boolean;
  rating: number;
  reviewCount: number;
  type: string;
  bio: string;
}

interface Stats {
  activeChats: number;
  totalClients: number;
  unreadMessages: number;
}

export default function DashboardPage() {
  useAuth();
  const { t } = useI18n();
  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [stats, setStats] = useState<Stats>({ activeChats: 0, totalClients: 0, unreadMessages: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [profileData, conversationsData] = await Promise.all([
          apiFetch('/experts/me/profile'),
          apiFetch('/conversations?role=expert'),
        ]);

        setProfile(profileData);

        const conversations = conversationsData?.asExpert || conversationsData || [];
        const active = conversations.filter((c: any) => c.status === 'active');
        const unread = conversations.reduce((sum: number, c: any) => sum + (c._count?.messages || 0), 0);

        setStats({
          activeChats: active.length,
          totalClients: conversations.length,
          unreadMessages: unread,
        });
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function getStatusBadge() {
    if (!profile) return null;

    if (profile.isPublished && profile.isVerified) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-[#22c55e22] text-[var(--green)]">
          <span className="w-2 h-2 rounded-full bg-[var(--green)]" />
          {t('dashboard', 'statusPublished')}
        </span>
      );
    }

    if (!profile.isActive) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-[#ef444422] text-[var(--red)]">
          <span className="w-2 h-2 rounded-full bg-[var(--red)]" />
          {t('dashboard', 'statusRejected')}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-[#f59e0b22] text-[var(--yellow)]">
        <span className="w-2 h-2 rounded-full bg-[var(--yellow)]" />
        {t('dashboard', 'statusPending')}
      </span>
    );
  }

  function getProfileTypeLabel(type?: string | null) {
    const key = String(type || '').toLowerCase();
    if (key === 'nutritionist' || key === 'dietitian') {
      return t('profile', key);
    }
    return type || '';
  }

  return (
    <AppShell>
      <OnboardingTour />
      <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:p-6 lg:mx-0 lg:p-8">
        <h1 className="mb-5 text-2xl font-bold sm:mb-6">{t('dashboard', 'title')}</h1>

        <NextConsultationWidget />


        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Profile status */}
            <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">{profile?.displayName || t('dashboard', 'yourProfile')}</h2>
                  <p className="text-sm text-[var(--text2)]">{getProfileTypeLabel(profile?.type)}</p>
                </div>
                {getStatusBadge()}
              </div>

              {profile && !profile.isPublished && !profile.isActive && (
                <div className="bg-[#ef444411] border border-[#ef444433] rounded-lg p-4 text-sm">
                  <strong className="text-[var(--red)]">{t('dashboard', 'rejectedTitle')}</strong>{' '}
                  <span className="text-[var(--text2)]">
                    {t('dashboard', 'rejectedBody')}
                  </span>
                </div>
              )}

              {profile && !profile.isPublished && profile.isActive && (
                <div className="bg-[#f59e0b11] border border-[#f59e0b33] rounded-lg p-4 text-sm">
                  <strong className="text-[var(--yellow)]">{t('dashboard', 'underReviewTitle')}</strong>{' '}
                  <span className="text-[var(--text2)]">
                    {t('dashboard', 'underReviewBody')}
                  </span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard icon={MessageSquare} label={t('dashboard', 'activeChats')} value={stats.activeChats} />
              <StatCard icon={Users} label={t('dashboard', 'totalClients')} value={stats.totalClients} />
              <StatCard icon={Mail} label={t('dashboard', 'newMessages')} value={stats.unreadMessages} highlight={stats.unreadMessages > 0} />
              <StatCard icon={Star} label={t('dashboard', 'avgRating')} value={profile?.rating ? `${profile.rating.toFixed(1)} (${profile.reviewCount})` : '—'} />
            </div>

            {/* Quick actions */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
              <h3 className="text-sm font-semibold text-[var(--text2)] uppercase tracking-wider mb-4">{t('dashboard', 'quickActions')}</h3>
              <div className="grid gap-3 sm:flex sm:flex-wrap">
                <a href="/chats" className="rounded-lg bg-[var(--primary)] px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-[var(--primary-hover)] sm:py-2">
                  {t('dashboard', 'viewChats')}
                </a>
                <a href="/profile" className="rounded-lg bg-[var(--surface2)] px-4 py-3 text-center text-sm font-medium transition hover:bg-[var(--border)] sm:py-2">
                  {t('dashboard', 'editProfile')}
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function StatCard({ icon: Icon, label, value, highlight }: { icon: LucideIcon; label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex items-center gap-3 mb-2">
        <Icon size={20} className="text-[var(--text2)]" />
        <span className="text-sm text-[var(--text2)]">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${highlight ? 'text-[var(--primary)]' : ''}`}>
        {value}
      </div>
    </div>
  );
}

function NextConsultationWidget() {
  const { locale } = useI18n();
  const [next, setNext] = useState<any | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      apiFetch('/consultations/me?role=expert&status=SCHEDULED').then((data: any[]) => {
        if (cancelled || !Array.isArray(data)) return;
        const now = Date.now();
        const upcoming = data
          .filter((c) => new Date(c.endAt).getTime() > now)
          .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0];
        setNext(upcoming || null);
      }).catch(() => {});
    };
    load();
    const refresh = setInterval(load, 60000);
    const ticker = setInterval(() => setTick((x) => x + 1), 30000);
    return () => { cancelled = true; clearInterval(refresh); clearInterval(ticker); };
  }, []);

  if (!next) return null;
  const start = new Date(next.startAt);
  const end = new Date(next.endAt);
  const now = Date.now();
  const diffMs = start.getTime() - now;
  const inWindow = now >= start.getTime() - 5 * 60000 && now < end.getTime() + 10 * 60000;
  const clientName = [next.client?.userProfile?.firstName, next.client?.userProfile?.lastName].filter(Boolean).join(' ')
    || next.client?.email || 'client';

  let when: string;
  if (inWindow) {
    when = locale === 'ru' ? 'Идёт сейчас' : 'Live now';
  } else if (diffMs < 0) {
    when = locale === 'ru' ? 'Должна была начаться' : 'Should have started';
  } else if (diffMs < 60 * 60000) {
    when = `${Math.round(diffMs / 60000)} ${locale === 'ru' ? 'мин' : 'min'}`;
  } else if (diffMs < 24 * 60 * 60000) {
    const h = Math.floor(diffMs / 3600000);
    const m = Math.round((diffMs % 3600000) / 60000);
    when = `${h}${locale === 'ru' ? 'ч' : 'h'} ${m}${locale === 'ru' ? 'м' : 'm'}`;
  } else {
    when = start.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
  }

  // tick used to force re-render every 30s so countdown stays fresh
  void tick;

  return (
    <div className="mb-6 rounded-xl border border-[var(--primary-soft)] bg-[var(--primary-soft)]/30 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-[var(--primary)] p-2.5 text-white">
            <Calendar size={20} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-[var(--text2)]">
              {locale === 'ru' ? 'Ближайшая консультация' : 'Next consultation'}
            </div>
            <div className="font-medium">
              {clientName} · <span className="text-[var(--primary)]">{when}</span>
            </div>
            <div className="text-xs text-[var(--text2)]">
              {start.toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              {' · '}{next.durationMinutes} min
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {inWindow ? (
            <Link href={`/call/${next.id}`} className="inline-flex items-center gap-1 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white">
              <Video size={14} /> {locale === 'ru' ? 'Начать' : 'Start'}
            </Link>
          ) : null}
          <Link href="/consultations" className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm">
            {locale === 'ru' ? 'Все' : 'View all'}
          </Link>
        </div>
      </div>
    </div>
  );
}
