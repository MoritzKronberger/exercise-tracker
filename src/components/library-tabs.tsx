import Link from "next/link";
import { cx } from "./ui";

const tabs = [
  { key: "plans", href: "/plans", label: "Plans" },
  { key: "schedule", href: "/schedule", label: "Schedule" },
  { key: "exercises", href: "/exercises", label: "Exercises" },
] as const;

/** Segmented control for the Plans area: 48px tall, equal thirds. */
export function LibraryTabs({ active }: { active: (typeof tabs)[number]["key"] }) {
  return (
    <nav className="mb-3 grid grid-cols-3 rounded-sm bg-gray-200">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          replace
          className={cx(
            "flex h-6 items-center justify-center rounded-sm text-body font-medium",
            active === t.key ? "bg-gray-1000 text-background-100" : "text-gray-900",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
