"use client";

import { useRef, useState, useTransition } from "react";
import { createExercise, deleteExercise, setExerciseArchived, updateExercise } from "@/app/actions";
import { Button, Card, EmptyState, Field, Input, More, cx } from "@/components/ui";
import { IconChevronDown } from "@/components/icons";
import { fmtWeight } from "@/lib/format";

type Row = { id: number; name: string; restSeconds: number | null; minReps: number; maxReps: number; weightStep: number; archived: boolean; loggedSets: number };

export function ExerciseList({ exercises }: { exercises: Row[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [open, setOpen] = useState<number | null>(null);
  const active = exercises.filter((e) => !e.archived);
  const archived = exercises.filter((e) => e.archived);

  const list = (rows: Row[]) => (
    <Card className="overflow-hidden">
      {rows.map((e) => (
        <ExerciseRow key={e.id} row={e} open={open === e.id} onToggle={() => setOpen(open === e.id ? null : e.id)} />
      ))}
    </Card>
  );

  return (
    <div className="flex flex-col gap-2">
      {active.length === 0 ? <EmptyState title="No exercises yet" description="Add the exercises you do." /> : list(active)}

      <form
        ref={formRef}
        action={(fd) =>
          start(async () => {
            await createExercise(fd);
            formRef.current?.reset();
          })
        }
        className="flex gap-1"
      >
        <Input name="name" placeholder="New exercise" required autoComplete="off" className="flex-1" />
        <Button type="submit" variant="primary" disabled={pending}>
          Add
        </Button>
      </form>

      {archived.length > 0 && <More label={`Archived (${archived.length})`}>{list(archived)}</More>}
    </div>
  );
}

function ExerciseRow({ row, open, onToggle }: { row: Row; open: boolean; onToggle: () => void }) {
  const [name, setName] = useState(row.name);
  const [rest, setRest] = useState(row.restSeconds?.toString() ?? "");
  const [minReps, setMinReps] = useState(String(row.minReps));
  const [maxReps, setMaxReps] = useState(String(row.maxReps));
  const [step, setStep] = useState(String(row.weightStep));
  const valid = Number(minReps) >= 1 && Number(maxReps) > Number(minReps) && Number(step.replace(",", ".")) > 0;
  const [pending, start] = useTransition();

  return (
    <div className="[&:not(:first-child)]:border-t [&:not(:first-child)]:border-gray-alpha-400">
      <button type="button" onClick={onToggle} className="flex min-h-7 w-full items-center gap-2 px-2 text-left active:bg-gray-alpha-100" aria-expanded={open}>
        <span className={cx("min-w-0 flex-1 text-body break-words", row.archived && "text-gray-900")}>{row.name}</span>
        <span className="tabular text-meta text-gray-900">
          {row.minReps}–{row.maxReps} · {fmtWeight(row.weightStep)} kg
        </span>
        <IconChevronDown size={24} className={cx("shrink-0 text-gray-700 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <form
          className="flex flex-col gap-2 border-t border-gray-alpha-400 p-2"
          onSubmit={(ev) => {
            ev.preventDefault();
            start(async () => {
              await updateExercise(row.id, {
                name,
                restSeconds: rest.trim() ? Number(rest) : null,
                minReps: Number(minReps),
                maxReps: Number(maxReps),
                weightStep: Number(step.replace(",", ".")),
              });
              onToggle();
            });
          }}
        >
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <div className="grid grid-cols-2 gap-1">
            <Field label="Min reps">
              <Input type="number" inputMode="numeric" value={minReps} onChange={(e) => setMinReps(e.target.value)} />
            </Field>
            <Field label="Max reps">
              <Input type="number" inputMode="numeric" value={maxReps} onChange={(e) => setMaxReps(e.target.value)} />
            </Field>
            <Field label="Weight step (kg)">
              <Input inputMode="decimal" value={step} onChange={(e) => setStep(e.target.value)} />
            </Field>
            <Field label="Rest (seconds)">
              <Input type="number" inputMode="numeric" placeholder="none" value={rest} onChange={(e) => setRest(e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                if (row.archived) start(() => setExerciseArchived(row.id, false));
                else if (row.loggedSets > 0) {
                  if (confirm(`Archive “${row.name}”? Its history is kept.`)) start(() => setExerciseArchived(row.id, true));
                } else if (confirm(`Delete “${row.name}”? It is also removed from plans.`)) start(() => deleteExercise(row.id));
              }}
            >
              {row.archived ? "Restore" : row.loggedSets > 0 ? "Archive" : "Delete"}
            </Button>
            <Button type="submit" variant="primary" disabled={pending || !valid}>
              Save
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
