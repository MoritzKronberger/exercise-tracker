"use client";

import { useState, useTransition } from "react";
import { deleteSchedule } from "@/app/actions";
import { Button, Input, cx } from "@/components/ui";
import { IconTrash } from "@/components/icons";

const PRESETS = [4, 8, 12];

export function WeeksField() {
  const [weeks, setWeeks] = useState(8);
  return (
    <div className="flex flex-col gap-1.5 text-[13px] text-gray-900">
      Duration
      <div className="flex gap-2">
        <div className="flex rounded-md p-0.5 shadow-border">
          {PRESETS.map((w) => (
            <button
              type="button"
              key={w}
              onClick={() => setWeeks(w)}
              className={cx(
                "h-9 rounded px-3 text-sm font-medium transition-colors",
                weeks === w ? "bg-gray-1000 text-background-100" : "text-gray-1000 hover:bg-gray-alpha-100",
              )}
            >
              {w} wk
            </button>
          ))}
        </div>
        <Input
          type="number"
          name="weeks"
          inputMode="numeric"
          min={1}
          max={104}
          value={weeks}
          onChange={(e) => setWeeks(Number(e.target.value))}
          className="w-20 text-center"
          aria-label="Weeks"
        />
      </div>
    </div>
  );
}

export function DeleteScheduleButton({ id, name }: { id: number; name: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="small"
      variant="tertiary"
      aria-label="Delete schedule"
      disabled={pending}
      onClick={() => confirm(`Remove this schedule of “${name}”? Logged workouts are kept.`) && start(() => deleteSchedule(id))}
    >
      <IconTrash />
    </Button>
  );
}
