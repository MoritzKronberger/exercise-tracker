import { getAuth } from "@/lib/auth";

// Better Auth's endpoints (sign-in, sign-up, sign-out, session, …).
export async function GET(request: Request) {
  return (await getAuth()).handler(request);
}

export async function POST(request: Request) {
  return (await getAuth()).handler(request);
}
