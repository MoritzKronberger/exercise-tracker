"use client";

import { useOffline } from "next/offline";

export function OfflineBanner() {
  const offline = useOffline();
  if (!offline) return null;
  return (
    <div role="status" className="sticky top-0 z-50 bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-900 shadow-border">
      You&apos;re offline. Anything you log is kept and synced once the connection is back.
    </div>
  );
}
