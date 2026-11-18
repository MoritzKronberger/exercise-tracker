// How well a training block is being followed: which planned workouts were done on time, late or skipped.
import { addDays, scheduleWeek, weekdayOf } from "./dates";

export type DayStatus = "on-time" | "late" | "skipped" | "today" | "upcoming";

export type Adherence = {
  days: Map<string, DayStatus>;
  total: number;
  onTime: number;
  late: number;
  skipped: number;
  remaining: number;
  week: { done: number; planned: number };
};

/** Calendar date ("YYYY-MM-DD") of an instant in the given timezone. */
export function localDate(at: Date | string, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(at));
  } catch {
    return new Date(at).toISOString().slice(0, 10);
  }
}

/**
 * A planned workout counts as
 *  - on time: logged on (or before) its planned day,
 *  - late:    started on a later day,
 *  - skipped: its day is over and nothing was logged.
 * Today's workout is never "skipped" — there's still time.
 */
export function computeAdherence({
  startDate,
  weeks,
  trainingWeekdays,
  sessions,
  today,
  timeZone,
}: {
  startDate: string;
  weeks: number;
  trainingWeekdays: Set<number>;
  /** Sessions of this schedule that have at least one logged set. */
  sessions: { date: string; startedAt: Date | string }[];
  today: string;
  timeZone: string;
}): Adherence {
  const byDate = new Map<string, string>(); // planned date → local date it was started
  for (const s of sessions) {
    const started = localDate(s.startedAt, timeZone);
    const prev = byDate.get(s.date);
    if (!prev || started < prev) byDate.set(s.date, started);
  }

  const days = new Map<string, DayStatus>();
  for (let i = 0; i < weeks * 7; i++) {
    const d = addDays(startDate, i);
    if (!trainingWeekdays.has(weekdayOf(d))) continue;
    const started = byDate.get(d);
    days.set(d, started ? (started <= d ? "on-time" : "late") : d < today ? "skipped" : d === today ? "today" : "upcoming");
  }

  const count = (st: DayStatus) => [...days.values()].filter((v) => v === st).length;
  // "This week" is the block's own week (it starts on the schedule's start day, e.g. Saturday):
  // before the block that's week 1, after it the last week.
  const blockWeek = scheduleWeek(startDate, weeks, today) ?? (today < startDate ? 1 : weeks);
  const weekStart = addDays(startDate, (blockWeek - 1) * 7);
  const thisWeek = [...days.entries()].filter(([d]) => d >= weekStart && d <= addDays(weekStart, 6));
  return {
    days,
    total: days.size,
    onTime: count("on-time"),
    late: count("late"),
    skipped: count("skipped"),
    remaining: count("today") + count("upcoming"),
    week: { done: thisWeek.filter(([, s]) => s === "on-time" || s === "late").length, planned: thisWeek.length },
  };
}
