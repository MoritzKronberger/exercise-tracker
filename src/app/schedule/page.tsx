import Link from "next/link";
import { Suspense } from "react";
import { createSchedule } from "@/app/actions";
import { Badge, Button, Card, EmptyState, Input, LinkButton, PageHeader, PageSkeleton, Select, cx } from "@/components/ui";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";
import { addDays, formatDate, scheduleWeek, startOfWeek, weekdayOf, WEEKDAYS_SHORT } from "@/lib/dates";
import { getPlanItems, listPlans, listSchedules, sessionSummaries } from "@/lib/data";
import { userToday } from "@/lib/server";
import { DeleteScheduleButton, WeeksField } from "./schedule-client";

export default function SchedulePage({ searchParams }: PageProps<"/schedule">) {
  return (
    <>
      <PageHeader title="Schedule" description="Run a weekly plan from a start date for a number of weeks." />
      <Suspense fallback={<PageSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const PALETTE = ["bg-blue-700", "bg-green-700", "bg-amber-700", "bg-red-700", "bg-gray-1000"];

async function Content({ searchParams }: { searchParams: PageProps<"/schedule">["searchParams"] }) {
  const sp = await searchParams;
  const [plans, schedules, today, summaries] = await Promise.all([listPlans(), listSchedules(), userToday(), sessionSummaries()]);
  const items = await getPlanItems(plans.map((p) => p.id));
  const preselect = Number(sp.plan) || plans[0]?.id;
  const month = typeof sp.month === "string" && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : today.slice(0, 7);
  const nextMonday = weekdayOf(today) === 0 ? today : addDays(startOfWeek(today), 7);

  const colorOf = new Map(schedules.map((s, i) => [s.id, PALETTE[i % PALETTE.length]]));

  return (
    <div className="flex flex-col gap-8">
      {plans.length === 0 ? (
        <EmptyState title="No plans to schedule" description="Create a workout plan first." action={<LinkButton href="/plans">Go to plans</LinkButton>} />
      ) : (
        <Card className="p-4">
          <h2 className="mb-4 font-medium">New schedule</h2>
          <form action={createSchedule} className="grid gap-4 sm:grid-cols-[1fr_180px] sm:items-end">
            <label className="flex flex-col gap-1.5 text-[13px] text-gray-900">
              Plan
              <Select name="planId" defaultValue={preselect} required>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] text-gray-900">
              Start date
              <Input type="date" name="startDate" defaultValue={nextMonday} required />
            </label>
            <WeeksField />
            <Button type="submit" variant="primary">
              Add schedule
            </Button>
          </form>
        </Card>
      )}

      <Calendar month={month} today={today} schedules={schedules} items={items} colorOf={colorOf} summaries={summaries} />

      <section>
        <h2 className="mb-3 font-medium">All schedules</h2>
        {schedules.length === 0 ? (
          <p className="text-sm text-gray-900">Nothing scheduled yet.</p>
        ) : (
          <Card className="divide-y divide-gray-alpha-400">
            {schedules.map((s) => {
              const planDays = new Set(items.filter((i) => i.planId === s.planId).map((i) => i.weekday)).size;
              const planned = planDays * s.weeks;
              const done = summaries.filter((x) => x.scheduleId === s.id && x.sets > 0).length;
              const week = scheduleWeek(s.startDate, s.weeks, today);
              const status = week ? "active" : s.startDate > today ? "upcoming" : "completed";
              return (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={cx("size-2.5 shrink-0 rounded-full", colorOf.get(s.id))} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/plans/${s.planId}`} className="truncate text-sm font-medium hover:underline">
                      {s.planName}
                    </Link>
                    <p className="text-xs text-gray-900">
                      {formatDate(s.startDate, { day: "numeric", month: "short", year: "numeric" })} –{" "}
                      {formatDate(s.endDate, { day: "numeric", month: "short", year: "numeric" })} · {s.weeks} weeks · {done}/{planned} workouts
                    </p>
                  </div>
                  {status === "active" && <Badge color="green">Week {week}</Badge>}
                  {status === "upcoming" && <Badge color="blue">Upcoming</Badge>}
                  {status === "completed" && <Badge>Done</Badge>}
                  <DeleteScheduleButton id={s.id} name={s.planName} />
                </div>
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}

function Calendar({
  month,
  today,
  schedules,
  items,
  colorOf,
  summaries,
}: {
  month: string;
  today: string;
  schedules: Awaited<ReturnType<typeof listSchedules>>;
  items: Awaited<ReturnType<typeof getPlanItems>>;
  colorOf: Map<number, string>;
  summaries: Awaited<ReturnType<typeof sessionSummaries>>;
}) {
  const first = `${month}-01`;
  const gridStart = startOfWeek(first);
  const [y, m] = month.split("-").map(Number);
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const trimmed = days.slice(35).every((d) => d.slice(0, 7) !== month) ? days.slice(0, 35) : days;
  const doneDates = new Set(summaries.filter((s) => s.sets > 0).map((s) => s.date));

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="flex-1 font-medium">{formatDate(first, { month: "long", year: "numeric" })}</h2>
        <LinkButton href={`/schedule?month=${prev}`} size="small" variant="tertiary" aria-label="Previous month">
          <IconChevronLeft />
        </LinkButton>
        <LinkButton href={`/schedule?month=${today.slice(0, 7)}`} size="small" variant="secondary">
          Today
        </LinkButton>
        <LinkButton href={`/schedule?month=${next}`} size="small" variant="tertiary" aria-label="Next month">
          <IconChevronRight />
        </LinkButton>
      </div>
      <Card className="overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-alpha-400 text-center text-[11px] font-medium text-gray-900">
          {WEEKDAYS_SHORT.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {trimmed.map((d) => {
            const wd = weekdayOf(d);
            const active = schedules.filter(
              (s) => scheduleWeek(s.startDate, s.weeks, d) !== null && items.some((i) => i.planId === s.planId && i.weekday === wd),
            );
            const inMonth = d.slice(0, 7) === month;
            return (
              <Link
                key={d}
                href={`/?date=${d}`}
                className={cx(
                  "flex min-h-14 flex-col gap-1 border-gray-alpha-400 p-1.5 text-xs transition-colors hover:bg-gray-alpha-100 sm:min-h-20 [&:not(:nth-child(7n))]:border-r [&:nth-child(n+8)]:border-t",
                  !inMonth && "text-gray-600",
                )}
              >
                <span
                  className={cx(
                    "tabular grid size-6 place-items-center rounded-full",
                    d === today && "bg-gray-1000 font-semibold text-background-100",
                  )}
                >
                  {Number(d.slice(8))}
                </span>
                <span className="flex flex-wrap gap-1">
                  {active.map((s) => (
                    <span key={s.id} className={cx("h-1.5 w-full rounded-full", colorOf.get(s.id), !inMonth && "opacity-40")} title={s.planName} />
                  ))}
                  {doneDates.has(d) && <span className="text-[10px] font-medium text-green-900">✓ done</span>}
                </span>
              </Link>
            );
          })}
        </div>
      </Card>
    </section>
  );
}

