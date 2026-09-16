import { describe, test, expect } from 'bun:test';
import { monthBucket, isWithinRange, filterByDateRange } from './dateRange';
import type { DateRange } from './dateRange';

describe('monthBucket', () => {
  test('buckets a UTC timestamp into its America/Sao_Paulo month', () => {
    expect(monthBucket('2026-08-19T03:00:00+00:00')).toBe('2026-08');
  });

  test('returns null for a null date', () => {
    expect(monthBucket(null)).toBeNull();
  });
});

describe('isWithinRange', () => {
  const range: DateRange = {
    start: new Date('2026-08-01T00:00:00Z'),
    end: new Date('2026-08-31T23:59:59Z'),
  };

  test('returns true for a date inside the range', () => {
    expect(isWithinRange('2026-08-15T12:00:00Z', range)).toBe(true);
  });

  test('returns false for a date outside the range', () => {
    expect(isWithinRange('2026-09-01T00:00:00Z', range)).toBe(false);
  });

  test('returns false for a null date', () => {
    expect(isWithinRange(null, range)).toBe(false);
  });
});

describe('filterByDateRange', () => {
  test('keeps only rows whose accessor date falls in range', () => {
    const range: DateRange = {
      start: new Date('2026-08-01T00:00:00Z'),
      end: new Date('2026-08-31T23:59:59Z'),
    };
    const rows = [{ date: '2026-08-10T00:00:00Z' }, { date: '2026-09-10T00:00:00Z' }];
    expect(filterByDateRange(rows, range, (row) => row.date)).toEqual([
      { date: '2026-08-10T00:00:00Z' },
    ]);
  });
});
