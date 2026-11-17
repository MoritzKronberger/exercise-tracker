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

/** The user's IANA timezone (reported by the browser via the `tz` cookie). */
export async function userTimeZone() {
  await connection();
  const tz = (await cookies()).get("tz")?.value;
  return tz ? decodeURIComponent(tz) : process.env.TZ_DEFAULT || "Europe/Berlin";
}

/** "Today" in the user's timezone. */
export async function userToday() {
  return todayIn(await userTimeZone());
}
