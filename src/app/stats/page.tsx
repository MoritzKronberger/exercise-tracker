import Link from "next/link";
import { Suspense } from "react";
import { BandLegend, TimeBars, type Band } from "@/components/charts";
import { Card, EmptyState, LinkButton, More, PageSkeleton, SectionTitle, Stat, cx } from "@/components/ui";
import { formatDate, startOfWeek, toTs } from "@/lib/dates";
import { exerciseProgress, listExercises, listSchedules, sessionSummaries } from "@/lib/data";
import { fmtVolume } from "@/lib/format";
import { ExerciseProgress } from "./exercise-progress";

export default function StatsPage({ searchParams }: PageProps<"/stats">) {
  return (
    <>
      <h1 className="mb-2 text-display font-semibold tracking-tight">Stats</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const DAY = 86_400_000;

async function Content({ searchParams }: { searchParams: PageProps<"/stats">["searchParams"] }) {
  const sp = await searchParams;
  const [summariesAll, schedules, progress, exercises] = await Promise.all([
    sessionSummaries(),
    listSchedules(),
    exerciseProgress(),
    listExercises(true),
  ]);

  if (!summariesAll.some((s) => s.sets > 0)) {
    return <EmptyState title="No data yet" description="Finish a workout to see stats." action={<LinkButton href="/" className="w-full">Go to today</LinkButton>} />;
  }

  const block = schedules.find((s) => s.id === Number(sp.block)) ?? null;
  const from = block?.startDate ?? "0000-01-01";
  const to = block?.endDate ?? "9999-12-31";
  const inRange = (d: string) => d >= from && d <= to;
  const summaries = summariesAll.filter((s) => s.sets > 0 && inRange(s.date));

  const weekly = new Map<string, number>();
  for (const s of summaries) weekly.set(startOfWeek(s.date), (weekly.get(startOfWeek(s.date)) ?? 0) + s.volume);
  const weeklyData = [...weekly.entries()].sort().map(([date, value]) => ({ date, value }));

  const allTs = summaries.map((s) => toTs(s.date));
  const domain: [number, number] | undefined = block
    ? [toTs(block.startDate) - DAY, toTs(block.endDate) + 2 * DAY]
    : allTs.length
      ? [Math.min(...allTs) - 4 * DAY, Math.max(...allTs) + 7 * DAY]
      : undefined;
  const bands: Band[] = schedules
    .map((s) => ({ id: s.id, from: s.startDate, to: s.endDate, label: s.planName }))
    .filter((b) => !domain || (toTs(b.to) >= domain[0] && toTs(b.from) <= domain[1]));

  const exName = new Map(exercises.map((e) => [e.id, e.name]));
  const sessionIds = new Set(summaries.map((s) => s.id));
  const progressList = [...progress.entries()]
    .map(([id, pts]) => ({ id, name: exName.get(id) ?? "Unknown", points: pts.filter((p) => sessionIds.has(p.sessionId)) }))
    .filter((p) => p.points.length > 0)
    .sort((a, b) => b.points.length - a.points.length || a.name.localeCompare(b.name));
  const totalVolume = summaries.reduce((n, s) => n + s.volume, 0);

  return (
    <div className="flex flex-col gap-3">
      {schedules.length > 0 && (
        <div className="-mx-2 flex gap-1 overflow-x-auto px-2">
          <Chip href="/stats" active={!block}>
            All time
          </Chip>
          {schedules.map((s) => (
            <Chip key={s.id} href={`/stats?block=${s.id}`} active={block?.id === s.id}>
              {s.planName} · {formatDate(s.startDate, { month: "short" })}
            </Chip>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-1">
        <Stat label="Workouts" value={summaries.length} />
        <Stat label="Volume" value={fmtVolume(totalVolume)} />
      </div>

      {progressList.length > 0 && <ExerciseProgress exercises={progressList} />}

      {weeklyData.length > 0 && (
        <section>
          <SectionTitle>Volume per week</SectionTitle>
          <Card className="p-2">
            <TimeBars data={weeklyData} name="Volume" unit="kg" bands={bands} domain={domain} height={160} barWidth={24} />
            <BandLegend bands={bands} />
          </Card>
        </section>
      )}

      {summaries.length > 0 && (
        <More label="History">
          <Card className="overflow-hidden">
            {summaries.map((s) => (
              <Link key={s.id} href={`/workout/${s.id}`} className="flex min-h-7 items-center gap-2 px-2 active:bg-gray-alpha-100 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-gray-alpha-400">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body">{s.planName ?? "Workout"}</p>
                  <p className="text-meta text-gray-900">{formatDate(s.date, { weekday: "short", day: "numeric", month: "short" })}</p>
                </div>
                <span className="tabular text-body font-medium">{fmtVolume(s.volume)}</span>
              </Link>
            ))}
          </Card>
        </More>
      )}
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      replace
      scroll={false}
      className={cx(
        "flex h-6 shrink-0 items-center rounded-full px-2 text-body whitespace-nowrap",
        active ? "bg-gray-1000 text-background-100" : "bg-background-100 text-gray-1000 shadow-border",
      )}
    >
      {children}
    </Link>
  );
}
