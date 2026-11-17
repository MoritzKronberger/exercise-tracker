"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { login } from "@/app/actions";
import { Button, Card, Input } from "@/components/ui";

export function LoginForm() {
  const next = useSearchParams().get("next") ?? "/";
  const [state, action, pending] = useActionState(login, null);
  return (
    <Card className="p-6">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <Input type="password" name="password" placeholder="Password" autoComplete="current-password" autoFocus required />
        {state?.error && <p className="text-sm text-red-900">{state.error}</p>}
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </Card>
  );
}
