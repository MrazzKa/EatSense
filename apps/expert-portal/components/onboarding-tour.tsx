'use client';

import { useEffect, useState } from 'react';
import { Calendar, Key, MessageSquare, Package, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';

const STORAGE_KEY = 'expertPortalOnboardingV1';

interface Slide {
  icon: typeof Key;
  titleEn: string;
  titleRu: string;
  bodyEn: string;
  bodyRu: string;
}

const SLIDES: Slide[] = [
  {
    icon: Key,
    titleEn: 'Your access code',
    titleRu: 'Ваш код доступа',
    bodyEn: 'Share this code with clients — they enter it in the mobile app to start a consultation with you. You can copy or regenerate it in Profile.',
    bodyRu: 'Поделитесь этим кодом с клиентами — они вводят его в приложении, чтобы начать консультацию. Скопировать или сгенерировать заново можно в Профиле.',
  },
  {
    icon: Calendar,
    titleEn: 'Set your availability',
    titleRu: 'Задайте доступность',
    bodyEn: 'Open Availability and mark when you accept consultations. Clients only see free slots. Out-of-office mode pauses bookings.',
    bodyRu: 'В разделе «Доступность» отметьте время приёма. Клиенты видят только свободные слоты. Режим отпуска приостанавливает бронирование.',
  },
  {
    icon: Package,
    titleEn: 'Pricing & offers',
    titleRu: 'Цены и услуги',
    bodyEn: 'Add 30/60/90-min offers with prices in your local currency. Stripe Connect handles payouts automatically (set up in Earnings).',
    bodyRu: 'Создайте офферы 30/60/90 минут с ценами в вашей валюте. Stripe Connect автоматически проводит выплаты (подключите в разделе «Доходы»).',
  },
  {
    icon: MessageSquare,
    titleEn: 'Chat & client notes',
    titleRu: 'Чат и заметки',
    bodyEn: 'Each client conversation lives in Chats. Open a client card to see meals, lab results, and add private notes — visible only to you.',
    bodyRu: 'Каждый разговор живёт в «Чатах». На карточке клиента видны приёмы пищи и анализы, можно вести приватные заметки.',
  },
];

export function OnboardingTour() {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

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
  const slide = SLIDES[idx];
  const Icon = slide.icon;
  const isLast = idx === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-[var(--surface)] p-6 shadow-2xl">
        <button onClick={close} aria-label="Close" className="absolute right-3 top-3 text-[var(--text-secondary)] hover:text-[var(--text)]">
          <X size={20} />
        </button>
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
          <Icon size={28} />
        </div>
        <h2 className="mb-2 text-xl font-semibold">{locale === 'ru' ? slide.titleRu : slide.titleEn}</h2>
        <p className="mb-6 text-sm leading-relaxed text-[var(--text-secondary)]">
          {locale === 'ru' ? slide.bodyRu : slide.bodyEn}
        </p>
        <div className="mb-5 flex justify-center gap-1.5">
          {SLIDES.map((_, i) => (
            <span key={i} className={`h-1.5 w-1.5 rounded-full transition ${i === idx ? 'bg-[var(--primary)] w-6' : 'bg-[var(--border)]'}`} />
          ))}
        </div>
        <div className="flex justify-between gap-2">
          <button onClick={close} className="text-sm text-[var(--text-secondary)] hover:underline">
            {locale === 'ru' ? 'Пропустить' : 'Skip'}
          </button>
          <button
            onClick={() => (isLast ? close() : setIdx(idx + 1))}
            className="rounded-lg bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white"
          >
            {isLast ? (locale === 'ru' ? 'Готово' : 'Got it') : (locale === 'ru' ? 'Далее' : 'Next')}
          </button>
        </div>
      </div>
    </div>
  );
}
