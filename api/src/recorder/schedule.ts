/**
 * Delay until the next wall-clock boundary of intervalMs.
 *
 * Timers run on a monotonic clock but boundaries are wall-clock, and WSL's host time sync nudges the wall
 * clock, so a timer can fire a moment before its boundary. Without the guard that would schedule a second
 * run a second later. Anything closer than 20% of the interval rolls to the following boundary.
 */
export function delayToNextBoundary(nowMs: number, intervalMs: number): number {
  const delay = intervalMs - (nowMs % intervalMs);
  return delay < intervalMs * 0.2 ? delay + intervalMs : delay;
}
