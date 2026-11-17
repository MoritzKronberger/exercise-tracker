"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deletePlan, duplicatePlan, renamePlan, savePlanDay, type DayItemInput } from "@/app/actions";
import { Button, Card, Input, LinkButton, Select, cx } from "@/components/ui";
import { IconChevronDown, IconChevronLeft, IconChevronUp, IconCopy, IconPlus, IconTrash } from "@/components/icons";
import { WEEKDAYS } from "@/lib/dates";

type Item = DayItemInput & { weekday: number };
type Ex = { id: number; name: string };

export function PlanEditor({ plan, items, exercises }: { plan: { id: number; name: string }; items: Item[]; exercises: Ex[] }) {
  const [name, setName] = useState(plan.name);
  const [pending, start] = useTransition();

  return (
    <div>
      <Link href="/plans" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-900 hover:text-gray-1000">
        <IconChevronLeft /> Plans
      </Link>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          className="min-w-0 flex-1 rounded-md bg-transparent px-1 py-1 text-2xl font-semibold tracking-tight outline-none hover:bg-gray-alpha-100 focus:bg-gray-alpha-100"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== plan.name && start(() => renamePlan(plan.id, name))}
          aria-label="Plan name"
        />
        <div className="flex gap-2">
          <LinkButton href={`/schedule?plan=${plan.id}`} variant="primary" size="small">
            Schedule
          </LinkButton>
          <Button size="small" onClick={() => start(() => duplicatePlan(plan.id))} disabled={pending}>
            <IconCopy /> Duplicate
          </Button>
          <Button
            size="small"
            variant="tertiary"
            className="text-red-900"
            onClick={() => confirm(`Delete plan “${plan.name}” and all its schedules?`) && start(() => deletePlan(plan.id))}
            disabled={pending}
          >
            <IconTrash /> Delete
          </Button>
        </div>
      </div>

      {exercises.length === 0 && (
        <Card className="mb-4 p-4 text-sm">
          You don&apos;t have any exercises yet.{" "}
          <Link className="text-blue-900 hover:underline" href="/exercises">
            Create some first
          </Link>
          .
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {WEEKDAYS.map((day, wd) => (
          <DayEditor
            key={wd}
            planId={plan.id}
            weekday={wd}
            label={day}
            initial={items.filter((i) => i.weekday === wd)}
            all={items}
            exercises={exercises}
          />
        ))}
      </div>
    </div>
  );
}

function DayEditor({
  planId,
  weekday,
  label,
  initial,
  all,
  exercises,
}: {
  planId: number;
  weekday: number;
  label: string;
  initial: Item[];
  all: Item[];
  exercises: Ex[];
}) {
  const serialized = JSON.stringify(initial.map(({ exerciseId, sets, reps }) => ({ exerciseId, sets, reps })));
  const [rows, setRows] = useState<DayItemInput[]>(() => JSON.parse(serialized));
  const [pending, start] = useTransition();
  const [synced, setSynced] = useState(serialized);
  if (synced !== serialized) {
    // Server data changed (e.g. after saving) – adopt it.
    setSynced(serialized);
    setRows(JSON.parse(serialized));
  }
  const dirty = JSON.stringify(rows) !== serialized;
  const otherDays = [...new Set(all.map((i) => i.weekday))].filter((d) => d !== weekday);

  const update = (idx: number, patch: Partial<DayItemInput>) => setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  const move = (idx: number, dir: -1 | 1) =>
    setRows((r) => {
      const next = [...r];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return r;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });

  return (
    <Card className={cx("p-4", dirty && "shadow-[0_0_0_1px_var(--ds-blue-700)]")}>
      <div className="flex items-center gap-2">
        <h2 className="flex-1 font-medium">{label}</h2>
        {rows.length === 0 && <span className="text-sm whitespace-nowrap text-gray-900">Rest day</span>}
        {otherDays.length > 0 && rows.length === 0 && (
          <Select
            className="h-8 w-32 text-xs"
            value=""
            onChange={(e) => {
              const from = Number(e.target.value);
              setRows(all.filter((i) => i.weekday === from).map(({ exerciseId, sets, reps }) => ({ exerciseId, sets, reps })));
            }}
          >
            <option value="" disabled>
              Copy from…
            </option>
            {otherDays.map((d) => (
              <option key={d} value={d}>
                {WEEKDAYS[d]}
              </option>
            ))}
          </Select>
        )}
      </div>

      {rows.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="hidden grid-cols-[1fr_56px_56px_auto] gap-2 px-0.5 text-[11px] font-medium tracking-wide text-gray-900 uppercase sm:grid">
            <span>Exercise</span>
            <span className="text-center">Sets</span>
            <span className="text-center">Reps</span>
            <span className="w-[88px]" />
          </div>
          {rows.map((row, idx) => (
            <div key={idx} className="grid grid-cols-[76px_76px_1fr_auto] items-center gap-2 border-b border-gray-alpha-200 pb-2 last:border-0 sm:grid-cols-[1fr_56px_56px_auto] sm:border-0 sm:pb-0">
              <Select className="col-span-4 sm:col-span-1" value={row.exerciseId} onChange={(e) => update(idx, { exerciseId: Number(e.target.value) })}>
                {!exercises.some((e) => e.id === row.exerciseId) && <option value={row.exerciseId}>(archived)</option>}
                {exercises.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </Select>
              <label className="relative">
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                className="pr-7 pl-1 text-center sm:px-1"
                value={row.sets}
                onChange={(e) => update(idx, { sets: Number(e.target.value) })}
                aria-label="Sets"
              />
                <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[10px] text-gray-700 sm:hidden">sets</span>
              </label>
              <label className="relative">
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                className="pr-7 pl-1 text-center sm:px-1"
                value={row.reps}
                onChange={(e) => update(idx, { reps: Number(e.target.value) })}
                aria-label="Reps"
              />
                <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[10px] text-gray-700 sm:hidden">reps</span>
              </label>
              <div className="flex w-[88px] justify-self-end">
                <Button size="small" variant="tertiary" className="px-1.5" onClick={() => move(idx, -1)} aria-label="Move up" disabled={idx === 0}>
                  <IconChevronUp />
                </Button>
                <Button size="small" variant="tertiary" className="px-1.5" onClick={() => move(idx, 1)} aria-label="Move down" disabled={idx === rows.length - 1}>
                  <IconChevronDown />
                </Button>
                <Button size="small" variant="tertiary" className="px-1.5" onClick={() => setRows((r) => r.filter((_, i) => i !== idx))} aria-label="Remove">
                  <IconTrash />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <Button
          size="small"
          variant="tertiary"
          disabled={!exercises.length}
          onClick={() => {
            const used = new Set(rows.map((r) => r.exerciseId));
            const next = exercises.find((e) => !used.has(e.id)) ?? exercises[0];
            const last = rows[rows.length - 1];
            setRows((r) => [...r, { exerciseId: next.id, sets: last?.sets ?? 3, reps: last?.reps ?? 10 }]);
          }}
        >
          <IconPlus /> Add exercise
        </Button>
        <div className="flex-1" />
        {dirty && (
          <>
            <Button size="small" variant="tertiary" onClick={() => setRows(JSON.parse(serialized))} disabled={pending}>
              Discard
            </Button>
            <Button
              size="small"
              variant="primary"
              disabled={pending || rows.some((r) => !(r.sets > 0) || !(r.reps > 0))}
              onClick={() => start(() => savePlanDay(planId, weekday, rows))}
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
