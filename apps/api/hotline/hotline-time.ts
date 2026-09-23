const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface LocalMoment {
  /** 0 = Sunday, matching HotlineShift.weekday. */
  weekday: number;
  /** Minutes since local midnight. */
  minute: number;
}

export function isValidTimezone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Where `at` falls in someone's week, in their own timezone.
 *
 * Shifts are stored as weekday + minutes because that is what a person means by
 * "Tuesday evenings". Turning that back into an instant needs the expert's zone,
 * not the server's — a shift written in Zurich must not drift when the API runs
 * in UTC or when either side changes for daylight saving.
 */
export function localMoment(at: Date, timeZone: string): LocalMoment {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(at);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  const weekday = WEEKDAYS.indexOf(read('weekday'));
  // Intl renders midnight as "24" in some locales/engines.
  const hour = Number(read('hour')) % 24;
  const minute = Number(read('minute'));

  return {
    weekday: weekday >= 0 ? weekday : at.getUTCDay(),
    minute: hour * 60 + minute,
  };
}

/** Minutes from `moment` until a shift starting at `startMinute` on `weekday`. */
export function minutesUntil(moment: LocalMoment, weekday: number, startMinute: number): number {
  const dayDelta = (weekday - moment.weekday + 7) % 7;
  const minutes = dayDelta * 24 * 60 + startMinute - moment.minute;
  return minutes >= 0 ? minutes : minutes + 7 * 24 * 60;
}

export function coversNow(moment: LocalMoment, weekday: number, startMinute: number, endMinute: number): boolean {
  if (moment.weekday !== weekday) return false;
  return moment.minute >= startMinute && moment.minute < endMinute;
}
