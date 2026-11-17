import { Suspense } from "react";
import { signOut } from "@/app/auth-actions";
import { Button, PageSkeleton } from "@/components/ui";
import { currentUser } from "@/lib/server";
import { PasswordForm } from "./password-form";

export default function AccountPage() {
  return (
    <>
      <h1 className="mb-2 text-display font-semibold tracking-tight">Account</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const user = await currentUser();
  return (
    <div className="flex flex-col gap-3">
      <p className="text-body text-gray-900">
        Signed in as <span className="font-medium text-gray-1000">{user.email}</span>
      </p>
      <section>
        <h2 className="mb-1 text-title font-semibold tracking-tight">Change password</h2>
        <PasswordForm />
      </section>
      <form action={signOut}>
        <Button type="submit" variant="danger" size="lg" className="w-full">
          Sign out
        </Button>
      </form>
    </div>
  );
}
