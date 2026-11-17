/*
 * Per-set double progression, assuming every set is taken to failure.
 *
 * Each set number has its own track: set 2 is only ever compared with set 2 of the
 * previous session of the same exercise (a second set to failure naturally lands lower).
 *
 *   last reps ≥ max  → add weight. The jump is chosen with the Epley 1RM estimate from that
 *                      set so you are predicted to land mid-range (≈9 reps for 6–12).
 *   last reps < min  → too heavy: ~5% less, rounded to the exercise's weight step (at least one step).
 *   otherwise        → same weight, one more rep (capped at max).
 *
 * Evidence: load and rep progression give similar adaptations (Plotkin et al. 2022);
 * Epley-type estimates are most accurate at ≤10 reps (Reynolds et al. 2006), so they are
 * only used to predict where a new weight lands — never to judge progress.
 */

export type RepRange = { min: number; max: number };
export type SetResult = { weight: number; reps: number };

export type SuggestionKind =
  | "first" //        no history at all — enter it yourself
  | "new-set" //      no history for this set number — borrowed the previous set's weight
  | "reps" //         same weight, +1 rep
  | "increase" //     reached the top of the range → heavier
  | "decrease" //     fell below the range → lighter
  | "step-too-big"; // reached the top, but even one step up would drop below the range

export type Suggestion = {
  kind: SuggestionKind;
  weight: number | null;
  goal: number | null;
  /** This set's result last time (null if none). */
  last: SetResult | null;
};

const DECREASE = 0.95;

export function roundToStep(w: number, step: number, mode: "down" | "up" | "nearest" = "nearest") {
  const k = w / step;
  const n = mode === "down" ? Math.floor(k + 1e-9) : mode === "up" ? Math.ceil(k - 1e-9) : Math.round(k);
  return Number((n * step).toFixed(2));
}

/** Epley estimated one-rep max. */
export function estimate1rm(weight: number, reps: number) {
  return weight * (1 + reps / 30);
}

/** Reps you're predicted to manage to failure at `weight`, given an estimated 1RM. */
export function predictReps(oneRm: number, weight: number) {
  if (weight <= 0) return Infinity;
  return 30 * (oneRm / weight - 1);
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const midpoint = (r: RepRange) => Math.round((r.min + r.max) / 2);

/** Next heavier weight after reaching `from.reps` (≥ max) at `from.weight`. */
export function heavier(from: SetResult, range: RepRange, step: number): { weight: number; goal: number; tooBig: boolean } {
  if (from.weight <= 0) {
    // Bodyweight with no added load: the formula can't help — add one step and restart at the bottom.
    return { weight: step, goal: range.min, tooBig: false };
  }
  const oneRm = estimate1rm(from.weight, from.reps);
  const target = midpoint(range);
  let w = roundToStep(oneRm / (1 + target / 30), step, "down");
  if (w <= from.weight) w = Number((from.weight + step).toFixed(2));
  const predicted = predictReps(oneRm, w);
  if (predicted < range.min) return { weight: w, goal: range.min, tooBig: true };
  return { weight: w, goal: clamp(Math.floor(predicted), range.min, range.max), tooBig: false };
}

/** Next lighter weight after falling below the range at `from.weight`. */
export function lighter(from: SetResult, range: RepRange, step: number): { weight: number; goal: number } {
  let w = roundToStep(from.weight * DECREASE, step, "nearest");
  if (w >= from.weight) w = Number((from.weight - step).toFixed(2));
  w = Math.max(0, w);
  const predicted = from.reps > 0 ? predictReps(estimate1rm(from.weight, from.reps), w) : range.min;
  return { weight: w, goal: clamp(Math.floor(predicted), range.min, range.max) };
}

/**
 * Suggestion for set `setNumber` (1-based), from the previous session's sets of this exercise.
 */
export function suggestSet(setNumber: number, previous: { setNumber: number; weight: number; reps: number }[], range: RepRange, step: number): Suggestion {
  const last = previous.find((s) => s.setNumber === setNumber) ?? null;
  if (!last) {
    const borrowed = [...previous].filter((s) => s.setNumber < setNumber).sort((a, b) => b.setNumber - a.setNumber)[0];
    if (!borrowed) return { kind: "first", weight: null, goal: null, last: null };
    return { kind: "new-set", weight: borrowed.weight, goal: null, last: null };
  }
  const result = { weight: last.weight, reps: last.reps };
  if (last.reps >= range.max) {
    const up = heavier(result, range, step);
    if (up.tooBig) return { kind: "step-too-big", weight: last.weight, goal: last.reps + 1, last: result };
    return { kind: "increase", weight: up.weight, goal: up.goal, last: result };
  }
  if (last.reps < range.min) {
    const down = lighter(result, range, step);
    return { kind: "decrease", weight: down.weight, goal: down.goal, last: result };
  }
  return { kind: "reps", weight: last.weight, goal: Math.min(last.reps + 1, range.max), last: result };
}

/** Weights at the two ends of the rep-range diagram for the weight currently selected. */
export function rangeEnds(weight: number, range: RepRange, step: number) {
  return {
    lower: lighter({ weight, reps: range.min - 1 }, range, step).weight,
    upper: heavier({ weight, reps: range.max }, range, step).weight,
  };
}
