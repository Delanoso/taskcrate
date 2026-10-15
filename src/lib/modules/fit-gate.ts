/** Standby-gate bubble check. One bubble at a time, in a random place, for a short life. */

export const FIT_PPE = [
  { key: "helmet", label: "Hard hat" },
  { key: "boots", label: "Safety boots" },
  { key: "vest", label: "High-vis vest" },
  { key: "eyes", label: "Eye protection" },
] as const;

export const FIT_BUBBLES = 8;
export const FIT_LIFE_MS = 1600;
/** An alert person can miss a couple. Three or more is a fail. */
export const FIT_MAX_MISSES = 2;
/** Average tap time of the bubbles they did pop. A second is comfortable; slower fails. */
export const FIT_SLOW_AVG_MS = 1200;

export type FitPop = { reactionMs: number | null };

export function scoreFit(ppeConfirmed: boolean, pops: FitPop[]) {
  const hits = pops.filter((p): p is { reactionMs: number } => p.reactionMs != null);
  const misses = pops.length - hits.length;
  const reactionMs = hits.length ? Math.round(hits.reduce((sum, p) => sum + p.reactionMs, 0) / hits.length) : FIT_LIFE_MS;
  const failed = !ppeConfirmed || misses > FIT_MAX_MISSES || hits.length === 0 || reactionMs > FIT_SLOW_AVG_MS;
  return {
    status: failed ? ("FAILED" as const) : ("VERIFIED_READY" as const),
    reactionMs,
    hits: hits.length,
    misses,
  };
}
