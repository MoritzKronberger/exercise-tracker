// Reset a user's password (there's no email in this app, so this is the "forgot password" path).
//
//   DATABASE_URL=… npx tsx scripts/reset-password.ts someone@example.com 'new-password'
//
// Without DATABASE_URL it targets the local development database (./.pglite).
// The user's existing sessions are signed out.
import { hashPassword } from "better-auth/crypto";

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password || password.length < 8) {
    console.error("Usage: npx tsx scripts/reset-password.ts <email> <new password, 8+ characters>");
    process.exit(1);
  }
  const hash = await hashPassword(password);
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  const query = url ? await neonQuery(url) : await pgliteQuery();

  const users = await query(`select id from "user" where lower(email) = lower($1)`, [email]);
  if (!users.length) {
    console.error(`No account with email ${email}.`);
    process.exit(1);
  }
  const id = users[0].id as string;
  await query(`update account set password = $1, updated_at = now() where user_id = $2 and provider_id = 'credential'`, [hash, id]);
  await query(`delete from session where user_id = $1`, [id]);
  console.log(`Password for ${email} reset; existing sessions signed out.`);
  process.exit(0);
}

async function neonQuery(url: string) {
  const { Pool } = await import("@neondatabase/serverless");
  const pool = new Pool({ connectionString: url });
  return async (sql: string, params: unknown[]) => (await pool.query(sql, params)).rows as Record<string, unknown>[];
}

async function pgliteQuery() {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite(process.env.PGLITE_DIR || "./.pglite");
  return async (sql: string, params: unknown[]) => (await db.query<Record<string, unknown>>(sql, params)).rows;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
