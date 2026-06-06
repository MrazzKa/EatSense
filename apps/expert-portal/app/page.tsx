'use client';

import { useState, useEffect } from 'react';
import { Globe, Leaf, Mail } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n/context';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/lib/i18n/messages';
import { useRouter } from 'next/navigation';
import { ChangePasswordForm } from '@/components/change-password-form';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3001';

export default function LoginPage() {
  const { user, loading, login, refresh } = useAuth();
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'password' | 'magic'>('password');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [forceChange, setForceChange] = useState(false);

  useEffect(() => {
    if (!loading && user && user.expertsRole === 'EXPERT' && !forceChange) {
      router.replace('/dashboard');
    }
  }, [user, loading, router, forceChange]);

  useEffect(() => {
    const remembered = localStorage.getItem('expertPortal:lastEmail');
    if (remembered) setEmail(remembered);
  }, []);

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/auth/expert/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || t('login', 'invalidCredentials'));
      }
      if (!data.accessToken || !data.refreshToken) {
        throw new Error(t('auth', 'authFailed'));
      }
      // Persist tokens so the (JWT-guarded) change-password call can authenticate.
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('expertPortal:lastEmail', email.trim().toLowerCase());

      if (data.mustChangePassword) {
        setForceChange(true);
        setSubmitting(false);
        return;
      }
      await login(data.accessToken, data.refreshToken);
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.message || t('auth', 'somethingWrong'));
      setSubmitting(false);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/auth/expert/request-magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          redirectUrl: `${PORTAL_URL}/auth/callback`,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to send magic link');
      }

      localStorage.setItem('expertPortal:lastEmail', email.trim().toLowerCase());
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (forceChange) {
    return (
      <ChangePasswordForm
        onDone={async () => {
          await refresh();
          setForceChange(false);
          router.replace('/dashboard');
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 text-center sm:p-10">
        <Leaf size={32} className="mx-auto mb-2 text-[var(--primary)]" strokeWidth={2.25} />
        <h1 className="text-xl font-bold mb-1">{t('login', 'title')}</h1>
        <p className="text-sm text-[var(--text2)] mb-8">
          {mode === 'password' ? t('login', 'passwordSubtitle') : t('login', 'subtitle')}
        </p>

        {sent ? (
          <div>
            <Mail size={40} strokeWidth={1.5} className="mx-auto mb-4 text-[var(--primary)]" />
            <h2 className="text-lg font-semibold mb-2">{t('login', 'checkEmail')}</h2>
            <p className="text-sm text-[var(--text2)] mb-4">
              {t('login', 'sentTo')} <strong className="text-[var(--text)]">{email}</strong>.
            </p>
            <button
              onClick={() => { setSent(false); setEmail(''); }}
              className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] cursor-pointer"
            >
              {t('login', 'useDifferent')}
            </button>
          </div>
        ) : mode === 'password' ? (
          <form onSubmit={handlePasswordLogin}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('login', 'emailPlaceholder')}
              autoComplete="username"
              required
              className="w-full px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--text2)] outline-none focus:border-[var(--primary)] transition mb-3"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('login', 'passwordPlaceholder')}
              autoComplete="current-password"
              required
              className="w-full px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--text2)] outline-none focus:border-[var(--primary)] transition mb-4"
            />

            <div className="text-right -mt-1 mb-4">
              <button
                type="button"
                onClick={() => { setMode('magic'); setError(''); }}
                className="text-xs text-[var(--text2)] hover:text-[var(--primary)] cursor-pointer"
              >
                {t('login', 'forgotPassword')}
              </button>
            </div>

            {error && <p className="text-sm text-[var(--red)] mb-4">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !email || !password}
              className="w-full py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-white font-semibold rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting ? t('login', 'signingInBtn') : t('login', 'signInBtn')}
            </button>

            <button
              type="button"
              onClick={() => { setMode('magic'); setError(''); }}
              className="mt-4 text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] cursor-pointer"
            >
              {t('login', 'useMagicLink')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleMagicLink}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('login', 'emailPlaceholder')}
              required
              className="w-full px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--text2)] outline-none focus:border-[var(--primary)] transition mb-4"
            />

            {error && <p className="text-sm text-[var(--red)] mb-4">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !email}
              className="w-full py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-white font-semibold rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting ? t('login', 'sending') : t('login', 'send')}
            </button>

            <button
              type="button"
              onClick={() => { setMode('password'); setError(''); }}
              className="mt-4 text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] cursor-pointer"
            >
              {t('login', 'usePassword')}
            </button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-[var(--border)] flex items-center justify-center gap-2 text-xs text-[var(--text2)]">
          <Globe size={12} />
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            className="bg-transparent outline-none cursor-pointer"
            aria-label={t('common', 'language')}
          >
            {LOCALES.map((l) => (
              <option key={l} value={l}>
                {LOCALE_LABELS[l]}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
