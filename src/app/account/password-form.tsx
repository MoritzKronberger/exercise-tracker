"use client";

import { useActionState } from "react";
import { changePassword } from "@/app/auth-actions";
import { Button, Input } from "@/components/ui";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, null);
  return (
    <form action={action} className="flex flex-col gap-2">
      <Input type="password" name="currentPassword" placeholder="Current password" autoComplete="current-password" required />
      <Input type="password" name="newPassword" placeholder="New password (8+ characters)" autoComplete="new-password" minLength={8} required />
      {state?.error && <p className="text-meta text-red-900">{state.error}</p>}
      {state?.ok && <p className="text-meta text-green-900">Password changed. Other devices were signed out.</p>}
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}
