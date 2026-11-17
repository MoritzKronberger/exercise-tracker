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

// ---------------------------------------------------------------- accounts (Better Auth)

export const authUser = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const authSession = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const authAccount = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const authVerification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/**
 * Owner of a row. Nullable only so data from before accounts existed can be claimed by the first
 * account (see src/lib/auth.ts); every query filters on it.
 */
const owner = () => text("user_id").references(() => authUser.id, { onDelete: "cascade" });

// ---------------------------------------------------------------- training data

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  userId: owner(),
  name: text("name").notNull(),
  /** Optional target rest between sets in seconds; the timer vibrates once reached. */
  restSeconds: integer("rest_seconds"),
  /** Rep range used for progression (double progression: add reps, then weight). */
  minReps: integer("min_reps").notNull().default(6),
  maxReps: integer("max_reps").notNull().default(12),
  /** Smallest weight change actually possible on this exercise (plates, dumbbell steps, machine pins). */
  weightStep: real("weight_step").notNull().default(2.5),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  userId: owner(),
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
  userId: owner(),
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
    userId: owner(),
    scheduleId: integer("schedule_id").references(() => schedules.id, { onDelete: "set null" }),
    planId: integer("plan_id").references(() => plans.id, { onDelete: "set null" }),
    date: date("date", { mode: "string" }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [index("sessions_date_idx").on(t.userId, t.date)],
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
    userId: owner(),
    date: date("date", { mode: "string" }).notNull(),
    weight: real("weight").notNull(),
  },
  (t) => [uniqueIndex("body_weights_user_date_idx").on(t.userId, t.date)],
);
