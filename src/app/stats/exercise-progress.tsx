"use client";

import { useState } from "react";
import { TimeLine } from "@/components/charts";
import { Card, SectionTitle, Select, cx } from "@/components/ui";
import type { ExerciseProgressPoint } from "@/lib/data";
import { fmtWeight } from "@/lib/format";

type Item = { id: number; name: string; points: ExerciseProgressPoint[] };

export function ExerciseProgress({ exercises }: { exercises: Item[] }) {
  const [selected, setSelected] = useState(exercises[0].id);
  const ex = exercises.find((e) => e.id === selected) ?? exercises[0];
  const first = ex.points[0];
  const last = ex.points.at(-1)!;
  const pct = ex.points.length > 1 && first.bestE1rm ? ((last.bestE1rm - first.bestE1rm) / first.bestE1rm) * 100 : null;

  return (
    <section>
      <SectionTitle>Progress</SectionTitle>
      <Card className="p-2">
        <Select value={selected} onChange={(e) => setSelected(Number(e.target.value))} aria-label="Exercise">
          {exercises.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </Select>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="tabular text-display font-semibold tracking-tight">
            {fmtWeight(last.topWeight)} × {last.topReps}
          </span>
          {pct != null && <span className={cx("tabular text-body font-medium", pct >= 0 ? "text-green-900" : "text-red-900")}>{`${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`}</span>}
        </div>
        <p className="text-meta text-gray-900">Last top set · % = estimated 1RM since start</p>
        {ex.points.length > 1 && (
          <div className="mt-2">
            <p className="text-meta text-gray-900">Estimated 1RM (kg)</p>
            <TimeLine data={ex.points.map((p) => ({ date: p.date, value: Math.round(p.bestE1rm * 10) / 10 }))} name="Est. 1RM" unit="kg" height={180} />
          </div>
        )}
      </Card>
    </section>
  );
}
