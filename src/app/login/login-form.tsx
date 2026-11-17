"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "@/app/auth-actions";
import { Button, Input } from "@/components/ui";

export function LoginForm() {
  const next = useSearchParams().get("next") ?? "/";
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="next" value={next} />
      <Input key={state?.email} type="email" name="email" placeholder="Email" autoComplete="email" defaultValue={state?.email} autoFocus={!state?.email} required className="h-7" />
      <Input type="password" name="password" placeholder="Password" autoComplete="current-password" required className="h-7" />
      {state?.error && <p className="text-meta text-red-900">{state.error}</p>}
      <Button type="submit" variant="primary" size="xl" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
