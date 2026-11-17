import { strict as assert } from "node:assert";
import { test } from "node:test";
import { heavier, lighter, predictReps, estimate1rm, rangeEnds, roundToStep, suggestSet } from "./progression";

const R = { min: 6, max: 12 };

test("rounds to the exercise's weight step", () => {
  assert.equal(roundToStep(64.62, 0.5, "down"), 64.5);
  assert.equal(roundToStep(64.62, 2.5, "down"), 62.5);
  assert.equal(roundToStep(57, 0.5, "down"), 57);
  assert.equal(roundToStep(0.3 + 0.6, 0.1, "nearest"), 0.9);
});

test("within the range: same weight, one more rep — per set", () => {
  const prev = [
    { setNumber: 1, weight: 60, reps: 10 },
    { setNumber: 2, weight: 60, reps: 7 },
  ];
  assert.deepEqual(suggestSet(1, prev, R, 0.5), { kind: "reps", weight: 60, goal: 11, last: { weight: 60, reps: 10 } });
  assert.deepEqual(suggestSet(2, prev, R, 0.5), { kind: "reps", weight: 60, goal: 8, last: { weight: 60, reps: 7 } });
});

test("sets progress independently: only the set that reached the top gets heavier", () => {
  const prev = [
    { setNumber: 1, weight: 60, reps: 12 },
    { setNumber: 2, weight: 60, reps: 9 },
  ];
  const s1 = suggestSet(1, prev, R, 0.5);
  const s2 = suggestSet(2, prev, R, 0.5);
  assert.equal(s1.kind, "increase");
  assert.ok(s1.weight! > 60);
  assert.equal(s2.kind, "reps");
  assert.equal(s2.weight, 60);
});

test("weight jump lands mid-range by the 1RM estimate", () => {
  // 60 × 12 → e1RM 84 → for ~9 reps: 84 / 1.3 = 64.6 → 64.5 kg, predicted 9 reps
  const up = heavier({ weight: 60, reps: 12 }, R, 0.5);
  assert.equal(up.weight, 64.5);
  assert.equal(up.goal, 9);
  // Coarse 2.5 kg steps round down: 62.5 kg, predicted 10 reps
  const coarse = heavier({ weight: 60, reps: 12 }, R, 2.5);
  assert.equal(coarse.weight, 62.5);
  assert.equal(coarse.goal, 10);
  // Going well past the top earns a bigger jump
  assert.ok(heavier({ weight: 60, reps: 15 }, R, 0.5).weight > up.weight);
});

test("always at least one step up, even when rounding would not move", () => {
  const up = heavier({ weight: 10, reps: 12 }, R, 2.5); // e1RM 14 → 10.77 → rounds down to 10
  assert.equal(up.weight, 12.5);
});

test("a step too big for the range keeps the weight and adds reps", () => {
  // 10 kg dumbbell, next one is 15 kg: predicted reps at 15 < 6
  const s = suggestSet(1, [{ setNumber: 1, weight: 10, reps: 12 }], R, 5);
  assert.equal(s.kind, "step-too-big");
  assert.equal(s.weight, 10);
  assert.equal(s.goal, 13);
});

test("below the range: about 5% lighter, rounded to the step", () => {
  const s = suggestSet(1, [{ setNumber: 1, weight: 100, reps: 5 }], R, 0.5);
  assert.equal(s.kind, "decrease");
  assert.equal(s.weight, 95);
  assert.equal(s.goal, Math.floor(predictReps(estimate1rm(100, 5), 95)));
  // At least one step even with coarse steps
  assert.equal(lighter({ weight: 20, reps: 4 }, R, 2.5).weight, 17.5);
});

test("a new set borrows the weight of the previous set; no history means no suggestion", () => {
  const prev = [
    { setNumber: 1, weight: 70, reps: 8 },
    { setNumber: 2, weight: 65, reps: 9 },
  ];
  assert.deepEqual(suggestSet(3, prev, R, 0.5), { kind: "new-set", weight: 65, goal: null, last: null });
  assert.deepEqual(suggestSet(1, [], R, 0.5), { kind: "first", weight: null, goal: null, last: null });
});

test("bodyweight exercises (0 kg added) step up from zero", () => {
  const s = suggestSet(1, [{ setNumber: 1, weight: 0, reps: 12 }], R, 2.5);
  assert.equal(s.kind, "increase");
  assert.equal(s.weight, 2.5);
  assert.equal(s.goal, 6);
});

test("diagram ends show the next lighter and heavier weight", () => {
  assert.deepEqual(rangeEnds(60, R, 0.5), { lower: 57, upper: 64.5 });
  assert.deepEqual(rangeEnds(60, R, 2.5), { lower: 57.5, upper: 62.5 });
});
