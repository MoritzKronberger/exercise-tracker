import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="mx-auto mt-12 max-w-sm">
      <h1 className="mb-3 text-center text-display font-semibold tracking-tight">Lift Log</h1>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
