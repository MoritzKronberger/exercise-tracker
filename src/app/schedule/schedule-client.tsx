"use client";

import { useState, useTransition } from "react";
import { createSchedule, deleteSchedule } from "@/app/actions";
import { Button, Field, Input, Select, cx } from "@/components/ui";
import { IconX } from "@/components/icons";
import { isISODate, nextWeekday, weekdayOf, WEEKDAYS } from "@/lib/dates";

type PlanOption = { id: number; name: string; weekStart: number };

/**
 * The start date follows the chosen plan: the next occurrence of the plan's start day (today if it
 * matches), until you pick a date yourself.
 */
export function ScheduleForm({ plans, preselect, today }: { plans: PlanOption[]; preselect: number; today: string }) {
  const startFor = (id: number) => nextWeekday(today, plans.find((p) => p.id === id)?.weekStart ?? 0);
  const [planId, setPlanId] = useState(preselect);
  const [date, setDate] = useState(() => startFor(preselect));
  const [touched, setTouched] = useState(false);
  const plan = plans.find((p) => p.id === planId);
  const offDay = plan && isISODate(date) && weekdayOf(date) !== plan.weekStart;

  return (
    <form action={createSchedule} className="flex flex-col gap-2">
      <Field label="Plan">
        <Select
          name="planId"
          value={planId}
          onChange={(e) => {
            const id = Number(e.target.value);
            setPlanId(id);
            if (!touched) setDate(startFor(id));
          }}
          required
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <label className="flex flex-col gap-1 text-meta text-gray-900">
        <span className="flex justify-between">
          <span>Start</span>
          {isISODate(date) && <span>{WEEKDAYS[weekdayOf(date)]}</span>}
        </span>
        <Input
          type="date"
          name="startDate"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setTouched(true);
          }}
          required
        />
        {offDay && plan && <span>The plan&apos;s week starts on {WEEKDAYS[plan.weekStart]}; weeks will run from {WEEKDAYS[weekdayOf(date)]} instead.</span>}
      </label>
      <WeeksField />
      <Button type="submit" variant="primary" size="xl">
        Add schedule
      </Button>
    </form>
  );
}

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
