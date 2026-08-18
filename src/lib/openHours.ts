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

/* ------------------------------------------------------------------ */
/* Display formatting                                                  */
/* ------------------------------------------------------------------ */

/** A single rendered row of a venue's opening hours. */
export interface WeekHourRow {
  /** Day label ("Saturday"…) or "Hours" for a single unlabelled range. */
  day: string;
  /** "11:00 AM – 12:00 AM" or "Closed". */
  label: string;
  closed?: boolean;
}

/** BD week order — Saturday first, matching how venues publish hours here. */
const WEEK_ORDER = [
  'Saturday',
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
];

const DAY_ALIASES: Record<string, string> = {
  saturday: 'Saturday',
  sat: 'Saturday',
  sunday: 'Sunday',
  sun: 'Sunday',
  monday: 'Monday',
  mon: 'Monday',
  tuesday: 'Tuesday',
  tue: 'Tuesday',
  tues: 'Tuesday',
  wednesday: 'Wednesday',
  wed: 'Wednesday',
  weds: 'Wednesday',
  thursday: 'Thursday',
  thu: 'Thursday',
  thur: 'Thursday',
  thurs: 'Thursday',
  friday: 'Friday',
  fri: 'Friday',
};

/** "11:00 AM" from minutes-since-midnight. */
function formatMinutes(minutes: number): string {
  const h24 = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const meridiem = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${meridiem}`;
}

function formatRange(start: number, end: number): string {
  return `${formatMinutes(start)} – ${formatMinutes(end)}`;
}

/** Parses a well-formed weekly hours string into per-day segments. Returns
 *  null when ANY segment fails to parse — a partial map must not look like a
 *  complete schedule. Days listed as "Closed" are recorded explicitly. */
function parseWeeklyHours(
  hours: string,
): Array<{ day: string; start: number; end: number } | { day: string; closed: true }> | null {
  const segments = hours
    .split(/[;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (segments.length === 0) return null;

  const rows: Array<{ day: string; start: number; end: number } | { day: string; closed: true }> = [];
  for (const segment of segments) {
    const m = /^([A-Za-z]+)\s*[:-]\s*(.+)$/.exec(segment);
    if (!m) return null;
    const canonical = DAY_ALIASES[m[1].toLowerCase()];
    if (!canonical) return null;
    const body = m[2].trim();
    if (/^closed$/i.test(body)) {
      rows.push({ day: canonical, closed: true });
      continue;
    }
    const parsed = parseOpenHours(body);
    if (!parsed) return null;
    rows.push({ day: canonical, ...parsed });
  }
  return rows.length > 0 ? rows : null;
}

/**
 * Renders a stored opening-hours string for display.
 *
 *  - Weekly maps ("Saturday: 11:00 AM – 12:00 AM; Sunday: 11:00 AM – 12:00 AM")
 *    render as per-day rows in BD week order. Days explicitly listed as
 *    "Closed" render as Closed; days NOT mentioned are omitted — we never
 *    invent a schedule for a day the source didn't cover.
 *  - A single range ("12:00 PM – 10:30 PM") renders as one neutral "Hours"
 *    row — we do NOT invent which days it applies to.
 *  - Anything unparseable returns null so the UI can say "Hours being
 *    verified" honestly.
 */
export function formatOpeningHours(hours: string): WeekHourRow[] | null {
  if (!hours) return null;

  const looksWeekly = /^[A-Za-z]+\s*[:-]\s*/i.test(hours);

  const weekly = parseWeeklyHours(hours);
  if (weekly) {
    const byDay = new Map(weekly.map((w) => [w.day, w]));
    return WEEK_ORDER.filter((day) => byDay.has(day)).map((day) => {
      const w = byDay.get(day)!;
      return 'closed' in w
        ? { day, label: 'Closed', closed: true }
        : { day, label: formatRange(w.start, w.end) };
    });
  }

  // A string that starts like a weekly map but has an unparseable segment
  // must not be rescued by the single-range parser — that would silently
  // drop one day's broken entry and render the rest as if it were a daily
  // schedule. Return null so the UI shows "Hours being verified".
  if (looksWeekly) return null;

  const single = parseOpenHours(hours);
  if (single) return [{ day: 'Hours', label: formatRange(single.start, single.end) }];

  return null;
}
