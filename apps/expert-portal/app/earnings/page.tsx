'use client';

import { AlertCircle, CreditCard, ExternalLink, Wallet } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { useI18n } from '@/lib/i18n/context';

export default function EarningsPage() {
  const { t, locale } = useI18n();
  const copy = locale === 'ru'
    ? {
        subtitle: 'Выплаты и история заказов появятся после подключения Stripe Connect.',
        month: 'Этот месяц',
        pending: 'Ожидает выплаты',
        lifetime: 'За все время',
        soon: 'Скоро',
        title: 'Выплаты пока не подключены',
        body: 'Пока Stripe Connect не подключен, автоматические выплаты недоступны. Активные консультации и стоимость заказов отображаются во вкладке',
        questions: 'Вопросы по выплатам:',
        more: 'Stripe Connect · История выплат · Ежемесячные отчеты · Налоговые документы',
      }
    : {
        subtitle: 'Payouts and order history will appear after Stripe Connect is connected.',
        month: 'This month',
        pending: 'Pending payout',
        lifetime: 'Lifetime',
        soon: 'Coming soon',
        title: 'Payouts are not connected yet',
        body: 'Until Stripe Connect is connected, automatic payouts are unavailable. Active consultations and order prices appear in the',
        questions: 'Questions about payouts:',
        more: 'Stripe Connect · Payout history · Monthly statements · Tax forms',
      };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl px-4 py-5 sm:p-6 lg:mx-0 lg:p-8">
        <h1 className="mb-2 text-2xl font-semibold">{t('nav', 'earnings')}</h1>
        <p className="mb-6 text-sm text-[var(--text2)]">{copy.subtitle}</p>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard label={copy.month} value="-" sublabel={copy.soon} icon={Wallet} />
          <StatCard label={copy.pending} value="-" sublabel={copy.soon} icon={CreditCard} />
          <StatCard label={copy.lifetime} value="-" sublabel={copy.soon} icon={Wallet} />
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-[var(--yellow)]" />
            <div>
              <h2 className="mb-1 text-sm font-medium">{copy.title}</h2>
              <p className="text-sm leading-relaxed text-[var(--text2)]">
                {copy.body}
                <a className="mx-1 text-[var(--primary)] hover:underline" href="/chats">Chats</a>
                tab.
              </p>
              <p className="mt-2 text-sm text-[var(--text2)]">
                {copy.questions}{' '}
                <a className="text-[var(--primary)] hover:underline" href="mailto:experts@eatsense.ch">
                  experts@eatsense.ch
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-dashed border-[var(--border)] p-5 text-sm text-[var(--text2)]">
          <div className="mb-1 flex items-center gap-2">
            <ExternalLink size={14} />
            <span className="font-medium text-[var(--text)]">{copy.soon}</span>
          </div>
          {copy.more}
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
}: {
  label: string;
  value: string;
  sublabel: string;
  icon: typeof Wallet;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-2 flex items-center gap-2 text-xs text-[var(--text2)]">
        <Icon size={14} />
        <span>{label}</span>
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-[var(--text2)]">{sublabel}</div>
    </div>
  );
}
