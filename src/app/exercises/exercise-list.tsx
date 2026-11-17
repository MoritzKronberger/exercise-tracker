"use client";

import { useRef, useState, useTransition } from "react";
import { createExercise, deleteExercise, setExerciseArchived, updateExercise } from "@/app/actions";
import { Badge, Button, Card, EmptyState, Input } from "@/components/ui";
import { IconCheck, IconPencil, IconPlus, IconX } from "@/components/icons";

type Row = { id: number; name: string; restSeconds: number | null; archived: boolean; loggedSets: number };

export function ExerciseList({ exercises }: { exercises: Row[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [showArchived, setShowArchived] = useState(false);
  const active = exercises.filter((e) => !e.archived);
  const archived = exercises.filter((e) => e.archived);

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-4">
        <form
          ref={formRef}
          action={(fd) =>
            start(async () => {
              await createExercise(fd);
              formRef.current?.reset();
              formRef.current?.querySelector<HTMLInputElement>("input[name=name]")?.focus();
            })
          }
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <label className="flex flex-1 flex-col gap-1.5 text-[13px] text-gray-900">
            Name
            <Input name="name" placeholder="e.g. Bench press" required autoComplete="off" />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] text-gray-900 sm:w-40">
            Target rest (sec)
            <Input name="restSeconds" type="number" inputMode="numeric" min={0} placeholder="optional" />
          </label>
          <Button type="submit" variant="primary" disabled={pending}>
            <IconPlus /> Add exercise
          </Button>
        </form>
      </Card>

      {active.length === 0 ? (
        <EmptyState title="No exercises yet" description="Add the exercises you do, then combine them into workout plans." />
      ) : (
        <Card className="divide-y divide-gray-alpha-400">
          {active.map((e) => (
            <ExerciseRow key={e.id} row={e} />
          ))}
        </Card>
      )}

      {archived.length > 0 && (
        <div>
          <button className="text-sm text-gray-900 hover:text-gray-1000" onClick={() => setShowArchived((s) => !s)}>
            {showArchived ? "Hide" : "Show"} archived ({archived.length})
          </button>
          {showArchived && (
            <Card className="mt-3 divide-y divide-gray-alpha-400">
              {archived.map((e) => (
                <ExerciseRow key={e.id} row={e} />
              ))}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function ExerciseRow({ row }: { row: Row }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(row.name);
  const [rest, setRest] = useState(row.restSeconds?.toString() ?? "");
  const [pending, start] = useTransition();

  if (editing) {
    return (
      <form
        className="flex flex-wrap items-center gap-2 p-3"
        onSubmit={(ev) => {
          ev.preventDefault();
          start(async () => {
            await updateExercise(row.id, { name, restSeconds: rest.trim() ? Number(rest) : null });
            setEditing(false);
          });
        }}
      >
        <Input className="min-w-40 flex-1" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
        <Input className="w-28" type="number" inputMode="numeric" placeholder="rest s" value={rest} onChange={(e) => setRest(e.target.value)} />
        <Button type="submit" variant="primary" size="medium" disabled={pending} aria-label="Save">
          <IconCheck />
        </Button>
        <Button type="button" variant="tertiary" onClick={() => setEditing(false)} aria-label="Cancel">
          <IconX />
        </Button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{row.name}</p>
        <p className="text-xs text-gray-900">
          {row.restSeconds ? `Rest ${row.restSeconds}s` : "No rest target"} · {row.loggedSets} sets logged
        </p>
      </div>
      {row.archived && <Badge>Archived</Badge>}
      <Button size="small" variant="tertiary" onClick={() => setEditing(true)} aria-label="Edit">
        <IconPencil />
      </Button>
      <Button
        size="small"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          if (row.loggedSets > 0 || row.archived) {
            if (row.archived || confirm(`Archive “${row.name}”? It keeps its history but disappears from pickers.`)) {
              start(() => setExerciseArchived(row.id, !row.archived));
            }
          } else if (confirm(`Delete “${row.name}”? It will also be removed from all plans.`)) {
            start(() => deleteExercise(row.id));
          }
        }}
      >
        {row.archived ? "Restore" : row.loggedSets > 0 ? "Archive" : "Delete"}
      </Button>
    </div>
  );
}
