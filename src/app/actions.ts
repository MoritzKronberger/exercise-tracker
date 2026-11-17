"use server";

import { and, asc, desc, eq, lte, max } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { getDb, schema } from "@/db";
import { AUTH_COOKIE, expectedToken } from "@/lib/auth";
import { isISODate, weekdayOf } from "@/lib/dates";
import { getPlanItems, listSchedules } from "@/lib/data";
import { requireAuth } from "@/lib/server";

const { exercises, plans, planItems, schedules, sessions, sessionExercises, setLogs, bodyWeights } = schema;

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

// ---------------------------------------------------------------- auth

export async function login(_: unknown, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");
  if (!process.env.APP_PASSWORD) {
    return { error: "APP_PASSWORD is not configured on the server." };
  }
  if (password !== process.env.APP_PASSWORD) {
    await new Promise((r) => setTimeout(r, 600));
    return { error: "Wrong password." };
  }
  const jar = await cookies();
  jar.set(AUTH_COOKIE, await expectedToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  (await cookies()).delete(AUTH_COOKIE);
  redirect("/login");
}

// ---------------------------------------------------------------- exercises

export async function createExercise(formData: FormData) {
  await requireAuth();
  const db = await getDb();
  const rest = String(formData.get("restSeconds") ?? "").trim();
  await db.insert(exercises).values({
    name: str(formData.get("name")),
    restSeconds: rest ? int(rest, 0, 3600) : null,
  });
  refresh();
}

export async function updateExercise(id: number, data: { name: string; restSeconds: number | null }) {
  await requireAuth();
  const db = await getDb();
  await db
    .update(exercises)
    .set({ name: str(data.name), restSeconds: data.restSeconds == null ? null : int(data.restSeconds, 0, 3600) })
    .where(eq(exercises.id, id));
  refresh();
}

export async function setExerciseArchived(id: number, archived: boolean) {
  await requireAuth();
  const db = await getDb();
  await db.update(exercises).set({ archived }).where(eq(exercises.id, id));
  refresh();
}

export async function deleteExercise(id: number) {
  await requireAuth();
  const db = await getDb();
  await db.delete(exercises).where(eq(exercises.id, id));
  refresh();
}

// ---------------------------------------------------------------- plans

export async function createPlan(formData: FormData) {
  await requireAuth();
  const db = await getDb();
  const [plan] = await db.insert(plans).values({ name: str(formData.get("name")) }).returning();
  redirect(`/plans/${plan.id}`);
}

export async function renamePlan(id: number, name: string) {
  await requireAuth();
  const db = await getDb();
  await db.update(plans).set({ name: str(name) }).where(eq(plans.id, id));
  refresh();
}

export async function duplicatePlan(id: number) {
  await requireAuth();
  const db = await getDb();
  const [orig] = await db.select().from(plans).where(eq(plans.id, id));
  if (!orig) return;
  const items = await getPlanItems([id]);
  const [copy] = await db.insert(plans).values({ name: `${orig.name} (copy)` }).returning();
  if (items.length) {
    await db.insert(planItems).values(
      items.map((i) => ({ planId: copy.id, weekday: i.weekday, exerciseId: i.exerciseId, sets: i.sets, reps: i.reps, position: i.position })),
    );
  }
  redirect(`/plans/${copy.id}`);
}

export async function deletePlan(id: number) {
  await requireAuth();
  const db = await getDb();
  await db.delete(plans).where(eq(plans.id, id));
  redirect("/plans");
}

export type DayItemInput = { exerciseId: number; sets: number; reps: number };

/** Replaces all exercises of one weekday of a plan. */
export async function savePlanDay(planId: number, weekday: number, items: DayItemInput[]) {
  await requireAuth();
  const db = await getDb();
  const wd = int(weekday, 0, 6);
  await db.transaction(async (tx) => {
    await tx.delete(planItems).where(and(eq(planItems.planId, planId), eq(planItems.weekday, wd)));
    if (items.length) {
      await tx.insert(planItems).values(
        items.map((i, idx) => ({
          planId,
          weekday: wd,
          exerciseId: int(i.exerciseId, 1, Number.MAX_SAFE_INTEGER),
          sets: int(i.sets, 1, 50),
          reps: int(i.reps, 1, 500),
          position: idx,
        })),
      );
    }
  });
  refresh();
}

// ---------------------------------------------------------------- schedules

export async function createSchedule(formData: FormData) {
  await requireAuth();
  const db = await getDb();
  const startDate = String(formData.get("startDate"));
  if (!isISODate(startDate)) throw new Error("Invalid start date");
  await db.insert(schedules).values({
    planId: int(formData.get("planId"), 1, Number.MAX_SAFE_INTEGER),
    startDate,
    weeks: int(formData.get("weeks"), 1, 104),
  });
  refresh();
}

export async function deleteSchedule(id: number) {
  await requireAuth();
  const db = await getDb();
  await db.delete(schedules).where(eq(schedules.id, id));
  refresh();
}

// ---------------------------------------------------------------- workouts

export async function startSession(date: string, scheduleId: number | null) {
  await requireAuth();
  if (!isISODate(date)) throw new Error("Invalid date");
  const db = await getDb();
  let planId: number | null = null;
  let items: { exerciseId: number; sets: number; reps: number }[] = [];
  if (scheduleId) {
    const sched = (await listSchedules()).find((s) => s.id === scheduleId);
    if (!sched) throw new Error("Schedule not found");
    planId = sched.planId;
    const wd = weekdayOf(date);
    items = (await getPlanItems([sched.planId])).filter((i) => i.weekday === wd);

    // Resume instead of duplicating if this workout was already started.
    const [existing] = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(eq(sessions.date, date), eq(sessions.scheduleId, scheduleId)))
      .limit(1);
    if (existing) redirect(`/workout/${existing.id}`);
  }
  const [session] = await db.insert(sessions).values({ date, scheduleId, planId }).returning();
  if (items.length) {
    await db.insert(sessionExercises).values(
      items.map((i, idx) => ({ sessionId: session.id, exerciseId: i.exerciseId, targetSets: i.sets, targetReps: i.reps, position: idx })),
    );
  }
  redirect(`/workout/${session.id}`);
}

export async function addSessionExercise(sessionId: number, exerciseId: number, targetSets: number, targetReps: number) {
  await requireAuth();
  const db = await getDb();
  const [{ pos }] = await db
    .select({ pos: max(sessionExercises.position) })
    .from(sessionExercises)
    .where(eq(sessionExercises.sessionId, sessionId));
  await db.insert(sessionExercises).values({
    sessionId,
    exerciseId,
    targetSets: int(targetSets, 1, 50),
    targetReps: int(targetReps, 1, 500),
    position: (pos ?? -1) + 1,
  });
  refresh();
}

export async function removeSessionExercise(sessionExerciseId: number) {
  await requireAuth();
  const db = await getDb();
  const [se] = await db.select().from(sessionExercises).where(eq(sessionExercises.id, sessionExerciseId));
  if (!se) return;
  await db.delete(setLogs).where(and(eq(setLogs.sessionId, se.sessionId), eq(setLogs.exerciseId, se.exerciseId)));
  await db.delete(sessionExercises).where(eq(sessionExercises.id, sessionExerciseId));
  refresh();
}

/**
 * `completedAtIso` is the moment the set was logged on the device. Sets logged while offline are
 * retried later, so the client timestamp keeps rest times accurate.
 */
export async function logSet(sessionId: number, exerciseId: number, weight: number, reps: number, completedAtIso?: string) {
  await requireAuth();
  const db = await getDb();
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
  await requireAuth();
  const db = await getDb();
  await db.update(setLogs).set({ weight: num(weight, 0, 2000), reps: int(reps, 0, 1000) }).where(eq(setLogs.id, id));
  refresh();
}

export async function deleteSet(id: number) {
  await requireAuth();
  const db = await getDb();
  const [row] = await db.select().from(setLogs).where(eq(setLogs.id, id));
  if (!row) return;
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
  await requireAuth();
  const db = await getDb();
  await db.update(sessions).set({ finishedAt: new Date() }).where(eq(sessions.id, sessionId));
  refresh();
}

export async function deleteSession(sessionId: number) {
  await requireAuth();
  const db = await getDb();
  await db.delete(sessions).where(eq(sessions.id, sessionId));
  redirect("/");
}

// ---------------------------------------------------------------- body weight

export async function saveBodyWeight(formData: FormData) {
  await requireAuth();
  const db = await getDb();
  const date = String(formData.get("date"));
  if (!isISODate(date)) throw new Error("Invalid date");
  const weight = num(formData.get("weight"), 20, 400);
  await db
    .insert(bodyWeights)
    .values({ date, weight })
    .onConflictDoUpdate({ target: bodyWeights.date, set: { weight } });
  refresh();
}

export async function deleteBodyWeight(id: number) {
  await requireAuth();
  const db = await getDb();
  await db.delete(bodyWeights).where(eq(bodyWeights.id, id));
  refresh();
}
