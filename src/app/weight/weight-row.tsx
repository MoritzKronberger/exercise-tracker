"use client";

import { useTransition } from "react";
import { deleteBodyWeight } from "@/app/actions";
import { Button } from "@/components/ui";
import { IconX } from "@/components/icons";

export function WeightRow({ id, date, weight, delta }: { id: number; date: string; weight: number; delta: number | null }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex min-h-7 items-center gap-2 pl-2 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-gray-alpha-400">
      <span className="min-w-0 flex-1 truncate text-body">{date}</span>
      {delta != null && delta !== 0 && <span className="tabular text-meta text-gray-900">{`${delta > 0 ? "+" : ""}${delta.toFixed(1)}`}</span>}
      <span className="tabular text-body font-medium">{weight.toFixed(1)}</span>
      <Button variant="ghost" size="lg" className="px-0 text-gray-900" aria-label="Delete entry" disabled={pending} onClick={() => confirm(`Delete ${date}?`) && start(() => deleteBodyWeight(id))}>
        <IconX size={24} />
      </Button>
    </div>
  );
}
