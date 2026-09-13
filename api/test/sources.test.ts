import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseXyzPerps } from "../src/sources/hyperliquid.js";
import { parseUltraOrder } from "../src/sources/jupiter.js";
import { parseMultiplierConfig } from "../src/sources/solana.js";

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));

describe("parseMultiplierConfig", () => {
  it("reads scaledUiAmountConfig from a real NVDAx mint account", () => {
    expect(parseMultiplierConfig(fixture("mint-nvdax.json"))).toEqual({
      multiplier: 1.0009180758490996,
      newMultiplier: 1.001701196801074,
      newMultiplierEffectiveTimestamp: 1789000200,
    });
  });
  it("returns null when the extension or account is missing", () => {
    expect(parseMultiplierConfig(null)).toBeNull();
    expect(parseMultiplierConfig({ data: { parsed: { info: { extensions: [] } } } })).toBeNull();
  });
});

describe("parseXyzPerps", () => {
  it("maps universe names to contexts by index", () => {
    const perps = parseXyzPerps(fixture("hl-xyz.json"));
    const nvda = perps.get("xyz:NVDA")!;
    expect(nvda.mark).toBeGreaterThan(50);
    expect(nvda.dayVolume).toBeGreaterThan(0);
    expect([...perps.keys()]).toEqual(["xyz:TSLA", "xyz:NVDA", "xyz:GOLD", "xyz:AAPL"]);
  });
});

describe("parseUltraOrder", () => {
  it("parses a real RFQ quote", () => {
    const o = parseUltraOrder(fixture("ultra-order-nvdaon.json"));
    expect(o).toMatchObject({ inAmount: "100000000", outAmount: "462528810", router: "jupiterz", swapType: "rfq", feeBps: 10, error: null });
    expect(o.requestId).toBeTruthy();
    expect(o.transaction).toBeNull();
  });
  it("treats a missing or zero outAmount as a recorded miss", () => {
    expect(parseUltraOrder({ inAmount: "100000000" })).toMatchObject({ outAmount: null, error: "no quote" });
    expect(parseUltraOrder({ outAmount: "0", errorMessage: "No routes found" })).toMatchObject({ outAmount: null, error: "No routes found" });
  });
});
