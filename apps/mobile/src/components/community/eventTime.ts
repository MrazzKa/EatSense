// Reliable "past event" detection for events/routes.
//
// New posts store an exact ISO timestamp in metadata.dateISO (picked via
// DateTimeField) — that is always preferred. Older/legacy posts only have the
// free-text `date`/`time` the user typed (or a localised "20 March 2026" string),
// so we fall back to a best-effort parse. If nothing is parseable we treat the
// post as NOT past (never hide on a guess).

// Locales the app formats dates in — used to recognise the month word in legacy
// free-text dates.
const LOCALES = ['en', 'ru', 'kk', 'fr', 'de', 'es'];

let MONTH_TOKENS: { token: string; month: number }[] | null = null;
function monthTokens() {
  if (MONTH_TOKENS) return MONTH_TOKENS;
  const out: { token: string; month: number }[] = [];
  for (const loc of LOCALES) {
    for (let m = 0; m < 12; m++) {
      try {
        // The exact month word a localized full date produces (e.g. "march",
        // "марта", "mars", "märz") plus the standalone long name.
        const full = new Date(2021, m, 15).toLocaleDateString(loc, { day: 'numeric', month: 'long', year: 'numeric' });
        const word = full.replace(/[0-9.,/\s]+/g, ' ').trim().toLowerCase();
        if (word) out.push({ token: word, month: m });
        const name = new Date(2021, m, 15).toLocaleDateString(loc, { month: 'long' }).toLowerCase();
        if (name) out.push({ token: name, month: m });
      } catch {
        // Intl may not support a locale on some engines — skip it.
      }
    }
  }
  // Longest tokens first so a full word matches before a shorter ambiguous stem.
  out.sort((a, b) => b.token.length - a.token.length);
  MONTH_TOKENS = out;
  return out;
}

function parseFreeText(date?: string, time?: string): number | null {
  if (!date) return null;
  const d = String(date).trim();
  if (!d) return null;

  // Native parse first — covers English ("March 20, 2026") and ISO-ish strings.
  const direct = Date.parse(time ? `${d} ${time}` : d);
  if (Number.isFinite(direct)) return direct;

  // Localised "<day> <month-word> <year>" → build a Date from the parts.
  const lower = d.toLowerCase();
  const year = lower.match(/\b(20\d{2})\b/);
  const day = lower.match(/\b([0-3]?\d)\b/);
  if (!year || !day) return null;
  const tok = monthTokens().find((x) => lower.includes(x.token));
  if (!tok) return null;

  // Unknown time → end of that day, so a same-day event isn't hidden too early.
  let hh = 23, mm = 59;
  const tm = (time || '').match(/(\d{1,2})[:.](\d{2})/);
  if (tm) { hh = Number(tm[1]); mm = Number(tm[2]); }

  const ms = new Date(Number(year[1]), tok.month, Number(day[1]), hh, mm, 0).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function getEventTimeMs(metadata: any): number | null {
  const iso = metadata?.dateISO;
  if (iso) {
    const ms = Date.parse(iso);
    if (Number.isFinite(ms)) return ms;
  }
  return parseFreeText(metadata?.date, metadata?.time);
}

export function isPastEvent(metadata: any): boolean {
  const ms = getEventTimeMs(metadata);
  return ms != null && ms < Date.now();
}
