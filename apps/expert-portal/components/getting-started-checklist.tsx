'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n/context';

const STORAGE_KEY = 'expertGettingStartedV1';

/**
 * Persistent "Getting started" checklist on the expert dashboard. Complements
 * the one-time OnboardingTour modal with an actionable, progress-tracked nudge.
 * Auto-hides once all steps are done or the expert dismisses it.
 */
export function GettingStartedChecklist({
  profilePublished,
  clientCount,
}: {
  profilePublished: boolean;
  clientCount: number;
}) {
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(true); // hidden until storage is read
  const [hasOffer, setHasOffer] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDismissed(localStorage.getItem(STORAGE_KEY) === '1');
    }
    apiFetch('/experts/me/offers')
      .then((d: any) => {
        const list = Array.isArray(d) ? d : Array.isArray(d?.offers) ? d.offers : [];
        setHasOffer(list.length > 0);
      })
      .catch(() => setHasOffer(false));
  }, []);

  const steps = [
    { done: profilePublished, label: t('dashboard', 'gsStep1'), href: '/profile' },
    { done: !!hasOffer, label: t('dashboard', 'gsStep2'), href: '/offers' },
    { done: clientCount > 0, label: t('dashboard', 'gsStep3'), href: '/profile' },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  // Wait for the offers fetch before deciding, to avoid a flash of a wrong state.
  if (hasOffer === null || dismissed || allDone) return null;

  function dismiss() {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, '1');
    setDismissed(true);
  }

  return (
    <div className="fade-up mb-6 rounded-xl border border-[var(--primary-soft)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{t('dashboard', 'gsTitle')}</h3>
          <span className="rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-xs font-medium text-[var(--primary)]">
            {doneCount}/{steps.length}
          </span>
        </div>
        <button
          onClick={dismiss}
          aria-label={t('common', 'close')}
          className="text-[var(--text2)] transition hover:text-[var(--text)]"
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-1">
        {steps.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-[var(--surface2)]"
          >
            {s.done ? (
              <CheckCircle2 size={20} className="shrink-0 text-[var(--green)]" />
            ) : (
              <Circle size={20} className="shrink-0 text-[var(--text2)]" />
            )}
            <span className={`text-sm ${s.done ? 'text-[var(--text2)] line-through' : 'text-[var(--text)]'}`}>
              {s.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
