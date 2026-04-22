'use client';

import { Ban } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n/context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  if (user.expertsRole !== 'EXPERT') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-10 text-center">
          <Ban size={40} strokeWidth={1.5} className="mx-auto mb-4 text-[var(--red)]" />
          <h2 className="text-lg font-semibold mb-2">{t('login', 'notExpert')}</h2>
          <p className="text-sm text-[var(--text2)] mb-6">
            {t('login', 'notExpertBody')}
          </p>
          <button
            onClick={() => { localStorage.clear(); window.location.href = '/'; }}
            className="px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold rounded-xl transition cursor-pointer"
          >
            {t('nav', 'signOut')}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
