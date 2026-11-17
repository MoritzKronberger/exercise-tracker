import { Suspense } from "react";
import { LibraryTabs } from "@/components/library-tabs";
import { PageSkeleton } from "@/components/ui";
import { exerciseUsage, listExercises } from "@/lib/data";
import { ExerciseList } from "./exercise-list";

export default function ExercisesPage() {
  return (
    <>
      <h1 className="sr-only">Plans</h1>
      <LibraryTabs active="exercises" />
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const [all, usage] = await Promise.all([listExercises(true), exerciseUsage()]);
  return (
    <ExerciseList
      exercises={all.map((e) => ({
        id: e.id,
        name: e.name,
        restSeconds: e.restSeconds,
        minReps: e.minReps,
        maxReps: e.maxReps,
        weightStep: e.weightStep,
        archived: e.archived,
        loggedSets: usage.get(e.id)?.sets ?? 0,
      }))}
    />
  );
}
