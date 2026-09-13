/**
 * US equity market sessions in America/New_York, computed from a UTC instant without a date library.
 *
 * Only "open" has a real exchange price we can use for free. Every other status prices from the perp model.
 */

export type MarketStatus = "open" | "pre_market" | "after_hours" | "overnight" | "weekend" | "holiday";

export const STATUS_LABEL: Record<MarketStatus, string> = {
  open: "Market open",
  pre_market: "Pre-market",
  after_hours: "After hours",
  overnight: "Overnight",
  weekend: "Weekend",
  holiday: "Holiday",
};

type DayRule = "closed" | { open: number; close: number };

const REGULAR = { open: 9 * 60 + 30, close: 16 * 60 };
const EARLY_CLOSE = { open: 9 * 60 + 30, close: 13 * 60 };

/**
 * NYSE holidays and early closes, ET dates. 2026 matches Pyth's Equity.Index schedule; 2027 from Pyth's
 * Equity.US schedule (both read 13 Sep 2026). Extend before using past mid-2027.
 */
const CALENDAR: Record<string, DayRule> = {
  "2026-01-01": "closed", "2026-01-19": "closed", "2026-02-16": "closed", "2026-04-03": "closed",
  "2026-05-25": "closed", "2026-06-19": "closed", "2026-07-03": "closed", "2026-09-07": "closed",
  "2026-11-26": "closed", "2026-11-27": EARLY_CLOSE, "2026-12-24": EARLY_CLOSE, "2026-12-25": "closed",
  "2027-01-01": "closed", "2027-01-18": "closed", "2027-02-15": "closed", "2027-03-26": "closed",
  "2027-05-31": "closed", "2027-06-18": "closed", "2027-07-05": "closed",
};

const PRE_MARKET_START = 4 * 60;
const AFTER_HOURS_END = 20 * 60;

interface EtParts {
  date: string; // YYYY-MM-DD
  weekday: number; // 0 = Sunday
  minutes: number; // minutes since ET midnight
}

const etFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function etParts(ms: number): EtParts {
  const p = Object.fromEntries(etFormatter.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    weekday: WEEKDAYS.indexOf(p.weekday),
    minutes: Number(p.hour) * 60 + Number(p.minute),
  };
}

function dayRule(date: string, weekday: number): DayRule {
  if (weekday === 0 || weekday === 6) return "closed";
  return CALENDAR[date] ?? REGULAR;
}

export function marketStatus(ms: number): MarketStatus {
  const { date, weekday, minutes } = etParts(ms);
  const rule = dayRule(date, weekday);

  if (weekday === 6) return "weekend";
  if (weekday === 0) return minutes >= AFTER_HOURS_END ? "overnight" : "weekend";
  if (weekday === 5 && minutes >= AFTER_HOURS_END) return "weekend";
  if (rule === "closed") return "holiday";

  if (minutes < PRE_MARKET_START) return "overnight";
  if (minutes < rule.open) return "pre_market";
  if (minutes < rule.close) return "open";
  if (minutes < AFTER_HOURS_END) return "after_hours";
  return "overnight";
}

const wallClockMs = (date: string, minutes: number) => {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d) + minutes * 60_000;
};

/** UTC ms for an ET wall-clock time. Handles DST by correcting a guess against the formatter. */
export function etToUtcMs(date: string, minutes: number): number {
  const target = wallClockMs(date, minutes);
  let guess = target + 5 * 3_600_000; // EST as a first guess
  for (let i = 0; i < 2; i++) {
    const got = etParts(guess);
    guess += target - wallClockMs(got.date, got.minutes);
  }
  return guess;
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** The next regular-session open strictly after ms (today's, if ms is before today's open). */
export function nextOpen(ms: number): number {
  const today = etParts(ms);
  for (let i = 0; i < 14; i++) {
    const date = addDays(today.date, i);
    const weekday = (today.weekday + i) % 7;
    const rule = dayRule(date, weekday);
    if (rule === "closed") continue;
    const openMs = etToUtcMs(date, rule.open);
    if (openMs > ms) return openMs;
  }
  throw new Error("no market open within 14 days, calendar needs extending");
}

/** Regular-session close for the session that is open at ms, or null if the market is not open. */
export function currentClose(ms: number): number | null {
  if (marketStatus(ms) !== "open") return null;
  const { date, weekday } = etParts(ms);
  const rule = dayRule(date, weekday);
  return rule === "closed" ? null : etToUtcMs(date, rule.close);
}
