"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deletePlan, duplicatePlan, renamePlan, savePlanDay, type DayItemInput } from "@/app/actions";
import { Button, Card, Input, LinkButton, Select, cx } from "@/components/ui";
import { IconChevronDown, IconChevronLeft, IconPlus, IconTrash } from "@/components/icons";
import { WEEKDAYS } from "@/lib/dates";

type Item = DayItemInput & { weekday: number };
type Ex = { id: number; name: string };

export function PlanEditor({ plan, items, exercises }: { plan: { id: number; name: string }; items: Item[]; exercises: Ex[] }) {
  const [name, setName] = useState(plan.name);
  const [open, setOpen] = useState<number | null>(null);
  const [pending, start] = useTransition();

  return (
    <div>
      <Link href="/plans" className="-ml-1 flex h-6 w-fit items-center gap-1 px-1 text-body text-gray-900">
        <IconChevronLeft size={24} /> Plans
      </Link>
      <input
        className="mb-2 h-7 w-full rounded-sm bg-transparent text-display font-semibold tracking-tight outline-none focus:bg-gray-alpha-100"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && name !== plan.name && start(() => renamePlan(plan.id, name))}
        aria-label="Plan name"
      />

      {exercises.length === 0 && (
        <Card className="mb-2 p-2 text-body">
          No exercises yet —{" "}
          <Link className="font-medium text-blue-900" href="/exercises">
            create some first
          </Link>
          .
        </Card>
      )}

      <div className="flex flex-col gap-1">
        {WEEKDAYS.map((day, wd) => (
          <DayEditor
            key={wd}
            planId={plan.id}
            weekday={wd}
            label={day}
            open={open === wd}
            onToggle={() => setOpen(open === wd ? null : wd)}
            initial={items.filter((i) => i.weekday === wd)}
            all={items}
            exercises={exercises}
          />
        ))}
      </div>

      <LinkButton href={`/schedule?plan=${plan.id}`} variant="primary" size="xl" className="mt-3 w-full">
        Schedule this plan
      </LinkButton>
      <div className="mt-1 grid grid-cols-2 gap-1">
        <Button variant="ghost" onClick={() => start(() => duplicatePlan(plan.id))} disabled={pending}>
          Duplicate
        </Button>
        <Button variant="danger" onClick={() => confirm(`Delete “${plan.name}” and its schedules?`) && start(() => deletePlan(plan.id))} disabled={pending}>
          Delete
        </Button>
      </div>
    </div>
  );
}

function DayEditor({
  planId,
  weekday,
  label,
  open,
  onToggle,
  initial,
  all,
  exercises,
}: {
  planId: number;
  weekday: number;
  label: string;
  open: boolean;
  onToggle: () => void;
  initial: Item[];
  all: Item[];
  exercises: Ex[];
}) {
  const serialized = JSON.stringify(initial.map(({ exerciseId, sets }) => ({ exerciseId, sets })));
  const [rows, setRows] = useState<DayItemInput[]>(() => JSON.parse(serialized));
  const [synced, setSynced] = useState(serialized);
  if (synced !== serialized) {
    // Server data changed (e.g. after saving) – adopt it.
    setSynced(serialized);
    setRows(JSON.parse(serialized));
  }
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(rows) !== serialized;
  const otherDays = [...new Set(all.map((i) => i.weekday))].filter((d) => d !== weekday);
  const nameOf = (id: number) => exercises.find((e) => e.id === id)?.name ?? "(archived)";
  const update = (idx: number, patch: Partial<DayItemInput>) => setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));

  return (
    <Card className={cx("overflow-hidden", dirty && "shadow-[0_0_0_2px_var(--ds-blue-700)]")}>
      <button type="button" onClick={onToggle} className="flex min-h-7 w-full items-center gap-2 px-2 text-left active:bg-gray-alpha-100" aria-expanded={open}>
        <span className="w-12 shrink-0 text-body font-semibold">{label}</span>
        <span className="min-w-0 flex-1 truncate text-meta text-gray-900">{rows.length ? rows.map((r) => nameOf(r.exerciseId)).join(", ") : "Rest"}</span>
        <IconChevronDown size={24} className={cx("shrink-0 text-gray-700 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="flex flex-col gap-2 border-t border-gray-alpha-400 p-2">
          {rows.map((row, idx) => (
            <div key={idx} className="flex flex-col gap-1">
              <Select value={row.exerciseId} onChange={(e) => update(idx, { exerciseId: Number(e.target.value) })} aria-label="Exercise">
                {!exercises.some((e) => e.id === row.exerciseId) && <option value={row.exerciseId}>(archived)</option>}
                {exercises.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </Select>
              <div className="flex items-center gap-1">
                <NumberField value={row.sets} onChange={(n) => update(idx, { sets: n })} suffix="sets" />
                <Button variant="ghost" className="ml-auto px-0" onClick={() => setRows((r) => r.filter((_, i) => i !== idx))} aria-label="Remove">
                  <IconTrash size={24} />
                </Button>
              </div>
            </div>
          ))}

          {rows.length === 0 && otherDays.length > 0 && (
            <Select
              value=""
              aria-label="Copy from another day"
              onChange={(e) => {
                const from = Number(e.target.value);
                setRows(all.filter((i) => i.weekday === from).map(({ exerciseId, sets }) => ({ exerciseId, sets })));
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

          <Button
            variant="secondary"
            disabled={!exercises.length}
            onClick={() => {
              const used = new Set(rows.map((r) => r.exerciseId));
              const next = exercises.find((e) => !used.has(e.id)) ?? exercises[0];
              const last = rows[rows.length - 1];
              setRows((r) => [...r, { exerciseId: next.id, sets: last?.sets ?? 2 }]);
            }}
          >
            <IconPlus size={24} /> Add exercise
          </Button>

          {dirty && (
            <div className="grid grid-cols-2 gap-1">
              <Button variant="ghost" onClick={() => setRows(JSON.parse(serialized))} disabled={pending}>
                Discard
              </Button>
              <Button
                variant="primary"
                disabled={pending || rows.some((r) => !(r.sets > 0))}
                onClick={() => start(() => savePlanDay(planId, weekday, rows))}
              >
                {pending ? "Saving…" : "Save"}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function NumberField({ value, onChange, suffix }: { value: number; onChange: (n: number) => void; suffix: string }) {
  return (
    <label className="relative w-12">
      <Input type="number" inputMode="numeric" min={1} className="w-12 pr-6 text-center" value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={suffix} />
      <span className="pointer-events-none absolute top-0 right-2 flex h-6 items-center text-meta text-gray-900">{suffix}</span>
    </label>
  );
}
