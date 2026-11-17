import Link from "next/link";
import { Suspense } from "react";
import { BandLegend, TimeBars, TimeLine, type Band } from "@/components/charts";
import { Badge, Card, EmptyState, LinkButton, PageHeader, PageSkeleton, Stat, cx } from "@/components/ui";
import { IconChevronRight } from "@/components/icons";
import { formatDate, startOfWeek, toTs } from "@/lib/dates";
import { exerciseProgress, getPlanItems, listBodyWeights, listExercises, listSchedules, sessionSummaries } from "@/lib/data";
import { fmtDuration, fmtKg, fmtVolume } from "@/lib/format";
import { userToday } from "@/lib/server";
import { ExerciseProgress } from "./exercise-progress";

export default function StatsPage({ searchParams }: PageProps<"/stats">) {
  return (
    <>
      <PageHeader title="Statistics" description="Volume, progression and body weight across your training blocks." />
      <Suspense fallback={<PageSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const DAY = 86_400_000;

function weightAt(entries: { date: string; weight: number }[], date: string, dir: "before" | "after") {
  if (dir === "after") return entries.find((e) => e.date >= date) ?? null;
  return [...entries].reverse().find((e) => e.date <= date) ?? null;
}

async function Content({ searchParams }: { searchParams: PageProps<"/stats">["searchParams"] }) {
  const sp = await searchParams;
  const [summariesAll, schedules, weights, progress, exercises, today] = await Promise.all([
    sessionSummaries(),
    listSchedules(),
    listBodyWeights(),
    exerciseProgress(),
    listExercises(true),
    userToday(),
  ]);
  const items = await getPlanItems([...new Set(schedules.map((s) => s.planId))]);

  const block = schedules.find((s) => s.id === Number(sp.block)) ?? null;
  const from = block?.startDate ?? "0000-01-01";
  const to = block?.endDate ?? "9999-12-31";
  const inRange = (d: string) => d >= from && d <= to;

  const summaries = summariesAll.filter((s) => s.sets > 0 && inRange(s.date));
  const weightsInRange = weights.filter((w) => inRange(w.date));
  const bands: Band[] = schedules.map((s) => ({ id: s.id, from: s.startDate, to: s.endDate, label: s.planName }));

  if (!summariesAll.some((s) => s.sets > 0) && !weights.length) {
    return (
      <EmptyState
        title="No data yet"
        description="Complete a workout or log your body weight and your statistics will show up here."
        action={<LinkButton href="/">Go to today</LinkButton>}
      />
    );
  }

  const totalVolume = summaries.reduce((n, s) => n + s.volume, 0);
  const totalSets = summaries.reduce((n, s) => n + s.sets, 0);
  const totalReps = summaries.reduce((n, s) => n + s.reps, 0);
  const durations = summaries
    .filter((s) => s.finishedAt || s.lastSetAt)
    .map((s) => (new Date((s.finishedAt ?? s.lastSetAt)!).getTime() - new Date(s.startedAt).getTime()) / 1000)
    .filter((d) => d > 0 && d < 6 * 3600);
  const avgDuration = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
  const wStart = weightsInRange[0];
  const wEnd = weightsInRange.at(-1);

  // Weekly volume, aligned with the body weight chart.
  const weekly = new Map<string, number>();
  for (const s of summaries) weekly.set(startOfWeek(s.date), (weekly.get(startOfWeek(s.date)) ?? 0) + s.volume);
  const weeklyData = [...weekly.entries()].sort().map(([date, value]) => ({ date, value }));

  const allTs = [...summaries.map((s) => toTs(s.date)), ...weightsInRange.map((w) => toTs(w.date))];
  const sharedDomain: [number, number] | undefined = block
    ? [toTs(block.startDate) - DAY, toTs(block.endDate) + 2 * DAY]
    : allTs.length
      ? [Math.min(...allTs) - 4 * DAY, Math.max(...allTs) + 7 * DAY]
      : undefined;
  const visibleBands = sharedDomain ? bands.filter((b) => toTs(b.to) >= sharedDomain[0] && toTs(b.from) <= sharedDomain[1]) : bands;

  const exName = new Map(exercises.map((e) => [e.id, e.name]));
  const sessionIds = new Set(summaries.map((s) => s.id));
  const progressList = [...progress.entries()]
    .map(([id, pts]) => ({ id, name: exName.get(id) ?? "Unknown", points: pts.filter((p) => sessionIds.has(p.sessionId)) }))
    .filter((p) => p.points.length > 0)
    .sort((a, b) => b.points.length - a.points.length || a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-6">
      {/* Block filter */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <FilterChip href="/stats" active={!block}>
          All time
        </FilterChip>
        {schedules.map((s) => (
          <FilterChip key={s.id} href={`/stats?block=${s.id}`} active={block?.id === s.id}>
            {s.planName} · {formatDate(s.startDate, { month: "short", year: "2-digit" })}
          </FilterChip>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Workouts" value={summaries.length} hint={block ? `of ${new Set(items.filter((i) => i.planId === block.planId).map((i) => i.weekday)).size * block.weeks} planned` : undefined} />
        <Stat label="Total volume" value={fmtVolume(totalVolume)} hint={summaries.length ? `${fmtVolume(totalVolume / summaries.length)} per workout` : undefined} />
        <Stat label="Sets · reps" value={`${totalSets} · ${totalReps}`} hint={avgDuration ? `avg ${fmtDuration(avgDuration)} per workout` : undefined} />
        <Stat
          label="Body weight"
          value={wEnd ? fmtKg(wEnd.weight) : "–"}
          hint={wStart && wEnd && wStart !== wEnd ? `${wEnd.weight - wStart.weight >= 0 ? "+" : ""}${(wEnd.weight - wStart.weight).toFixed(1)} kg since ${formatDate(wStart.date, { day: "numeric", month: "short" })}` : undefined}
        />
      </div>

      {summaries.length > 0 && (
        <Card className="p-4">
          <h2 className="text-sm font-medium">Volume per workout (kg)</h2>
          <p className="mb-2 text-xs text-gray-900">Weight × reps, summed over all sets of a session.</p>
          <TimeBars data={summaries.map((s) => ({ date: s.date, value: s.volume }))} name="Volume" unit="kg" bands={visibleBands} domain={sharedDomain} />
          <BandLegend bands={visibleBands} />
        </Card>
      )}

      {(weightsInRange.length > 0 || weeklyData.length > 0) && (
        <Card className="p-4">
          <h2 className="text-sm font-medium">Body weight vs. training</h2>
          <p className="mb-3 text-xs text-gray-900">Both charts share one timeline; shaded areas are training blocks.</p>
          {weightsInRange.length > 0 ? (
            <>
              <p className="text-xs font-medium text-gray-900">Body weight (kg)</p>
              <TimeLine data={weightsInRange.map((w) => ({ date: w.date, value: w.weight }))} name="Body weight" unit="kg" bands={visibleBands} domain={sharedDomain} height={180} />
            </>
          ) : (
            <p className="py-6 text-center text-sm text-gray-900">
              No body weight entries in this period. <Link className="text-blue-900 hover:underline" href="/weight">Log weight</Link>
            </p>
          )}
          {weeklyData.length > 0 && (
            <>
              <p className="mt-4 text-xs font-medium text-gray-900">Weekly volume (kg)</p>
              <TimeBars data={weeklyData} name="Weekly volume" unit="kg" bands={visibleBands} domain={sharedDomain} height={150} barWidth={28} />
            </>
          )}
          <BandLegend bands={visibleBands} />
        </Card>
      )}

      {progressList.length > 0 && <ExerciseProgress exercises={progressList} />}

      {!block && schedules.length > 0 && (
        <section>
          <h2 className="mb-3 font-medium">Training blocks</h2>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-alpha-400 text-left text-xs text-gray-900">
                  <th className="px-4 py-2 font-medium">Plan</th>
                  <th className="hidden px-2 py-2 font-medium sm:table-cell">Period</th>
                  <th className="px-2 py-2 text-right font-medium">Workouts</th>
                  <th className="hidden px-2 py-2 text-right font-medium sm:table-cell">Volume</th>
                  <th className="px-4 py-2 text-right font-medium">Weight Δ</th>
                </tr>
              </thead>
              <tbody className="tabular">
                {schedules.map((s) => {
                  const ss = summariesAll.filter((x) => x.sets > 0 && x.date >= s.startDate && x.date <= s.endDate);
                  const planned = new Set(items.filter((i) => i.planId === s.planId).map((i) => i.weekday)).size * s.weeks;
                  const vol = ss.reduce((n, x) => n + x.volume, 0);
                  const w0 = weightAt(weights, s.startDate, "after");
                  const w1 = weightAt(weights, s.endDate < today ? s.endDate : today, "before");
                  const wDelta = w0 && w1 && w1.date >= w0.date && w0.date <= s.endDate ? w1.weight - w0.weight : null;
                  return (
                    <tr key={s.id} className="border-b border-gray-alpha-200 last:border-0">
                      <td className="px-4 py-2.5">
                        <Link href={`/stats?block=${s.id}`} className="font-medium hover:underline">
                          {s.planName}
                        </Link>
                        {s.startDate <= today && s.endDate >= today && <Badge color="green" className="ml-2">Active</Badge>}
                        <p className="text-xs text-gray-900 sm:hidden">
                          {formatDate(s.startDate, { day: "numeric", month: "short" })} – {formatDate(s.endDate, { day: "numeric", month: "short" })} · {fmtVolume(vol)}
                        </p>
                      </td>
                      <td className="hidden px-2 py-2.5 text-gray-900 sm:table-cell">
                        {formatDate(s.startDate, { day: "numeric", month: "short" })} – {formatDate(s.endDate, { day: "numeric", month: "short", year: "2-digit" })}
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        {ss.length}/{planned}
                      </td>
                      <td className="hidden px-2 py-2.5 text-right sm:table-cell">{fmtVolume(vol)}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        {wDelta == null ? "–" : `${wDelta >= 0 ? "+" : ""}${wDelta.toFixed(1)} kg`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </section>
      )}

      {summaries.length > 0 && (
        <section>
          <h2 className="mb-3 font-medium">Workout history</h2>
          <Card className="divide-y divide-gray-alpha-400">
            {summaries.slice(0, 10).map((s) => (
              <HistoryRow key={s.id} s={s} />
            ))}
          </Card>
          {summaries.length > 10 && (
            <details className="group mt-3">
              <summary className="cursor-pointer list-none py-2 text-center text-sm font-medium text-gray-900 hover:text-gray-1000 group-open:hidden">
                Show all {summaries.length} workouts
              </summary>
              <Card className="divide-y divide-gray-alpha-400">
                {summaries.slice(10).map((s) => (
                  <HistoryRow key={s.id} s={s} />
                ))}
              </Card>
            </details>
          )}
        </section>
      )}
    </div>
  );
}

function HistoryRow({ s }: { s: Awaited<ReturnType<typeof sessionSummaries>>[number] }) {
  return (
    <Link href={`/workout/${s.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-alpha-100">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{s.planName ?? "Freestyle workout"}</p>
        <p className="text-xs text-gray-900">
          {formatDate(s.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })} · {s.sets} sets · {s.reps} reps
        </p>
      </div>
      {!s.finishedAt && <Badge color="amber">Open</Badge>}
      <span className="tabular text-sm font-medium">{fmtVolume(s.volume)}</span>
      <IconChevronRight className="text-gray-700" />
    </Link>
  );
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      replace
      scroll={false}
      className={cx(
        "inline-flex h-8 shrink-0 items-center rounded-full px-3 text-sm whitespace-nowrap transition-colors",
        active ? "bg-gray-1000 text-background-100" : "bg-background-100 text-gray-1000 shadow-border hover:bg-gray-100",
      )}
    >
      {children}
    </Link>
  );
}
