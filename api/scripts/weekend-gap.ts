// Pitch evidence: compares the latest recorded token buy prices with (a) the last regular close, which is what
// most apps show while the market is shut, and (b) the 24/7 perp. Usage: npm run weekend-gap
import { env, PERP_BY_STOCK } from "../src/config.js";
import { openDb } from "../src/db/db.js";
import { sleep } from "../src/lib/http.js";
import { fetchStockQuote } from "../src/sources/yahoo.js";

const BAND = 0.005;
const db = openDb(env.dbPath);
const sweep = db
  .prepare("SELECT sweep_id id FROM quotes GROUP BY sweep_id HAVING COUNT(*) > 50 ORDER BY sweep_id DESC LIMIT 1")
  .get() as { id: number } | undefined;
if (!sweep) {
  console.log("no complete sweep recorded yet");
  process.exit(0);
}

const pct = (a: number, b: number) => `${((a / b - 1) * 100).toFixed(2)}%`;
const label = (a: number, b: number) => (a / b - 1 > BAND ? "expensive" : a / b - 1 < -BAND ? "cheap" : "fair");

console.log(`sweep ${new Date(sweep.id).toISOString()}, verdict band ±${BAND * 100}%, perp not basis-corrected\n`);
console.log("stock  last close (time)          perp     best buy  vs close  vs perp   close says  perp says");
for (const stock of PERP_BY_STOCK.keys()) {
  const close = await fetchStockQuote(stock);
  const perp = db
    .prepare("SELECT COALESCE(mid, mark) px FROM perp_ticks WHERE stock = ? ORDER BY ABS(ts - ?) LIMIT 1")
    .get(stock, sweep.id) as { px: number };
  const best = db
    .prepare("SELECT MIN(pps) pps FROM quotes WHERE sweep_id = ? AND stock = ? AND side = 'buy'")
    .get(sweep.id, stock) as { pps: number | null };
  if (!best.pps) continue;
  const flip = label(best.pps, close.price) !== label(best.pps, perp.px) ? "  <- different answer" : "";
  console.log(
    `${stock.padEnd(6)} ${close.price.toFixed(2).padEnd(8)} (${new Date(close.marketTime).toISOString().slice(0, 16)}Z) ` +
      `${perp.px.toFixed(2).padEnd(8)} ${best.pps.toFixed(2).padEnd(9)} ${pct(best.pps, close.price).padEnd(9)} ` +
      `${pct(best.pps, perp.px).padEnd(9)} ${label(best.pps, close.price).padEnd(11)} ${label(best.pps, perp.px)}${flip}`,
  );
  await sleep(400);
}
db.close();
