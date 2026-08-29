import { describe, it, expect } from 'vitest';
import { resolveWheelPan } from '../useWheelPan';

/* The hook itself is DOM work — one listener, one rAF loop — and there is no
   jsdom in this repo. The decision it exists to make is pure, and it is the
   part with rules worth defending: every case below is a way the row could
   have trapped the reader on the page. */

const ROW = { at: 0, max: 900, clientWidth: 600 };
const wheel = (deltaY: number, over: Partial<Parameters<typeof resolveWheelPan>[0]> = {}) => ({
  deltaX: 0,
  deltaY,
  deltaMode: 0,
  ...over,
});

describe('resolveWheelPan', () => {
  it('pans forward by the wheel travel', () => {
    expect(resolveWheelPan(wheel(120), ROW)).toBe(120);
  });

  it('pans back when the row has somewhere to go back to', () => {
    expect(resolveWheelPan(wheel(-120), { ...ROW, at: 400 })).toBe(-120);
  });

  it('declines the event at the end so the page can keep scrolling', () => {
    expect(resolveWheelPan(wheel(120), { ...ROW, at: 900 })).toBe(0);
  });

  it('declines the event at the start so the page can scroll back up', () => {
    expect(resolveWheelPan(wheel(-120), { ...ROW, at: 0 })).toBe(0);
  });

  it('still takes the event at the end when asked to go the other way', () => {
    expect(resolveWheelPan(wheel(-120), { ...ROW, at: 900 })).toBe(-120);
  });

  it('declines everything when the row does not scroll at all', () => {
    expect(resolveWheelPan(wheel(120), { at: 0, max: 0, clientWidth: 600 })).toBe(0);
  });

  it('treats a sub-pixel of room as no room', () => {
    expect(resolveWheelPan(wheel(120), { at: 0, max: 0.5, clientWidth: 600 })).toBe(0);
  });

  it('leaves a trackpad sideways swipe to the browser', () => {
    expect(resolveWheelPan(wheel(4, { deltaX: -40 }), ROW)).toBe(0);
  });

  it('claims a diagonal swipe only while it is mostly vertical', () => {
    expect(resolveWheelPan(wheel(40, { deltaX: 12 }), ROW)).toBe(40);
  });

  it('leaves a pinch-zoom alone', () => {
    expect(resolveWheelPan(wheel(120, { ctrlKey: true }), ROW)).toBe(0);
  });

  it('reads a line-mode delta as lines', () => {
    expect(resolveWheelPan(wheel(3, { deltaMode: 1 }), ROW)).toBe(48);
  });

  it('reads a page-mode delta as most of a viewport', () => {
    expect(resolveWheelPan(wheel(1, { deltaMode: 2 }), ROW)).toBe(540);
  });

  it('never overshoots either end', () => {
    expect(resolveWheelPan(wheel(1, { deltaMode: 2 }), { ...ROW, at: 600 })).toBe(300);
    expect(resolveWheelPan(wheel(-1, { deltaMode: 2 }), { ...ROW, at: 200 })).toBe(-200);
  });

  it('ignores a zero delta rather than reporting a pan of nothing', () => {
    expect(resolveWheelPan(wheel(0), ROW)).toBe(0);
  });
});
