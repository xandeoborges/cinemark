export interface DateRange {
  start: Date;
  end: Date;
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
