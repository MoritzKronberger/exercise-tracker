import Link from "next/link";
import { Suspense } from "react";
import { Badge, Card, EmptyState, LinkButton, PageSkeleton, cx } from "@/components/ui";
import { IconCheck } from "@/components/icons";
import { addDays, diffDays, formatDate, isISODate, startOfWeek, WEEKDAYS_SHORT } from "@/lib/dates";
import { exerciseProgress, getAgenda, listBodyWeights, sessionSummaries } from "@/lib/data";
import { fmtKg, fmtVolume } from "@/lib/format";
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
  const weekStart = startOfWeek(date);
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const [agenda, progress, summaries, weights] = await Promise.all([
    getAgenda(week),
    exerciseProgress(),
    sessionSummaries(),
    listBodyWeights(),
  ]);
  const day = agenda.find((a) => a.date === date)!;
  const rel = diffDays(date, today);
  const relLabel = rel === 0 ? "Today" : rel === 1 ? "Tomorrow" : rel === -1 ? "Yesterday" : formatDate(date, { weekday: "long" });

  const thisWeek = summaries.filter((s) => s.date >= startOfWeek(today) && s.date <= today);
  const latestWeight = weights.at(-1);
  const plannedIds = new Set(day.workouts.map((w) => w.schedule.id));
  const otherSessions = day.sessions.filter((s) => !s.scheduleId || !plannedIds.has(s.scheduleId));

  return (
    <DaySwiper prev={addDays(date, -1)} next={addDays(date, 1)}>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-gray-900">{formatDate(date, { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{relLabel}</h1>
        </div>
        <div className="flex items-center gap-1">
          {rel !== 0 && (
            <LinkButton href="/" size="small" replace>
              Today
            </LinkButton>
          )}
          <DayArrows prev={addDays(date, -1)} next={addDays(date, 1)} />
        </div>
      </div>

      {/* Week strip */}
      <div className="mb-6 grid grid-cols-7 gap-1.5">
        {agenda.map((a, i) => {
          const done = a.sessions.some((s) => s.finishedAt);
          const planned = a.workouts.length > 0;
          return (
            <Link
              key={a.date}
              href={a.date === today ? "/" : `/?date=${a.date}`}
              replace
              className={cx(
                "flex flex-col items-center gap-1 rounded-lg py-2 text-xs transition-colors",
                a.date === date ? "bg-gray-1000 text-background-100" : "bg-background-100 shadow-border hover:bg-gray-100",
              )}
            >
              <span className={cx("text-[11px]", a.date === date ? "opacity-70" : "text-gray-900")}>{WEEKDAYS_SHORT[i]}</span>
              <span className={cx("tabular text-base font-semibold", a.date === today && a.date !== date && "text-blue-900")}>
                {Number(a.date.slice(8))}
              </span>
              <span className="flex h-3 items-center">
                {done ? (
                  <IconCheck size={12} className={a.date === date ? "" : "text-green-900"} />
                ) : planned ? (
                  <span className={cx("size-1.5 rounded-full", a.date === date ? "bg-background-100" : "bg-gray-1000")} />
                ) : null}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col gap-4">
        {day.workouts.length === 0 && otherSessions.length === 0 && (
          <EmptyState
            title="Rest day"
            description={
              <>
                Nothing scheduled for this day. <Link href="/schedule" className="text-blue-900 hover:underline">Schedule a plan</Link> or log a
                freestyle workout.
              </>
            }
            action={<StartButton date={date} scheduleId={null} label="Start freestyle workout" variant="secondary" />}
          />
        )}

        {day.workouts.map((w) => {
          const session = day.sessions.find((s) => s.scheduleId === w.schedule.id);
          return (
            <Card key={w.schedule.id} className="overflow-hidden">
              <div className="flex items-center gap-2 border-b border-gray-alpha-400 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{w.schedule.planName}</p>
                  <p className="text-xs text-gray-900">
                    Week {w.week} of {w.schedule.weeks} · {w.items.length} exercises · {w.items.reduce((n, i) => n + i.sets, 0)} sets
                  </p>
                </div>
                {session?.finishedAt ? <Badge color="green">Completed</Badge> : session ? <Badge color="amber">In progress</Badge> : null}
              </div>
              <ul className="divide-y divide-gray-alpha-200">
                {w.items.map((i) => {
                  const last = progress.get(i.exerciseId)?.filter((p) => p.date < date).at(-1);
                  return (
                    <li key={i.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="min-w-0 flex-1 truncate text-sm">{i.exerciseName}</span>
                      {last && <span className="tabular text-xs text-gray-900">last {fmtKg(last.topWeight)}</span>}
                      <span className="tabular w-14 text-right text-sm font-medium">
                        {i.sets} × {i.reps}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="p-3">
                {session ? (
                  <LinkButton href={`/workout/${session.id}`} variant={session.finishedAt ? "secondary" : "primary"} size="large" className="w-full">
                    {session.finishedAt ? "View workout" : "Resume workout"}
                  </LinkButton>
                ) : (
                  <StartButton date={date} scheduleId={w.schedule.id} label={rel > 0 ? "Start early" : "Start workout"} />
                )}
              </div>
            </Card>
          );
        })}

        {otherSessions.map((s) => (
          <Card key={s.id} className="flex items-center gap-3 p-4">
            <div className="flex-1">
              <p className="font-medium">Freestyle workout</p>
              <p className="text-xs text-gray-900">{s.finishedAt ? "Completed" : "In progress"}</p>
            </div>
            <LinkButton href={`/workout/${s.id}`} size="small" variant={s.finishedAt ? "secondary" : "primary"}>
              {s.finishedAt ? "View" : "Resume"}
            </LinkButton>
          </Card>
        ))}

        {day.workouts.length > 0 && (
          <div className="text-center">
            <StartButton date={date} scheduleId={null} label="Or start a freestyle workout" variant="tertiary" size="small" />
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3">
        <MiniStat label="This week" value={`${thisWeek.filter((s) => s.sets > 0).length} workout${thisWeek.filter((s) => s.sets > 0).length === 1 ? "" : "s"}`} />
        <MiniStat label="Week volume" value={fmtVolume(thisWeek.reduce((n, s) => n + s.volume, 0))} />
        <Link href="/weight">
          <MiniStat label="Body weight" value={latestWeight ? fmtKg(latestWeight.weight) : "Log →"} />
        </Link>
      </div>
      <p className="mt-6 text-center text-xs text-gray-700 md:hidden">Swipe left or right to browse days</p>
    </DaySwiper>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3">
      <p className="text-[11px] text-gray-900">{label}</p>
      <p className="tabular mt-0.5 truncate text-sm font-semibold">{value}</p>
    </Card>
  );
}
