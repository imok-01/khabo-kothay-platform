import { describe, expect, it } from 'vitest';
import {
  formatOpeningHours,
  formatScrapedHours,
  isOpenNow,
  minutesUntilOpen,
  openNowLabel,
  openStateNow,
  parseOpenHours,
  recordedHoursHeadline,
} from '../openHours';

const at = (h: number, m = 0) => new Date(2026, 6, 15, h, m); // fixed Wednesday

describe('parseOpenHours', () => {
  it('parses a standard day-time window', () => {
    expect(parseOpenHours('12:00 PM – 10:30 PM')).toEqual({ start: 720, end: 1350 });
  });

  it('parses morning openings with 12-hour formatting', () => {
    expect(parseOpenHours('7:00 AM – 10:30 PM')).toEqual({ start: 420, end: 1350 });
    expect(parseOpenHours('12:00 AM – 11:00 PM')).toEqual({ start: 0, end: 1380 });
  });

  it('parses windows crossing midnight (end <= start)', () => {
    expect(parseOpenHours('6:00 PM – 12:00 AM')).toEqual({ start: 1080, end: 0 });
  });

  it('returns null for unparseable strings', () => {
    expect(parseOpenHours('Open all day')).toBeNull();
    expect(parseOpenHours('')).toBeNull();
  });
});

describe('isOpenNow', () => {
  it('is open inside the window', () => {
    expect(isOpenNow('12:00 PM – 10:30 PM', at(15, 0))).toBe(true);
  });

  it('is closed before opening', () => {
    expect(isOpenNow('12:00 PM – 10:30 PM', at(9, 0))).toBe(false);
  });

  it('is closed after closing', () => {
    expect(isOpenNow('12:00 PM – 10:30 PM', at(23, 0))).toBe(false);
  });

  it('treats closing time as exclusive', () => {
    expect(isOpenNow('12:00 PM – 10:30 PM', at(10, 30))).toBe(false);
  });

  it('handles windows crossing midnight (evening)', () => {
    expect(isOpenNow('6:00 PM – 12:00 AM', at(21, 0))).toBe(true);
  });

  it('handles windows crossing midnight (after midnight)', () => {
    expect(isOpenNow('6:00 PM – 12:00 AM', at(0, 30))).toBe(false); // 12 AM is closing
  });

  it('returns false for unparseable hours', () => {
    expect(isOpenNow('Open all day', at(12))).toBe(false);
  });
});

describe('minutesUntilOpen', () => {
  it('returns 0 when the venue is open', () => {
    expect(minutesUntilOpen('12:00 PM – 10:30 PM', at(15))).toBe(0);
  });

  it('counts minutes to a later opening today', () => {
    expect(minutesUntilOpen('12:00 PM – 10:30 PM', at(9))).toBe(180);
  });

  it('counts to tomorrow when the start has passed', () => {
    // 11 PM is past the 10:30 PM close → opens 12:00 PM tomorrow (780 min).
    expect(minutesUntilOpen('12:00 PM – 10:30 PM', at(23))).toBe(780);
  });

  it('handles windows crossing midnight', () => {
    // 2 AM for a 6 PM – 12 AM venue is closed (past the midnight close) and
    // reopens today at 6 PM (960 min).
    expect(minutesUntilOpen('6:00 PM – 12:00 AM', at(2))).toBe(960);
  });

  it('returns null for unparseable hours', () => {
    expect(minutesUntilOpen('Open all day')).toBeNull();
  });
});

describe('openNowLabel', () => {
  it('labels open and closed states', () => {
    expect(openNowLabel('12:00 PM – 10:30 PM', at(15))).toBe('Open now');
    expect(openNowLabel('12:00 PM – 10:30 PM', at(9))).toBe('Closed now');
  });

  it('is undefined when hours cannot be parsed', () => {
    expect(openNowLabel('Open all day')).toBeUndefined();
  });
});

describe('formatOpeningHours', () => {
  it('renders a single range as one neutral row without inventing days', () => {
    expect(formatOpeningHours('12:00 PM – 10:30 PM')).toEqual([
      { day: 'Hours', label: '12:00 PM – 10:30 PM' },
    ]);
  });

  it('renders a weekly map in BD week order (Saturday first)', () => {
    const rows = formatOpeningHours(
      'Monday: 11:00 AM – 10:00 PM; Saturday: 11:00 AM – 12:00 AM; Sunday: Closed',
    );
    expect(rows).toEqual([
      { day: 'Saturday', label: '11:00 AM – 12:00 AM' },
      { day: 'Sunday', label: 'Closed', closed: true },
      { day: 'Monday', label: '11:00 AM – 10:00 PM' },
    ]);
  });

  it('omits days the source did not mention (never invents a schedule)', () => {
    const rows = formatOpeningHours('Saturday: 11:00 AM – 12:00 AM');
    expect(rows).toHaveLength(1);
    expect(rows![0].day).toBe('Saturday');
  });

  it('returns null for unparseable strings', () => {
    expect(formatOpeningHours('Closes soon 12 am Opens 6:30 am S')).toBeNull();
    expect(formatOpeningHours('Open Closes 4 am')).toBeNull();
    expect(formatOpeningHours('')).toBeNull();
    expect(formatOpeningHours('Open all day')).toBeNull();
  });

  it('returns null for a weekly map with any unparseable segment', () => {
    expect(formatOpeningHours('Saturday: 11:00 AM – 12:00 AM; Sunday: unknown')).toBeNull();
  });
});

describe('formatScrapedHours', () => {
  it('renders "Open Closes <time>" fragments', () => {
    expect(formatScrapedHours('Open Closes 1 am')).toEqual({
      day: 'Hours',
      label: 'Open · Closes 1:00 AM',
    });
    expect(formatScrapedHours('Open Closes 12:30 am')).toEqual({
      day: 'Hours',
      label: 'Open · Closes 12:30 AM',
    });
    expect(formatScrapedHours('Open Closes 4 pm')).toEqual({
      day: 'Hours',
      label: 'Open · Closes 4:00 PM',
    });
  });

  it('renders "Closed Opens <time> <day>" fragments', () => {
    expect(formatScrapedHours('Closed Opens 12 pm Sat')).toEqual({
      day: 'Hours',
      label: 'Closed · Opens 12:00 PM Saturday',
    });
    expect(formatScrapedHours('Closed Opens 10:30 am Sat')).toEqual({
      day: 'Hours',
      label: 'Closed · Opens 10:30 AM Saturday',
    });
  });

  it('renders "Closes soon <time> · Opens <time>" fragments', () => {
    expect(formatScrapedHours('Closes soon 12 am · Opens 12 pm Sa')).toEqual({
      day: 'Hours',
      label: 'Closes 12:00 AM · Opens 12:00 PM',
    });
    expect(formatScrapedHours('Closes soon 11:30 pm · Opens 6 am S')).toEqual({
      day: 'Hours',
      label: 'Closes 11:30 PM · Opens 6:00 AM',
    });
  });

  it('renders "Open 24 hours"', () => {
    expect(formatScrapedHours('Open 24 hours')).toEqual({
      day: 'Hours',
      label: 'Open 24 hours',
    });
  });

  it('keeps a fully spelled day on the closing side', () => {
    expect(formatScrapedHours('Open Closes 5 am Sat')).toEqual({
      day: 'Hours',
      label: 'Open · Closes 5:00 AM Saturday',
    });
  });

  it('returns null for non-scrape text', () => {
    expect(formatScrapedHours('')).toBeNull();
    expect(formatScrapedHours('Saturday: 11:00 AM – 12:00 AM; Sunday: Closed')).toBeNull();
    expect(formatScrapedHours('completely unrelated')).toBeNull();
  });
});

describe('openStateNow', () => {
  it('evaluates a single unambiguous window', () => {
    expect(openStateNow('12:00 PM – 10:30 PM', at(13))).toBe('Open now');
    expect(openStateNow('12:00 PM – 10:30 PM', at(23))).toBe('Closed now');
  });

  it('treats "Open 24 hours" as always open', () => {
    expect(openStateNow('Open 24 hours', at(4))).toBe('Open now');
  });

  it('reads TODAY’s row from a weekly schedule, not the first one listed', () => {
    // The regression guard. `HOURS_RE` is unanchored, so the old
    // `openNowLabel` matched Saturday’s 11am–3pm window and called this
    // Wednesday lunchtime "Open now" — on a venue that opens at 6pm.
    const weekly = 'Saturday: 11:00 AM – 3:00 PM; Wednesday: 6:00 PM – 11:00 PM';
    expect(openNowLabel(weekly, at(13))).toBe('Open now'); // the bug, still there
    expect(openStateNow(weekly, at(13))).toBe('Closed now');
    expect(openStateNow(weekly, at(19))).toBe('Open now');
  });

  it('honours a day recorded as Closed', () => {
    expect(openStateNow('Wednesday: Closed; Thursday: 6:00 PM – 11:00 PM', at(19))).toBe('Closed now');
  });

  it('says nothing when the schedule never covered today', () => {
    expect(openStateNow('Friday: 6:00 PM – 11:00 PM; Saturday: Closed', at(19))).toBeNull();
  });

  it('credits a window that crossed midnight to the day it started on', () => {
    // Tuesday 6 PM – 2 AM is still running at 1 AM Wednesday.
    const weekly = 'Tuesday: 6:00 PM – 2:00 AM; Wednesday: 6:00 PM – 11:00 PM';
    expect(openStateNow(weekly, at(1))).toBe('Open now');
    expect(openStateNow(weekly, at(3))).toBe('Closed now');
  });

  it('refuses every Google scrape fragment', () => {
    // The heart of the bug this fixed: these carry a state word that was true
    // when the listing was scraped and says nothing about now.
    expect(openStateNow('Closed Opens 12 pm Sat', at(13))).toBeNull();
    expect(openStateNow('Open Closes 1 am', at(13))).toBeNull();
    expect(openStateNow('Closes soon 11:30 pm · Opens 12 pm', at(13))).toBeNull();
  });

  it('never rescues a weekly-shaped string that failed to parse', () => {
    expect(openStateNow('Saturday: 11:00 AM – 3:00 PM; Sunday: whenever', at(13))).toBeNull();
  });

  it('returns null for nothing at all', () => {
    expect(openStateNow('', at(13))).toBeNull();
    expect(openStateNow('completely unrelated', at(13))).toBeNull();
  });
});

describe('recordedHoursHeadline', () => {
  it('drops the stale moment-word and keeps the schedule fact', () => {
    expect(recordedHoursHeadline(formatScrapedHours('Closed Opens 12 pm Sat'))).toBe('Opens 12:00 PM Saturday');
    expect(recordedHoursHeadline(formatScrapedHours('Open Closes 5 am Sat'))).toBe('Closes 5:00 AM Saturday');
  });

  it('keeps "Open 24 hours", which is a schedule and not a moment', () => {
    expect(recordedHoursHeadline(formatScrapedHours('Open 24 hours'))).toBe('Open 24 hours');
  });

  it('returns null when the moment-word was all there was', () => {
    expect(recordedHoursHeadline(formatScrapedHours('Closed'))).toBeNull();
    expect(recordedHoursHeadline(null)).toBeNull();
    expect(recordedHoursHeadline(undefined)).toBeNull();
  });
});
