"use client";

import Link from "next/link";
import { useOffline } from "next/offline";
import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import {
  addSessionExercise,
  deleteSession,
  deleteSet,
  finishSession,
  logSet,
  removeSessionExercise,
  updateSet,
} from "@/app/actions";
import { Badge, Button, Card, Input, Select, cx } from "@/components/ui";
import { IconCheck, IconChevronLeft, IconClock, IconPlus, IconTrash, IconX } from "@/components/icons";
import { formatDate } from "@/lib/dates";
import { e1rm, fmtDuration, fmtVolume, fmtWeight } from "@/lib/format";

type Log = { id: number; setNumber: number; weight: number; reps: number; restSeconds: number | null; completedAt: string; pending?: boolean };
type Prev = { date: string; sets: { setNumber: number; weight: number; reps: number }[] } | null;
type Ex = {
  sessionExerciseId: number;
  exerciseId: number;
  name: string;
  restSeconds: number | null;
  targetSets: number;
  targetReps: number;
  previous: Prev;
  logs: Log[];
};
export type WorkoutData = {
  id: number;
  date: string;
  title: string;
  startedAt: string;
  finishedAt: string | null;
  previousVolume: number | null;
  exercises: Ex[];
  library: { id: number; name: string }[];
};

type PendingLog = { exerciseId: number; weight: number; reps: number; completedAt: string };

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const acquire = () => navigator.wakeLock.request("screen").then((l) => (lock = l)).catch(() => {});
    acquire();
    const onVis = () => document.visibilityState === "visible" && acquire();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      lock?.release().catch(() => {});
    };
  }, [active]);
}

export function WorkoutView({ data }: { data: WorkoutData }) {
  const [pendingLogs, addPending] = useOptimistic<PendingLog[], PendingLog>([], (s, p) => [...s, p]);
  const [, startTransition] = useTransition();
  const [finishing, startFinish] = useTransition();
  const finished = Boolean(data.finishedAt);

  const exercises = useMemo(
    () =>
      data.exercises.map((e) => {
        const extra = pendingLogs
          .filter((p) => p.exerciseId === e.exerciseId)
          .map((p, i) => ({ id: -1 - i, setNumber: e.logs.length + i + 1, weight: p.weight, reps: p.reps, restSeconds: null, completedAt: p.completedAt, pending: true }));
        return { ...e, logs: [...e.logs, ...extra] };
      }),
    [data.exercises, pendingLogs],
  );

  const allLogs = exercises.flatMap((e) => e.logs.map((l) => ({ ...l, exercise: e })));
  const lastLog = allLogs.reduce<(typeof allLogs)[number] | null>((a, l) => (!a || l.completedAt > a.completedAt ? l : a), null);
  const now = useNow(!finished);
  useWakeLock(!finished);

  const totalVolume = allLogs.reduce((n, l) => n + l.weight * l.reps, 0);
  const totalSets = allLogs.length;
  const targetSets = exercises.reduce((n, e) => n + e.targetSets, 0);
  const endTime = data.finishedAt ? new Date(data.finishedAt).getTime() : now;
  const elapsed = (endTime - new Date(data.startedAt).getTime()) / 1000;

  const handleLog = (exerciseId: number, weight: number, reps: number) => {
    startTransition(async () => {
      const completedAt = new Date().toISOString();
      addPending({ exerciseId, weight, reps, completedAt });
      await logSet(data.id, exerciseId, weight, reps, completedAt);
    });
  };

  return (
    <div className={cx("mx-auto max-w-xl", !finished && "pb-32")}>
      <Link href={`/?date=${data.date}`} className="mb-3 inline-flex items-center gap-1 text-sm text-gray-900 hover:text-gray-1000">
        <IconChevronLeft /> {formatDate(data.date, { weekday: "long", day: "numeric", month: "short" })}
      </Link>

      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{data.title}</h1>
          <p className="tabular mt-0.5 flex items-center gap-1.5 text-sm text-gray-900">
            <IconClock size={14} /> {fmtDuration(elapsed)} · {totalSets}/{targetSets} sets · {fmtVolume(totalVolume)}
          </p>
        </div>
        {finished ? <Badge color="green">Completed</Badge> : null}
      </div>

      {finished && <Summary data={data} exercises={exercises} totalVolume={totalVolume} elapsed={elapsed} />}

      <div className="flex flex-col gap-4">
        {exercises.map((e) => (
          <ExerciseCard key={e.sessionExerciseId} ex={e} onLog={handleLog} />
        ))}
      </div>

      <AddExercise sessionId={data.id} library={data.library.filter((l) => !exercises.some((e) => e.exerciseId === l.id))} />

      <div className="mt-8 flex flex-col gap-2">
        {!finished ? (
          <Button
            variant="primary"
            size="large"
            disabled={finishing}
            onClick={() => {
              const missing = targetSets - totalSets;
              if (missing > 0 && !confirm(`${missing} planned set${missing === 1 ? "" : "s"} not logged. Finish anyway?`)) return;
              startFinish(() => finishSession(data.id));
            }}
          >
            <IconCheck /> Finish workout
          </Button>
        ) : null}
        <Button
          variant="tertiary"
          size="small"
          className="self-center text-red-900"
          onClick={() => confirm("Delete this workout and all its logged sets?") && startFinish(() => deleteSession(data.id))}
        >
          Delete workout
        </Button>
      </div>

      {!finished && lastLog && <RestTimer since={lastLog.completedAt} target={lastLog.exercise.restSeconds} now={now} />}
    </div>
  );
}

function Summary({ data, exercises, totalVolume, elapsed }: { data: WorkoutData; exercises: Ex[]; totalVolume: number; elapsed: number }) {
  const prs = exercises.filter((e) => {
    if (!e.previous || !e.logs.length) return false;
    const best = Math.max(...e.logs.map((l) => e1rm(l.weight, l.reps)));
    const prevBest = Math.max(...e.previous.sets.map((s) => e1rm(s.weight, s.reps)));
    return best > prevBest;
  });
  const delta = data.previousVolume ? ((totalVolume - data.previousVolume) / data.previousVolume) * 100 : null;
  return (
    <Card className="mb-4 grid grid-cols-3 divide-x divide-gray-alpha-400">
      <div className="p-3">
        <p className="text-[11px] text-gray-900">Volume</p>
        <p className="tabular font-semibold">{fmtVolume(totalVolume)}</p>
        {delta !== null && (
          <p className={cx("tabular text-[11px]", delta >= 0 ? "text-green-900" : "text-red-900")}>
            {delta >= 0 ? "+" : ""}
            {delta.toFixed(0)}% vs last
          </p>
        )}
      </div>
      <div className="p-3">
        <p className="text-[11px] text-gray-900">Duration</p>
        <p className="tabular font-semibold">{fmtDuration(elapsed)}</p>
      </div>
      <div className="p-3">
        <p className="text-[11px] text-gray-900">Improved</p>
        <p className="tabular font-semibold">
          {prs.length}/{exercises.length}
        </p>
        <p className="text-[11px] text-gray-900">exercises</p>
      </div>
    </Card>
  );
}

function ExerciseCard({ ex, onLog }: { ex: Ex; onLog: (exerciseId: number, weight: number, reps: number) => void }) {
  const [extraSlots, setExtraSlots] = useState(0);
  const [pending, start] = useTransition();
  const rowCount = Math.max(ex.targetSets + extraSlots, ex.logs.length);
  const nextIndex = ex.logs.length; // 0-based index of the set to log next
  const done = ex.logs.length >= ex.targetSets;
  const prevSet = (n: number) => ex.previous?.sets.find((s) => s.setNumber === n) ?? null;

  const defaultWeight = (() => {
    const prev = prevSet(nextIndex + 1);
    const lastHere = ex.logs.at(-1);
    if (prev && lastHere) {
      // Carry today's adjustment forward, e.g. last time 60/60/60, today set 1 at 62.5 → suggest 62.5.
      const prevOfLast = prevSet(lastHere.setNumber);
      return prevOfLast ? Math.max(0, prev.weight + (lastHere.weight - prevOfLast.weight)) : lastHere.weight;
    }
    if (prev) return prev.weight;
    if (lastHere) return lastHere.weight;
    return ex.previous?.sets.at(-1)?.weight ?? null;
  })();
  const volume = ex.logs.reduce((n, l) => n + l.weight * l.reps, 0);

  return (
    <Card className={cx("overflow-hidden", done && "opacity-95")}>
      <div className="flex items-start gap-2 px-4 pt-3.5 pb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate font-medium">{ex.name}</h2>
            {done && <IconCheck className="shrink-0 text-green-900" />}
          </div>
          <p className="tabular text-xs text-gray-900">
            Target {ex.targetSets} × {ex.targetReps}
            {ex.restSeconds ? ` · rest ${fmtDuration(ex.restSeconds)}` : ""}
            {volume > 0 ? ` · ${fmtVolume(volume)}` : ""}
          </p>
          {ex.previous && (
            <p className="tabular mt-1 text-xs text-gray-800">
              Last ({formatDate(ex.previous.date, { day: "numeric", month: "short" })}):{" "}
              {ex.previous.sets.map((s) => `${fmtWeight(s.weight)}×${s.reps}`).join(" · ")}
            </p>
          )}
        </div>
        <Button
          size="small"
          variant="tertiary"
          aria-label={`Remove ${ex.name} from workout`}
          disabled={pending}
          onClick={() =>
            confirm(`Remove ${ex.name} from this workout${ex.logs.length ? " and delete its logged sets" : ""}?`) &&
            start(() => removeSessionExercise(ex.sessionExerciseId))
          }
        >
          <IconX />
        </Button>
      </div>

      <div className="grid grid-cols-[28px_1fr] border-t border-gray-alpha-400">
        {Array.from({ length: rowCount }, (_, i) => {
          const log = ex.logs[i];
          const prev = prevSet(i + 1);
          if (log) return <LoggedRow key={`l${log.id}`} index={i} log={log} prev={prev} targetReps={ex.targetReps} />;
          if (i === nextIndex)
            return (
              <SetInput
                key={`in-${ex.logs.length}`}
                index={i}
                defaultWeight={defaultWeight}
                defaultReps={prev?.reps && i >= ex.targetSets ? prev.reps : ex.targetReps}
                prev={prev}
                onLog={(w, r) => onLog(ex.exerciseId, w, r)}
              />
            );
          return (
            <div key={`f${i}`} className="col-span-2 grid grid-cols-subgrid items-center border-t border-gray-alpha-200 py-2.5 text-gray-700">
              <span className="tabular text-center text-xs">{i + 1}</span>
              <span className="tabular pr-4 text-sm">
                {i < ex.targetSets ? `${ex.targetReps} reps` : "Extra set"}
                {prev && <span className="ml-2 text-xs">last {fmtWeight(prev.weight)} × {prev.reps}</span>}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex border-t border-gray-alpha-400">
        <button
          className="flex h-10 flex-1 items-center justify-center gap-1.5 text-xs font-medium text-gray-900 transition-colors hover:bg-gray-alpha-100 hover:text-gray-1000"
          onClick={() => setExtraSlots(rowCount - ex.targetSets + 1)}
        >
          <IconPlus size={14} /> Add set
        </button>
        {extraSlots > 0 && rowCount > ex.logs.length && (
          <button
            className="flex h-10 items-center justify-center px-4 text-xs font-medium text-gray-900 hover:bg-gray-alpha-100"
            onClick={() => setExtraSlots((n) => Math.max(0, n - 1))}
          >
            Remove empty set
          </button>
        )}
      </div>
    </Card>
  );
}

function Delta({ value, unit }: { value: number; unit: string }) {
  if (!value) return null;
  return (
    <span className={cx("tabular text-[11px] font-medium", value > 0 ? "text-green-900" : "text-red-900")}>
      {value > 0 ? "+" : ""}
      {fmtWeight(value)}
      {unit}
    </span>
  );
}

function LoggedRow({ index, log, prev, targetReps }: { index: number; log: Log; prev: { weight: number; reps: number } | null; targetReps: number }) {
  const [editing, setEditing] = useState(false);
  const [weight, setWeight] = useState(String(log.weight));
  const [reps, setReps] = useState(String(log.reps));
  const [pending, start] = useTransition();

  if (editing && !log.pending) {
    return (
      <div className="col-span-2 grid grid-cols-subgrid items-center border-t border-gray-alpha-200 bg-gray-alpha-100 py-2">
        <span className="tabular text-center text-xs text-gray-900">{index + 1}</span>
        <form
          className="flex items-center gap-2 pr-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              await updateSet(log.id, Number(weight.replace(",", ".")), Number(reps));
              setEditing(false);
            });
          }}
        >
          <Input className="h-9 w-20 text-center" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} aria-label="Weight" />
          <span className="text-xs text-gray-900">kg ×</span>
          <Input className="h-9 w-16 text-center" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} aria-label="Reps" />
          <div className="flex-1" />
          <Button size="small" variant="primary" type="submit" disabled={pending} aria-label="Save">
            <IconCheck />
          </Button>
          <Button
            size="small"
            variant="tertiary"
            type="button"
            disabled={pending}
            aria-label="Delete set"
            onClick={() => start(() => deleteSet(log.id))}
          >
            <IconTrash />
          </Button>
          <Button size="small" variant="tertiary" type="button" onClick={() => setEditing(false)} aria-label="Cancel">
            <IconX />
          </Button>
        </form>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      disabled={log.pending}
      className="col-span-2 grid grid-cols-subgrid items-center border-t border-gray-alpha-200 py-2.5 text-left transition-colors hover:bg-gray-alpha-100"
    >
      <span className="grid place-items-center">
        <span className="grid size-5 place-items-center rounded-full bg-green-700 text-white">
          <IconCheck size={11} strokeWidth={2.2} />
        </span>
      </span>
      <span className="flex items-center gap-2 pr-4">
        <span className="tabular text-sm font-medium">
          {fmtWeight(log.weight)} kg × {log.reps}
        </span>
        {log.reps !== targetReps && (
          <Badge color={log.reps > targetReps ? "green" : "amber"}>
            {log.reps > targetReps ? "+" : ""}
            {log.reps - targetReps} reps
          </Badge>
        )}
        {prev && <Delta value={log.weight - prev.weight} unit="kg" />}
        <span className="flex-1" />
        {log.restSeconds != null && (
          <span className="tabular flex items-center gap-1 text-xs text-gray-800">
            <IconClock size={12} /> {fmtDuration(log.restSeconds)}
          </span>
        )}
        {log.pending && <PendingLabel />}
      </span>
    </button>
  );
}

function PendingLabel() {
  const offline = useOffline();
  return offline ? <Badge color="amber">offline · will sync</Badge> : <span className="text-xs text-gray-700">saving…</span>;
}

function Stepper({
  value,
  onChange,
  step,
  label,
  unit,
  decimal,
}: {
  value: string;
  onChange: (v: string) => void;
  step: number;
  label: string;
  unit: string;
  decimal?: boolean;
}) {
  const bump = (d: number) => {
    const n = Number(value.replace(",", ".")) || 0;
    onChange(String(Math.max(0, Math.round((n + d) * 100) / 100)));
  };
  return (
    <div className="flex flex-1 flex-col gap-1">
      <span className="text-[11px] text-gray-900">{label}</span>
      <div className="flex h-11 items-stretch overflow-hidden rounded-md bg-background-100 shadow-border">
        <button type="button" className="w-10 text-lg text-gray-900 hover:bg-gray-alpha-100 active:bg-gray-alpha-200" onClick={() => bump(-step)} aria-label={`Decrease ${label}`}>
          −
        </button>
        <div className="relative flex flex-1 items-center">
          <input
            className="tabular h-full w-full min-w-0 bg-transparent text-center text-base font-semibold outline-none"
            inputMode={decimal ? "decimal" : "numeric"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={(e) => e.target.select()}
            aria-label={label}
            placeholder="0"
          />
          <span className="pointer-events-none absolute right-1.5 text-[10px] text-gray-700">{unit}</span>
        </div>
        <button type="button" className="w-10 text-lg text-gray-900 hover:bg-gray-alpha-100 active:bg-gray-alpha-200" onClick={() => bump(step)} aria-label={`Increase ${label}`}>
          +
        </button>
      </div>
    </div>
  );
}

function SetInput({
  index,
  defaultWeight,
  defaultReps,
  prev,
  onLog,
}: {
  index: number;
  defaultWeight: number | null;
  defaultReps: number;
  prev: { weight: number; reps: number } | null;
  onLog: (weight: number, reps: number) => void;
}) {
  const [weight, setWeight] = useState(defaultWeight != null ? String(defaultWeight) : "");
  const [reps, setReps] = useState(String(defaultReps));
  const w = Number(weight.replace(",", "."));
  const r = Number(reps);
  const valid = weight.trim() !== "" && Number.isFinite(w) && w >= 0 && Number.isInteger(r) && r >= 0;

  return (
    <form
      className="col-span-2 grid grid-cols-subgrid border-t border-gray-alpha-200 bg-blue-100 py-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onLog(w, r);
      }}
    >
      <span className="tabular grid place-items-center self-center text-xs font-semibold text-blue-900">{index + 1}</span>
      <div className="flex flex-col gap-2 pr-3">
        <div className="flex gap-2">
          <Stepper label="Weight" unit="kg" value={weight} onChange={setWeight} step={2.5} decimal />
          <Stepper label="Reps" unit="" value={reps} onChange={setReps} step={1} />
        </div>
        <div className="flex items-center gap-2">
          <span className="tabular flex-1 text-xs text-gray-900">{prev ? `Last time: ${fmtWeight(prev.weight)} kg × ${prev.reps}` : "No previous data for this set"}</span>
          <Button type="submit" variant="primary" disabled={!valid}>
            <IconCheck /> Log set
          </Button>
        </div>
      </div>
    </form>
  );
}

function RestTimer({ since, target, now }: { since: string; target: number | null; now: number }) {
  const elapsed = Math.max(0, (now - new Date(since).getTime()) / 1000);
  const over = target != null && elapsed >= target;
  const buzzed = useRef<string | null>(null);

  useEffect(() => {
    if (over && buzzed.current !== since) {
      buzzed.current = since;
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {}
    }
  }, [over, since]);

  if (elapsed > 60 * 30) return null; // stale – probably done with the workout
  const pct = target ? Math.min(100, (elapsed / target) * 100) : 0;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-30 px-4 pb-3 md:bottom-4">
      <div className="pointer-events-auto mx-auto max-w-xl overflow-hidden rounded-xl bg-gray-1000 text-background-100 shadow-menu">
        <div className="flex items-center gap-3 px-4 py-3">
          <IconClock />
          <span className="text-sm opacity-80">Rest</span>
          <span className={cx("tabular text-2xl font-semibold tracking-tight", over && "text-green-700")}>{fmtDuration(elapsed)}</span>
          <span className="flex-1" />
          {target != null && <span className="tabular text-sm opacity-70">{over ? "Go!" : `target ${fmtDuration(target)}`}</span>}
        </div>
        {target != null && (
          <div className="h-1 bg-white/10">
            <div className={cx("h-full transition-[width] duration-1000 ease-linear", over ? "bg-green-700" : "bg-blue-700")} style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}

function AddExercise({ sessionId, library }: { sessionId: number; library: { id: number; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [exerciseId, setExerciseId] = useState<number | "">("");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10");
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <Button className="mt-4 w-full" onClick={() => setOpen(true)} disabled={!library.length}>
        <IconPlus /> Add exercise to this workout
      </Button>
    );
  }
  return (
    <Card className="mt-4 p-4">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!exerciseId) return;
          start(async () => {
            await addSessionExercise(sessionId, exerciseId, Number(sets), Number(reps));
            setOpen(false);
            setExerciseId("");
          });
        }}
      >
        <Select value={exerciseId} onChange={(e) => setExerciseId(Number(e.target.value))} required>
          <option value="" disabled>
            Choose exercise…
          </option>
          {library.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
        <div className="flex items-center gap-2">
          <Input className="w-20 text-center" inputMode="numeric" value={sets} onChange={(e) => setSets(e.target.value)} aria-label="Sets" />
          <span className="text-sm text-gray-900">sets ×</span>
          <Input className="w-20 text-center" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} aria-label="Reps" />
          <span className="text-sm text-gray-900">reps</span>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="tertiary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={pending || !exerciseId}>
            Add
          </Button>
        </div>
      </form>
    </Card>
  );
}
