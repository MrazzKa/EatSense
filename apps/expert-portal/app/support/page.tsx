'use client';

import { Mail, MessageCircle, ExternalLink } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { useI18n } from '@/lib/i18n/context';

const SUPPORT_EMAIL = 'info@eatsense.ch';

export default function SupportPage() {
  const { locale } = useI18n();
  const subject = encodeURIComponent(locale === 'ru' ? 'Вопрос эксперта EatSense' : 'EatSense expert support');

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:p-6 lg:mx-0 lg:p-8">
        <h1 className="mb-5 text-2xl font-bold">
          {locale === 'ru' ? 'Связаться с EatSense' : 'Contact EatSense'}
        </h1>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <div className="rounded-lg bg-[var(--primary)]/15 p-2 text-[var(--primary)]">
              <MessageCircle size={22} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {locale === 'ru' ? 'Помощь для экспертов' : 'Expert support'}
              </h2>
              <p className="mt-1 text-sm text-[var(--text2)]">
                {locale === 'ru'
                  ? 'Напишите нам по вопросам расписания, клиентов, выплат, профиля или технических ошибок.'
                  : 'Email us about schedule, clients, payouts, profile changes, or technical issues.'}
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
