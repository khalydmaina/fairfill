import { describe, expect, it } from "vitest";
import { currentClose, etToUtcMs, marketStatus, nextOpen } from "../src/engine/sessions.js";

const utc = (iso: string) => Date.parse(iso);

describe("marketStatus (Sep 2026 is EDT, UTC-4)", () => {
  it.each([
    ["2026-09-13T15:13:00Z", "weekend"], // Sun 11:13 ET, the snapshot
    ["2026-09-13T23:59:00Z", "weekend"], // Sun 19:59 ET
    ["2026-09-14T00:00:00Z", "overnight"], // Sun 20:00 ET, overnight session opens
    ["2026-09-14T07:59:00Z", "overnight"], // Mon 03:59 ET
    ["2026-09-14T08:00:00Z", "pre_market"], // Mon 04:00 ET
    ["2026-09-14T13:29:00Z", "pre_market"],
    ["2026-09-14T13:30:00Z", "open"], // Mon 09:30 ET
    ["2026-09-14T19:59:00Z", "open"],
    ["2026-09-14T20:00:00Z", "after_hours"], // Mon 16:00 ET
    ["2026-09-15T00:00:00Z", "overnight"], // Mon 20:00 ET
    ["2026-09-18T19:59:00Z", "open"], // Fri 15:59 ET, deadline day
    ["2026-09-18T20:00:00Z", "after_hours"],
    ["2026-09-19T00:00:00Z", "weekend"], // Fri 20:00 ET
    ["2026-09-19T12:00:00Z", "weekend"], // Sat
  ])("%s is %s", (iso, expected) => {
    expect(marketStatus(utc(iso))).toBe(expected);
  });

  it("marks full holidays and early closes", () => {
    expect(marketStatus(utc("2026-11-26T15:00:00Z"))).toBe("holiday"); // Thanksgiving, EST
    expect(marketStatus(utc("2026-11-27T17:59:00Z"))).toBe("open"); // 12:59 EST, early close day
    expect(marketStatus(utc("2026-11-27T18:00:00Z"))).toBe("after_hours"); // 13:00 EST
  });
});

describe("etToUtcMs", () => {
  it("handles both sides of the DST change (1 Nov 2026)", () => {
    expect(new Date(etToUtcMs("2026-10-30", 570)).toISOString()).toBe("2026-10-30T13:30:00.000Z");
    expect(new Date(etToUtcMs("2026-11-02", 570)).toISOString()).toBe("2026-11-02T14:30:00.000Z");
  });
});

describe("nextOpen and currentClose", () => {
  it("from Sunday afternoon is Monday 09:30 ET", () => {
    expect(new Date(nextOpen(utc("2026-09-13T15:13:00Z"))).toISOString()).toBe("2026-09-14T13:30:00.000Z");
  });
  it("during the session is the next trading day", () => {
    expect(new Date(nextOpen(utc("2026-09-14T15:00:00Z"))).toISOString()).toBe("2026-09-15T13:30:00.000Z");
  });
  it("skips a holiday", () => {
    expect(new Date(nextOpen(utc("2026-09-04T21:00:00Z"))).toISOString()).toBe("2026-09-08T13:30:00.000Z"); // over Labor Day
  });
  it("close is 16:00 ET on a normal day, 13:00 on an early close, null when closed", () => {
    expect(new Date(currentClose(utc("2026-09-14T15:00:00Z"))!).toISOString()).toBe("2026-09-14T20:00:00.000Z");
    expect(new Date(currentClose(utc("2026-11-27T15:00:00Z"))!).toISOString()).toBe("2026-11-27T18:00:00.000Z");
    expect(currentClose(utc("2026-09-13T15:00:00Z"))).toBeNull();
  });
});
