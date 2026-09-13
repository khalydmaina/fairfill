import { describe, expect, it } from "vitest";
import { computeBasis, FAIR_PARAMS, fairPrice, median, pairGaps, premium, stdev, verdict } from "../src/engine/fair.js";

const now = Date.parse("2026-09-14T15:00:00Z");
const perp = { ts: now - 10_000, price: 215.26, dayVolume: 21_700_000 };
const calibrated = { b: 0.0012, s: 0.0004, n: 390 };

describe("stats", () => {
  it("median and sample stdev", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(stdev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
    expect(stdev([1])).toBe(0);
  });
});

describe("pairGaps", () => {
  it("pairs nearest ticks within tolerance and skips far ones", () => {
    const real = [
      { ts: 0, price: 100 },
      { ts: 60_000, price: 100 },
      { ts: 600_000, price: 100 },
    ];
    const perps = [
      { ts: 2_000, price: 100.1 },
      { ts: 58_000, price: 100.2 },
      { ts: 400_000, price: 999 },
    ];
    const gaps = pairGaps(real, perps);
    expect(gaps).toHaveLength(2);
    expect(gaps[0]).toBeCloseTo(0.001, 9);
    expect(gaps[1]).toBeCloseTo(0.002, 9);
  });
  it("basis is null without samples", () => {
    expect(computeBasis([])).toBeNull();
    expect(computeBasis([0.001, 0.002, 0.003])).toEqual({ b: 0.002, s: expect.closeTo(0.001, 9), n: 3 });
  });
});

describe("fairPrice", () => {
  it("uses the real price while the market is open", () => {
    const f = fairPrice({ status: "open", now, real: { ts: now - 5_000, price: 215.1 }, perp, basis: calibrated });
    expect(f).toEqual({ state: "live", price: 215.1, band: FAIR_PARAMS.openMinBand, source: "real" });
  });

  it("falls back to the perp model when the open-market real price is stale", () => {
    const f = fairPrice({ status: "open", now, real: { ts: now - 120_000, price: 215.1 }, perp, basis: calibrated });
    expect(f.state).toBe("model");
  });

  it("corrects the perp by the basis when closed and calibrated", () => {
    const f = fairPrice({ status: "weekend", now, perp: { ...perp, halfSpread: 0.0002 }, basis: calibrated });
    expect(f.state).toBe("model");
    expect(f.price).toBeCloseTo(215.26 / 1.0012, 9);
    expect(f.band).toBeCloseTo(0.0015 + 0.0002, 9); // 2s = 0.0008 is under the 0.15% floor
  });

  it("widens the band with a noisy basis", () => {
    const f = fairPrice({ status: "overnight", now, perp, basis: { b: 0, s: 0.002, n: 100 } });
    expect(f.band).toBeCloseTo(0.004, 9);
  });

  it("marks an estimate as calibrating until there are enough samples", () => {
    const f = fairPrice({ status: "weekend", now, perp, basis: { b: 0.01, s: 0, n: 59 } });
    expect(f).toEqual({ state: "calibrating", price: 215.26, band: FAIR_PARAMS.calibratingBand, source: "perp" });
  });

  it("is unavailable with a stale or illiquid perp, or none", () => {
    expect(fairPrice({ status: "weekend", now, perp: { ...perp, ts: now - 91_000 }, basis: calibrated }).state).toBe("unavailable");
    expect(fairPrice({ status: "weekend", now, perp: { ...perp, dayVolume: 100_000 }, basis: calibrated }).state).toBe("unavailable");
    expect(fairPrice({ status: "weekend", now, perp: null }).state).toBe("unavailable");
  });
});

describe("premium and verdict", () => {
  it("classifies against the band", () => {
    expect(premium(216.33, 215.26)).toBeCloseTo(0.00497, 5);
    expect(verdict(0.004, 0.0015)).toBe("above");
    expect(verdict(-0.004, 0.0015)).toBe("below");
    expect(verdict(0.001, 0.0015)).toBe("fair");
  });
});
