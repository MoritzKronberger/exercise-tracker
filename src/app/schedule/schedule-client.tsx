"use client";

import { useState, useTransition } from "react";
import { deleteSchedule } from "@/app/actions";
import { Button, cx } from "@/components/ui";
import { IconX } from "@/components/icons";

const PRESETS = [4, 8, 12];

export function WeeksField() {
  const [weeks, setWeeks] = useState(8);
  return (
    <div className="flex flex-col gap-1 text-meta text-gray-900">
      Weeks
      <input type="hidden" name="weeks" value={weeks} />
      <div className="grid grid-cols-3 gap-1">
        {PRESETS.map((w) => (
          <button
            type="button"
            key={w}
            onClick={() => setWeeks(w)}
            aria-pressed={weeks === w}
            className={cx("h-6 rounded-sm text-body font-medium", weeks === w ? "bg-gray-1000 text-background-100" : "bg-background-100 text-gray-1000 shadow-border")}
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DeleteScheduleButton({ id, name }: { id: number; name: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="lg"
      className="px-0 text-gray-900"
      aria-label="Remove schedule"
      disabled={pending}
      onClick={() => confirm(`Remove this schedule of “${name}”? Logged workouts are kept.`) && start(() => deleteSchedule(id))}
    >
      <IconX size={24} />
    </Button>
  );
}
