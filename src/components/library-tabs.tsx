import Link from "next/link";
import { cx } from "./ui";

export function LibraryTabs({ active }: { active: "plans" | "exercises" }) {
  const item = (href: string, key: string, label: string) => (
    <Link
      href={href}
      className={cx(
        "relative -mb-px border-b-2 px-1 pb-3 text-sm transition-colors",
        active === key ? "border-gray-1000 text-gray-1000" : "border-transparent text-gray-900 hover:text-gray-1000",
      )}
    >
      {label}
    </Link>
  );
  return (
    <div className="mb-6 flex gap-6 border-b border-gray-alpha-400">
      {item("/plans", "plans", "Workout plans")}
      {item("/exercises", "exercises", "Exercises")}
    </div>
  );
}
