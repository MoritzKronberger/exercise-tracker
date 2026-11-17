export function fmtWeight(n: number | null | undefined, digits = 1) {
  if (n == null || Number.isNaN(n)) return "–";
  return `${Number(n.toFixed(digits))}`;
}

export function fmtKg(n: number | null | undefined) {
  return n == null ? "–" : `${fmtWeight(n)} kg`;
}

export function fmtVolume(n: number) {
  if (n >= 10_000) return `${(n / 1000).toFixed(1)} t`;
  return `${Math.round(n).toLocaleString("en-US")} kg`;
}

export function fmtDuration(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  const ss = String(sec).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Epley estimated one-rep max. */
export function e1rm(weight: number, reps: number) {
  if (reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}
