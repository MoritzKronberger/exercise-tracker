import { strict as assert } from "node:assert";
import { test } from "node:test";
import { computeAdherence } from "./adherence";
import { nextWeekday, weekdaysFrom } from "./dates";

const base = { weeks: 2, timeZone: "Europe/Berlin" };

test("on time, late, skipped, today and upcoming", () => {
  // Mon + Wed + Fri from Mon 2 Nov 2026; today = Wed 11 Nov.
  const a = computeAdherence({
    ...base,
    startDate: "2026-11-02",
    trainingWeekdays: new Set([0, 2, 4]),
    today: "2026-11-11",
    sessions: [
      { date: "2026-11-02", startedAt: "2026-11-02T17:00:00Z" }, // on time
      { date: "2026-11-04", startedAt: "2026-11-05T17:00:00Z" }, // a day late
      { date: "2026-11-09", startedAt: "2026-11-09T22:30:00Z" }, // 23:30 in Berlin → still on time
    ],
  });
  assert.equal(a.onTime, 2);
  assert.equal(a.late, 1);
  assert.equal(a.skipped, 1); // Fri 6 Nov
  assert.equal(a.days.get("2026-11-11"), "today");
  assert.equal(a.remaining, 2); // today + Fri 13 Nov
});

test("'this week' follows the block's own weeks, not the calendar week", () => {
  // Plan Sat + Mon + Tue, block starts Sat 21 Nov 2026 → block weeks run Saturday–Friday.
  const common = { ...base, startDate: "2026-11-21", trainingWeekdays: new Set([5, 0, 1]) };
  // Tue 24 Nov: Sat 21, Mon 23 done; Tue 24 is today → week 1 = Sat 21, Mon 23, Tue 24.
  const a = computeAdherence({
    ...common,
    today: "2026-11-24",
    sessions: [
      { date: "2026-11-21", startedAt: "2026-11-21T10:00:00Z" },
      { date: "2026-11-23", startedAt: "2026-11-23T17:00:00Z" },
    ],
  });
  assert.deepEqual(a.week, { done: 2, planned: 3 });
  // Thursday before the block starts: week 1 is shown, nothing done yet.
  const before = computeAdherence({ ...common, today: "2026-11-19", sessions: [] });
  assert.deepEqual(before.week, { done: 0, planned: 3 });
  assert.equal(before.skipped, 0);
});

test("next occurrence of a plan's start day", () => {
  assert.equal(nextWeekday("2026-11-19", 5), "2026-11-21"); // Thu → Sat
  assert.equal(nextWeekday("2026-11-21", 5), "2026-11-21"); // already Saturday → today
  assert.equal(nextWeekday("2026-11-22", 0), "2026-11-23"); // Sun → Mon
  assert.deepEqual(weekdaysFrom(5), [5, 6, 0, 1, 2, 3, 4]);
});
