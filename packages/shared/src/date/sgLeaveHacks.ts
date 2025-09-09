/**
 * SG Leave-hack utilities
 * - nextNWeekends: upcoming Fri-Sun windows
 * - longWeekendCombos: includes PH adjacencies yielding 3-4D with +1 leave
 * - isLeaveHack: whether a given range benefits from a PH adjacency (+1 leave)
 */

export type DateRange = { start: Date; end: Date };

export function nextNWeekends(n: number, now: Date = new Date()): DateRange[] {
  if (n <= 0) return [];
  const start = new Date(now);
  const day = start.getDay();
  const diffToFri = (5 - day + 7) % 7; // 5 = Fri
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + diffToFri);
  const ranges: DateRange[] = [];
  for (let i = 0; i < n; i++) {
    const fri = new Date(start);
    fri.setDate(fri.getDate() + i * 7);
    const sun = new Date(fri);
    sun.setDate(sun.getDate() + 2);
    ranges.push({ start: fri, end: sun });
  }
  return ranges;
}

export type LongWeekend = { start: Date; end: Date; reason: string; leaveDaysNeeded: number };

export function longWeekendCombos(now: Date = new Date(), holidays: Date[] = []): LongWeekend[] {
  const weekends = nextNWeekends(12, now);
  const holidaySet = new Set(holidays.map((d) => ymd(d)));
  const results: LongWeekend[] = [];
  for (const w of weekends) {
    // Check Mon PH (Fri-Sun weekend + Mon PH => 4D, 0 leave)
    const mon = addDays(w.end, 1);
    if (holidaySet.has(ymd(mon))) {
      results.push({ start: w.start, end: mon, reason: 'Mon PH', leaveDaysNeeded: 0 });
      continue;
    }
    // Check Fri PH (Fri PH + weekend => 3D, 0 leave)
    const fri = w.start;
    if (holidaySet.has(ymd(fri))) {
      results.push({ start: w.start, end: w.end, reason: 'Fri PH', leaveDaysNeeded: 0 });
      continue;
    }
    // Check Thu PH (+1 leave on Fri) => 4D
    const thu = addDays(w.start, -1);
    if (holidaySet.has(ymd(thu))) {
      const mon2 = addDays(w.end, 1);
      results.push({ start: thu, end: mon2, reason: 'Thu PH +1 leave', leaveDaysNeeded: 1 });
      continue;
    }
    // Check Tue PH (+1 leave on Mon) => 4D
    const tue = addDays(w.end, 2);
    if (holidaySet.has(ymd(tue))) {
      results.push({ start: w.start, end: tue, reason: 'Tue PH +1 leave', leaveDaysNeeded: 1 });
      continue;
    }
  }
  return results;
}

export function isLeaveHack(range: DateRange, holidays: Date[] = []): boolean {
  const combos = longWeekendCombos(range.start, holidays);
  return combos.some((c) => ymd(c.start) === ymd(range.start) && ymd(c.end) === ymd(range.end));
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, delta: number): Date {
  const n = new Date(d);
  n.setDate(n.getDate() + delta);
  return n;
} 