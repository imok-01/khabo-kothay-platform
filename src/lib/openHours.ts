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

/** Whether `minutes` falls inside a window, which may cross midnight. */
function withinRange(start: number, end: number, minutes: number): boolean {
  if (end > start) return minutes >= start && minutes < end;
  // Crosses midnight (e.g. 6 PM – 12 AM): open late and early.
  return minutes >= start || minutes < end;
}

/** Whether the venue is open at the given instant (defaults to now). */
export function isOpenNow(hours: string, now: Date = new Date()): boolean {
  const parsed = parseOpenHours(hours);
  if (!parsed) return false;
  return withinRange(parsed.start, parsed.end, now.getHours() * 60 + now.getMinutes());
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

/** "4 am" → "4:00 AM"; "6:30 pm" → "6:30 PM". Only normalises; never invents. */
function normalizeScrapedTime(raw: string): string | null {
  const m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i.exec(raw.trim());
  if (!m) return null;
  let hour = Number(m[1]) % 12;
  if (m[3].toLowerCase() === 'pm') hour += 12;
  const min = m[2] ? Number(m[2]) : 0;
  const meridiem = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(min).padStart(2, '0')} ${meridiem}`;
}

/** Expand a day token only when it is unambiguous ("sat" → "Saturday"). */
function expandScrapedDay(token: string): string | undefined {
  return DAY_ALIASES[token.toLowerCase()];
}

/**
 * Renders a Google-scrape opening-hours fragment as one honest summary row.
 *
 * The import stored Google's snapshot strings verbatim, e.g.
 * "Open Closes 1 am", "Closed Opens 12 pm Sat",
 * "Closes soon 11:30 pm · Opens 12 pm", "Open 24 hours". These are NOT a
 * complete weekly schedule, so they never render as per-day rows — they
 * render as a single "Hours" row composed only from tokens that actually
 * appear in the recorded string (status, closing time, opening time, and a
 * day only when spelled out fully). Returns null when nothing recognizable
 * is present, letting the UI keep the honest "Hours being verified" state.
 */
export function formatScrapedHours(hours: string): WeekHourRow | null {
  if (!hours) return null;
  const s = hours.trim();
  if (/^open\s+24\s*hours/i.test(s)) return { day: 'Hours', label: 'Open 24 hours' };

  const parts: string[] = [];
  if (/^open\b/i.test(s) && !/closes\s+soon/i.test(s)) parts.push('Open');
  if (/^closed\b/i.test(s)) parts.push('Closed');

  const closeM = s.match(/closes(?:\s+soon)?\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*([a-z]{2,9})?/i);
  if (closeM) {
    const time = normalizeScrapedTime(closeM[1]);
    if (time) parts.push(`Closes ${time}${closeM[2] ? ` ${expandScrapedDay(closeM[2]) ?? closeM[2]}` : ''}`);
  }

  const openM = s.match(/opens\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*([a-z]{2,9})?/i);
  if (openM) {
    const time = normalizeScrapedTime(openM[1]);
    if (time) parts.push(`Opens ${time}${openM[2] ? ` ${expandScrapedDay(openM[2]) ?? ''}`.trimEnd() : ''}`);
  }

  return parts.length > 0 ? { day: 'Hours', label: parts.join(' · ') } : null;
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

/* ------------------------------------------------------------------ */
/* Open-state evaluation                                               */
/* ------------------------------------------------------------------ */

/** `Date.getDay()` order — 0 is Sunday. Not the BD display order above. */
const JS_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * "Open now" / "Closed now" derived from a recorded hours string, or null when
 * the string does not actually support the claim.
 *
 * This exists because `openNowLabel` cannot be trusted on a weekly schedule:
 * `HOURS_RE` is unanchored, so on
 * "Saturday: 11:00 AM – 3:00 PM; Sunday: 6:00 PM – 11:00 PM" it matches the
 * FIRST range it finds and applies Saturday's window to every day of the week.
 * No catalogue row is weekly today, so nothing is visibly wrong — it is wrong
 * the moment one is, and silently.
 *
 * What it answers, in order:
 *  - "Open 24 hours"                       → always open;
 *  - a weekly map                          → *today's* row, and yesterday's
 *    first when yesterday's window crossed midnight and still covers now (a
 *    6 PM – 2 AM Saturday belongs to Saturday, so 1 AM Sunday must ask
 *    Saturday before it believes Sunday);
 *  - a weekly-shaped string that failed to parse → null, never a rescue by the
 *    single-range parser;
 *  - a single range                        → that window;
 *  - anything else, including every Google scrape fragment → null.
 *
 * Returning null is the important case: a fragment like
 * "Closed Opens 12 pm Sat" carries a state word that was true *at scrape time*
 * and says nothing about now. The page must present the schedule fact instead
 * of a stale live claim — see `recordedHoursHeadline`.
 */
export function openStateNow(hours: string, now: Date = new Date()): 'Open now' | 'Closed now' | null {
  if (!hours) return null;
  const s = hours.trim();
  if (/^open\s+24\s*hours/i.test(s)) return 'Open now';

  const minutes = now.getHours() * 60 + now.getMinutes();

  const weekly = parseWeeklyHours(s);
  if (weekly) {
    const byDay = new Map(weekly.map((w) => [w.day, w]));
    const yesterday = byDay.get(JS_DAY_NAMES[(now.getDay() + 6) % 7]);
    if (
      yesterday &&
      !('closed' in yesterday) &&
      yesterday.end <= yesterday.start &&
      minutes < yesterday.end
    ) {
      return 'Open now';
    }
    const today = byDay.get(JS_DAY_NAMES[now.getDay()]);
    if (!today) return null; // the source never covered today
    if ('closed' in today) return 'Closed now';
    return withinRange(today.start, today.end, minutes) ? 'Open now' : 'Closed now';
  }

  // Weekly-shaped but unparseable: same rule as `formatOpeningHours`.
  if (/^[A-Za-z]+\s*[:-]\s*/.test(s)) return null;

  const single = parseOpenHours(s);
  if (!single) return null;
  return withinRange(single.start, single.end, minutes) ? 'Open now' : 'Closed now';
}

/**
 * The schedule half of a scraped hours row, with the stale moment-word dropped.
 *
 * `formatScrapedHours` renders Google's fragment faithfully, leading
 * "Open"/"Closed" included, because in the reference card it is labelled as a
 * recorded snapshot. The decision bar at the top of the page cannot use that
 * word: there it would read as a live status. "Closed · Opens 12:00 PM
 * Saturday" becomes "Opens 12:00 PM Saturday" — the part that is still true.
 * Returns null when the word was all there was.
 */
export function recordedHoursHeadline(row: WeekHourRow | null | undefined): string | null {
  if (!row) return null;
  const kept = row.label
    .split('·')
    .map((part) => part.trim())
    .filter((part) => part && !/^(open|closed)$/i.test(part));
  return kept.length > 0 ? kept.join(' · ') : null;
}
