import { Suspense } from "react";
import { LibraryTabs } from "@/components/library-tabs";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { exerciseUsage, listExercises } from "@/lib/data";
import { ExerciseList } from "./exercise-list";

export default function ExercisesPage() {
  return (
    <>
      <PageHeader title="Library" description="Exercises you can add to your workout plans." />
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
        archived: e.archived,
        loggedSets: usage.get(e.id)?.sets ?? 0,
      }))}
    />
  );
}
