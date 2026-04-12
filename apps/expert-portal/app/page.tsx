'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/v1';
const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3001';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (user.expertsRole === 'EXPERT') {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/auth/request-magic-link`, {
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

      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
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
      <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-10 text-center">
        <div className="text-3xl mb-2">🍏</div>
        <h1 className="text-xl font-bold mb-1">EatSense Expert Portal</h1>
        <p className="text-sm text-[var(--text2)] mb-8">Sign in to manage your expert profile</p>

        {sent ? (
          <div>
            <div className="text-4xl mb-4">📧</div>
            <h2 className="text-lg font-semibold mb-2">Check your email</h2>
            <p className="text-sm text-[var(--text2)] mb-4">
              We sent a magic link to <strong className="text-[var(--text)]">{email}</strong>. Click the link to sign in.
            </p>
            <button
              onClick={() => { setSent(false); setEmail(''); }}
              className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] cursor-pointer"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--text2)] outline-none focus:border-[var(--primary)] transition mb-4"
            />

            {error && (
              <p className="text-sm text-[var(--red)] mb-4">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || !email}
              className="w-full py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-white font-semibold rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting ? 'Sending...' : 'Send Magic Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
