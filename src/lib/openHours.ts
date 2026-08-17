/**
 * Parsing and evaluation of the app's `openingHours` strings
 * (e.g. "12:00 PM – 10:30 PM", "6:00 PM – 12:00 AM").
 * Times are represented as minutes since midnight.
 */

const HOURS_RE = /(\d{1,2}):(\d{2})\s*(AM|PM)\s*[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i;

export interface OpenHours {
  /** minutes since midnight */
  start: number;
  /** minutes since midnight; if `<= start` the venue is open past midnight */
  end: number;
}

export function parseOpenHours(hours: string): OpenHours | null {
  const m = HOURS_RE.exec(hours);
  if (!m) return null;
  return { start: toMinutes(m[1], m[2], m[3]), end: toMinutes(m[4], m[5], m[6]) };
}

function toMinutes(h: string, min: string, meridiem: string): number {
  let hour = Number(h) % 12;
  if (meridiem.toUpperCase() === 'PM') hour += 12;
  return hour * 60 + Number(min);
}

/** Whether the venue is open at the given instant (defaults to now). */
export function isOpenNow(hours: string, now: Date = new Date()): boolean {
  const parsed = parseOpenHours(hours);
  if (!parsed) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const { start, end } = parsed;
  if (end > start) return minutes >= start && minutes < end;
  // Crosses midnight (e.g. 6 PM – 12 AM): open late and early.
  return minutes >= start || minutes < end;
}

/** "Open now" label for the current time, or undefined if hours can't be parsed. */
export function openNowLabel(hours: string, now: Date = new Date()): string | undefined {
  const parsed = parseOpenHours(hours);
  if (!parsed) return undefined;
  return isOpenNow(hours, now) ? 'Open now' : 'Closed now';
}

/**
 * Minutes until the next opening of the venue, or null when hours can't be
 * parsed. Returns 0 when the venue is currently open. Handles windows that
 * cross midnight. Used by the "Opening soon" / "Opens later" availability
 * states — derived from recorded hours, never claimed as live data.
 */
export function minutesUntilOpen(hours: string, now: Date = new Date()): number | null {
  const parsed = parseOpenHours(hours);
  if (!parsed) return null;
  if (isOpenNow(hours, now)) return 0;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const { start } = parsed;
  // Closed: the next opening is today's start time unless that has already
  // passed (handles simple windows and cross-midnight windows alike).
  return start > nowMin ? start - nowMin : 1440 - nowMin + start;
}
