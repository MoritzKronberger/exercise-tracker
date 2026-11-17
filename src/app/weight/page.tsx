import { Suspense } from "react";
import { BandLegend, TimeLine } from "@/components/charts";
import { Card, More, PageSkeleton, SectionTitle, Stat } from "@/components/ui";
import { addDays, formatDate } from "@/lib/dates";
import { listBodyWeights, listSchedules } from "@/lib/data";
import { userToday } from "@/lib/server";
import { WeightForm } from "./weight-form";
import { WeightRow } from "./weight-row";

export default function WeightPage() {
  return (
    <>
      <h1 className="mb-2 text-display font-semibold tracking-tight">Weight</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </>
  );
}

function avgBetween(entries: { date: string; weight: number }[], from: string, to: string) {
  const xs = entries.filter((e) => e.date >= from && e.date <= to);
  return xs.length ? xs.reduce((n, e) => n + e.weight, 0) / xs.length : null;
}

const signed = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)} kg`;

async function Content() {
  const [entries, schedules, today] = await Promise.all([listBodyWeights(), listSchedules(), userToday()]);
  const latest = entries.at(-1);
  const first = entries[0];
  const avg7 = avgBetween(entries, addDays(today, -6), today);
  const bands = first
    ? schedules.filter((s) => s.endDate >= first.date && s.startDate <= today).map((s) => ({ id: s.id, from: s.startDate, to: s.endDate, label: s.planName }))
    : [];
  const rows = [...entries].reverse().map((e, i, arr) => ({
    id: e.id,
    date: formatDate(e.date, e.date.slice(0, 4) === today.slice(0, 4) ? { weekday: "short", day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" }),
    weight: e.weight,
    delta: arr[i + 1] ? e.weight - arr[i + 1].weight : null,
  }));

  return (
    <div className="flex flex-col gap-3">
      <WeightForm key={latest?.id ?? 0} today={today} last={latest?.weight ?? null} />

      {entries.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-1">
            <Stat label="7-day average" value={avg7 == null ? "–" : `${avg7.toFixed(1)} kg`} />
            <Stat label="Since start" value={signed(latest!.weight - first.weight)} />
          </div>

          {entries.length > 1 && (
            <section>
              <SectionTitle>Trend</SectionTitle>
              <Card className="p-2">
                <TimeLine data={entries.map((e) => ({ date: e.date, value: e.weight }))} name="Body weight" unit="kg" bands={bands} height={180} />
                <BandLegend bands={bands} />
              </Card>
            </section>
          )}

          <More label={`All entries (${rows.length})`}>
            <Card className="overflow-hidden">
              {rows.map((r) => (
                <WeightRow key={r.id} {...r} />
              ))}
            </Card>
          </More>
        </>
      )}
    </div>
  );
}
