import { env, recorderConfig } from "./config.js";
import { openDb } from "./db/db.js";
import { multiplierJob, perpJob, realPriceJob, runJob, shouldPollRealPrice, sweepJob, type MultiplierCache, type RealPriceSeen } from "./recorder/jobs.js";
import { delayToNextBoundary } from "./recorder/schedule.js";

const db = openDb(env.dbPath);
const cache: MultiplierCache = new Map();
const realSeen: RealPriceSeen = new Map();
const timers = new Map<string, NodeJS.Timeout>();
let stopping = false;

/**
 * Runs fn every intervalMs, aligned to wall-clock boundaries. A run that is still going when the next
 * boundary arrives is not doubled up: that tick is skipped and logged, which leaves a visible gap.
 */
function every(intervalMs: number, name: string, fn: () => Promise<unknown>, runNow = false) {
  let running = false;
  const run = async () => {
    if (running) {
      console.log(`${new Date().toISOString()} ${name} skipped, previous run still going`);
      return;
    }
    running = true;
    try {
      await fn();
    } finally {
      running = false;
    }
  };
  const schedule = () => {
    if (stopping) return;
    const delay = delayToNextBoundary(Date.now(), intervalMs);
    timers.set(
      name,
      setTimeout(() => {
        schedule();
        void run();
      }, delay),
    );
  };
  schedule();
  if (runNow) void run();
}

async function main() {
  console.log(`fairfill recorder starting, db ${env.dbPath}, jupiter ${env.jupiterBaseUrl}${env.jupiterApiKey ? " (key)" : ""}`);
  // Multipliers first so the first sweep prices shares correctly, then data immediately rather than at the next boundary.
  await runJob(db, "multipliers", () => multiplierJob(db, cache));
  await runJob(db, "perps", () => perpJob(db));

  every(recorderConfig.perpIntervalMs, "perps", () => runJob(db, "perps", () => perpJob(db)));
  every(recorderConfig.multiplierIntervalMs, "multipliers", () => runJob(db, "multipliers", () => multiplierJob(db, cache)));
  every(recorderConfig.sweepIntervalMs, "sweep", () => runJob(db, "sweep", () => sweepJob(db, cache)), true);
  every(
    recorderConfig.realPriceIntervalMs,
    "real",
    async () => {
      if (shouldPollRealPrice(Date.now(), realSeen.size > 0)) await runJob(db, "real", () => realPriceJob(db, realSeen));
    },
    true,
  );
}

function shutdown(signal: string) {
  console.log(`${new Date().toISOString()} ${signal}, stopping`);
  stopping = true;
  timers.forEach(clearTimeout);
  db.close();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

main().catch((err) => {
  console.error("recorder failed to start", err);
  process.exit(1);
});
