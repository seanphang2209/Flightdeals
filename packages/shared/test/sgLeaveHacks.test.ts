import { describe, it, expect } from 'vitest';
import { nextNWeekends, longWeekendCombos, isLeaveHack } from '../src/date/sgLeaveHacks';

const D = (s: string) => new Date(s + 'T00:00:00.000Z');

describe('sgLeaveHacks', () => {
  it('nextNWeekends returns n ranges starting on Friday', () => {
    const res = nextNWeekends(2, D('2025-01-01')); // Wed
    expect(res).toHaveLength(2);
    expect(res[0].start.getDay()).toBe(5);
    expect(res[0].end.getDay()).toBe(0);
  });

  it('detects Mon PH 4D with 0 leave', () => {
    const now = D('2025-01-01');
    const holidays = [D('2025-01-06')]; // Mon
    const combos = longWeekendCombos(now, holidays);
    expect(combos.some((c) => c.reason.includes('Mon PH') && c.leaveDaysNeeded === 0)).toBe(true);
  });

  it('detects Fri PH 3D with 0 leave', () => {
    const now = D('2025-01-01');
    const holidays = [D('2025-01-03')]; // Fri
    const combos = longWeekendCombos(now, holidays);
    expect(combos.some((c) => c.reason.includes('Fri PH') && c.leaveDaysNeeded === 0)).toBe(true);
  });

  it('detects Tue PH +1 leave', () => {
    const now = D('2025-01-01');
    const holidays = [D('2025-01-07')]; // Tue
    const combos = longWeekendCombos(now, holidays);
    expect(combos.some((c) => c.reason.includes('Tue PH') && c.leaveDaysNeeded === 1)).toBe(true);
  });

  it('isLeaveHack matches computed combo range', () => {
    const now = D('2025-01-01');
    const holidays = [D('2025-01-06')];
    const combos = longWeekendCombos(now, holidays);
    const pick = combos[0];
    expect(isLeaveHack({ start: pick.start, end: pick.end }, holidays)).toBe(true);
  });
}); 