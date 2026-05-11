'use client';

import { Wallet, CreditCard, AlertCircle, ExternalLink } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { useI18n } from '@/lib/i18n/context';

/**
 * Earnings — placeholder shell while Stripe Connect is not yet wired.
 * Real numbers populate once STRIPE_ENABLED=true and Connect Express onboarding
 * is rolled out. Until then the page communicates the manual-payout state so
 * experts aren't left guessing how/when they get paid.
 */
export default function EarningsPage() {
  const { t } = useI18n();
  return (
    <AppShell>
      <div className="max-w-4xl">
        <h1 className="text-2xl font-semibold mb-2">{t('nav', 'earnings')}</h1>
        <p className="text-sm text-[var(--text2)] mb-6">
          Track your consultations, paid orders, and (soon) automatic payouts.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard label="This month" value="—" sublabel="Coming soon" icon={Wallet} />
          <StatCard label="Pending payout" value="—" sublabel="Coming soon" icon={CreditCard} />
          <StatCard label="Lifetime" value="—" sublabel="Coming soon" icon={Wallet} />
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-[var(--yellow)] mt-0.5 shrink-0" />
            <div>
              <h2 className="font-medium text-sm mb-1">Automatic payouts not yet enabled</h2>
              <p className="text-sm text-[var(--text2)] leading-relaxed">
                Until Stripe Connect onboarding is live, payouts for your completed consultations
                are processed manually by the EatSense team on a monthly basis. Your active
                conversations and the price of each completed order appear in the
                <a className="text-[var(--primary)] hover:underline mx-1" href="/chats">Chats</a>
                tab.
              </p>
              <p className="text-sm text-[var(--text2)] mt-2">
                Questions about your payout? Contact{' '}
                <a className="text-[var(--primary)] hover:underline" href="mailto:experts@eatsense.ch">
                  experts@eatsense.ch
                </a>
                .
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-dashed border-[var(--border)] p-5 text-sm text-[var(--text2)]">
          <div className="flex items-center gap-2 mb-1">
            <ExternalLink size={14} />
            <span className="font-medium text-[var(--text)]">Coming soon</span>
          </div>
          Stripe Connect onboarding · Payout history · Monthly statements · Tax forms
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
      <div className="flex items-center gap-2 text-xs text-[var(--text2)] mb-2">
        <Icon size={14} />
        <span>{label}</span>
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-[var(--text2)] mt-1">{sublabel}</div>
    </div>
  );
}
