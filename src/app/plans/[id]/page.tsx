import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui";
import { getPlan, listExercises } from "@/lib/data";
import { PlanEditor } from "./plan-editor";

export default function PlanPage({ params }: PageProps<"/plans/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/plans/[id]">["params"] }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [plan, exercises] = await Promise.all([getPlan(id), listExercises()]);
  if (!plan) notFound();
  return (
    <PlanEditor
      plan={{ id: plan.id, name: plan.name }}
      items={plan.items.map((i) => ({ weekday: i.weekday, exerciseId: i.exerciseId, sets: i.sets }))}
      exercises={exercises.map((e) => ({ id: e.id, name: e.name }))}
    />
  );
}
