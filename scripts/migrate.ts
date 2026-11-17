// Applies pending migrations to DATABASE_URL. Runs automatically during `npm run build`
// (e.g. on Vercel) and is skipped when no database URL is configured.
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;

async function main() {
  if (!url) {
    console.log("[migrate] No DATABASE_URL set – skipping migrations (local PGlite migrates on start).");
    return;
  }
  const pool = new Pool({ connectionString: url });
  await migrate(drizzle({ client: pool }), { migrationsFolder: "./drizzle" });
  await pool.end();
  console.log("[migrate] Database is up to date.");
}

main().catch((err) => {
  console.error("[migrate] Failed:", err);
  process.exit(1);
});
