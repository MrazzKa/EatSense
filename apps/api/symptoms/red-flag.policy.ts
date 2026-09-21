import { Injectable } from '@nestjs/common';
import { isKnownRedFlag } from './symptom-catalog';

export interface RedFlagVerdict {
  /** True when at least one recognised emergency item was ticked. */
  readonly triggered: boolean;
  /** Recognised flag ids, de-duplicated and in catalogue order of arrival. */
  readonly flags: string[];
}

/**
 * Decides whether a symptom report has to stop being a diary entry and become a
 * "call emergency services" screen.
 *
 * It is a separate injectable rather than three lines inside the service on
 * purpose. The AI nutritionist and the hotline triage both have to make exactly
 * this call, and the one thing worse than having no red-flag rule is having
 * three of them that disagree. When those land, they inject this.
 *
 * Note what it deliberately does NOT do: it does not weigh severity, combine
 * zones, or infer anything the user did not explicitly tick. Inferring an
 * emergency from a pattern is clinical reasoning, and clinical reasoning is what
 * we are not allowed to ship. Reacting to a checkbox the user ticked themselves
 * is not.
 */
@Injectable()
export class RedFlagPolicy {
  evaluate(reported: readonly unknown[] | undefined | null): RedFlagVerdict {
    if (!Array.isArray(reported) || reported.length === 0) {
      return { triggered: false, flags: [] };
    }

    const seen = new Set<string>();
    for (const candidate of reported) {
      if (typeof candidate === 'string' && isKnownRedFlag(candidate)) {
        seen.add(candidate);
      }
    }

    const flags = [...seen];
    return { triggered: flags.length > 0, flags };
  }
}
