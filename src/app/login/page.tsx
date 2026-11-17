import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="mx-auto mt-[12vh] max-w-sm">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <span className="grid size-10 place-items-center rounded-lg bg-gray-1000 text-background-100">
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M5 5v6M11 5v6M3 6.5v3M13 6.5v3M5 8h6" /></svg>
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Lift Log</h1>
        <p className="text-sm text-gray-900">Enter your password to continue.</p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
