"use client";

import { useRouter } from "next/navigation";
import { useRef, useTransition, type ReactNode } from "react";
import { startSession } from "@/app/actions";
import { Button } from "@/components/ui";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";

export function DaySwiper({ prev, next, children }: { prev: string; next: string; children: ReactNode }) {
  const router = useRouter();
  const touch = useRef<{ x: number; y: number } | null>(null);
  const go = (d: string) => router.replace(`/?date=${d}`, { scroll: false });

  return (
    <div
      onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        if (!touch.current) return;
        const dx = e.changedTouches[0].clientX - touch.current.x;
        const dy = e.changedTouches[0].clientY - touch.current.y;
        touch.current = null;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? next : prev);
      }}
    >
      {children}
    </div>
  );
}

/** Desktop only — phones swipe. */
export function DayArrows({ prev, next }: { prev: string; next: string }) {
  const router = useRouter();
  const go = (d: string) => router.replace(`/?date=${d}`, { scroll: false });
  return (
    <div className="hidden gap-1 md:flex">
      <Button variant="ghost" onClick={() => go(prev)} aria-label="Previous day">
        <IconChevronLeft size={24} />
      </Button>
      <Button variant="ghost" onClick={() => go(next)} aria-label="Next day">
        <IconChevronRight size={24} />
      </Button>
    </div>
  );
}

export function StartButton({
  date,
  scheduleId,
  label,
  variant = "primary",
  size = "xl",
}: {
  date: string;
  scheduleId: number | null;
  label: string;
  variant?: "primary" | "secondary";
  size?: "lg" | "xl";
}) {
  const [pending, start] = useTransition();
  return (
    <Button variant={variant} size={size} className="w-full" disabled={pending} onClick={() => start(() => startSession(date, scheduleId))}>
      {pending ? "Starting…" : label}
    </Button>
  );
}
