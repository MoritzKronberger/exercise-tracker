"use client";

import { useOffline } from "next/offline";

export function OfflineBanner() {
  const offline = useOffline();
  if (!offline) return null;
  return (
    <div role="status" className="sticky top-0 z-50 flex min-h-6 items-center justify-center bg-amber-100 px-2 text-center text-meta font-medium text-amber-900 shadow-border">
      Offline — your sets are saved when you&apos;re back online.
    </div>
  );
}
