"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deletePlan, duplicatePlan, renamePlan, savePlanDay, setPlanWeekStart, type DayItemInput } from "@/app/actions";
import { Button, Card, Input, LinkButton, Select, cx } from "@/components/ui";
import { IconArrowDown, IconArrowUp, IconChevronDown, IconChevronLeft, IconMore, IconPlus, IconTrash } from "@/components/icons";
import { Sheet, SheetItem } from "@/components/sheet";
import { WEEKDAYS, weekdaysFrom } from "@/lib/dates";

type Item = DayItemInput & { weekday: number };
type Ex = { id: number; name: string };

export function PlanEditor({ plan, items, exercises }: { plan: { id: number; name: string; weekStart: number }; items: Item[]; exercises: Ex[] }) {
  const [name, setName] = useState(plan.name);
  const [weekStart, setWeekStart] = useState(plan.weekStart);
  const [open, setOpen] = useState<number | null>(null);
  const [menu, setMenu] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div>
      <div className="flex items-center justify-between">
        <Link href="/plans" className="-ml-1 flex h-6 w-fit items-center gap-1 px-1 text-body text-gray-900">
          <IconChevronLeft size={24} /> Plans
        </Link>
        <Button variant="ghost" className="-mr-1 px-0" onClick={() => setMenu(true)} aria-label="Plan actions">
          <IconMore size={24} />
        </Button>
      </div>
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

      {/* Days are listed from this day, and schedules start on it by default. */}
      <label className="mb-1 flex min-h-6 items-center justify-between gap-2 text-body text-gray-900">
        Week starts on
        <Select
          className="w-20"
          value={weekStart}
          onChange={(e) => {
            const wd = Number(e.target.value);
            setWeekStart(wd);
            start(() => setPlanWeekStart(plan.id, wd));
          }}
        >
          {WEEKDAYS.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </Select>
      </label>

      <div className="flex flex-col gap-1">
        {weekdaysFrom(weekStart).map((wd) => (
          <DayEditor
            key={wd}
            planId={plan.id}
            weekday={wd}
            label={WEEKDAYS[wd]}
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

      <Sheet open={menu} onClose={() => setMenu(false)} title={plan.name}>
        <SheetItem disabled={pending} onClick={() => start(() => duplicatePlan(plan.id))}>
          Duplicate plan
        </SheetItem>
        <SheetItem
          danger
          disabled={pending}
          onClick={() => confirm(`Delete “${plan.name}” and its schedules? Logged workouts are kept.`) && start(() => deletePlan(plan.id))}
        >
          Delete plan
        </SheetItem>
      </Sheet>
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
  const move = (idx: number, by: -1 | 1) =>
    setRows((r) => {
      const next = [...r];
      [next[idx], next[idx + by]] = [next[idx + by], next[idx]];
      return next;
    });

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
                <div className="ml-auto flex">
                  <Button variant="ghost" className="px-0" onClick={() => move(idx, -1)} disabled={idx === 0} aria-label="Move up">
                    <IconArrowUp size={24} />
                  </Button>
                  <Button variant="ghost" className="px-0" onClick={() => move(idx, 1)} disabled={idx === rows.length - 1} aria-label="Move down">
                    <IconArrowDown size={24} />
                  </Button>
                  <Button variant="ghost" className="px-0" onClick={() => setRows((r) => r.filter((_, i) => i !== idx))} aria-label="Remove">
                    <IconTrash size={24} />
                  </Button>
                </div>
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

/**
 * Keeps what you type as text, so clearing the field doesn't turn into "0" (and "03" after typing).
 * Valid numbers are applied as you type; leaving it empty or invalid restores the last valid value.
 */
function NumberField({ value, onChange, suffix }: { value: number; onChange: (n: number) => void; suffix: string }) {
  const [text, setText] = useState(String(value));
  const [synced, setSynced] = useState(value);
  if (synced !== value) {
    setSynced(value);
    setText(String(value));
  }
  return (
    <label className="relative w-12">
      <Input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        className="w-12 pr-6 text-center"
        value={text}
        // Select on every tap (not just the first focus), so typing always replaces the number.
        onFocus={(e) => e.target.select()}
        onClick={(e) => e.currentTarget.select()}
        onChange={(e) => {
          const t = e.target.value.replace(/\D/g, "").slice(0, 2);
          setText(t);
          const n = Number(t);
          if (t && n >= 1) {
            setSynced(n);
            onChange(n);
          }
        }}
        onBlur={() => setText(String(value))}
        aria-label={suffix}
      />
      <span className="pointer-events-none absolute top-0 right-2 flex h-6 items-center text-meta text-gray-900">{suffix}</span>
    </label>
  );
}
