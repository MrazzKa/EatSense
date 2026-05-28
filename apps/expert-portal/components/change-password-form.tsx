'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import { apiFetch } from '@/lib/api';

/**
 * Force-change-password screen. Shown on first login (mustChangePassword) and
 * reused by app-shell as a global guard. Requires an authenticated session
 * (accessToken in localStorage) — the change-password endpoint is JWT-guarded.
 */
export function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (pwd.length < 8) { setError(t('changePassword', 'tooShort')); return; }
    if (pwd !== confirm) { setError(t('changePassword', 'mismatch')); return; }
    setSubmitting(true);
    try {
      // currentPassword omitted — server allows it during a forced reset.
      await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ newPassword: pwd }),
      });
      onDone();
    } catch (err: any) {
      setError(err?.message || t('auth', 'somethingWrong'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-10">
        <Lock size={32} className="mx-auto mb-2 text-[var(--primary)]" strokeWidth={2.25} />
        <h1 className="text-xl font-bold mb-1 text-center">{t('changePassword', 'title')}</h1>
        <p className="text-sm text-[var(--text2)] mb-6 text-center">{t('changePassword', 'subtitle')}</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder={t('changePassword', 'newPassword')}
            autoComplete="new-password"
            required
            className="w-full px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--text2)] outline-none focus:border-[var(--primary)] transition mb-3"
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={t('changePassword', 'confirmPassword')}
            autoComplete="new-password"
            required
            className="w-full px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--text2)] outline-none focus:border-[var(--primary)] transition mb-4"
          />
          {error && <p className="text-sm text-[var(--red)] mb-4">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !pwd || !confirm}
            className="w-full py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-white font-semibold rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
          >
            {submitting ? t('changePassword', 'saving') : t('changePassword', 'submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
