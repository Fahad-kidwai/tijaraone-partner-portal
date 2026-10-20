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
