/**
 * Token amounts to share amounts.
 *
 * xStocks and Ondo tokens are Token-2022 mints with the scaled UI amount extension. The raw
 * on-chain amount times the multiplier is the share-equivalent amount, and the multiplier grows
 * as dividends are folded in. The two issuers' multipliers differ, so tokens must be compared
 * per share, never per token.
 */

export interface MultiplierConfig {
  multiplier: number;
  newMultiplier: number;
  /** Unix seconds. */
  newMultiplierEffectiveTimestamp: number;
}

export function effectiveMultiplier(cfg: MultiplierConfig | null | undefined, nowSec: number): number {
  if (!cfg) return 1;
  return nowSec >= cfg.newMultiplierEffectiveTimestamp ? cfg.newMultiplier : cfg.multiplier;
}

export function rawToUnits(raw: string | bigint, decimals: number): number {
  const value = BigInt(raw);
  const base = 10n ** BigInt(decimals);
  return Number(value / base) + Number(value % base) / Number(base);
}

export function unitsToRaw(units: number, decimals: number): bigint {
  const [whole, frac = ""] = units.toFixed(decimals).split(".");
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(frac.padEnd(decimals, "0") || "0");
}

export function rawToShares(raw: string | bigint, decimals: number, multiplier: number): number {
  return rawToUnits(raw, decimals) * multiplier;
}

/** Price per share. Buying: usd paid / shares received. Selling: usd received / shares given. */
export function pricePerShare(usd: number, shares: number): number | null {
  return shares > 0 ? usd / shares : null;
}
