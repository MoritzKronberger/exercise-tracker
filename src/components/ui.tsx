import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/*
 * Every size here is a whole multiple of the 8px grid (see globals.css).
 *   h-6 = 48px  minimum touch target
 *   h-7 = 56px  workout controls
 *   h-8 = 64px  primary action of a screen
 */

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg" | "xl";

const variants: Record<Variant, string> = {
  primary: "bg-gray-1000 text-background-100 active:opacity-80",
  secondary: "bg-background-100 text-gray-1000 shadow-border active:bg-gray-100",
  ghost: "bg-transparent text-gray-1000 active:bg-gray-alpha-200",
  danger: "bg-transparent text-red-900 active:bg-red-100",
};
const sizes: Record<Size, string> = {
  md: "h-6 min-w-6 px-2 gap-1 rounded-sm text-body",
  lg: "h-7 min-w-7 px-2 gap-1 rounded-sm text-body",
  xl: "h-8 min-w-8 px-3 gap-1 rounded-lg text-body",
};

export function buttonClass(variant: Variant = "secondary", size: Size = "md", extra?: string) {
  return cx(
    "inline-flex select-none items-center justify-center font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-40",
    variants[variant],
    sizes[size],
    extra,
  );
}

export function Button({ variant = "secondary", size = "md", className, ...props }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type="button" {...props} className={buttonClass(variant, size, className)} />;
}

export function LinkButton({ variant = "secondary", size = "md", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link {...props} className={buttonClass(variant, size, className)} />;
}

export const inputClass =
  "h-6 w-full rounded-sm bg-background-100 px-2 text-body text-gray-1000 shadow-border placeholder:text-gray-700 focus:shadow-focus focus:outline-none disabled:opacity-40";

/** Drops the default full width when the caller sets its own width. */
function field(className?: string) {
  return cx(/(^|\s)(w-|min-w-0|flex-1)/.test(className ?? "") ? inputClass.replace("w-full ", "") : inputClass, className);
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input {...props} className={field(className)} />;
}

const chevron =
  "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 fill=%22none%22 stroke=%22%23888%22 stroke-width=%221.5%22><path d=%22M4 6l4 4 4-4%22/></svg>')] bg-[right_16px_center] bg-no-repeat";

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select {...props} className={cx(field(className), "appearance-none pr-5", chevron)} />;
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("flex flex-col gap-1 text-meta text-gray-900", className)}>
      {label}
      {children}
    </label>
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cx("rounded-lg bg-background-100 shadow-small", className)} />;
}

export function PageHeader({ title, eyebrow, actions }: { title: ReactNode; eyebrow?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-3 flex min-h-6 items-end justify-between gap-2">
      <div className="min-w-0">
        {eyebrow && <p className="text-meta text-gray-900">{eyebrow}</p>}
        <h1 className="text-display font-semibold tracking-tight">{title}</h1>
      </div>
      {actions && <div className="flex shrink-0 gap-1">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-1 text-title font-semibold tracking-tight">{children}</h2>;
}

type BadgeColor = "gray" | "blue" | "green" | "amber" | "red";
const badgeColors: Record<BadgeColor, string> = {
  gray: "bg-gray-200 text-gray-1000",
  blue: "bg-blue-200 text-blue-900",
  green: "bg-green-100 text-green-900",
  amber: "bg-amber-100 text-amber-900",
  red: "bg-red-100 text-red-900",
};

export function Badge({ color = "gray", children, className }: { color?: BadgeColor; children: ReactNode; className?: string }) {
  return <span className={cx("inline-flex h-3 items-center rounded-full px-1 text-meta font-medium whitespace-nowrap", badgeColors[color], className)}>{children}</span>;
}

export function EmptyState({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-gray-500 px-3 py-4 text-center">
      <p className="text-body font-medium">{title}</p>
      {description && <p className="text-meta text-gray-900">{description}</p>}
      {action && <div className="mt-1 w-full">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-lg bg-gray-200", className)} />;
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-8" />
      <Skeleton className="h-24" />
      <Skeleton className="h-16" />
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Card className="p-2">
      <p className="text-meta text-gray-900">{label}</p>
      <p className="tabular text-title font-semibold tracking-tight">{value}</p>
    </Card>
  );
}

/** List row with a 56px minimum height — the basic building block of every list. */
export function Row({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cx("flex min-h-7 items-center gap-2 px-2", className)} />;
}

/** Collapsed secondary content ("Show all …"). */
export function More({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="group">
      <summary className="flex h-6 cursor-pointer list-none items-center justify-center text-meta font-medium text-gray-900 group-open:hidden">{label}</summary>
      {children}
    </details>
  );
}

/**
 * The screen's primary action, pinned in the thumb zone just above the tab bar on phones
 * (inline on desktop). Renders a spacer so page content never hides behind it.
 */
export function ActionBar({ children, aboveNav = true }: { children: ReactNode; aboveNav?: boolean }) {
  return (
    <>
      <div className="h-10 md:hidden" />
      <div
        className={cx(
          "fixed inset-x-0 z-30 bg-gradient-to-t from-background-200 from-60% to-transparent px-2 pt-2 pb-2 md:static md:mt-3 md:bg-none md:p-0",
          aboveNav ? "bottom-[calc(64px+env(safe-area-inset-bottom))]" : "pb-safe bottom-0",
        )}
      >
        <div className="mx-auto flex max-w-xl gap-1">{children}</div>
      </div>
    </>
  );
}
