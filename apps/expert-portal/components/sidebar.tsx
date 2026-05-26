'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Calendar, Globe, Leaf, LogOut, MessageSquare, User, Users, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n/context';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/lib/i18n/messages';

type NavKey = 'dashboard' | 'chats' | 'clients' | 'calendar' | 'profile';

const NAV_ITEMS: { href: string; key: NavKey; icon: LucideIcon }[] = [
  { href: '/dashboard', key: 'dashboard', icon: BarChart3 },
  { href: '/chats', key: 'chats', icon: MessageSquare },
  { href: '/clients', key: 'clients', icon: Users },
  { href: '/calendar', key: 'calendar', icon: Calendar },
  { href: '/profile', key: 'profile', icon: User },
];

const MOBILE_PRIMARY_ITEMS = NAV_ITEMS.filter((item) =>
  ['dashboard', 'chats', 'clients', 'calendar', 'profile'].includes(item.key),
);

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t, locale, setLocale } = useI18n();

  const displayName = user?.expertProfile?.displayName
    || [user?.profile?.firstName, user?.profile?.lastName].filter(Boolean).join(' ')
    || user?.email
    || 'Expert';
  const mobileLabel = (key: NavKey) => {
    if (key === 'dashboard') return t('sidebarMobile', 'home');
    if (key === 'calendar') return t('sidebarMobile', 'schedule');
    return t('nav', key);
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/95 px-4 backdrop-blur md:hidden">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Leaf size={20} className="text-[var(--primary)]" strokeWidth={2.25} />
            <span className="truncate text-sm font-bold">EatSense Expert</span>
          </div>
          <div className="mt-0.5 truncate text-xs text-[var(--text2)]">{displayName}</div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2 text-xs text-[var(--text)] outline-none"
            aria-label={t('common', 'language')}
          >
            {LOCALES.map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
          <button
            onClick={logout}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text2)]"
            aria-label={t('nav', 'signOut')}
          >
            <LogOut size={17} />
          </button>
        </div>
      </header>

      <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] md:flex md:min-h-screen">
        <div className="p-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Leaf size={20} className="text-[var(--primary)]" strokeWidth={2.25} />
            <span className="font-bold text-sm">EatSense Expert</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href) || (item.href === '/calendar' && pathname.startsWith('/consultations'));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                  active
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-[var(--text2)] hover:bg-[var(--surface2)] hover:text-[var(--text)]'
                }`}
              >
                <Icon size={18} />
                <span>{mobileLabel(item.key)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[var(--border)] space-y-3">
          <div>
            <div className="text-sm font-medium truncate">{displayName}</div>
            <div className="text-xs text-[var(--text2)] truncate">{user?.email}</div>
          </div>

          <div className="flex items-center gap-2">
            <Globe size={14} className="text-[var(--text2)]" />
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              className="flex-1 text-xs bg-[var(--surface2)] border border-[var(--border)] rounded-md px-2 py-1 text-[var(--text)] outline-none cursor-pointer focus:border-[var(--primary)]"
              aria-label={t('common', 'language')}
            >
              {LOCALES.map((l) => (
                <option key={l} value={l}>
                  {LOCALE_LABELS[l]}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={logout}
            className="text-xs text-[var(--text2)] hover:text-[var(--red)] transition cursor-pointer"
          >
            {t('nav', 'signOut')}
          </button>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 gap-1 border-t border-[var(--border)] bg-[var(--surface)]/95 px-2 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 backdrop-blur md:hidden">
        {MOBILE_PRIMARY_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href) || (item.href === '/calendar' && pathname.startsWith('/consultations'));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-[44px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2.5 text-[10px] leading-tight transition ${
                active ? 'bg-[var(--primary)] text-white' : 'text-[var(--text2)]'
              }`}
            >
              <Icon size={19} />
              <span className="w-full truncate text-center">{mobileLabel(item.key)}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
