"use client";

import { useActionState } from "react";
import { signUp } from "@/app/auth-actions";
import { Button, Input } from "@/components/ui";

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, null);
  return (
    <form action={action} className="flex flex-col gap-2">
      <Input key={state?.email} type="email" name="email" placeholder="Email" autoComplete="email" defaultValue={state?.email} autoFocus={!state?.email} required className="h-7" />
      <Input type="password" name="password" placeholder="Password (8+ characters)" autoComplete="new-password" minLength={8} required className="h-7" />
      {/* Plain text on purpose: password managers fill password-type fields ("confirm password"). */}
      <Input
        type="text"
        name="invite"
        placeholder="Invite code"
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        data-1p-ignore
        data-lpignore="true"
        className="h-7"
      />
      {state?.error && <p className="text-meta text-red-900">{state.error}</p>}
      <Button type="submit" variant="primary" size="xl" disabled={pending}>
        {pending ? "Creating…" : "Create account"}
      </Button>
    </form>
  );
}
