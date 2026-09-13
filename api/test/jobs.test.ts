import { describe, expect, it } from "vitest";
import { TOKENS } from "../src/config.js";
import { openDb } from "../src/db/db.js";
import { buyRow, runJob, sellRow } from "../src/recorder/jobs.js";
import { parseUltraOrder } from "../src/sources/jupiter.js";

const nvdaon = TOKENS.find((t) => t.stock === "NVDA" && t.issuer === "ondo")!;

describe("quote rows", () => {
  it("buy row prices per share from the quote and multiplier", () => {
    const order = parseUltraOrder({ inAmount: "100000000", outAmount: "462528810", router: "jupiterz", swapType: "rfq", feeBps: 10 });
    const row = buyRow(nvdaon, 1, 100, order, 1.0017152487959897, 2);
    expect(row.pps).toBeCloseTo(215.8325, 3);
    expect(row.error).toBeNull();
  });
  it("sell row prices USDC received per share given", () => {
    const order = parseUltraOrder({ inAmount: "462528810", outAmount: "99550000" });
    const row = sellRow(nvdaon, 1, "462528810", order, 1.0017152487959897, 2);
    expect(row.usd).toBe(99.55);
    expect(row.pps).toBeCloseTo(214.8613, 3);
  });
  it("keeps a no-quote buy as a row with an error and no price", () => {
    const row = buyRow(nvdaon, 1, 100, parseUltraOrder({}), 1, 2);
    expect(row).toMatchObject({ pps: null, shares: null, error: "no quote" });
  });
});

describe("db + runJob", () => {
  it("seeds 30 tokens and records job failures without throwing", async () => {
    const db = openDb(":memory:");
    expect((db.prepare("SELECT COUNT(*) n FROM tokens").get() as { n: number }).n).toBe(30);
    const ok = await runJob(db, "boom", async () => {
      throw new Error("upstream down");
    });
    expect(ok).toBe(false);
    expect(db.prepare("SELECT job, ok, detail FROM job_runs").get()).toEqual({ job: "boom", ok: 0, detail: "upstream down" });
  });
});

describe("shouldPollRealPrice", async () => {
  const { shouldPollRealPrice } = await import("../src/recorder/jobs.js");
  it("polls every minute while open", () => {
    expect(shouldPollRealPrice(Date.parse("2026-09-14T15:07:00Z"), true)).toBe(true);
  });
  it("polls on 30-minute marks while closed, or when there is no data yet", () => {
    expect(shouldPollRealPrice(Date.parse("2026-09-13T17:07:00Z"), true)).toBe(false);
    expect(shouldPollRealPrice(Date.parse("2026-09-13T17:30:00Z"), true)).toBe(true);
    expect(shouldPollRealPrice(Date.parse("2026-09-13T17:07:00Z"), false)).toBe(true);
  });
});
