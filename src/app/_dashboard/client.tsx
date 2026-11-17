"use client";

import { useRouter } from "next/navigation";
import { useRef, useTransition, type ReactNode } from "react";
import { startSession } from "@/app/actions";
import { Button } from "@/components/ui";
import { IconChevronLeft, IconChevronRight, IconPlay } from "@/components/icons";

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
      className="mx-auto max-w-xl"
    >
      {children}
    </div>
  );
}

export function DayArrows({ prev, next }: { prev: string; next: string }) {
  const router = useRouter();
  const go = (d: string) => router.replace(`/?date=${d}`, { scroll: false });
  return (
    <>
      <Button size="small" variant="tertiary" onClick={() => go(prev)} aria-label="Previous day">
        <IconChevronLeft />
      </Button>
      <Button size="small" variant="tertiary" onClick={() => go(next)} aria-label="Next day">
        <IconChevronRight />
      </Button>
    </>
  );
}

export function StartButton({
  date,
  scheduleId,
  label,
  variant = "primary",
  size = "large",
}: {
  date: string;
  scheduleId: number | null;
  label: string;
  variant?: "primary" | "secondary" | "tertiary";
  size?: "small" | "medium" | "large";
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant={variant}
      size={size}
      className={size === "large" ? "w-full" : undefined}
      disabled={pending}
      onClick={() => start(() => startSession(date, scheduleId))}
    >
      {size === "large" && <IconPlay size={14} />}
      {pending ? "Starting…" : label}
    </Button>
  );
}
