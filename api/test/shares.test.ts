import { describe, expect, it } from "vitest";
import { effectiveMultiplier, pricePerShare, rawToShares, rawToUnits, unitsToRaw } from "../src/engine/shares.js";

// NVDAx on-chain config read 13 Sep 2026: the new multiplier took effect 10 Sep 2026 00:30 UTC.
const nvdax = { multiplier: 1.0009180758490996, newMultiplier: 1.001701196801074, newMultiplierEffectiveTimestamp: 1789000200 };

describe("effectiveMultiplier", () => {
  it("uses the old multiplier before the effective timestamp", () => {
    expect(effectiveMultiplier(nvdax, 1789000199)).toBe(1.0009180758490996);
  });
  it("switches to the new multiplier at the effective timestamp", () => {
    expect(effectiveMultiplier(nvdax, 1789000200)).toBe(1.001701196801074);
  });
  it("is 1 for a mint without the extension", () => {
    expect(effectiveMultiplier(null, 1789000200)).toBe(1);
  });
});

describe("raw amounts", () => {
  it("converts raw to units without float drift on large u64 values", () => {
    expect(rawToUnits("18446744073709551615", 9)).toBeCloseTo(18446744073.709551615, 3);
    expect(rawToUnits(46251827n, 8)).toBe(0.46251827);
  });
  it("round-trips USDC units", () => {
    expect(unitsToRaw(100, 6)).toBe(100_000_000n);
    expect(unitsToRaw(0.000001, 6)).toBe(1n);
    expect(rawToUnits(unitsToRaw(123.456789, 6), 6)).toBe(123.456789);
  });
});

describe("per-share pricing", () => {
  it("prices a $100 NVDAon buy per share, not per token", () => {
    // Ultra quote 13 Sep 2026: 100 USDC -> 462528810 raw NVDAon (9 decimals), multiplier 1.0017152487959897
    const shares = rawToShares("462528810", 9, 1.0017152487959897);
    const perToken = 100 / rawToUnits("462528810", 9);
    const perShare = pricePerShare(100, shares)!;
    expect(perToken).toBeCloseTo(216.2027, 3);
    expect(perShare).toBeCloseTo(215.8325, 3);
    expect(perToken / perShare - 1).toBeCloseTo(0.0017152, 6);
  });
  it("returns null for zero shares", () => {
    expect(pricePerShare(100, 0)).toBeNull();
  });
});
