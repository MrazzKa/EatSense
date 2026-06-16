/**
 * Extract a pharmacy access code from a scanned QR payload or deep link.
 *
 * Pharmacy QR codes encode the universal link
 *   https://eatsense.ch/pharmacy?code=PHARMACY-GENEVA-010
 * but we also accept the custom-scheme deep link (eatsense://pharmacy?code=…),
 * a /pharmacy/<CODE> path form, or a bare code (in case a QR just holds the code).
 *
 * Returns the raw code (server normalises it again) or null if nothing usable.
 */
export function parsePharmacyCode(input?: string | null): string | null {
  if (!input) return null;
  const s = input.trim();
  if (!s) return null;

  // ?code=XXX or &code=XXX (universal link / deep link)
  const q = s.match(/[?&]code=([^&\s#]+)/i);
  if (q) return decodeURIComponent(q[1]).trim();

  // .../pharmacy/<CODE> or .../p/<CODE>
  const path = s.match(/\/(?:pharmacy|p)\/([A-Za-z0-9-]{4,40})/i);
  if (path) return path[1].trim();

  // It is a URL but carries no code → nothing to link.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) return null;

  // Bare code (a QR that just holds "PHARMACY-GENEVA-010").
  if (/^[A-Za-z0-9-]{4,40}$/.test(s)) return s;

  return null;
}
