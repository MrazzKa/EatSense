'use client';

import { useEffect, useState } from 'react';
import { Star, MessageSquareQuote, EyeOff } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { apiFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n/context';

interface ReviewClient {
  id: string;
  userProfile?: {
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
  } | null;
}

interface Review {
  id: string;
  rating: number;
  comment?: string | null;
  isVisible: boolean;
  createdAt: string;
  client?: ReviewClient | null;
}

function Stars({ rating }: { rating: number }) {
  const safe = Math.max(0, Math.min(rating, 5));
  return (
    <div className="inline-flex gap-0.5 text-[var(--yellow)]">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={14}
          fill={i < safe ? 'currentColor' : 'none'}
          strokeWidth={i < safe ? 1 : 1.5}
          className={i < safe ? '' : 'opacity-40'}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const { t } = useI18n();
  const clientName = (r: Review) => {
    const p = r.client?.userProfile;
    if (!p) return t('reviews', 'clientFallback');
    const name = [p.firstName, p.lastName].filter(Boolean).join(' ');
    return name || t('reviews', 'clientFallback');
  };
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<Review[]>('/experts/me/reviews');
        setReviews(data);
      } catch (err) {
        console.error('Failed to load reviews:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const visible = reviews.filter((r) => r.isVisible);
  const avg = visible.length > 0
    ? (visible.reduce((acc, r) => acc + r.rating, 0) / visible.length).toFixed(1)
    : '—';

  return (
    <AppShell>
      <div className="p-8 max-w-3xl">
        <h1 className="text-2xl font-bold mb-6">{t('reviews', 'title')}</h1>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-20 bg-[var(--surface)] border border-[var(--border)] rounded-2xl">
            <MessageSquareQuote size={40} strokeWidth={1.5} className="mx-auto mb-4 text-[var(--text2)]" />
            <p className="text-[var(--text2)] mb-1">{t('reviews', 'empty')}</p>
            <p className="text-sm text-[var(--text2)]">{t('reviews', 'emptyHint')}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                <div className="text-xs text-[var(--text2)] mb-1">{t('reviews', 'total')}</div>
                <div className="text-2xl font-bold">{reviews.length}</div>
              </div>
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                <div className="text-xs text-[var(--text2)] mb-1">{t('reviews', 'visible')}</div>
                <div className="text-2xl font-bold text-[var(--green)]">{visible.length}</div>
              </div>
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                <div className="text-xs text-[var(--text2)] mb-1">{t('reviews', 'avgRating')}</div>
                <div className="text-2xl font-bold text-[var(--yellow)]">{avg}</div>
              </div>
            </div>

            <div className="space-y-3">
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className={`bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 ${
                    r.isVisible ? '' : 'opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Stars rating={r.rating} />
                        <span className="text-xs text-[var(--text2)]">({r.rating}/5)</span>
                      </div>
                      <div className="text-sm font-medium">{clientName(r)}</div>
                      <div className="text-xs text-[var(--text2)]">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    {!r.isVisible && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[var(--surface2)] text-[var(--text2)]">
                        <EyeOff size={12} />
                        {t('common', 'hidden')}
                      </span>
                    )}
                  </div>
                  {r.comment ? (
                    <p className="text-sm text-[var(--text)] mt-2">{r.comment}</p>
                  ) : (
                    <p className="text-sm text-[var(--text2)] italic mt-2">{t('reviews', 'noComment')}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
