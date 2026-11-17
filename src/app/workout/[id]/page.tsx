import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui";
import { getSessionDetail, listExercises, sessionSummaries } from "@/lib/data";
import { WorkoutView, type WorkoutData } from "./workout-view";

export default function WorkoutPage({ params }: PageProps<"/workout/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/workout/[id]">["params"] }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [detail, exercises, summaries] = await Promise.all([getSessionDetail(id), listExercises(), sessionSummaries()]);
  if (!detail) notFound();
  const { session } = detail;

  const startedAt = new Date(session.startedAt).getTime();
  const previousSameplan = summaries.find(
    (s) => s.id !== id && s.sets > 0 && new Date(s.startedAt).getTime() < startedAt && (session.planId ? s.planId === session.planId : !s.planId),
  );

  const data: WorkoutData = {
    id: session.id,
    date: session.date,
    title: session.planName ?? "Freestyle workout",
    startedAt: new Date(session.startedAt).toISOString(),
    finishedAt: session.finishedAt ? new Date(session.finishedAt).toISOString() : null,
    previousVolume: previousSameplan?.volume ?? null,
    exercises: detail.exercises.map((e) => ({
      sessionExerciseId: e.id,
      exerciseId: e.exerciseId,
      name: e.name,
      restSeconds: e.restSeconds,
      targetSets: e.targetSets,
      targetReps: e.targetReps,
      previous: e.previous,
      logs: e.logs.map((l) => ({
        id: l.id,
        setNumber: l.setNumber,
        weight: l.weight,
        reps: l.reps,
        restSeconds: l.restSeconds,
        completedAt: new Date(l.completedAt).toISOString(),
      })),
    })),
    library: exercises.map((e) => ({ id: e.id, name: e.name })),
  };
  return <WorkoutView data={data} />;
}
