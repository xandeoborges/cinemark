export interface DateRange {
  start: Date;
  end: Date;
}

// Sao Paulo has observed no DST since 2019, so a fixed UTC-3 offset is safe here.
const SAO_PAULO_OFFSET_HOURS = -3;

/**
 * Returns the Date instant corresponding to 00:00:00.000 in America/Sao_Paulo
 * on the given calendar day. `month` is 1-indexed (matches the Y-M-D shape
 * parsed from a date input or ISO string).
 */
export function startOfDayInSaoPaulo(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, -SAO_PAULO_OFFSET_HOURS, 0, 0, 0));
}

/**
 * Returns the Date instant corresponding to 23:59:59.999 in America/Sao_Paulo
 * on the given calendar day (which lands on the next UTC calendar day).
 */
export function endOfDayInSaoPaulo(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 23 - SAO_PAULO_OFFSET_HOURS, 59, 59, 999));
}

export function monthBucket(isoDate: string | null, timeZone = 'America/Sao_Paulo'): string | null {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
  });
  return formatter.format(date);
}

export function isWithinRange(isoDate: string | null, range: DateRange): boolean {
  if (!isoDate) return false;
  const time = new Date(isoDate).getTime();
  if (Number.isNaN(time)) return false;
  return time >= range.start.getTime() && time <= range.end.getTime();
}

export function filterByDateRange<T>(
  rows: T[],
  range: DateRange,
  getDate: (row: T) => string | null,
): T[] {
  return rows.filter((row) => isWithinRange(getDate(row), range));
}
