import Link from "next/link";
import { Suspense } from "react";
import { ActionBar, Badge, Card, EmptyState, LinkButton, PageSkeleton, Row, cx } from "@/components/ui";
import { addDays, diffDays, formatDate, isISODate, startOfWeek, WEEKDAYS_SHORT } from "@/lib/dates";
import { getAgenda } from "@/lib/data";
import { userToday } from "@/lib/server";
import { DayArrows, DaySwiper, StartButton } from "./_dashboard/client";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}

async function Dashboard({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const sp = await searchParams;
  const today = await userToday();
  const date = isISODate(sp.date) ? sp.date : today;
  const week = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(date), i));
  const agenda = await getAgenda(week);
  const day = agenda.find((a) => a.date === date)!;

  const rel = diffDays(date, today);
  const title = rel === 0 ? "Today" : rel === 1 ? "Tomorrow" : rel === -1 ? "Yesterday" : formatDate(date, { weekday: "long" });
  const plannedIds = new Set(day.workouts.map((w) => w.schedule.id));
  const freestyle = day.sessions.filter((s) => !s.scheduleId || !plannedIds.has(s.scheduleId));
  const single = day.workouts.length === 1 ? day.workouts[0] : null;
  const singleSession = single && day.sessions.find((s) => s.scheduleId === single.schedule.id);

  return (
    <DaySwiper prev={addDays(date, -1)} next={addDays(date, 1)}>
      <div className="mb-2 flex items-end justify-between gap-2">
        <div>
          <p className="text-meta text-gray-900">{formatDate(date, { day: "numeric", month: "long" })}</p>
          <h1 className="text-display font-semibold tracking-tight">{title}</h1>
        </div>
        <div className="flex gap-1">
          {rel !== 0 && (
            <LinkButton href="/" replace>
              Today
            </LinkButton>
          )}
          <DayArrows prev={addDays(date, -1)} next={addDays(date, 1)} />
        </div>
      </div>

      {/* Week strip — 7 × 64px targets */}
      <div className="mb-3 grid grid-cols-7 gap-1">
        {agenda.map((a, i) => {
          const done = a.sessions.some((s) => s.finishedAt);
          const planned = a.workouts.length > 0;
          const selected = a.date === date;
          return (
            <Link
              key={a.date}
              href={a.date === today ? "/" : `/?date=${a.date}`}
              replace
              aria-label={formatDate(a.date, { weekday: "long", day: "numeric", month: "long" })}
              className={cx(
                "flex h-8 flex-col items-center justify-center rounded-sm",
                selected ? "bg-gray-1000 text-background-100" : "bg-background-100 shadow-border",
              )}
            >
              <span className={cx("text-meta", !selected && (a.date === today ? "font-semibold text-blue-900" : "text-gray-900"))}>
                {WEEKDAYS_SHORT[i][0]}
              </span>
              <span className="tabular text-body font-semibold">{Number(a.date.slice(8))}</span>
              <span
                className={cx(
                  "h-[4px] w-2 rounded-full",
                  done ? (selected ? "bg-green-700" : "bg-green-700") : planned ? (selected ? "bg-background-100" : "bg-gray-1000") : "bg-transparent",
                )}
              />
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        {day.workouts.length === 0 && freestyle.length === 0 && (
          <EmptyState title="Rest day" description="Nothing planned." action={<StartButton date={date} scheduleId={null} label="Start empty workout" variant="secondary" size="lg" />} />
        )}

        {day.workouts.map((w) => {
          const session = day.sessions.find((s) => s.scheduleId === w.schedule.id);
          return (
            <Card key={w.schedule.id}>
              <Row className="min-h-8">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-title font-semibold tracking-tight">{w.schedule.planName}</p>
                  <p className="text-meta text-gray-900">
                    Week {w.week} of {w.schedule.weeks}
                  </p>
                </div>
                {session?.finishedAt ? <Badge color="green">Done</Badge> : session ? <Badge color="amber">Started</Badge> : null}
              </Row>
              <ul className="border-t border-gray-alpha-400 pb-1">
                {w.items.map((i) => (
                  <li key={i.id} className="flex min-h-6 items-center gap-2 px-2">
                    <span className="min-w-0 flex-1 text-body">{i.exerciseName}</span>
                    <span className="tabular text-body text-gray-900">
                      {i.sets} × {i.reps}
                    </span>
                  </li>
                ))}
              </ul>
              {!single && (
                <div className="px-2 pb-2">
                  <WorkoutAction session={session} date={date} scheduleId={w.schedule.id} />
                </div>
              )}
            </Card>
          );
        })}

        {freestyle.map((s) => (
          <Card key={s.id}>
            <Link href={`/workout/${s.id}`} className="flex min-h-7 items-center justify-between px-2 text-body">
              <span className="font-medium">Workout</span>
              <span className="text-gray-900">{s.finishedAt ? "Done ›" : "Resume ›"}</span>
            </Link>
          </Card>
        ))}
      </div>

      {single && (
        <ActionBar>
          <WorkoutAction session={singleSession ?? undefined} date={date} scheduleId={single.schedule.id} />
        </ActionBar>
      )}
    </DaySwiper>
  );
}

function WorkoutAction({ session, date, scheduleId }: { session?: { id: number; finishedAt: Date | null }; date: string; scheduleId: number }) {
  if (session)
    return (
      <LinkButton href={`/workout/${session.id}`} variant={session.finishedAt ? "secondary" : "primary"} size="xl" className="w-full">
        {session.finishedAt ? "View workout" : "Resume workout"}
      </LinkButton>
    );
  return <StartButton date={date} scheduleId={scheduleId} label="Start workout" />;
}
