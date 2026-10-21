export const DUBAI_TIME_ZONE = "Asia/Dubai";

/** Asia/Dubai is UTC+4 year-round (no DST). */
const DUBAI_OFFSET_MS = 4 * 60 * 60 * 1000;

export function formatInDubai(date: Date, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: DUBAI_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
    ...options,
  }).format(date);
}

function dubaiYearMonth(date: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DUBAI_TIME_ZONE,
    year: "numeric",
    month: "numeric",
  }).formatToParts(date);
  return {
    year: Number(parts.find((p) => p.type === "year")?.value),
    month: Number(parts.find((p) => p.type === "month")?.value) - 1,
  };
}

/**
 * UTC boundaries [start, end) for the Dubai calendar month containing `date`.
 * Single helper for every "this month" aggregate so month-boundary bugs
 * have exactly one place to live (and one test file).
 */
export function dubaiMonthBoundsUtc(date: Date): { start: Date; end: Date } {
  const { year, month } = dubaiYearMonth(date);
  return {
    start: new Date(Date.UTC(year, month, 1) - DUBAI_OFFSET_MS),
    end: new Date(Date.UTC(year, month + 1, 1) - DUBAI_OFFSET_MS),
  };
}

/** UTC boundaries for an explicit Dubai calendar month (monthIndex 0-11). */
export function dubaiMonthBoundsUtcFor(year: number, monthIndex: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, monthIndex, 1) - DUBAI_OFFSET_MS),
    end: new Date(Date.UTC(year, monthIndex + 1, 1) - DUBAI_OFFSET_MS),
  };
}

/** "YYYY-MM" key of the Dubai calendar month containing `date`. */
export function dubaiMonthKey(date: Date): string {
  const { year, month } = dubaiYearMonth(date);
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

/** Parse a "YYYY-MM" Dubai month key into UTC bounds. */
export function dubaiMonthKeyBounds(key: string): { start: Date; end: Date } {
  const [year, month] = key.split("-").map(Number);
  return dubaiMonthBoundsUtcFor(year, month - 1);
}

export interface DubaiMonth {
  key: string;
  label: string;
  start: Date;
  end: Date;
}

/** The last `count` Dubai calendar months, oldest first, ending at `date`'s month. */
export function lastDubaiMonths(date: Date, count: number): DubaiMonth[] {
  const { year, month } = dubaiYearMonth(date);
  const months: DubaiMonth[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(year, month - i, 1));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const bounds = dubaiMonthBoundsUtcFor(y, m);
    months.push({
      key: `${y}-${String(m + 1).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "short", year: "2-digit" }).format(
        new Date(Date.UTC(y, m, 1))
      ),
      ...bounds,
    });
  }
  return months;
}
