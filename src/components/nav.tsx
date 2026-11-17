"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";
import { IconChart, IconHome, IconList, IconScale } from "./icons";

const tabs = [
  { href: "/", label: "Today", icon: IconHome, match: (p: string) => p === "/" },
  {
    href: "/plans",
    label: "Plans",
    icon: IconList,
    match: (p: string) => p.startsWith("/plans") || p.startsWith("/exercises") || p.startsWith("/schedule"),
  },
  { href: "/stats", label: "Stats", icon: IconChart, match: (p: string) => p.startsWith("/stats") },
  { href: "/weight", label: "Weight", icon: IconScale, match: (p: string) => p.startsWith("/weight") },
];

/** Workout mode and login are full-screen: no navigation chrome. */
const hidden = (p: string) => p.startsWith("/login") || p.startsWith("/workout");

export function BottomNav() {
  return <BottomNavView pathname={usePathname()} />;
}

export function BottomNavView({ pathname }: { pathname: string }) {
  if (hidden(pathname)) return null;
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-gray-alpha-400 bg-background-100/90 backdrop-blur-md md:hidden">
      <ul className="mx-auto grid max-w-xl grid-cols-4">
        {tabs.map((t) => {
          const active = t.match(pathname);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={cx(
                  "flex h-8 flex-col items-center justify-center text-meta font-medium",
                  active ? "text-gray-1000" : "text-gray-800",
                )}
              >
                <t.icon size={24} strokeWidth={active ? 2 : 1.5} />
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

/** Desktop only — on phones the bottom bar is the only navigation. */
export function TopNavView({ pathname }: { pathname: string }) {
  if (hidden(pathname)) return null;
  return (
    <header className="sticky top-0 z-40 hidden border-b border-gray-alpha-400 bg-background-100/80 backdrop-blur-md md:block">
      <div className="mx-auto flex h-8 max-w-3xl items-center gap-3 px-2">
        <Link href="/" className="text-body font-semibold tracking-tight">
          Lift Log
        </Link>
        <ul className="flex items-center gap-1">
          {tabs.map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                className={cx(
                  "flex h-6 items-center rounded-sm px-2 text-body",
                  t.match(pathname) ? "text-gray-1000" : "text-gray-900 hover:bg-gray-alpha-100",
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
