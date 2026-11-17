import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "tertiary" | "error";
type Size = "small" | "medium" | "large";

const variants: Record<Variant, string> = {
  primary: "bg-gray-1000 text-background-100 hover:bg-[color-mix(in_srgb,var(--ds-gray-1000)_85%,transparent)]",
  secondary: "bg-background-100 text-gray-1000 shadow-border hover:bg-gray-alpha-100",
  tertiary: "bg-transparent text-gray-1000 hover:bg-gray-alpha-100",
  error: "bg-red-700 text-white hover:bg-red-900",
};
const sizes: Record<Size, string> = {
  small: "h-8 px-2.5 text-sm gap-1.5 rounded-md",
  medium: "h-10 px-3.5 text-sm gap-2 rounded-md",
  large: "h-12 px-5 text-base gap-2 rounded-lg",
};

export function buttonClass(variant: Variant = "secondary", size: Size = "medium", extra?: string) {
  return cx(
    "inline-flex items-center justify-center font-medium whitespace-nowrap select-none transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    sizes[size],
    extra,
  );
}

export function Button({
  variant = "secondary",
  size = "medium",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button {...props} className={buttonClass(variant, size, className)} />;
}

export function LinkButton({
  variant = "secondary",
  size = "medium",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link {...props} className={buttonClass(variant, size, className)} />;
}

export const inputClass =
  "h-10 w-full rounded-md bg-background-100 px-3 text-sm text-gray-1000 shadow-border placeholder:text-gray-700 transition-shadow hover:shadow-[0_0_0_1px_var(--ds-gray-500)] focus:shadow-focus focus:outline-none disabled:opacity-50";

/** Drops the default full width when the caller sets its own width. */
function field(className?: string) {
  return cx(/(^|\s)(w-|min-w-0)/.test(className ?? "") ? inputClass.replace("w-full ", "") : inputClass, className);
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input {...props} className={field(className)} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select {...props} className={cx(field(className), "appearance-none pr-8 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 fill=%22none%22 stroke=%22%23888%22 stroke-width=%221.5%22><path d=%22M4 6l4 4 4-4%22/></svg>')] bg-[right_10px_center] bg-no-repeat")} />;
}

export function Label({ children, className, ...props }: ComponentProps<"label">) {
  return (
    <label {...props} className={cx("flex flex-col gap-1.5 text-[13px] text-gray-900", className)}>
      {children}
    </label>
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cx("rounded-xl bg-background-100 shadow-small", className)} />;
}

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-900">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
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
  return (
    <span className={cx("inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium whitespace-nowrap", badgeColors[color], className)}>
      {children}
    </span>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-500 px-6 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-gray-900">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-md bg-gray-200", className)} />;
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-24" />
      <Skeleton className="h-40" />
      <Skeleton className="h-40" />
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <Card className="p-4">
      <p className="text-[13px] text-gray-900">{label}</p>
      <p className="tabular mt-1 text-xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-900">{hint}</p>}
    </Card>
  );
}
