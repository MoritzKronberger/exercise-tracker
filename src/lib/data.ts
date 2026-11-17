import "server-only";
import { and, asc, desc, eq, inArray, isNotNull, lt, ne, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { scheduleEnd, scheduleWeek, weekdayOf } from "./dates";
import { e1rm } from "./format";

const { exercises, plans, planItems, schedules, sessions, sessionExercises, setLogs, bodyWeights } = schema;

export type Exercise = typeof exercises.$inferSelect;
export type SetLog = typeof setLogs.$inferSelect;

export async function listExercises(includeArchived = false) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(exercises)
    .where(includeArchived ? undefined : eq(exercises.archived, false))
    .orderBy(asc(sql`lower(${exercises.name})`));
  return rows;
}

export async function exerciseUsage() {
  const db = await getDb();
  const rows = await db
    .select({ exerciseId: setLogs.exerciseId, sets: sql<number>`count(*)::int`, last: sql<string>`max(${setLogs.completedAt})` })
    .from(setLogs)
    .groupBy(setLogs.exerciseId);
  return new Map(rows.map((r) => [r.exerciseId, r]));
}

export type PlanItem = {
  id: number;
  planId: number;
  weekday: number;
  exerciseId: number;
  exerciseName: string;
  sets: number;
  position: number;
  minReps: number;
  maxReps: number;
};

export async function getPlanItems(planIds: number[]): Promise<PlanItem[]> {
  if (!planIds.length) return [];
  const db = await getDb();
  return db
    .select({
      id: planItems.id,
      planId: planItems.planId,
      weekday: planItems.weekday,
      exerciseId: planItems.exerciseId,
      exerciseName: exercises.name,
      sets: planItems.sets,
      position: planItems.position,
      minReps: exercises.minReps,
      maxReps: exercises.maxReps,
    })
    .from(planItems)
    .innerJoin(exercises, eq(exercises.id, planItems.exerciseId))
    .where(inArray(planItems.planId, planIds))
    .orderBy(asc(planItems.weekday), asc(planItems.position), asc(planItems.id));
}

export async function listPlans() {
  const db = await getDb();
  const rows = await db.select().from(plans).orderBy(desc(plans.createdAt));
  const items = await getPlanItems(rows.map((r) => r.id));
  return rows.map((p) => ({
    ...p,
    items: items.filter((i) => i.planId === p.id),
  }));
}

export async function getPlan(id: number) {
  const db = await getDb();
  const [plan] = await db.select().from(plans).where(eq(plans.id, id));
  if (!plan) return null;
  return { ...plan, items: await getPlanItems([id]) };
}

export async function listSchedules() {
  const db = await getDb();
  const rows = await db
    .select({
      id: schedules.id,
      planId: schedules.planId,
      planName: plans.name,
      startDate: schedules.startDate,
      weeks: schedules.weeks,
    })
    .from(schedules)
    .innerJoin(plans, eq(plans.id, schedules.planId))
    .orderBy(desc(schedules.startDate));
  return rows.map((r) => ({ ...r, endDate: scheduleEnd(r.startDate, r.weeks) }));
}

export type Schedule = Awaited<ReturnType<typeof listSchedules>>[number];

/** Everything planned for a range of dates, with sessions already logged on those dates. */
export async function getAgenda(dates: string[]) {
  const db = await getDb();
  const allSchedules = await listSchedules();
  const active = allSchedules.filter((s) => dates.some((d) => scheduleWeek(s.startDate, s.weeks, d) !== null));
  const items = await getPlanItems([...new Set(active.map((s) => s.planId))]);
  const daySessions = dates.length
    ? await db
        .select()
        .from(sessions)
        .where(inArray(sessions.date, dates))
        .orderBy(asc(sessions.startedAt))
    : [];

  return dates.map((date) => {
    const wd = weekdayOf(date);
    const workouts = active
      .filter((s) => scheduleWeek(s.startDate, s.weeks, date) !== null)
      .map((s) => ({
        schedule: s,
        week: scheduleWeek(s.startDate, s.weeks, date)!,
        items: items.filter((i) => i.planId === s.planId && i.weekday === wd),
      }))
      .filter((w) => w.items.length > 0);
    return { date, weekday: wd, workouts, sessions: daySessions.filter((s) => s.date === date) };
  });
}

export async function getSessionDetail(id: number) {
  const db = await getDb();
  const [session] = await db
    .select({
      id: sessions.id,
      date: sessions.date,
      startedAt: sessions.startedAt,
      finishedAt: sessions.finishedAt,
      scheduleId: sessions.scheduleId,
      planId: sessions.planId,
      planName: plans.name,
    })
    .from(sessions)
    .leftJoin(plans, eq(plans.id, sessions.planId))
    .where(eq(sessions.id, id));
  if (!session) return null;

  const exs = await db
    .select({
      id: sessionExercises.id,
      exerciseId: sessionExercises.exerciseId,
      name: exercises.name,
      restSeconds: exercises.restSeconds,
      minReps: exercises.minReps,
      maxReps: exercises.maxReps,
      weightStep: exercises.weightStep,
      targetSets: sessionExercises.targetSets,
      position: sessionExercises.position,
    })
    .from(sessionExercises)
    .innerJoin(exercises, eq(exercises.id, sessionExercises.exerciseId))
    .where(eq(sessionExercises.sessionId, id))
    .orderBy(asc(sessionExercises.position), asc(sessionExercises.id));

  const logs = await db
    .select()
    .from(setLogs)
    .where(eq(setLogs.sessionId, id))
    .orderBy(asc(setLogs.setNumber), asc(setLogs.completedAt));

  // The most recent earlier session for each exercise, with its sets.
  const exerciseIds = exs.map((e) => e.exerciseId);
  const previous = new Map<number, { date: string; sets: { setNumber: number; weight: number; reps: number }[] }>();
  if (exerciseIds.length) {
    const prevRows = await db
      .select({
        exerciseId: setLogs.exerciseId,
        sessionId: setLogs.sessionId,
        date: sessions.date,
        startedAt: sessions.startedAt,
        setNumber: setLogs.setNumber,
        weight: setLogs.weight,
        reps: setLogs.reps,
      })
      .from(setLogs)
      .innerJoin(sessions, eq(sessions.id, setLogs.sessionId))
      .where(
        and(
          inArray(setLogs.exerciseId, exerciseIds),
          ne(setLogs.sessionId, id),
          lt(sessions.startedAt, session.startedAt),
        ),
      )
      .orderBy(desc(sessions.startedAt), asc(setLogs.setNumber));
    const chosen = new Map<number, number>();
    for (const r of prevRows) {
      if (!chosen.has(r.exerciseId)) chosen.set(r.exerciseId, r.sessionId);
      if (chosen.get(r.exerciseId) !== r.sessionId) continue;
      const entry = previous.get(r.exerciseId) ?? { date: r.date, sets: [] };
      entry.sets.push({ setNumber: r.setNumber, weight: r.weight, reps: r.reps });
      previous.set(r.exerciseId, entry);
    }
  }

  return {
    session,
    exercises: exs.map((e) => ({
      ...e,
      logs: logs.filter((l) => l.exerciseId === e.exerciseId),
      previous: previous.get(e.exerciseId) ?? null,
    })),
  };
}

export type SessionDetail = NonNullable<Awaited<ReturnType<typeof getSessionDetail>>>;

// ---------------------------------------------------------------- statistics

export async function sessionSummaries() {
  const db = await getDb();
  const rows = await db
    .select({
      id: sessions.id,
      date: sessions.date,
      startedAt: sessions.startedAt,
      finishedAt: sessions.finishedAt,
      planId: sessions.planId,
      scheduleId: sessions.scheduleId,
      planName: plans.name,
      volume: sql<number>`coalesce(sum(${setLogs.weight} * ${setLogs.reps}), 0)::float`,
      sets: sql<number>`count(${setLogs.id})::int`,
      reps: sql<number>`coalesce(sum(${setLogs.reps}), 0)::int`,
      lastSetAt: sql<string | null>`max(${setLogs.completedAt})`,
    })
    .from(sessions)
    .leftJoin(plans, eq(plans.id, sessions.planId))
    .leftJoin(setLogs, eq(setLogs.sessionId, sessions.id))
    .groupBy(sessions.id, plans.name)
    .orderBy(desc(sessions.date), desc(sessions.startedAt));
  return rows;
}

export type ExerciseProgressPoint = {
  sessionId: number;
  date: string;
  topWeight: number;
  topReps: number;
  bestE1rm: number;
  volume: number;
  sets: number;
  reps: number;
};

export async function exerciseProgress(): Promise<Map<number, ExerciseProgressPoint[]>> {
  const db = await getDb();
  const rows = await db
    .select({
      exerciseId: setLogs.exerciseId,
      sessionId: setLogs.sessionId,
      date: sessions.date,
      startedAt: sessions.startedAt,
      weight: setLogs.weight,
      reps: setLogs.reps,
    })
    .from(setLogs)
    .innerJoin(sessions, eq(sessions.id, setLogs.sessionId))
    .orderBy(asc(sessions.startedAt), asc(setLogs.setNumber));

  const out = new Map<number, ExerciseProgressPoint[]>();
  for (const r of rows) {
    const list = out.get(r.exerciseId) ?? [];
    let p = list.find((x) => x.sessionId === r.sessionId);
    if (!p) {
      p = { sessionId: r.sessionId, date: r.date, topWeight: 0, topReps: 0, bestE1rm: 0, volume: 0, sets: 0, reps: 0 };
      list.push(p);
    }
    if (r.weight > p.topWeight || (r.weight === p.topWeight && r.reps > p.topReps)) {
      p.topWeight = r.weight;
      p.topReps = r.reps;
    }
    p.bestE1rm = Math.max(p.bestE1rm, e1rm(r.weight, r.reps));
    p.volume += r.weight * r.reps;
    p.sets += 1;
    p.reps += r.reps;
    out.set(r.exerciseId, list);
  }
  return out;
}

export async function listBodyWeights() {
  const db = await getDb();
  return db.select().from(bodyWeights).orderBy(asc(bodyWeights.date));
}

export async function hasAnyFinishedSession() {
  const db = await getDb();
  const [r] = await db.select({ id: sessions.id }).from(sessions).where(isNotNull(sessions.finishedAt)).limit(1);
  return Boolean(r);
}
