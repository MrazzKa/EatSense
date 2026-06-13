// Reliable "past event" detection. New events/routes store an ISO timestamp in
// metadata.dateISO (picked via DateTimeField). Legacy posts only have free-text
// `date` → we can't tell, so they're never treated as past (no false badges).

export function getEventTimeMs(metadata: any): number | null {
  const iso = metadata?.dateISO;
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

export function isPastEvent(metadata: any): boolean {
  const ms = getEventTimeMs(metadata);
  return ms != null && ms < Date.now();
}
