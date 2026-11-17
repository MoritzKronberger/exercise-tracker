"use client";

/** Big −/value/+ control: 64px tall, 64px wide buttons. */
export function Stepper({
  label,
  hint,
  value,
  onChange,
  step,
  decimal,
}: {
  label: string;
  hint?: string | null;
  value: string;
  onChange: (v: string) => void;
  step: number;
  decimal?: boolean;
}) {
  const bump = (d: number) => {
    const n = Number(value.replace(",", ".")) || 0;
    onChange(String(Math.max(0, Math.round((n + d) * 100) / 100)));
  };
  return (
    <div>
      <p className="mb-1 flex justify-between text-meta text-gray-900">
        <span>{label}</span>
        {hint && <span className="tabular">{hint}</span>}
      </p>
      <div className="flex h-8 items-stretch overflow-hidden rounded-lg bg-background-100 shadow-border">
        <button type="button" className="w-8 shrink-0 text-display text-gray-900 active:bg-gray-alpha-200" onClick={() => bump(-step)} aria-label={`Decrease ${label}`}>
          −
        </button>
        <input
          className="tabular h-full min-w-0 flex-1 bg-transparent text-center text-display font-semibold outline-none"
          inputMode={decimal ? "decimal" : "numeric"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => e.target.select()}
          aria-label={label}
          placeholder="0"
        />
        <button type="button" className="w-8 shrink-0 text-display text-gray-900 active:bg-gray-alpha-200" onClick={() => bump(step)} aria-label={`Increase ${label}`}>
          +
        </button>
      </div>
    </div>
  );
}

