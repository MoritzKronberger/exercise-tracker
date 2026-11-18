"use client";

import type { ReactNode } from "react";
import { Button, cx } from "./ui";
import { IconX } from "./icons";

/** Bottom sheet: every secondary action lives here, out of the way. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-label={title}>
      <button className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <div className="pb-safe relative max-h-[85vh] overflow-y-auto rounded-t-lg bg-background-100 shadow-menu">
        <div className="mx-auto max-w-xl px-2 pb-2">
          <div className="flex h-7 items-center justify-between">
            <h2 className="text-title font-semibold tracking-tight">{title}</h2>
            <Button variant="ghost" size="lg" onClick={onClose} aria-label="Close">
              <IconX size={24} />
            </Button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function SheetItem({ children, onClick, danger, disabled }: { children: ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "flex min-h-7 w-full items-center gap-2 border-t border-gray-alpha-400 text-left text-body active:bg-gray-alpha-100 disabled:opacity-40",
        danger && "text-red-900",
      )}
    >
      {children}
    </button>
  );
}
