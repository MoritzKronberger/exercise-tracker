"use client";

import { useRef, useState, useTransition } from "react";
import { saveBodyWeight } from "@/app/actions";
import { Button, Field, Input } from "@/components/ui";
import { Stepper } from "@/components/stepper";

export function WeightForm({ today, last }: { today: string; last: number | null }) {
  const [weight, setWeight] = useState(last != null ? last.toFixed(1) : "");
  const [date, setDate] = useState(today);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  const valid = Number(weight.replace(",", ".")) > 0;
  return (
    <form
      ref={ref}
      className="flex flex-col gap-2"
      action={(fd) =>
        start(async () => {
          await saveBodyWeight(fd);
          setSaved(true);
        })
      }
    >
      <input type="hidden" name="weight" value={weight.replace(",", ".")} />
      <Stepper
        label="kg"
        value={weight}
        onChange={(v) => {
          setWeight(v);
          setSaved(false);
        }}
        step={0.1}
        decimal
      />
      <Field label="Date">
        <Input type="date" name="date" value={date} max={today} onChange={(e) => (setDate(e.target.value), setSaved(false))} required />
      </Field>
      <Button type="submit" variant="primary" size="xl" disabled={pending || !valid}>
        {pending ? "Saving…" : saved ? "Saved ✓" : "Save"}
      </Button>
    </form>
  );
}
