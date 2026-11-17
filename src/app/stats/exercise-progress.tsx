"use client";

import { useState } from "react";
import { ProgressLines } from "@/components/charts";
import { Card, Select, cx } from "@/components/ui";
import type { ExerciseProgressPoint } from "@/lib/data";
import { fmtVolume, fmtWeight } from "@/lib/format";

type Item = { id: number; name: string; points: ExerciseProgressPoint[] };

function change(points: ExerciseProgressPoint[]) {
  if (points.length < 2) return null;
  const a = points[0].bestE1rm;
  const b = points.at(-1)!.bestE1rm;
  return a ? ((b - a) / a) * 100 : null;
}

export function ExerciseProgress({ exercises }: { exercises: Item[] }) {
  const [selected, setSelected] = useState(exercises[0].id);
  const ex = exercises.find((e) => e.id === selected) ?? exercises[0];
  const best = ex.points.reduce((a, p) => (p.bestE1rm > a.bestE1rm ? p : a), ex.points[0]);
  const top = ex.points.reduce((a, p) => (p.topWeight > a.topWeight ? p : a), ex.points[0]);
  const pct = change(ex.points);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium">Exercise progression</h2>
      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Select value={selected} onChange={(e) => setSelected(Number(e.target.value))} className="w-auto min-w-48">
            {exercises.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </Select>
          <div className="tabular flex gap-4 text-xs text-gray-900">
            <span>
              Best set <b className="font-semibold text-gray-1000">{fmtWeight(top.topWeight)} kg × {top.topReps}</b>
            </span>
            <span>
              Best e1RM <b className="font-semibold text-gray-1000">{fmtWeight(best.bestE1rm)} kg</b>
            </span>
            {pct != null && (
              <span className={cx("font-medium", pct >= 0 ? "text-green-900" : "text-red-900")}>
                {pct >= 0 ? "+" : ""}
                {pct.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        {ex.points.length > 1 ? (
          <ProgressLines data={ex.points.map((p) => ({ date: p.date, top: p.topWeight, e1rm: p.bestE1rm }))} />
        ) : (
          <p className="py-10 text-center text-sm text-gray-900">Log this exercise in at least two workouts to see a trend.</p>
        )}
        <p className="mt-2 text-xs text-gray-900">Est. 1RM uses the Epley formula (weight × (1 + reps / 30)), so extra reps count as progress too.</p>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-gray-alpha-400 text-left text-xs text-gray-900">
              <th className="px-4 py-2 font-medium">Exercise</th>
              <th className="px-2 py-2 text-right font-medium">Sessions</th>
              <th className="px-2 py-2 text-right font-medium">Last top set</th>
              <th className="px-2 py-2 text-right font-medium">Best e1RM</th>
              <th className="px-2 py-2 text-right font-medium">Volume</th>
              <th className="px-4 py-2 text-right font-medium">Change</th>
            </tr>
          </thead>
          <tbody className="tabular">
            {exercises.map((e) => {
              const last = e.points.at(-1)!;
              const c = change(e.points);
              return (
                <tr
                  key={e.id}
                  onClick={() => setSelected(e.id)}
                  className={cx("cursor-pointer border-b border-gray-alpha-200 last:border-0 hover:bg-gray-alpha-100", e.id === selected && "bg-gray-alpha-100")}
                >
                  <td className="px-4 py-2.5 font-medium">{e.name}</td>
                  <td className="px-2 py-2.5 text-right">{e.points.length}</td>
                  <td className="px-2 py-2.5 text-right">
                    {fmtWeight(last.topWeight)} × {last.topReps}
                  </td>
                  <td className="px-2 py-2.5 text-right">{fmtWeight(Math.max(...e.points.map((p) => p.bestE1rm)))}</td>
                  <td className="px-2 py-2.5 text-right">{fmtVolume(e.points.reduce((n, p) => n + p.volume, 0))}</td>
                  <td className={cx("px-4 py-2.5 text-right", c == null ? "text-gray-700" : c >= 0 ? "text-green-900" : "text-red-900")}>
                    {c == null ? "–" : `${c >= 0 ? "+" : ""}${c.toFixed(1)}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
