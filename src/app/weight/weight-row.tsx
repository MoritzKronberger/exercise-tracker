"use client";

import { useTransition } from "react";
import { deleteBodyWeight } from "@/app/actions";
import { Button } from "@/components/ui";
import { IconTrash } from "@/components/icons";

export function WeightRow({ id, date, weight, delta }: { id: number; date: string; weight: number; delta: number | null }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="min-w-0 flex-1 truncate text-sm">{date}</span>
      {delta != null && delta !== 0 && (
        <span className="tabular text-xs text-gray-900">
          {delta > 0 ? "+" : ""}
          {delta.toFixed(1)}
        </span>
      )}
      <span className="tabular w-16 text-right text-sm font-medium">{weight.toFixed(1)} kg</span>
      <Button size="small" variant="tertiary" aria-label="Delete entry" disabled={pending} onClick={() => start(() => deleteBodyWeight(id))}>
        <IconTrash />
      </Button>
    </div>
  );
}
