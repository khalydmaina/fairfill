import { describe, expect, it } from "vitest";
import { delayToNextBoundary } from "../src/recorder/schedule.js";

describe("delayToNextBoundary", () => {
  const minute = 60_000;
  const base = Date.parse("2026-09-13T15:47:00Z");
  it("waits for the next boundary", () => {
    expect(delayToNextBoundary(base + 10_000, minute)).toBe(50_000);
    expect(delayToNextBoundary(base, minute)).toBe(minute);
  });
  it("does not double-fire when a timer lands just before its boundary (15:46:58.8 then 15:47:00)", () => {
    expect(delayToNextBoundary(base - 1_200, minute)).toBe(61_200);
  });
  it("still runs the next boundary when a timer fires late", () => {
    expect(delayToNextBoundary(base + 3_000, minute)).toBe(57_000);
  });
});
