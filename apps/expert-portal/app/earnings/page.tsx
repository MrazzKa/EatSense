'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, CreditCard, ExternalLink, Wallet } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { apiFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n/context';
import { useToast } from '@/components/toast';

interface ConnectStatus {
  stripeConnectAccountId: string | null;
  stripeConnectPayoutsEnabled: boolean;
  stripeConnectChargesEnabled: boolean;
  stripeConnectDetailsSubmitted: boolean;
  stripeEnabled?: boolean;
  platformFeePercent?: number;
}

export default function EarningsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
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
      toast((e as any)?.message || 'Failed to create onboarding link', 'error');
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
          {t('earnings', 'bannerCta')}
        </p>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard label={t('earnings', 'thisMonth')} value="—" sublabel={t('earnings', 'comingSoon')} icon={Wallet} />
          <StatCard label={t('earnings', 'pendingPayout')} value="—" sublabel={t('earnings', 'comingSoon')} icon={CreditCard} />
          <StatCard label={t('earnings', 'lifetime')} value="—" sublabel={t('earnings', 'comingSoon')} icon={Wallet} />
        </div>

        {stripeDisabled && (
          <div className="mb-4 rounded-xl border border-[var(--yellow-soft)] bg-[var(--yellow-soft)] p-4 text-sm text-[var(--yellow)]">
            {t('earnings', 'paymentsDisabled')}
          </div>
        )}
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin h-8 w-8 rounded-full border-2 border-[var(--primary)] border-t-transparent" />
          </div>
        ) : ready ? (
          <div className="rounded-xl border border-[var(--green-soft)] bg-[var(--green-soft)] p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-[var(--green)]" />
              <div>
                <h2 className="mb-1 text-sm font-medium">{t('earnings', 'stripeConnected')}</h2>
                <p className="text-sm text-[var(--text2)]">
                  {t('earnings', 'payoutsAuto')}
                </p>
                <button onClick={startOnboarding} className="mt-3 text-sm text-[var(--primary)] hover:underline">
                  {t('earnings', 'updateStripe')}
                </button>
              </div>
            </div>
          </div>
        ) : pending ? (
          <div className="rounded-xl border border-[var(--yellow-soft)] bg-[var(--yellow-soft)] p-5">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="mt-0.5 shrink-0 text-[var(--yellow)]" />
              <div>
                <h2 className="mb-1 text-sm font-medium">{t('earnings', 'finishSetup')}</h2>
                <p className="text-sm text-[var(--text2)]">
                  {t('earnings', 'finishSetupBody')}
                </p>
                <button onClick={startOnboarding} disabled={redirecting} className="mt-3 inline-flex items-center gap-1 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                  {redirecting ? '…' : t('earnings', 'continueStripe')}
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
                  {t('earnings', 'connectStripeTitle')}
                </h2>
                <p className="text-sm leading-relaxed text-[var(--text2)]">
                  {`${t('earnings', 'stripeFeeBefore')} ${feePercent}%.`}
                </p>
                <button onClick={startOnboarding} disabled={redirecting} className="mt-3 inline-flex items-center gap-1 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                  {redirecting ? '…' : t('earnings', 'connectStripeBtn')}
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
