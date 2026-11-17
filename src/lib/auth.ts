import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { count, isNull } from "drizzle-orm";
import { getDb, schema, type DB } from "@/db";

/*
 * Accounts: email + password via Better Auth (MIT, self-hosted — users live in this app's own database).
 * Sign-up needs the invite code (APP_PASSWORD). Without one configured, only the very first account can
 * be created, so a fresh deployment can't be claimed by a stranger.
 */

export const INVITE_HEADER = "x-invite-code";

async function userCount(db: DB) {
  const [{ n }] = await db.select({ n: count() }).from(schema.authUser);
  return n;
}

/** Data from before accounts existed belongs to the first account. */
async function claimUnownedData(db: DB, userId: string) {
  for (const table of [schema.exercises, schema.plans, schema.schedules, schema.sessions, schema.bodyWeights]) {
    await db.update(table).set({ userId }).where(isNull(table.userId));
  }
}

function trustedOrigins() {
  return [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]
    .filter(Boolean)
    .map((host) => `https://${host}`);
}

function secret() {
  const s = process.env.BETTER_AUTH_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_SECRET is not set. Add a long random value in your Vercel environment variables.");
  }
  return "development-only-secret-do-not-use-in-production";
}

function create(db: DB) {
  return betterAuth({
    secret: secret(),
    baseURL: process.env.BETTER_AUTH_URL,
    trustedOrigins: trustedOrigins(),
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.authUser,
        session: schema.authSession,
        account: schema.authAccount,
        verification: schema.authVerification,
      },
    }),
    emailAndPassword: { enabled: true, minPasswordLength: 8, autoSignIn: true },
    session: {
      expiresIn: 60 * 60 * 24 * 90, // stay signed in on your phone for 90 days…
      updateAge: 60 * 60 * 24, // …extended whenever you use the app
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-up/email") return;
        const invite = process.env.APP_PASSWORD;
        const given = ctx.headers?.get(INVITE_HEADER) ?? "";
        if (invite ? given !== invite : (await userCount(db)) > 0) {
          throw new APIError("FORBIDDEN", { message: "Invalid invite code." });
        }
      }),
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            if ((await userCount(db)) === 1) await claimUnownedData(db, user.id);
          },
        },
      },
    },
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof create>;

const globalForAuth = globalThis as unknown as { __auth?: Promise<Auth> };

/** The database is opened asynchronously (Neon or local PGlite), so the auth instance is too. */
export function getAuth(): Promise<Auth> {
  if (!globalForAuth.__auth) {
    globalForAuth.__auth = getDb()
      .then(create)
      .catch((err) => {
        globalForAuth.__auth = undefined; // don't cache a failure
        throw err;
      });
  }
  return globalForAuth.__auth;
}
