import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { getAuth } from "./auth";
import { todayIn } from "./dates";

/** The signed-in user (validated against the database), once per request. Redirects to /login otherwise. */
export const currentUser = cache(async () => {
  const auth = await getAuth();
  // Use the cookie store rather than the raw request header: after an action that replaced the
  // session (e.g. a password change), it already holds the new session cookie.
  const h = new Headers(await headers());
  h.set("cookie", (await cookies()).toString());
  const session = await auth.api.getSession({ headers: h });
  if (!session) redirect("/login");
  return { id: session.user.id, email: session.user.email };
});

export async function userId() {
  return (await currentUser()).id;
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
