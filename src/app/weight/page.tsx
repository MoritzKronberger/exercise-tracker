import { Suspense } from "react";
import { saveBodyWeight } from "@/app/actions";
import { TimeLine } from "@/components/charts";
import { Button, Card, EmptyState, Input, PageHeader, PageSkeleton, Stat } from "@/components/ui";
import { addDays, formatDate } from "@/lib/dates";
import { listBodyWeights, listSchedules } from "@/lib/data";
import { fmtKg } from "@/lib/format";
import { userToday } from "@/lib/server";
import { WeightRow } from "./weight-row";

export default function WeightPage() {
  return (
    <>
      <PageHeader title="Body weight" description="Log your weight to see how it develops alongside your training blocks." />
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

async function Content() {
  const [entries, schedules, today] = await Promise.all([listBodyWeights(), listSchedules(), userToday()]);
  const latest = entries.at(-1);
  const first = entries[0];
  const avg7 = avgBetween(entries, addDays(today, -6), today);
  const avgPrev7 = avgBetween(entries, addDays(today, -13), addDays(today, -7));
  const bands = schedules.map((s) => ({ id: s.id, from: s.startDate, to: s.endDate, label: s.planName }));
  const firstDate = first?.date;
  const visibleBands = firstDate ? bands.filter((b) => b.to >= firstDate && b.from <= today) : [];

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-4">
        <form action={saveBodyWeight} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-[13px] text-gray-900">
            Date
            <Input type="date" name="date" defaultValue={today} max={today} required className="w-40" />
          </label>
          <label className="flex flex-1 flex-col gap-1.5 text-[13px] text-gray-900">
            Weight (kg)
            <Input
              name="weight"
              inputMode="decimal"
              placeholder={latest ? String(latest.weight) : "e.g. 78.4"}
              required
              pattern="[0-9]+([.,][0-9]+)?"
              autoComplete="off"
              className="min-w-24"
            />
          </label>
          <Button type="submit" variant="primary">
            Save
          </Button>
        </form>
        <p className="mt-2 text-xs text-gray-900">Saving again for the same date overwrites that day&apos;s entry.</p>
      </Card>

      {entries.length === 0 ? (
        <EmptyState title="No entries yet" description="Weigh yourself regularly, ideally at the same time of day." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Latest" value={fmtKg(latest!.weight)} hint={formatDate(latest!.date)} />
            <Stat label="7-day average" value={fmtKg(avg7)} hint={avg7 && avgPrev7 ? `${avg7 - avgPrev7 >= 0 ? "+" : ""}${(avg7 - avgPrev7).toFixed(1)} kg vs prior week` : undefined} />
            <Stat label="Change since start" value={`${latest!.weight - first.weight >= 0 ? "+" : ""}${(latest!.weight - first.weight).toFixed(1)} kg`} hint={`since ${formatDate(first.date)}`} />
            <Stat label="Entries" value={entries.length} />
          </div>

          <Card className="p-4">
            <h2 className="text-sm font-medium">Body weight (kg)</h2>
            <p className="mb-2 text-xs text-gray-900">Shaded areas are scheduled training blocks.</p>
            <TimeLine data={entries.map((e) => ({ date: e.date, value: e.weight }))} name="Body weight" unit="kg" bands={visibleBands} />
          </Card>

          <Card className="divide-y divide-gray-alpha-400">
            {[...entries].reverse().map((e, i, arr) => (
              <WeightRow key={e.id} id={e.id} date={formatDate(e.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })} weight={e.weight} delta={arr[i + 1] ? e.weight - arr[i + 1].weight : null} />
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
