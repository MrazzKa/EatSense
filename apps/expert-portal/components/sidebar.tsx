'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/chats', label: 'Chats', icon: '💬' },
  { href: '/profile', label: 'My Profile', icon: '👤' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const displayName = user?.expertProfile?.displayName
    || [user?.profile?.firstName, user?.profile?.lastName].filter(Boolean).join(' ')
    || user?.email
    || 'Expert';

  return (
    <aside className="w-60 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col min-h-screen shrink-0">
      <div className="p-5 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <span className="text-xl">🍏</span>
          <span className="font-bold text-sm">EatSense Expert</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
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
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[var(--border)]">
        <div className="text-sm font-medium truncate mb-1">{displayName}</div>
        <div className="text-xs text-[var(--text2)] truncate mb-3">{user?.email}</div>
        <button
          onClick={logout}
          className="text-xs text-[var(--text2)] hover:text-[var(--red)] transition cursor-pointer"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
