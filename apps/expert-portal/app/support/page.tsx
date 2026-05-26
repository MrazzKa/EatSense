'use client';

import { Mail, MessageCircle, ExternalLink } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { useI18n } from '@/lib/i18n/context';

const SUPPORT_EMAIL = 'info@eatsense.ch';

export default function SupportPage() {
  const { t } = useI18n();
  const subject = encodeURIComponent(t('support', 'subject'));

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:p-6 lg:mx-0 lg:p-8">
        <h1 className="mb-5 text-2xl font-bold">
          {t('support', 'title')}
        </h1>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <div className="rounded-lg bg-[var(--primary)]/15 p-2 text-[var(--primary)]">
              <MessageCircle size={22} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {t('support', 'expertSupport')}
              </h2>
              <p className="mt-1 text-sm text-[var(--text2)]">
                {t('support', 'bodyFull')}
              </p>
            </div>
          </div>

          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${subject}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)] sm:w-auto"
          >
            <Mail size={17} />
            {SUPPORT_EMAIL}
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </AppShell>
  );
}
