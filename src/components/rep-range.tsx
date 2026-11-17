import { cx } from "./ui";
import { fmtWeight } from "@/lib/format";

/**
 * The rep range as a strip of numbers, with the next lighter / heavier weight on either end.
 *   filled blue  = reps you're about to log (follows the reps control)
 *   ringed       = what this set did last time
 * Going past either end lights up that end: that's the weight change the *next session* will suggest —
 * the weight for this set is already pre-filled.
 */
export function RepRange({
  min,
  max,
  reps,
  last,
  weight,
  lower,
  upper,
}: {
  min: number;
  max: number;
  reps: number | null;
  last: number | null;
  weight: number | null;
  lower: number | null;
  upper: number | null;
}) {
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const dense = values.length > 9;
  const over = reps != null && reps > max;
  const under = reps != null && reps < min;
  const atTop = reps != null && reps >= max;
  const label = `Rep range ${min} to ${max}.${reps != null ? ` Now ${reps}.` : ""}${last != null ? ` Last time ${last}.` : ""}${
    lower != null && weight != null ? ` Below ${min}: ${fmtWeight(lower)} kg next session.` : ""
  }${upper != null && weight != null ? ` At ${max}: ${fmtWeight(upper)} kg next session.` : ""}`;

  return (
    <div className="mb-2">
      <div className="flex h-6 items-center gap-1" role="img" aria-label={label}>
        <End tone={under ? "down" : undefined} text={lower != null && weight != null ? `−${fmtWeight(weight - lower)}` : null} />
        <div className="relative flex h-6 min-w-0 flex-1 items-center justify-between rounded-full bg-gray-100 px-[4px]">
          {values.map((v) => {
            const isNow = reps === v || (v === max && over) || (v === min && under);
            const isLast = last === v || (v === max && last != null && last > max) || (v === min && last != null && last < min);
            const show = !dense || v === min || v === max || isNow || isLast;
            return (
              <span
                key={v}
                className={cx(
                  "tabular grid shrink-0 place-items-center rounded-full font-semibold",
                  show ? "size-3 text-meta" : "size-[4px] bg-gray-500",
                  isNow ? "bg-blue-700 text-white" : show && "text-gray-900",
                  isLast && "ring-2 ring-gray-700 ring-inset",
                  isNow && isLast && "ring-white/70",
                )}
              >
                {/* Past either end, the end cell shows the actual number you're about to log. */}
                {show ? (isNow && reps != null && (over || under) ? reps : v) : null}
              </span>
            );
          })}
        </div>
        <End tone={atTop ? "up" : undefined} text={upper != null && weight != null ? `+${fmtWeight(upper - weight)}` : null} />
      </div>
      {/* Legend: the circles are about this set; the ends are about the next session. */}
      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-meta text-gray-900" aria-hidden>
        <span className="flex items-center gap-[4px]">
          <span className="size-[12px] rounded-full bg-blue-700" /> this set
        </span>
        {last != null && (
          <span className="flex items-center gap-[4px]">
            <span className="size-[12px] rounded-full ring-2 ring-gray-700 ring-inset" /> last time
          </span>
        )}
        <span>ends: next session</span>
      </p>
    </div>
  );
}

function End({ text, tone }: { text: string | null; tone?: "up" | "down" }) {
  return (
    <span
      className={cx(
        "tabular flex h-6 w-6 shrink-0 flex-col items-center justify-center rounded-sm text-meta font-semibold leading-none",
        tone === "up" ? "bg-green-700 text-white" : tone === "down" ? "bg-amber-700 text-gray-1000" : "text-gray-900",
      )}
    >
      {text ?? "–"}
      {text && <span className="font-normal opacity-80">next</span>}
    </span>
  );
}
