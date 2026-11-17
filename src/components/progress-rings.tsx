import type { Adherence } from "@/lib/adherence";
import { Card, cx } from "./ui";

const SIZE = 96; // 12 grid units
const STROKE = 12;
const GAP = 4;
const C = SIZE / 2;

type Segment = { value: number; color: string; label: string };

/** One ring. Segments are drawn clockwise from 12 o'clock with a small gap between them. */
function Ring({ r, total, segments, round }: { r: number; total: number; segments: Segment[]; round?: boolean }) {
  const circ = 2 * Math.PI * r;
  const shown = segments.filter((s) => s.value > 0);
  const gap = shown.length > 1 ? 2 : 0;
  let offset = 0;
  return (
    <g transform={`rotate(-90 ${C} ${C})`}>
      <circle cx={C} cy={C} r={r} fill="none" stroke="var(--ds-gray-200)" strokeWidth={STROKE} />
      {total > 0 &&
        shown.map((s) => {
          const len = Math.max(0, (s.value / total) * circ - gap);
          const el = (
            <circle
              key={s.label}
              cx={C}
              cy={C}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={STROKE}
              strokeLinecap={round && len > STROKE ? "round" : "butt"}
              strokeDasharray={`${round && len > STROKE ? len - STROKE + 0.01 : len} ${circ}`}
              strokeDashoffset={-(offset + (round && len > STROKE ? STROKE / 2 : 0))}
            >
              <title>{`${s.label}: ${s.value}`}</title>
            </circle>
          );
          offset += (s.value / total) * circ;
          return el;
        })}
    </g>
  );
}

const ON_TIME = "var(--ds-green-700)";
const LATE = "var(--ds-amber-700)";
const SKIPPED = "var(--ds-red-700)";
const WEEK = "var(--ds-blue-700)";

/** Apple-style activity rings: outer = this week, inner = the whole training block. */
export function ProgressRings({ a, weekLabel }: { a: Adherence; weekLabel: string }) {
  const weekClosed = a.week.planned > 0 && a.week.done >= a.week.planned;
  const outer = SIZE / 2 - STROKE / 2;
  const inner = outer - STROKE - GAP;
  const rows: { color: string; label: string; value: string; shape: "ring" | "dot" }[] = [
    { color: WEEK, label: weekClosed ? "Week closed ✓" : "This week", value: `${a.week.done}/${a.week.planned}`, shape: "ring" },
    { color: ON_TIME, label: "On time", value: String(a.onTime), shape: "dot" },
    { color: LATE, label: "Late", value: String(a.late), shape: "dot" },
    { color: SKIPPED, label: "Skipped", value: String(a.skipped), shape: "dot" },
  ];

  return (
    <Card className="flex items-center gap-2 p-2">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="shrink-0" role="img" aria-label={`This week ${a.week.done} of ${a.week.planned} workouts. Block: ${a.onTime} on time, ${a.late} late, ${a.skipped} skipped, ${a.remaining} to go.`}>
        <Ring r={outer} total={a.week.planned} segments={[{ value: a.week.done, color: WEEK, label: "This week" }]} round />
        <Ring
          r={inner}
          total={a.total}
          segments={[
            { value: a.onTime, color: ON_TIME, label: "On time" },
            { value: a.late, color: LATE, label: "Late" },
            { value: a.skipped, color: SKIPPED, label: "Skipped" },
          ]}
        />
      </svg>
      <div className="min-w-0 flex-1">
        <p className="text-meta text-gray-900">{weekLabel}</p>
        <ul>
          {rows.map((r) => (
            <li key={r.label} className="flex h-3 items-center gap-1 text-meta">
              <span
                className={cx("size-1 shrink-0", r.shape === "ring" ? "rounded-full border-2" : "rounded-full")}
                style={r.shape === "ring" ? { borderColor: r.color } : { background: r.color }}
              />
              <span className={cx("flex-1", r.label.startsWith("Week closed") && "font-semibold text-blue-900")}>{r.label}</span>
              <span className="tabular font-semibold">{r.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
