import Link from "next/link";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <div className="mx-auto mt-12 max-w-sm">
      <h1 className="mb-3 text-center text-display font-semibold tracking-tight">Create account</h1>
      <SignupForm />
      <Link href="/login" className="mt-2 flex h-6 items-center justify-center text-body text-gray-900">
        Sign in instead
      </Link>
    </div>
  );
}
