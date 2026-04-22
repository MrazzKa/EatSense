'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n/context';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useI18n();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError(t('auth', 'noToken'));
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/magic-link?token=${token}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || t('auth', 'linkExpired'));
        }

        const data = await res.json();

        if (!data.accessToken || !data.refreshToken) {
          throw new Error(t('auth', 'authFailed'));
        }

        login(data.accessToken, data.refreshToken);
        router.replace('/dashboard');
      } catch (err: any) {
        setError(err.message || t('auth', 'somethingWrong'));
      }
    })();
  }, [searchParams, login, router, t]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-10 text-center">
          <div className="text-4xl mb-4">:(</div>
          <h2 className="text-lg font-semibold mb-2">{t('auth', 'signInFailed')}</h2>
          <p className="text-sm text-[var(--text2)] mb-6">{error}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold rounded-xl transition"
          >
            {t('auth', 'tryAgain')}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-[var(--text2)]">{t('auth', 'signingIn')}</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
