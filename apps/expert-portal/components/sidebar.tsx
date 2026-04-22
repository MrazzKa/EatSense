'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Globe, Leaf, MessageSquare, Package, Star, User, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n/context';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/lib/i18n/messages';

type NavKey = 'dashboard' | 'chats' | 'offers' | 'reviews' | 'profile';

const NAV_ITEMS: { href: string; key: NavKey; icon: LucideIcon }[] = [
  { href: '/dashboard', key: 'dashboard', icon: BarChart3 },
  { href: '/chats', key: 'chats', icon: MessageSquare },
  { href: '/offers', key: 'offers', icon: Package },
  { href: '/reviews', key: 'reviews', icon: Star },
  { href: '/profile', key: 'profile', icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t, locale, setLocale } = useI18n();

  const displayName = user?.expertProfile?.displayName
    || [user?.profile?.firstName, user?.profile?.lastName].filter(Boolean).join(' ')
    || user?.email
    || 'Expert';

  return (
    <aside className="w-60 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col min-h-screen shrink-0">
      <div className="p-5 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Leaf size={20} className="text-[var(--primary)]" strokeWidth={2.25} />
          <span className="font-bold text-sm">EatSense Expert</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
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
              <span>{t('nav', item.key)}</span>
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
  );
}
