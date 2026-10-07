'use client';

import { useCallback, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n/context';
import { formatDateTime } from '@/lib/i18n/format';
import type { Locale } from '@/lib/i18n/messages';
import { SEVERITY_COLORS, answerLabels, severityBand, severityLabel, zoneLabel } from '@/lib/bodymap';

interface CaseEntry {
  zoneId: string;
  severity: number;
  answers: Record<string, string> | null;
}

interface CaseReport {
  reportedAt: string;
  note: string | null;
  entries: CaseEntry[];
}

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; report: CaseReport | null }
  | { kind: 'failed' };

/**
 * The body-map record attached to a hotline request, loaded on demand.
 *
 * Fetched only when opened: most requests are taken on the reason alone, and a
 * queue poll every few seconds should not drag every attached record with it.
 * The record is shown as the person entered it — places, how strong, their own
 * answers — with no reading of what it might mean.
 */
export function CaseCard({ requestId }: { requestId: string }) {
  const { t, locale } = useI18n();
  const lang = locale as Locale;
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<LoadState>({ kind: 'idle' });

  const toggle = useCallback(async () => {
    const next = !open;
    setOpen(next);
    if (!next || state.kind === 'ready' || state.kind === 'loading') return;

    setState({ kind: 'loading' });
    try {
      const data = await apiFetch<{ report: CaseReport | null }>(`/hotline/expert/queue/${requestId}`);
      setState({ kind: 'ready', report: data.report });
    } catch {
      setState({ kind: 'failed' });
    }
  }, [open, state.kind, requestId]);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)]"
      >
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {open ? t('hotline', 'hideCase') : t('hotline', 'viewCase')}
      </button>

      {open ? (
        <div className="mt-2 rounded-xl border border-[var(--border)] p-3 text-sm">
          {state.kind === 'loading' ? (
            <p className="text-[var(--text2)]">{t('hotline', 'caseLoading')}</p>
          ) : null}
          {state.kind === 'failed' || (state.kind === 'ready' && !state.report) ? (
            <p className="text-[var(--text2)]">{t('hotline', 'caseUnavailable')}</p>
          ) : null}
          {state.kind === 'ready' && state.report ? (
            <CaseReportView report={state.report} locale={lang} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CaseReportView({ report, locale }: { report: CaseReport; locale: Locale }) {
  const { t } = useI18n();

  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--text2)]">
        {t('hotline', 'caseReported').replace('{{time}}', formatDateTime(report.reportedAt, locale))}
      </p>

      <ul className="space-y-3">
        {report.entries.map((entry) => (
          <li key={entry.zoneId}>
            <div className="flex items-center gap-2 font-semibold">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: SEVERITY_COLORS[severityBand(entry.severity)] }}
                aria-hidden
              />
              <span>{zoneLabel(locale, entry.zoneId)}</span>
              <span className="font-normal text-[var(--text2)]">
                {entry.severity}/10 · {severityLabel(locale, entry.severity)}
              </span>
            </div>
            {entry.answers && Object.keys(entry.answers).length > 0 ? (
              <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 pl-4 text-xs">
                {Object.entries(entry.answers).map(([questionId, answerId]) => {
                  const { question, answer } = answerLabels(locale, questionId, answerId);
                  return (
                    <div key={questionId} className="contents">
                      <dt className="text-[var(--text2)]">{question}</dt>
                      <dd>{answer}</dd>
                    </div>
                  );
                })}
              </dl>
            ) : null}
          </li>
        ))}
      </ul>

      {report.note ? (
        <div>
          <p className="text-xs text-[var(--text2)]">{t('hotline', 'caseNote')}</p>
          <p className="whitespace-pre-wrap">{report.note}</p>
        </div>
      ) : null}
    </div>
  );
}
