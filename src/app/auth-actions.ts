"use server";

import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth, INVITE_HEADER } from "@/lib/auth";

/** `email` is echoed back so the form keeps it after an error (React resets forms after an action). */
type FormState = { error?: string; ok?: boolean; email?: string } | null;

function safeNext(v: FormDataEntryValue | null) {
  const s = String(v ?? "/");
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
}

function message(err: unknown, fallback: string) {
  return isAPIError(err) && err.message ? err.message : fallback;
}

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const auth = await getAuth();
  const email = String(formData.get("email") ?? "").trim();
  try {
    await auth.api.signInEmail({ body: { email, password: String(formData.get("password") ?? "") }, headers: await headers() });
  } catch {
    return { error: "Wrong email or password.", email };
  }
  redirect(safeNext(formData.get("next")));
}

export async function signUp(_: FormState, formData: FormData): Promise<FormState> {
  const auth = await getAuth();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Use at least 8 characters for the password.", email };
  // The invite code travels as a header so Better Auth's own sign-up hook can check it.
  const h = new Headers(await headers());
  h.set(INVITE_HEADER, String(formData.get("invite") ?? ""));
  try {
    await auth.api.signUpEmail({ body: { email, password, name: email.split("@")[0] || email }, headers: h });
  } catch (err) {
    return { error: message(err, "Could not create the account."), email };
  }
  redirect("/");
}

export async function signOut() {
  const auth = await getAuth();
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}

export async function changePassword(_: FormState, formData: FormData): Promise<FormState> {
  const auth = await getAuth();
  const newPassword = String(formData.get("newPassword") ?? "");
  if (newPassword.length < 8) return { error: "Use at least 8 characters." };
  try {
    await auth.api.changePassword({
      body: { currentPassword: String(formData.get("currentPassword") ?? ""), newPassword, revokeOtherSessions: true },
      headers: await headers(),
    });
  } catch (err) {
    return { error: message(err, "Current password is wrong.") };
  }
  return { ok: true };
}
