// All calendar dates are handled as "YYYY-MM-DD" strings to avoid timezone drift.

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const WEEKDAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toUTC(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

function fromUTC(dt: Date) {
  return dt.toISOString().slice(0, 10);
}

export function isISODate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(toUTC(s).getTime());
}

export function addDays(d: string, n: number) {
  const dt = toUTC(d);
  dt.setUTCDate(dt.getUTCDate() + n);
  return fromUTC(dt);
}

export function diffDays(a: string, b: string) {
  return Math.round((toUTC(a).getTime() - toUTC(b).getTime()) / 86_400_000);
}

/** 0 = Monday … 6 = Sunday */
export function weekdayOf(d: string) {
  return (toUTC(d).getUTCDay() + 6) % 7;
}

export function startOfWeek(d: string) {
  return addDays(d, -weekdayOf(d));
}

export function todayIn(timeZone?: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function formatDate(d: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" }).format(toUTC(d));
}

export function scheduleEnd(startDate: string, weeks: number) {
  return addDays(startDate, weeks * 7 - 1);
}

/** 1-based week number of `d` inside a schedule, or null if outside. */
export function scheduleWeek(startDate: string, weeks: number, d: string) {
  const offset = diffDays(d, startDate);
  if (offset < 0 || offset >= weeks * 7) return null;
  return Math.floor(offset / 7) + 1;
}

/** UTC midnight timestamp of a calendar date (used for chart time axes). */
export const toTs = (d: string) => Date.parse(`${d}T00:00:00Z`);

/** The first date on or after `from` that falls on `weekday` (0 = Monday … 6 = Sunday). */
export function nextWeekday(from: string, weekday: number) {
  return addDays(from, (weekday - weekdayOf(from) + 7) % 7);
}

/** Weekday indexes in plan order, e.g. start 5 (Saturday) → [5, 6, 0, 1, 2, 3, 4]. */
export function weekdaysFrom(start: number) {
  return Array.from({ length: 7 }, (_, i) => (start + i) % 7);
}
