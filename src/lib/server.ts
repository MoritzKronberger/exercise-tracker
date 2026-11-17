import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AUTH_COOKIE, isValidToken } from "./auth";
import { todayIn } from "./dates";

export async function requireAuth() {
  const jar = await cookies();
  if (!(await isValidToken(jar.get(AUTH_COOKIE)?.value))) redirect("/login");
}

/** "Today" in the user's timezone (reported by the browser via the `tz` cookie). */
export async function userToday() {
  await connection();
  const jar = await cookies();
  const tz = jar.get("tz")?.value;
  return todayIn(tz ? decodeURIComponent(tz) : process.env.TZ_DEFAULT || "Europe/Berlin");
}
