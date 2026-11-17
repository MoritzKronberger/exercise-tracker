"use client";

import Link from "next/link";
import { useOffline } from "next/offline";
import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition, type ReactNode } from "react";
import {
  addSessionExercise,
  deleteSession,
  deleteSet,
  finishSession,
  logSet,
  removeSessionExercise,
  updateSet,
} from "@/app/actions";
import { ActionBar, Button, Card, EmptyState, Select, cx } from "@/components/ui";
import { IconCheck, IconChevronDown, IconChevronLeft, IconChevronRight, IconX } from "@/components/icons";
import { Stepper } from "@/components/stepper";
import { formatDate } from "@/lib/dates";
import { fmtDuration, fmtVolume, fmtWeight } from "@/lib/format";

type Log = { id: number; setNumber: number; weight: number; reps: number; restSeconds: number | null; completedAt: string; pending?: boolean };
type PrevSet = { setNumber: number; weight: number; reps: number };
type Prev = { date: string; sets: PrevSet[] } | null;
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

// ---------------------------------------------------------------- hooks

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

// ---------------------------------------------------------------- shared pieces

/** Bottom sheet: every secondary action lives here, out of the way. */
function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-label={title}>
      <button className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <div className="pb-safe relative max-h-[85vh] overflow-y-auto rounded-t-lg bg-background-100 shadow-menu">
        <div className="mx-auto max-w-xl px-2 pb-2">
          <div className="flex h-7 items-center justify-between">
            <h2 className="text-title font-semibold tracking-tight">{title}</h2>
            <Button variant="ghost" size="lg" onClick={onClose} aria-label="Close">
              <IconX size={24} />
            </Button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function SheetItem({ children, onClick, danger, disabled }: { children: ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "flex min-h-7 w-full items-center gap-2 border-t border-gray-alpha-400 text-left text-body active:bg-gray-alpha-100 disabled:opacity-40",
        danger && "text-red-900",
      )}
    >
      {children}
    </button>
  );
}

function parseWeight(v: string) {
  return Number(v.replace(",", "."));
}

function EditSetSheet({ log, onClose }: { log: Log | null; onClose: () => void }) {
  return (
    <Sheet open={!!log} onClose={onClose} title={log ? `Set ${log.setNumber}` : ""}>
      {log && <EditSetForm key={log.id} log={log} onClose={onClose} />}
    </Sheet>
  );
}

function EditSetForm({ log, onClose }: { log: Log; onClose: () => void }) {
  const [weight, setWeight] = useState(String(log.weight));
  const [reps, setReps] = useState(String(log.reps));
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <Stepper label="Weight (kg)" value={weight} onChange={setWeight} step={2.5} decimal />
      <Stepper label="Reps" value={reps} onChange={setReps} step={1} />
      <Button
        variant="primary"
        size="xl"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await updateSet(log.id, parseWeight(weight), Number(reps));
            onClose();
          })
        }
      >
        Save
      </Button>
      <Button
        variant="danger"
        size="lg"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await deleteSet(log.id);
            onClose();
          })
        }
      >
        Delete set
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------- main view

export function WorkoutView({ data }: { data: WorkoutData }) {
  return data.finishedAt ? <FinishedView data={data} /> : <FocusView data={data} />;
}

function withPending(exercises: Ex[], pending: PendingLog[]): Ex[] {
  return exercises.map((e) => {
    const extra = pending
      .filter((p) => p.exerciseId === e.exerciseId)
      .map((p, i) => ({ id: -1 - i, setNumber: e.logs.length + i + 1, weight: p.weight, reps: p.reps, restSeconds: null, completedAt: p.completedAt, pending: true }));
    return { ...e, logs: [...e.logs, ...extra] };
  });
}

function suggestedWeight(ex: Ex) {
  const prevSet = (n: number) => ex.previous?.sets.find((s) => s.setNumber === n) ?? null;
  const prev = prevSet(ex.logs.length + 1);
  const lastHere = ex.logs.at(-1);
  if (prev && lastHere) {
    // Carry today's adjustment forward, e.g. last time 60/60/60, today set 1 at 62.5 → suggest 62.5.
    const prevOfLast = prevSet(lastHere.setNumber);
    return prevOfLast ? Math.max(0, prev.weight + (lastHere.weight - prevOfLast.weight)) : lastHere.weight;
  }
  if (prev) return prev.weight;
  if (lastHere) return lastHere.weight;
  return ex.previous?.sets.at(-1)?.weight ?? null;
}

function FocusView({ data }: { data: WorkoutData }) {
  const [pendingLogs, addPending] = useOptimistic<PendingLog[], PendingLog>([], (s, p) => [...s, p]);
  const [, startLog] = useTransition();
  const [busy, startBusy] = useTransition();
  const exercises = useMemo(() => withPending(data.exercises, pendingLogs), [data.exercises, pendingLogs]);

  const firstOpen = exercises.findIndex((e) => e.logs.length < e.targetSets);
  const [current, setCurrent] = useState(firstOpen === -1 ? 0 : firstOpen);
  const idx = Math.min(current, Math.max(0, exercises.length - 1));
  const ex = exercises[idx] as Ex | undefined;

  const [menuOpen, setMenuOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Log | null>(null);
  const [extraFor, setExtraFor] = useState<number | null>(null);

  const now = useNow(true);
  useWakeLock(true);

  const allLogs = exercises.flatMap((e) => e.logs.map((l) => ({ ...l, rest: e.restSeconds })));
  const lastLog = allLogs.reduce<(typeof allLogs)[number] | null>((a, l) => (!a || l.completedAt > a.completedAt ? l : a), null);
  const allDone = exercises.length > 0 && exercises.every((e) => e.logs.length >= e.targetSets);

  const go = (d: -1 | 1) => setCurrent((c) => Math.min(exercises.length - 1, Math.max(0, c + d)));
  const touch = useRef<number | null>(null);

  const log = (weight: number, reps: number) => {
    if (!ex) return;
    const completedAt = new Date().toISOString();
    const finishesExercise = ex.logs.length + 1 === ex.targetSets;
    startLog(async () => {
      addPending({ exerciseId: ex.exerciseId, weight, reps, completedAt });
      await logSet(data.id, ex.exerciseId, weight, reps, completedAt);
    });
    setExtraFor(null);
    if (finishesExercise) {
      // Move on to the next exercise that still has sets left — it's what you'll do after resting.
      const order = [...exercises.keys()].slice(idx + 1).concat([...exercises.keys()].slice(0, idx));
      const next = order.find((i) => exercises[i].logs.length < exercises[i].targetSets);
      if (next !== undefined) setCurrent(next);
    }
  };

  const finish = () => startBusy(() => finishSession(data.id));

  const exDone = ex ? ex.logs.length >= ex.targetSets && extraFor !== ex.exerciseId : false;

  return (
    <div className="-mt-3">
      {/* Top bar: close · exercise picker · rest timer */}
      <div className="sticky top-0 z-30 -mx-2 flex h-8 items-center gap-1 bg-background-200/90 px-1 backdrop-blur-md">
        <Link href={`/?date=${data.date}`} className={cx("grid size-7 shrink-0 place-items-center rounded-sm active:bg-gray-alpha-200")} aria-label="Leave workout">
          <IconX size={24} />
        </Link>
        <button onClick={() => setMenuOpen(true)} className="flex h-7 min-w-0 flex-1 items-center gap-1 rounded-sm px-1 text-left active:bg-gray-alpha-200">
          <span className="truncate text-body font-medium">{exercises.length ? `${idx + 1} / ${exercises.length}` : data.title}</span>
          <IconChevronDown size={16} className="shrink-0 text-gray-900" />
        </button>
        {lastLog && <RestTimer since={lastLog.completedAt} target={lastLog.rest} now={now} />}
      </div>

      {!ex ? (
        <div className="mt-3">
          <EmptyState title="No exercises yet" action={<Button variant="primary" size="xl" className="w-full" onClick={() => setAddOpen(true)}>Add exercise</Button>} />
        </div>
      ) : (
        <div
          onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touch.current == null) return;
            const dx = e.changedTouches[0].clientX - touch.current;
            touch.current = null;
            if (Math.abs(dx) > 80) go(dx < 0 ? 1 : -1);
          }}
        >
          <h1 className="mt-1 mb-2 text-display font-semibold tracking-tight">{ex.name}</h1>

          <SetTiles ex={ex} extra={extraFor === ex.exerciseId && ex.logs.length >= ex.targetSets} onEdit={setEditing} />

          {exDone && <p className="text-body text-gray-900">All {ex.targetSets} sets done.</p>}

          {!exDone && <SetInput key={`${ex.exerciseId}-${ex.logs.length}`} ex={ex} onLog={log} />}
        </div>
      )}

      {/* Thumb zone: previous · primary · next */}
      {ex && (
        <ActionBar aboveNav={false}>
          <Button variant="secondary" size="xl" className="w-8 px-0" onClick={() => go(-1)} disabled={idx === 0} aria-label="Previous exercise">
            <IconChevronLeft size={24} />
          </Button>
          {exDone ? (
            allDone ? (
              <Button variant="primary" size="xl" className="flex-1" onClick={finish} disabled={busy}>
                <IconCheck size={24} /> Finish workout
              </Button>
            ) : (
              <Button variant="primary" size="xl" className="min-w-0 flex-1" onClick={() => go(1)} disabled={idx === exercises.length - 1}>
                Next
              </Button>
            )
          ) : (
            <Button variant="primary" size="xl" className="flex-1" form="set-input" type="submit">
              <IconCheck size={24} /> Log set {ex.logs.length + 1}
            </Button>
          )}
          <Button variant="secondary" size="xl" className="w-8 px-0" onClick={() => go(1)} disabled={idx === exercises.length - 1} aria-label="Next exercise">
            <IconChevronRight size={24} />
          </Button>
        </ActionBar>
      )}

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title={data.title}>
        <ul>
          {exercises.map((e, i) => {
            const done = e.logs.length >= e.targetSets;
            return (
              <li key={e.sessionExerciseId}>
                <SheetItem
                  onClick={() => {
                    setCurrent(i);
                    setMenuOpen(false);
                  }}
                >
                  <span className={cx("grid size-4 shrink-0 place-items-center rounded-full", done ? "bg-green-700 text-white" : i === idx ? "bg-gray-1000 text-background-100" : "bg-gray-200")}>
                    {done && <IconCheck size={16} strokeWidth={2.5} />}
                  </span>
                  <span className={cx("min-w-0 flex-1", i === idx && "font-semibold")}>{e.name}</span>
                  <span className="tabular text-meta text-gray-900">
                    {e.logs.length}/{e.targetSets}
                  </span>
                </SheetItem>
              </li>
            );
          })}
        </ul>
        <div className="mt-2">
          {ex && exDone && (
            <SheetItem
              onClick={() => {
                setExtraFor(ex.exerciseId);
                setMenuOpen(false);
              }}
            >
              Extra set of {ex.name}
            </SheetItem>
          )}
          <SheetItem
            onClick={() => {
              setMenuOpen(false);
              setAddOpen(true);
            }}
          >
            Add exercise
          </SheetItem>
          {!allDone && exercises.length > 0 && (
            <SheetItem
              disabled={busy}
              onClick={() => {
                const missing = exercises.reduce((n, e) => n + Math.max(0, e.targetSets - e.logs.length), 0);
                if (confirm(`${missing} planned set${missing === 1 ? "" : "s"} not logged. Finish anyway?`)) finish();
              }}
            >
              Finish workout
            </SheetItem>
          )}
          {ex && (
            <SheetItem
              danger
              disabled={busy}
              onClick={() => {
                if (confirm(`Remove ${ex.name} from this workout${ex.logs.length ? " and delete its sets" : ""}?`)) {
                  startBusy(() => removeSessionExercise(ex.sessionExerciseId));
                  setMenuOpen(false);
                }
              }}
            >
              Remove {ex.name}
            </SheetItem>
          )}
          <SheetItem danger disabled={busy} onClick={() => confirm("Delete this workout and all its sets?") && startBusy(() => deleteSession(data.id))}>
            Delete workout
          </SheetItem>
        </div>
      </Sheet>

      <AddExerciseSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        sessionId={data.id}
        library={data.library.filter((l) => !exercises.some((e) => e.exerciseId === l.id))}
        onAdded={() => setCurrent(exercises.length)}
      />
      <EditSetSheet log={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

/** All sets of the exercise as one row of 48px tiles: done ✓ / current / upcoming. Tap a done set to fix it. */
function SetTiles({ ex, extra, onEdit }: { ex: Ex; extra: boolean; onEdit: (l: Log) => void }) {
  const count = Math.max(ex.targetSets, ex.logs.length) + (extra ? 1 : 0);
  const offline = useOffline();
  return (
    <div className="mb-3 grid grid-cols-4 gap-1">
      {Array.from({ length: count }, (_, i) => {
        const l = ex.logs[i];
        const isNext = i === ex.logs.length;
        return (
          <button
            key={i}
            type="button"
            disabled={!l || l.pending}
            onClick={() => l && onEdit(l)}
            aria-label={l ? `Set ${i + 1}: ${l.weight} kg × ${l.reps}, edit` : `Set ${i + 1}`}
            className={cx(
              "tabular flex h-6 min-w-0 items-center justify-center rounded-sm px-1 text-meta font-semibold whitespace-nowrap",
              l ? (l.pending ? "bg-amber-100 text-amber-900" : "bg-green-100 text-green-900 active:opacity-70") : isNext ? "bg-blue-700 text-white" : "bg-gray-200 text-gray-900",
            )}
          >
            {l ? (l.pending && offline ? "offline" : `${fmtWeight(l.weight)}×${l.reps}`) : i < ex.targetSets ? `Set ${i + 1}` : "Extra"}
          </button>
        );
      })}
    </div>
  );
}

function SetInput({ ex, onLog }: { ex: Ex; onLog: (weight: number, reps: number) => void }) {
  const initialWeight = suggestedWeight(ex);
  const [weight, setWeight] = useState(initialWeight != null ? String(initialWeight) : "");
  const [reps, setReps] = useState(String(ex.targetReps));
  const prev = ex.previous?.sets.find((s) => s.setNumber === ex.logs.length + 1);
  const w = parseWeight(weight);
  const r = Number(reps);
  const valid = weight.trim() !== "" && Number.isFinite(w) && w >= 0 && Number.isInteger(r) && r >= 0;
  return (
    <form
      id="set-input"
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onLog(w, r);
      }}
    >
      <Stepper label="Weight (kg)" hint={prev && `last ${fmtWeight(prev.weight)}`} value={weight} onChange={setWeight} step={2.5} decimal />
      <Stepper label="Reps" hint={prev ? `last ${prev.reps} · goal ${ex.targetReps}` : `goal ${ex.targetReps}`} value={reps} onChange={setReps} step={1} />
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

  if (elapsed > 60 * 30) return null; // stale – probably done
  const pct = target ? Math.min(100, (elapsed / target) * 100) : 0;
  return (
    <div
      className={cx("relative flex h-6 shrink-0 items-center overflow-hidden rounded-full px-2", over ? "bg-green-700 text-white" : "bg-gray-1000 text-background-100")}
      role="timer"
      aria-label="Rest time"
    >
      {target != null && !over && <span className="absolute inset-y-0 left-0 bg-white/20" style={{ width: `${pct}%` }} />}
      <span className="tabular relative text-title font-semibold">{fmtDuration(elapsed)}</span>
    </div>
  );
}

function AddExerciseSheet({
  open,
  onClose,
  sessionId,
  library,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  sessionId: number;
  library: { id: number; name: string }[];
  onAdded: () => void;
}) {
  const [exerciseId, setExerciseId] = useState<number | "">("");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10");
  const [pending, start] = useTransition();
  return (
    <Sheet open={open} onClose={onClose} title="Add exercise">
      <div className="flex flex-col gap-2">
        <Select value={exerciseId} onChange={(e) => setExerciseId(Number(e.target.value))} className="h-7">
          <option value="" disabled>
            Choose…
          </option>
          {library.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
        <Stepper label="Sets" value={sets} onChange={setSets} step={1} />
        <Stepper label="Reps" value={reps} onChange={setReps} step={1} />
        <Button
          variant="primary"
          size="xl"
          disabled={pending || !exerciseId}
          onClick={() =>
            exerciseId &&
            start(async () => {
              await addSessionExercise(sessionId, exerciseId, Number(sets), Number(reps));
              setExerciseId("");
              onAdded();
              onClose();
            })
          }
        >
          Add
        </Button>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- after the workout

function FinishedView({ data }: { data: WorkoutData }) {
  const [editing, setEditing] = useState<Log | null>(null);
  const [pending, start] = useTransition();
  const logs = data.exercises.flatMap((e) => e.logs);
  const volume = logs.reduce((n, l) => n + l.weight * l.reps, 0);
  const end = logs.reduce((m, l) => Math.max(m, new Date(l.completedAt).getTime()), new Date(data.finishedAt!).getTime());
  const duration = (Math.min(end, new Date(data.finishedAt!).getTime()) - new Date(data.startedAt).getTime()) / 1000;
  const delta = data.previousVolume ? ((volume - data.previousVolume) / data.previousVolume) * 100 : null;

  return (
    <div>
      <p className="text-meta text-gray-900">{formatDate(data.date, { weekday: "long", day: "numeric", month: "long" })}</p>
      <h1 className="mb-2 text-display font-semibold tracking-tight">{data.title}</h1>

      <div className="mb-3 grid grid-cols-3 gap-1">
        <Tile label="Volume" value={fmtVolume(volume)} />
        <Tile label="vs last" value={delta == null ? "–" : `${delta >= 0 ? "+" : ""}${delta.toFixed(0)}%`} tone={delta == null ? undefined : delta >= 0 ? "good" : "bad"} />
        <Tile label="Time" value={fmtDuration(Math.max(0, duration))} />
      </div>

      <div className="flex flex-col gap-2">
        {data.exercises.map((e) => (
          <Card key={e.sessionExerciseId} className="overflow-hidden">
            <p className="flex min-h-6 items-center px-2 text-body font-semibold">{e.name}</p>
            {e.logs.length === 0 && <p className="px-2 pb-2 text-meta text-gray-900">Skipped</p>}
            {e.logs.map((l) => (
              <button key={l.id} type="button" onClick={() => setEditing(l)} className="flex min-h-6 w-full items-center gap-2 border-t border-gray-alpha-400 px-2 text-left active:bg-gray-alpha-100">
                <span className="tabular w-3 text-meta text-gray-900">{l.setNumber}</span>
                <span className="tabular flex-1 text-body">
                  {fmtWeight(l.weight)} kg × {l.reps}
                </span>
              </button>
            ))}
          </Card>
        ))}
      </div>

      <Button variant="danger" size="lg" className="mt-3 w-full" disabled={pending} onClick={() => confirm("Delete this workout and all its sets?") && start(() => deleteSession(data.id))}>
        Delete workout
      </Button>

      <ActionBar aboveNav={false}>
        <Link href={`/?date=${data.date}`} className="flex h-8 flex-1 items-center justify-center rounded-lg bg-gray-1000 text-body font-medium text-background-100">
          Done
        </Link>
      </ActionBar>
      <EditSetSheet log={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <Card className="p-2">
      <p className="text-meta text-gray-900">{label}</p>
      <p className={cx("tabular text-title font-semibold tracking-tight", tone === "good" && "text-green-900", tone === "bad" && "text-red-900")}>{value}</p>
    </Card>
  );
}
