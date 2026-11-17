import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/*
 * Fast check for a session cookie so signed-out visitors land on /login. The session itself is
 * validated against the database on every page and action (src/lib/server.ts → currentUser).
 */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();
  const url = new URL("/login", request.url);
  const next = request.nextUrl.pathname + request.nextUrl.search;
  if (next !== "/") url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|signup|api/auth|_next/static|_next/image|favicon.ico|icon|apple-icon|manifest).*)"],
};
