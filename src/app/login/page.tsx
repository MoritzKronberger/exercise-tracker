import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="mx-auto mt-12 max-w-sm">
      <h1 className="mb-3 text-center text-display font-semibold tracking-tight">Lift Log</h1>
      <Suspense>
        <LoginForm />
      </Suspense>
      <Link href="/signup" className="mt-2 flex h-6 items-center justify-center text-body text-gray-900">
        Create account
      </Link>
    </div>
  );
}
