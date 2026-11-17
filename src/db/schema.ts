import {
  pgTable,
  serial,
  text,
  integer,
  real,
  date,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  /** Optional target rest between sets in seconds; the timer vibrates once reached. */
  restSeconds: integer("rest_seconds"),
  /** Rep range used for progression (double progression: add reps, then weight). */
  minReps: integer("min_reps").notNull().default(6),
  maxReps: integer("max_reps").notNull().default(12),
  /** Smallest weight change actually possible on this exercise (plates, dumbbell steps, machine pins). */
  weightStep: real("weight_step").notNull().default(0.5),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** weekday: 0 = Monday … 6 = Sunday */
export const planItems = pgTable(
  "plan_items",
  {
    id: serial("id").primaryKey(),
    planId: integer("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(),
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    sets: integer("sets").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("plan_items_plan_idx").on(t.planId, t.weekday)],
);

export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id")
    .notNull()
    .references(() => plans.id, { onDelete: "cascade" }),
  startDate: date("start_date", { mode: "string" }).notNull(),
  weeks: integer("weeks").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    scheduleId: integer("schedule_id").references(() => schedules.id, { onDelete: "set null" }),
    planId: integer("plan_id").references(() => plans.id, { onDelete: "set null" }),
    date: date("date", { mode: "string" }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [index("sessions_date_idx").on(t.date)],
);

/** Snapshot of the plan's targets at the moment the session was started. */
export const sessionExercises = pgTable(
  "session_exercises",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    targetSets: integer("target_sets").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("session_exercises_session_idx").on(t.sessionId)],
);

export const setLogs = pgTable(
  "set_logs",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    setNumber: integer("set_number").notNull(),
    weight: real("weight").notNull(),
    reps: integer("reps").notNull(),
    /** Seconds rested before this set (measured from the previous logged set in the session). */
    restSeconds: integer("rest_seconds"),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("set_logs_session_idx").on(t.sessionId),
    index("set_logs_exercise_idx").on(t.exerciseId, t.completedAt),
  ],
);

export const bodyWeights = pgTable(
  "body_weights",
  {
    id: serial("id").primaryKey(),
    date: date("date", { mode: "string" }).notNull(),
    weight: real("weight").notNull(),
  },
  (t) => [uniqueIndex("body_weights_date_idx").on(t.date)],
);
