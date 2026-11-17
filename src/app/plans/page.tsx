import Link from "next/link";
import { Suspense } from "react";
import { createPlan } from "@/app/actions";
import { LibraryTabs } from "@/components/library-tabs";
import { Badge, Button, Card, EmptyState, Input, PageHeader, PageSkeleton } from "@/components/ui";
import { IconChevronRight, IconPlus } from "@/components/icons";
import { WEEKDAYS_SHORT } from "@/lib/dates";
import { listPlans, listSchedules } from "@/lib/data";
import { userToday } from "@/lib/server";

export default function PlansPage() {
  return (
    <>
      <PageHeader title="Library" description="Weekly workout plans built from your exercises." />
      <LibraryTabs active="plans" />
      <Card className="mb-6 p-4">
        <form action={createPlan} className="flex gap-2">
          <Input name="name" placeholder="New plan name, e.g. Push / Pull / Legs" required autoComplete="off" />
          <Button type="submit" variant="primary">
            <IconPlus /> Create
          </Button>
        </form>
      </Card>
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const [plans, schedules, today] = await Promise.all([listPlans(), listSchedules(), userToday()]);
  if (!plans.length) {
    return <EmptyState title="No workout plans yet" description="Create a plan, then assign exercises with sets and reps to each day of the week." />;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {plans.map((p) => {
        const days = new Set(p.items.map((i) => i.weekday));
        const active = schedules.some((s) => s.planId === p.id && s.startDate <= today && s.endDate >= today);
        return (
          <Link key={p.id} href={`/plans/${p.id}`} className="group">
            <Card className="p-4 transition-shadow group-hover:shadow-menu">
              <div className="flex items-center gap-2">
                <p className="flex-1 truncate font-medium">{p.name}</p>
                {active && <Badge color="green">Active</Badge>}
                <IconChevronRight className="text-gray-700" />
              </div>
              <p className="mt-1 text-sm text-gray-900">
                {days.size} training {days.size === 1 ? "day" : "days"} · {p.items.length} exercises
              </p>
              <div className="mt-3 flex gap-1">
                {WEEKDAYS_SHORT.map((d, i) => (
                  <span
                    key={d}
                    className={`grid h-7 flex-1 place-items-center rounded text-[11px] font-medium ${days.has(i) ? "bg-gray-1000 text-background-100" : "bg-gray-100 text-gray-700"}`}
                  >
                    {d[0]}
                  </span>
                ))}
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
