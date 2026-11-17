"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const DAY = 86_400_000;
import { toTs } from "@/lib/dates";
const fmtTick = (ts: number) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(ts);
const fmtFull = (ts: number) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(ts);

const axis = { stroke: "var(--ds-gray-900)", fontSize: 12, tickLine: false, axisLine: false } as const;

export type Band = { id: number; from: string; to: string; label: string };

function TooltipBox({
  active,
  payload,
  label,
  unit,
  digits = 1,
}: {
  active?: boolean;
  payload?: readonly { dataKey?: unknown; name?: unknown; value?: unknown; color?: string }[];
  label?: unknown;
  unit: string;
  digits?: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-sm bg-background-100 px-2 py-1 text-meta shadow-menu">
      <p className="font-medium">{fmtFull(Number(label))}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="tabular flex items-center gap-1 text-gray-900">
          <span className="size-1 rounded-full" style={{ background: p.color }} />
          {String(p.name)}
          <span className="ml-auto pl-2 font-medium text-gray-1000">
            {Number(p.value).toLocaleString("en-US", { maximumFractionDigits: digits })} {unit}
          </span>
        </p>
      ))}
    </div>
  );
}

function domainFor(dates: number[], bands: Band[] = []) {
  const all = [...dates, ...bands.flatMap((b) => [toTs(b.from), toTs(b.to)])];
  if (!all.length) return [0, 1] as [number, number];
  const min = Math.min(...all);
  const max = Math.max(...all);
  return [min - DAY, max + DAY] as [number, number];
}

/** Consecutive blocks alternate between two tints so neighbours stay distinguishable. */
function bandFill(bands: Band[], b: Band) {
  const order = [...bands].sort((x, y) => x.from.localeCompare(y.from));
  return order.findIndex((x) => x.id === b.id) % 2 === 0 ? "var(--viz-band)" : "var(--viz-band-2)";
}

function Bands({ bands }: { bands: Band[] }) {
  return bands.map((b) => (
    <ReferenceArea key={b.id} x1={toTs(b.from)} x2={toTs(b.to) + DAY} fill={bandFill(bands, b)} fillOpacity={1} ifOverflow="hidden" />
  ));
}

/** Names the shaded training blocks (kept out of the plot so labels never collide with data). */
export function BandLegend({ bands }: { bands: Band[] }) {
  if (!bands.length) return null;
  const fmt = (d: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(toTs(d));
  return (
    <ul className="mt-1 flex flex-col text-meta text-gray-900">
      {[...bands]
        .sort((x, y) => x.from.localeCompare(y.from))
        .map((b) => (
          <li key={b.id} className="flex min-h-3 items-center gap-1">
            <span className="size-2 rounded-sm shadow-border" style={{ background: bandFill(bands, b) }} />
            <span className="font-medium text-gray-1000">{b.label}</span>
            <span className="tabular">
              {fmt(b.from)} – {fmt(b.to)}
            </span>
          </li>
        ))}
    </ul>
  );
}

/** Single-series time line (e.g. body weight), optionally with shaded plan periods. */
export function TimeLine({
  data,
  name,
  unit,
  bands = [],
  domain,
  height = 220,
}: {
  data: { date: string; value: number }[];
  name: string;
  unit: string;
  bands?: Band[];
  domain?: [number, number];
  height?: number;
}) {
  const points = data.map((d) => ({ ts: toTs(d.date), value: d.value }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={points} margin={{ top: 16, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
        <Bands bands={bands} />
        <XAxis dataKey="ts" type="number" scale="time" domain={domain ?? domainFor(points.map((p) => p.ts), bands)} tickFormatter={fmtTick} {...axis} minTickGap={24} />
        <YAxis domain={[(min: number) => Math.floor(min - 1), (max: number) => Math.ceil(max + 1)]} allowDecimals={false} tickFormatter={(v) => String(Math.round(v))} {...axis} width={44} />
        <Tooltip content={(p) => <TooltipBox {...p} unit={unit} />} cursor={{ stroke: "var(--ds-gray-500)" }} />
        <Line
          dataKey="value"
          name={name}
          stroke="var(--viz-1)"
          strokeWidth={2}
          dot={points.length < 40 ? { r: 3, strokeWidth: 2, stroke: "var(--ds-background-100)", fill: "var(--viz-1)" } : false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--ds-background-100)" }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Bars on a time axis (e.g. volume per session / week). */
export function TimeBars({
  data,
  name,
  unit,
  bands = [],
  domain,
  height = 200,
  barWidth,
}: {
  data: { date: string; value: number }[];
  name: string;
  unit: string;
  bands?: Band[];
  domain?: [number, number];
  height?: number;
  barWidth?: number;
}) {
  const points = data.map((d) => ({ ts: toTs(d.date), value: Math.round(d.value) }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={points} margin={{ top: 16, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
        <Bands bands={bands} />
        <XAxis dataKey="ts" type="number" scale="time" domain={domain ?? domainFor(points.map((p) => p.ts), bands)} tickFormatter={fmtTick} {...axis} minTickGap={24} />
        <YAxis tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(v))} {...axis} width={44} />
        <Tooltip content={(p) => <TooltipBox {...p} unit={unit} digits={0} />} cursor={{ fill: "var(--ds-gray-alpha-100)" }} />
        <Bar dataKey="value" name={name} fill="var(--viz-1)" radius={[4, 4, 0, 0]} maxBarSize={barWidth ?? 18} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Two series in the same unit (kg): top-set weight and estimated 1RM. */
export function ProgressLines({ data, height = 240 }: { data: { date: string; top: number; e1rm: number }[]; height?: number }) {
  const points = data.map((d) => ({ ts: toTs(d.date), top: d.top, e1rm: Math.round(d.e1rm * 10) / 10 }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={points} margin={{ top: 16, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
        <XAxis dataKey="ts" type="number" scale="time" domain={domainFor(points.map((p) => p.ts))} tickFormatter={fmtTick} {...axis} minTickGap={24} />
        <YAxis domain={[(min: number) => Math.max(0, Math.floor((min - 5) / 5) * 5), (max: number) => Math.ceil((max + 5) / 5) * 5]} allowDecimals={false} tickFormatter={(v) => String(Math.round(v))} {...axis} width={44} />
        <Tooltip content={(p) => <TooltipBox {...p} unit="kg" />} cursor={{ stroke: "var(--ds-gray-500)" }} />
        <Legend verticalAlign="top" align="left" height={32} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 14, color: "var(--ds-gray-900)", paddingLeft: 40 }} />
        <Line dataKey="top" name="Top set" stroke="var(--viz-1)" strokeWidth={2} dot={{ r: 3, strokeWidth: 2, stroke: "var(--ds-background-100)", fill: "var(--viz-1)" }} isAnimationActive={false} />
        <Line dataKey="e1rm" name="Est. 1RM" stroke="var(--viz-2)" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3, strokeWidth: 2, stroke: "var(--ds-background-100)", fill: "var(--viz-2)" }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
