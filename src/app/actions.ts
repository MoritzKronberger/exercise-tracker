"use server";

import { and, asc, count, desc, eq, inArray, lte, max } from "drizzle-orm";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { getDb, schema, type DB } from "@/db";
import { isISODate, weekdayOf } from "@/lib/dates";
import { getPlanItems, listSchedules } from "@/lib/data";
import { userId } from "@/lib/server";

const { exercises, plans, planItems, schedules, sessions, sessionExercises, setLogs, bodyWeights } = schema;

/*
 * Ownership: every action resolves the signed-in user and only touches that user's rows. Rows
 * without an owner column (plan items, workout exercises, sets) are reached through an owned parent,
 * and every referenced id (exercise, plan, schedule) is checked before it is used.
 */

async function context() {
  const [db, uid] = await Promise.all([getDb(), userId()]);
  return { db, uid };
}

class NotFound extends Error {
  constructor() {
    super("Not found");
  }
}

async function ownPlan(db: DB, uid: string, id: number) {
  const [row] = await db.select({ id: plans.id }).from(plans).where(and(eq(plans.id, id), eq(plans.userId, uid)));
  if (!row) throw new NotFound();
}

async function ownSession(db: DB, uid: string, id: number) {
  const [row] = await db.select({ id: sessions.id }).from(sessions).where(and(eq(sessions.id, id), eq(sessions.userId, uid)));
  if (!row) throw new NotFound();
}

async function ownExercises(db: DB, uid: string, ids: number[]) {
  const unique = [...new Set(ids)];
  if (!unique.length) return;
  const [{ n }] = await db
    .select({ n: count() })
    .from(exercises)
    .where(and(inArray(exercises.id, unique), eq(exercises.userId, uid)));
  if (n !== unique.length) throw new NotFound();
}

/** A logged set, only if it belongs to one of the user's workouts. */
async function ownSet(db: DB, uid: string, id: number) {
  const [row] = await db
    .select({ id: setLogs.id, sessionId: setLogs.sessionId, exerciseId: setLogs.exerciseId })
    .from(setLogs)
    .innerJoin(sessions, eq(sessions.id, setLogs.sessionId))
    .where(and(eq(setLogs.id, id), eq(sessions.userId, uid)));
  if (!row) throw new NotFound();
  return row;
}

function int(v: unknown, min: number, max: number, fallback?: number) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) {
    if (fallback !== undefined) return fallback;
    throw new Error("Invalid number");
  }
  return Math.min(max, Math.max(min, n));
}

function num(v: unknown, min: number, max: number) {
  const n = Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) throw new Error("Invalid number");
  return Math.min(max, Math.max(min, Math.round(n * 100) / 100));
}

function str(v: unknown, maxLen = 120) {
  const s = String(v ?? "").trim().slice(0, maxLen);
  if (!s) throw new Error("Value required");
  return s;
}

// ---------------------------------------------------------------- exercises

export async function createExercise(formData: FormData) {
  const { db, uid } = await context();
  await db.insert(exercises).values({ userId: uid, name: str(formData.get("name")) });
  refresh();
}

export type ExerciseSettings = { name: string; restSeconds: number | null; minReps: number; maxReps: number; weightStep: number };

export async function updateExercise(id: number, data: ExerciseSettings) {
  const { db, uid } = await context();
  const minReps = int(data.minReps, 1, 100);
  const maxReps = int(data.maxReps, minReps + 1, 101);
  await db
    .update(exercises)
    .set({
      name: str(data.name),
      restSeconds: data.restSeconds == null ? null : int(data.restSeconds, 0, 3600),
      minReps,
      maxReps,
      weightStep: num(data.weightStep, 0.05, 50),
    })
    .where(and(eq(exercises.id, id), eq(exercises.userId, uid)));
  refresh();
}

export async function setExerciseArchived(id: number, archived: boolean) {
  const { db, uid } = await context();
  await db.update(exercises).set({ archived }).where(and(eq(exercises.id, id), eq(exercises.userId, uid)));
  refresh();
}

export async function deleteExercise(id: number) {
  const { db, uid } = await context();
  await db.delete(exercises).where(and(eq(exercises.id, id), eq(exercises.userId, uid)));
  refresh();
}

// ---------------------------------------------------------------- plans

export async function createPlan(formData: FormData) {
  const { db, uid } = await context();
  const [plan] = await db.insert(plans).values({ userId: uid, name: str(formData.get("name")) }).returning();
  redirect(`/plans/${plan.id}`);
}

export async function renamePlan(id: number, name: string) {
  const { db, uid } = await context();
  await db.update(plans).set({ name: str(name) }).where(and(eq(plans.id, id), eq(plans.userId, uid)));
  refresh();
}

export async function duplicatePlan(id: number) {
  const { db, uid } = await context();
  const [orig] = await db.select().from(plans).where(and(eq(plans.id, id), eq(plans.userId, uid)));
  if (!orig) return;
  const items = await getPlanItems([id]);
  const [copy] = await db.insert(plans).values({ userId: uid, name: `${orig.name} (copy)` }).returning();
  if (items.length) {
    await db.insert(planItems).values(
      items.map((i) => ({ planId: copy.id, weekday: i.weekday, exerciseId: i.exerciseId, sets: i.sets, position: i.position })),
    );
  }
  redirect(`/plans/${copy.id}`);
}

export async function deletePlan(id: number) {
  const { db, uid } = await context();
  await db.delete(plans).where(and(eq(plans.id, id), eq(plans.userId, uid)));
  redirect("/plans");
}

export type DayItemInput = { exerciseId: number; sets: number };

/** Replaces all exercises of one weekday of a plan. */
export async function savePlanDay(planId: number, weekday: number, items: DayItemInput[]) {
  const { db, uid } = await context();
  await ownPlan(db, uid, planId);
  const rows = items.map((i, idx) => ({
    planId,
    weekday: int(weekday, 0, 6),
    exerciseId: int(i.exerciseId, 1, Number.MAX_SAFE_INTEGER),
    sets: int(i.sets, 1, 50),
    position: idx,
  }));
  await ownExercises(
    db,
    uid,
    rows.map((r) => r.exerciseId),
  );
  await db.transaction(async (tx) => {
    await tx.delete(planItems).where(and(eq(planItems.planId, planId), eq(planItems.weekday, int(weekday, 0, 6))));
    if (rows.length) await tx.insert(planItems).values(rows);
  });
  refresh();
}

// ---------------------------------------------------------------- schedules

export async function createSchedule(formData: FormData) {
  const { db, uid } = await context();
  const startDate = String(formData.get("startDate"));
  if (!isISODate(startDate)) throw new Error("Invalid start date");
  const planId = int(formData.get("planId"), 1, Number.MAX_SAFE_INTEGER);
  await ownPlan(db, uid, planId);
  await db.insert(schedules).values({ userId: uid, planId, startDate, weeks: int(formData.get("weeks"), 1, 104) });
  refresh();
}

export async function deleteSchedule(id: number) {
  const { db, uid } = await context();
  await db.delete(schedules).where(and(eq(schedules.id, id), eq(schedules.userId, uid)));
  refresh();
}

// ---------------------------------------------------------------- workouts

export async function startSession(date: string, scheduleId: number | null) {
  const { db, uid } = await context();
  if (!isISODate(date)) throw new Error("Invalid date");
  let planId: number | null = null;
  let items: { exerciseId: number; sets: number }[] = [];
  if (scheduleId) {
    const sched = (await listSchedules()).find((s) => s.id === scheduleId); // only the user's schedules
    if (!sched) throw new NotFound();
    planId = sched.planId;
    const wd = weekdayOf(date);
    items = (await getPlanItems([sched.planId])).filter((i) => i.weekday === wd);

    // Resume instead of duplicating if this workout was already started.
    const [existing] = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(eq(sessions.userId, uid), eq(sessions.date, date), eq(sessions.scheduleId, scheduleId)))
      .limit(1);
    if (existing) redirect(`/workout/${existing.id}`);
  }
  const [session] = await db.insert(sessions).values({ userId: uid, date, scheduleId, planId }).returning();
  if (items.length) {
    await db.insert(sessionExercises).values(
      items.map((i, idx) => ({ sessionId: session.id, exerciseId: i.exerciseId, targetSets: i.sets, position: idx })),
    );
  }
  redirect(`/workout/${session.id}`);
}

export async function addSessionExercise(sessionId: number, exerciseId: number, targetSets: number) {
  const { db, uid } = await context();
  await ownSession(db, uid, sessionId);
  await ownExercises(db, uid, [exerciseId]);
  const [{ pos }] = await db
    .select({ pos: max(sessionExercises.position) })
    .from(sessionExercises)
    .where(eq(sessionExercises.sessionId, sessionId));
  await db.insert(sessionExercises).values({
    sessionId,
    exerciseId,
    targetSets: int(targetSets, 1, 50),
    position: (pos ?? -1) + 1,
  });
  refresh();
}

export async function removeSessionExercise(sessionExerciseId: number) {
  const { db, uid } = await context();
  const [se] = await db
    .select({ id: sessionExercises.id, sessionId: sessionExercises.sessionId, exerciseId: sessionExercises.exerciseId })
    .from(sessionExercises)
    .innerJoin(sessions, eq(sessions.id, sessionExercises.sessionId))
    .where(and(eq(sessionExercises.id, sessionExerciseId), eq(sessions.userId, uid)));
  if (!se) return;
  await db.delete(setLogs).where(and(eq(setLogs.sessionId, se.sessionId), eq(setLogs.exerciseId, se.exerciseId)));
  await db.delete(sessionExercises).where(eq(sessionExercises.id, se.id));
  refresh();
}

/**
 * `completedAtIso` is the moment the set was logged on the device. Sets logged while offline are
 * retried later, so the client timestamp keeps rest times accurate.
 */
export async function logSet(sessionId: number, exerciseId: number, weight: number, reps: number, completedAtIso?: string) {
  const { db, uid } = await context();
  await ownSession(db, uid, sessionId);
  await ownExercises(db, uid, [exerciseId]);
  const serverNow = Date.now();
  const clientTs = completedAtIso ? Date.parse(completedAtIso) : NaN;
  // Accept the device time if it is plausible (not in the future, at most 12h old).
  const now = new Date(Number.isFinite(clientTs) && clientTs <= serverNow + 60_000 && clientTs >= serverNow - 12 * 3600_000 ? Math.min(clientTs, serverNow) : serverNow);
  const [last] = await db
    .select({ completedAt: setLogs.completedAt })
    .from(setLogs)
    .where(and(eq(setLogs.sessionId, sessionId), lte(setLogs.completedAt, now)))
    .orderBy(desc(setLogs.completedAt))
    .limit(1);
  const [{ n }] = await db
    .select({ n: max(setLogs.setNumber) })
    .from(setLogs)
    .where(and(eq(setLogs.sessionId, sessionId), eq(setLogs.exerciseId, exerciseId)));
  await db.insert(setLogs).values({
    sessionId,
    exerciseId,
    setNumber: (n ?? 0) + 1,
    weight: num(weight, 0, 2000),
    reps: int(reps, 0, 1000),
    restSeconds: last ? Math.round((now.getTime() - new Date(last.completedAt).getTime()) / 1000) : null,
    completedAt: now,
  });
  refresh();
}

export async function updateSet(id: number, weight: number, reps: number) {
  const { db, uid } = await context();
  await ownSet(db, uid, id);
  await db.update(setLogs).set({ weight: num(weight, 0, 2000), reps: int(reps, 0, 1000) }).where(eq(setLogs.id, id));
  refresh();
}

export async function deleteSet(id: number) {
  const { db, uid } = await context();
  const row = await ownSet(db, uid, id);
  await db.delete(setLogs).where(eq(setLogs.id, id));
  // Renumber remaining sets of that exercise.
  const rest = await db
    .select({ id: setLogs.id })
    .from(setLogs)
    .where(and(eq(setLogs.sessionId, row.sessionId), eq(setLogs.exerciseId, row.exerciseId)))
    .orderBy(asc(setLogs.setNumber));
  for (const [i, r] of rest.entries()) {
    await db.update(setLogs).set({ setNumber: i + 1 }).where(eq(setLogs.id, r.id));
  }
  refresh();
}

export async function finishSession(sessionId: number) {
  const { db, uid } = await context();
  await db.update(sessions).set({ finishedAt: new Date() }).where(and(eq(sessions.id, sessionId), eq(sessions.userId, uid)));
  refresh();
}

export async function deleteSession(sessionId: number) {
  const { db, uid } = await context();
  await db.delete(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.userId, uid)));
  redirect("/");
}

// ---------------------------------------------------------------- body weight

export async function saveBodyWeight(formData: FormData) {
  const { db, uid } = await context();
  const date = String(formData.get("date"));
  if (!isISODate(date)) throw new Error("Invalid date");
  const weight = num(formData.get("weight"), 20, 400);
  await db
    .insert(bodyWeights)
    .values({ userId: uid, date, weight })
    .onConflictDoUpdate({ target: [bodyWeights.userId, bodyWeights.date], set: { weight } });
  refresh();
}

export async function deleteBodyWeight(id: number) {
  const { db, uid } = await context();
  await db.delete(bodyWeights).where(and(eq(bodyWeights.id, id), eq(bodyWeights.userId, uid)));
  refresh();
}
