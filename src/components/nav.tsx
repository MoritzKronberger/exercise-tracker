"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";
import { IconCalendar, IconChart, IconHome, IconList, IconScale } from "./icons";

const tabs = [
  { href: "/", label: "Today", icon: IconHome, match: (p: string) => p === "/" || p.startsWith("/workout") },
  { href: "/plans", label: "Plans", icon: IconList, match: (p: string) => p.startsWith("/plans") || p.startsWith("/exercises") },
  { href: "/schedule", label: "Schedule", icon: IconCalendar, match: (p: string) => p.startsWith("/schedule") },
  { href: "/stats", label: "Stats", icon: IconChart, match: (p: string) => p.startsWith("/stats") },
  { href: "/weight", label: "Weight", icon: IconScale, match: (p: string) => p.startsWith("/weight") },
];

export function BottomNav() {
  return <BottomNavView pathname={usePathname()} />;
}

export function BottomNavView({ pathname }: { pathname: string }) {
  if (pathname.startsWith("/login")) return null;
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-gray-alpha-400 bg-background-100/90 backdrop-blur-md md:hidden">
      <ul className="mx-auto flex max-w-xl">
        {tabs.map((t) => {
          const active = t.match(pathname);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                className={cx(
                  "flex h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                  active ? "text-gray-1000" : "text-gray-800 hover:text-gray-1000",
                )}
              >
                <t.icon size={18} />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function TopNav() {
  return <TopNavView pathname={usePathname()} />;
}

export function TopNavView({ pathname }: { pathname: string }) {
  if (pathname.startsWith("/login")) return null;
  return (
    <header className="sticky top-0 z-40 border-b border-gray-alpha-400 bg-background-100/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="grid size-6 place-items-center rounded-md bg-gray-1000 text-background-100">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 5v6M11 5v6M3 6.5v3M13 6.5v3M5 8h6" /></svg>
          </span>
          Lift Log
        </Link>
        <ul className="hidden items-center gap-1 md:flex">
          {tabs.map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                className={cx(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  t.match(pathname) ? "text-gray-1000" : "text-gray-900 hover:bg-gray-alpha-100 hover:text-gray-1000",
                )}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
