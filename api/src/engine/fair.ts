/**
 * Fair price per share (spec section 6).
 *
 * Market open: the real exchange price. Otherwise: the 24/7 perp corrected by its measured gap (basis) to
 * the real price, with a band that widens with how noisy that gap has been. Every number here is published
 * on the Method page, so keep it boring and explainable.
 */
import type { MarketStatus } from "./sessions.js";

export const FAIR_PARAMS = {
  /** Gap samples (one per regular-session minute) needed before the basis is trusted. */
  minSamples: 60,
  /** Sessions of history used for the basis. */
  basisSessions: 5,
  openMinBand: 0.0005,
  closedMinBand: 0.0015,
  calibratingBand: 0.005,
  staleMs: 90_000,
  minPerpDayVolumeUsd: 500_000,
  /** Real and perp ticks further apart than this are not paired into a gap sample. */
  pairToleranceMs: 30_000,
};

export interface BasisStats {
  /** Median of perp / real - 1. */
  b: number;
  /** Standard deviation of the same gaps. */
  s: number;
  n: number;
}

export interface Tick {
  ts: number;
  price: number;
}

export type FairState = "live" | "model" | "calibrating" | "unavailable";

export interface FairPrice {
  state: FairState;
  price: number | null;
  /** Half-width of the band as a fraction of price. */
  band: number;
  source: "real" | "perp" | "none";
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, v) => a + v, 0) / values.length;
  return Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / (values.length - 1));
}

/** Pairs each real tick with the nearest perp tick in time and returns perp / real - 1 for close pairs. */
export function pairGaps(real: Tick[], perp: Tick[], toleranceMs = FAIR_PARAMS.pairToleranceMs): number[] {
  const perps = [...perp].sort((a, b) => a.ts - b.ts);
  const gaps: number[] = [];
  let j = 0;
  for (const r of [...real].sort((a, b) => a.ts - b.ts)) {
    while (j + 1 < perps.length && Math.abs(perps[j + 1].ts - r.ts) <= Math.abs(perps[j].ts - r.ts)) j++;
    const p = perps[j];
    if (p && Math.abs(p.ts - r.ts) <= toleranceMs && r.price > 0) gaps.push(p.price / r.price - 1);
  }
  return gaps;
}

export function computeBasis(gaps: number[]): BasisStats | null {
  if (gaps.length === 0) return null;
  return { b: median(gaps), s: stdev(gaps), n: gaps.length };
}

export interface FairInput {
  status: MarketStatus;
  now: number;
  real?: Tick | null;
  realHalfSpread?: number;
  perp?: (Tick & { dayVolume: number | null; halfSpread?: number }) | null;
  basis?: BasisStats | null;
}

export function fairPrice(input: FairInput): FairPrice {
  const { status, now, real, perp, basis } = input;
  const fresh = (t?: Tick | null) => !!t && t.price > 0 && now - t.ts <= FAIR_PARAMS.staleMs;

  if (status === "open" && fresh(real)) {
    return {
      state: "live",
      price: real!.price,
      band: Math.max(FAIR_PARAMS.openMinBand, input.realHalfSpread ?? 0),
      source: "real",
    };
  }

  // Closed, or open with no fresh real price: fall back to the perp model rather than showing nothing.
  const liquid = (perp?.dayVolume ?? 0) >= FAIR_PARAMS.minPerpDayVolumeUsd;
  if (!fresh(perp) || !liquid) return { state: "unavailable", price: null, band: 0, source: "none" };

  if (basis && basis.n >= FAIR_PARAMS.minSamples) {
    return {
      state: "model",
      price: perp!.price / (1 + basis.b),
      band: Math.max(FAIR_PARAMS.closedMinBand, 2 * basis.s) + (perp!.halfSpread ?? 0),
      source: "perp",
    };
  }
  return { state: "calibrating", price: perp!.price, band: FAIR_PARAMS.calibratingBand, source: "perp" };
}

export type Verdict = "fair" | "above" | "below";

export function premium(pricePerShare: number, fair: number): number {
  return pricePerShare / fair - 1;
}

export function verdict(prem: number, band: number): Verdict {
  if (prem > band) return "above";
  if (prem < -band) return "below";
  return "fair";
}
