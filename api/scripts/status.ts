// Prints recorder health and the latest sweep as a per-share table. Usage: npm run status
import { env } from "../src/config.js";
import { openDb } from "../src/db/db.js";

const db = openDb(env.dbPath);
const ago = (ts: number | null) => (ts ? `${Math.round((Date.now() - ts) / 1000)}s ago` : "never");

console.log(`db ${env.dbPath}\n`);
for (const t of ["perp_ticks", "quotes", "multipliers", "job_runs"]) {
  const { n } = db.prepare(`SELECT COUNT(*) n FROM ${t}`).get() as { n: number };
  console.log(`${t.padEnd(12)} ${n} rows`);
}

console.log("\njob        last run      last ok       failures(24h)  detail");
const jobs = db.prepare(
  `SELECT job, MAX(ts) last, MAX(CASE WHEN ok = 1 THEN ts END) last_ok,
          SUM(CASE WHEN ok = 0 AND ts > ? THEN 1 ELSE 0 END) failures
   FROM job_runs GROUP BY job`,
).all(Date.now() - 86_400_000) as Array<{ job: string; last: number; last_ok: number | null; failures: number }>;
for (const j of jobs) {
  const { detail } = db.prepare("SELECT detail FROM job_runs WHERE job = ? ORDER BY ts DESC LIMIT 1").get(j.job) as { detail: string };
  console.log(`${j.job.padEnd(10)} ${ago(j.last).padEnd(13)} ${ago(j.last_ok).padEnd(13)} ${String(j.failures).padEnd(14)} ${detail.slice(0, 80)}`);
}

const sweep = db.prepare("SELECT MAX(sweep_id) id FROM quotes").get() as { id: number | null };
if (!sweep.id) process.exit(0);

console.log(`\nlatest sweep ${new Date(sweep.id).toISOString()} ($/share, premium vs raw perp mid, not basis-corrected)`);
console.log("stock  perp      xstocks buy  vs perp  sell      ondo buy     vs perp  sell      cheaper");
const rows = db.prepare("SELECT * FROM quotes WHERE sweep_id = ?").all(sweep.id) as Array<{
  stock: string; issuer: string; side: string; pps: number | null; error: string | null;
}>;
const perps = db.prepare(
  `SELECT p.stock, COALESCE(p.mid, p.mark) px FROM perp_ticks p
   JOIN (SELECT stock, MAX(ts) ts FROM perp_ticks WHERE ts <= ? + 60000 GROUP BY stock) l ON l.stock = p.stock AND l.ts = p.ts`,
).all(sweep.id) as Array<{ stock: string; px: number }>;
const perpBy = new Map(perps.map((p) => [p.stock, p.px]));
const stocks = [...new Set(rows.map((r) => r.stock))];
const fmt = (v: number | null | undefined, w: number) => (v == null ? "-" : v.toFixed(2)).padEnd(w);
const pct = (v: number | null | undefined, ref: number | undefined, w: number) =>
  (v == null || ref == null ? "-" : `${((v / ref - 1) * 100).toFixed(2)}%`).padEnd(w);
for (const s of stocks) {
  const get = (issuer: string, side: string) => rows.find((r) => r.stock === s && r.issuer === issuer && r.side === side)?.pps ?? null;
  const xb = get("xstocks", "buy"), xs = get("xstocks", "sell"), ob = get("ondo", "buy"), os = get("ondo", "sell");
  const perp = perpBy.get(s);
  const cheaper = xb && ob ? (xb <= ob ? `xstocks by ${((ob / xb - 1) * 100).toFixed(2)}%` : `ondo by ${((xb / ob - 1) * 100).toFixed(2)}%`) : xb ? "xstocks only" : ob ? "ondo only" : "none";
  console.log(`${s.padEnd(6)} ${fmt(perp, 9)} ${fmt(xb, 12)} ${pct(xb, perp, 8)} ${fmt(xs, 9)} ${fmt(ob, 12)} ${pct(ob, perp, 8)} ${fmt(os, 9)} ${cheaper}`);
}
db.close();
