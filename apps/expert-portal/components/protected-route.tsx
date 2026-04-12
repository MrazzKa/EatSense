'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

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
          <div className="text-4xl mb-4">🚫</div>
          <h2 className="text-lg font-semibold mb-2">Not an expert</h2>
          <p className="text-sm text-[var(--text2)] mb-6">
            This portal is for registered experts only. Register as an expert in the EatSense app first.
          </p>
          <button
            onClick={() => { localStorage.clear(); window.location.href = '/'; }}
            className="px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold rounded-xl transition cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
