import { describe, expect, it } from 'vitest';
import { isOpenNow, minutesUntilOpen, openNowLabel, parseOpenHours } from '../openHours';

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
