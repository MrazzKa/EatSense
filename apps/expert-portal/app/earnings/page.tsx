'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, CreditCard, ExternalLink, Wallet } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { apiFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n/context';

interface ConnectStatus {
  stripeConnectAccountId: string | null;
  stripeConnectPayoutsEnabled: boolean;
  stripeConnectChargesEnabled: boolean;
  stripeConnectDetailsSubmitted: boolean;
  stripeEnabled?: boolean;
  platformFeePercent?: number;
}

export default function EarningsPage() {
  const { t, locale } = useI18n();
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    apiFetch('/payments/connect/status')
      .then((s) => setStatus(s))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  async function startOnboarding() {
    setRedirecting(true);
    try {
      const res = await apiFetch('/payments/connect/onboarding-link', { method: 'POST' });
      if (res?.url) window.location.href = res.url;
    } catch (e) {
      alert((e as any)?.message || 'Failed to create onboarding link');
      setRedirecting(false);
    }
  }

  const ready = status?.stripeConnectPayoutsEnabled && status?.stripeConnectChargesEnabled;
  const pending = status?.stripeConnectAccountId && !ready;
  const stripeDisabled = status?.stripeEnabled === false;
  const feePercent = typeof status?.platformFeePercent === 'number' ? status.platformFeePercent : 15;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl px-4 py-5 sm:p-6 lg:mx-0 lg:p-8">
        <h1 className="mb-2 text-2xl font-semibold">{t('nav', 'earnings')}</h1>
        <p className="mb-6 text-sm text-[var(--text2)]">
          {locale === 'ru' ? 'Подключите Stripe Connect для автоматических выплат за консультации.' : 'Connect Stripe to receive automatic payouts for consultations.'}
        </p>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard label={locale === 'ru' ? 'Этот месяц' : 'This month'} value="—" sublabel={locale === 'ru' ? 'Скоро' : 'Coming soon'} icon={Wallet} />
          <StatCard label={locale === 'ru' ? 'Ожидает выплаты' : 'Pending payout'} value="—" sublabel={locale === 'ru' ? 'Скоро' : 'Coming soon'} icon={CreditCard} />
          <StatCard label={locale === 'ru' ? 'За всё время' : 'Lifetime'} value="—" sublabel={locale === 'ru' ? 'Скоро' : 'Coming soon'} icon={Wallet} />
        </div>

        {stripeDisabled && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {locale === 'ru'
              ? 'Платежи временно отключены администратором. Связка со Stripe станет доступна после включения.'
              : 'Payments are temporarily disabled by the admin. Stripe linking will be available once enabled.'}
          </div>
        )}
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin h-8 w-8 rounded-full border-2 border-[var(--primary)] border-t-transparent" />
          </div>
        ) : ready ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-green-600" />
              <div>
                <h2 className="mb-1 text-sm font-medium">{locale === 'ru' ? 'Stripe Connect подключён' : 'Stripe Connect connected'}</h2>
                <p className="text-sm text-[var(--text2)]">
                  {locale === 'ru' ? 'Платежи приходят на ваш счёт автоматически после завершения консультаций.' : 'Payouts will appear in your account after consultations complete.'}
                </p>
                <button onClick={startOnboarding} className="mt-3 text-sm text-[var(--primary)] hover:underline">
                  {locale === 'ru' ? 'Обновить данные на Stripe' : 'Update on Stripe'}
                </button>
              </div>
            </div>
          </div>
        ) : pending ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="mt-0.5 shrink-0 text-amber-600" />
              <div>
                <h2 className="mb-1 text-sm font-medium">{locale === 'ru' ? 'Завершите настройку Stripe' : 'Finish Stripe setup'}</h2>
                <p className="text-sm text-[var(--text2)]">
                  {locale === 'ru' ? 'Подтвердите ваши данные в Stripe чтобы начать получать выплаты.' : 'Submit your details on Stripe to enable payouts.'}
                </p>
                <button onClick={startOnboarding} disabled={redirecting} className="mt-3 inline-flex items-center gap-1 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                  {redirecting ? '…' : locale === 'ru' ? 'Продолжить на Stripe' : 'Continue on Stripe'}
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-start gap-3">
              <CreditCard size={20} className="mt-0.5 shrink-0 text-[var(--primary)]" />
              <div>
                <h2 className="mb-1 text-sm font-medium">
                  {locale === 'ru' ? 'Подключите Stripe для приёма выплат' : 'Connect Stripe to receive payouts'}
                </h2>
                <p className="text-sm leading-relaxed text-[var(--text2)]">
                  {locale === 'ru'
                    ? `EatSense использует Stripe Connect Express. Onboarding занимает 5-10 минут. Платформа удерживает ${feePercent}% комиссию.`
                    : `EatSense uses Stripe Connect Express. Onboarding takes 5–10 minutes. The platform fee is ${feePercent}%.`}
                </p>
                <button onClick={startOnboarding} disabled={redirecting} className="mt-3 inline-flex items-center gap-1 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                  {redirecting ? '…' : locale === 'ru' ? 'Подключить Stripe' : 'Connect Stripe'}
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function StatCard({ label, value, sublabel, icon: Icon }: { label: string; value: string; sublabel: string; icon: typeof Wallet }) {
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
