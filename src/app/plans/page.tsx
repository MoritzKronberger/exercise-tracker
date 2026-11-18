import Link from "next/link";
import { Suspense } from "react";
import { createPlan } from "@/app/actions";
import { LibraryTabs } from "@/components/library-tabs";
import { Badge, Button, Card, EmptyState, Input, PageSkeleton } from "@/components/ui";
import { IconChevronRight } from "@/components/icons";
import { WEEKDAYS_SHORT, weekdaysFrom } from "@/lib/dates";
import { listPlans, listSchedules } from "@/lib/data";
import { userToday } from "@/lib/server";

export default function PlansPage() {
  return (
    <>
      <h1 className="sr-only">Plans</h1>
      <LibraryTabs active="plans" />
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
      <form action={createPlan} className="mt-3 flex gap-1">
        <Input name="name" placeholder="New plan" required autoComplete="off" className="flex-1" />
        <Button type="submit" variant="primary">
          Create
        </Button>
      </form>
    </>
  );
}

async function Content() {
  const [plans, schedules, today] = await Promise.all([listPlans(), listSchedules(), userToday()]);
  if (!plans.length) return <EmptyState title="No plans yet" description="Create one below." />;
  return (
    <Card className="overflow-hidden">
      {plans.map((p) => {
        const days = new Set(p.items.map((i) => i.weekday));
        const active = schedules.some((s) => s.planId === p.id && s.startDate <= today && s.endDate >= today);
        return (
          <Link key={p.id} href={`/plans/${p.id}`} className="flex min-h-8 items-center gap-2 px-2 active:bg-gray-alpha-100 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-gray-alpha-400">
            <div className="min-w-0 flex-1">
              <p className="truncate text-body font-semibold">{p.name}</p>
              <p className="text-meta text-gray-900">{weekdaysFrom(p.weekStart)
                  .filter((i) => days.has(i))
                  .map((i) => WEEKDAYS_SHORT[i])
                  .join(" · ") || "No training days"}</p>
            </div>
            {active && <Badge color="green">Active</Badge>}
            <IconChevronRight size={24} className="text-gray-700" />
          </Link>
        );
      })}
    </Card>
  );
}
