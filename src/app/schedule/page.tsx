import Link from "next/link";
import { Suspense } from "react";
import { createSchedule } from "@/app/actions";
import { LibraryTabs } from "@/components/library-tabs";
import { Badge, Button, Card, EmptyState, Field, Input, LinkButton, PageSkeleton, Select, SectionTitle, cx } from "@/components/ui";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";
import { addDays, formatDate, scheduleWeek, startOfWeek, weekdayOf, WEEKDAYS_SHORT } from "@/lib/dates";
import { getPlanItems, listPlans, listSchedules, sessionSummaries } from "@/lib/data";
import { userToday } from "@/lib/server";
import { DeleteScheduleButton, WeeksField } from "./schedule-client";

export default function SchedulePage({ searchParams }: PageProps<"/schedule">) {
  return (
    <>
      <h1 className="mb-2 text-display font-semibold tracking-tight">Plans</h1>
      <LibraryTabs active="schedule" />
      <Suspense fallback={<PageSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const PALETTE = ["bg-blue-700", "bg-amber-700", "bg-green-700", "bg-red-700", "bg-gray-1000"];
const short = (d: string) => formatDate(d, { day: "numeric", month: "short" });

async function Content({ searchParams }: { searchParams: PageProps<"/schedule">["searchParams"] }) {
  const sp = await searchParams;
  const [plans, schedules, today, summaries] = await Promise.all([listPlans(), listSchedules(), userToday(), sessionSummaries()]);
  const items = await getPlanItems(plans.map((p) => p.id));
  const preselect = Number(sp.plan) || plans[0]?.id;
  const month = typeof sp.month === "string" && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : today.slice(0, 7);
  const nextMonday = weekdayOf(today) === 0 ? today : addDays(startOfWeek(today), 7);
  const colorOf = new Map([...schedules].reverse().map((s, i) => [s.id, PALETTE[i % PALETTE.length]]));

  return (
    <div className="flex flex-col gap-3">
      <Calendar month={month} today={today} schedules={schedules} items={items} colorOf={colorOf} doneDates={new Set(summaries.filter((s) => s.sets > 0).map((s) => s.date))} />

      {schedules.length > 0 && (
        <Card className="overflow-hidden">
          {schedules.map((s) => {
            const week = scheduleWeek(s.startDate, s.weeks, today);
            return (
              <div key={s.id} className="flex min-h-7 items-center gap-2 pl-2 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-gray-alpha-400">
                <span className={cx("size-2 shrink-0 rounded-full", colorOf.get(s.id))} />
                <Link href={`/plans/${s.planId}`} className="flex min-h-7 min-w-0 flex-1 flex-col justify-center">
                  <span className="truncate text-body font-medium">{s.planName}</span>
                  <span className="text-meta text-gray-900">
                    {short(s.startDate)} – {short(s.endDate)}
                  </span>
                </Link>
                {week ? <Badge color="green">Week {week}</Badge> : s.startDate > today ? <Badge color="blue">Next</Badge> : <Badge>Done</Badge>}
                <DeleteScheduleButton id={s.id} name={s.planName} />
              </div>
            );
          })}
        </Card>
      )}

      <section>
        <SectionTitle>New schedule</SectionTitle>
        {plans.length === 0 ? (
          <EmptyState title="No plans yet" action={<LinkButton href="/plans" className="w-full">Create a plan</LinkButton>} />
        ) : (
          <form action={createSchedule} className="flex flex-col gap-2">
            <Field label="Plan">
              <Select name="planId" defaultValue={preselect} required>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Start">
              <Input type="date" name="startDate" defaultValue={nextMonday} required />
            </Field>
            <WeeksField />
            <Button type="submit" variant="primary" size="xl">
              Add schedule
            </Button>
          </form>
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
  doneDates,
}: {
  month: string;
  today: string;
  schedules: Awaited<ReturnType<typeof listSchedules>>;
  items: Awaited<ReturnType<typeof getPlanItems>>;
  colorOf: Map<number, string>;
  doneDates: Set<string>;
}) {
  const first = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const days = Array.from({ length: 42 }, (_, i) => addDays(startOfWeek(first), i));
  const grid = days.slice(35).every((d) => d.slice(0, 7) !== month) ? days.slice(0, 35) : days;

  return (
    <section>
      <div className="mb-1 flex items-center">
        <h2 className="flex-1 text-title font-semibold tracking-tight">{formatDate(first, { month: "long", year: "numeric" })}</h2>
        <LinkButton href={`/schedule?month=${prev}`} variant="ghost" className="px-0" aria-label="Previous month" replace>
          <IconChevronLeft size={24} />
        </LinkButton>
        <LinkButton href={`/schedule?month=${next}`} variant="ghost" className="px-0" aria-label="Next month" replace>
          <IconChevronRight size={24} />
        </LinkButton>
      </div>
      <Card className="overflow-hidden">
        <div className="grid grid-cols-7 text-center text-meta text-gray-900">
          {WEEKDAYS_SHORT.map((d) => (
            <div key={d} className="flex h-4 items-center justify-center">
              {d[0]}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((d) => {
            const wd = weekdayOf(d);
            const active = schedules.find((s) => scheduleWeek(s.startDate, s.weeks, d) !== null && items.some((i) => i.planId === s.planId && i.weekday === wd));
            const inMonth = d.slice(0, 7) === month;
            const done = doneDates.has(d);
            return (
              <Link
                key={d}
                href={`/?date=${d}`}
                className={cx("flex h-7 flex-col items-center justify-center gap-[4px] border-t border-gray-alpha-400 active:bg-gray-alpha-100", !inMonth && "opacity-40")}
              >
                <span className={cx("tabular grid size-4 place-items-center rounded-full text-body", d === today && "bg-gray-1000 font-semibold text-background-100")}>
                  {Number(d.slice(8))}
                </span>
                <span className={cx("h-[4px] w-3 rounded-full", done ? "bg-green-700" : active ? colorOf.get(active.id) : "bg-transparent")} />
              </Link>
            );
          })}
        </div>
      </Card>
      <p className="mt-1 flex items-center gap-1 text-meta text-gray-900">
        <span className="h-[4px] w-3 rounded-full bg-green-700" /> done
      </p>
    </section>
  );
}
