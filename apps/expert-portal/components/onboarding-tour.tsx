'use client';

import { useEffect, useState } from 'react';
import { Calendar, Key, MessageSquare, Package, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';

const STORAGE_KEY = 'expertPortalOnboardingV1';

const SLIDE_ICONS = [Key, Calendar, Package, MessageSquare] as const;

export function OnboardingTour() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  const slides = [
    { titleKey: 'slide1Title', bodyKey: 'slide1Body' },
    { titleKey: 'slide2Title', bodyKey: 'slide2Body' },
    { titleKey: 'slide3Title', bodyKey: 'slide3Body' },
    { titleKey: 'slide4Title', bodyKey: 'slide4Body' },
  ] as const;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) setOpen(true);
  }, []);

  function close() {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
  }

  if (!open) return null;
  const Icon = SLIDE_ICONS[idx];
  const slide = slides[idx];
  const isLast = idx === slides.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="fade-up relative w-full max-w-md rounded-2xl bg-[var(--surface)] p-6 shadow-2xl">
        <button onClick={close} aria-label={t('onboardingTour', 'closeAria')} className="absolute right-3 top-3 text-[var(--text2)] hover:text-[var(--text)]">
          <X size={20} />
        </button>
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
          <Icon size={28} />
        </div>
        <h2 className="mb-2 text-xl font-semibold">{t('onboardingTour', slide.titleKey)}</h2>
        <p className="mb-6 text-sm leading-relaxed text-[var(--text2)]">
          {t('onboardingTour', slide.bodyKey)}
        </p>
        <div className="mb-5 flex justify-center gap-1.5">
          {slides.map((_, i) => (
            <span key={i} className={`h-1.5 w-1.5 rounded-full transition ${i === idx ? 'bg-[var(--primary)] w-6' : 'bg-[var(--border)]'}`} />
          ))}
        </div>
        <div className="flex justify-between gap-2">
          <button onClick={close} className="text-sm text-[var(--text2)] hover:underline">
            {t('onboardingTour', 'skip')}
          </button>
          <button
            onClick={() => (isLast ? close() : setIdx(idx + 1))}
            className="rounded-lg bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white"
          >
            {isLast ? t('onboardingTour', 'done') : t('onboardingTour', 'next')}
          </button>
        </div>
      </div>
    </div>
  );
}
