import { PERP_BY_STOCK, recorderConfig, TOKENS, USDC_DECIMALS, USDC_MINT, type Token } from "../config.js";
import type { Db } from "../db/db.js";
import { effectiveMultiplier, pricePerShare, rawToShares, rawToUnits, unitsToRaw, type MultiplierConfig } from "../engine/shares.js";
import { sleep } from "../lib/http.js";
import { fetchXyzPerps } from "../sources/hyperliquid.js";
import { ultraOrder, type UltraOrder } from "../sources/jupiter.js";
import { fetchMultiplierConfigs } from "../sources/solana.js";

export type MultiplierCache = Map<string, MultiplierConfig | null>;

const nowSec = () => Math.floor(Date.now() / 1000);

/** Runs a job, records the outcome in job_runs, never throws. */
export async function runJob(db: Db, job: string, fn: () => Promise<string>): Promise<boolean> {
  const started = Date.now();
  let ok = true;
  let detail: string;
  try {
    detail = await fn();
  } catch (err) {
    ok = false;
    detail = err instanceof Error ? err.message : String(err);
  }
  db.prepare("INSERT INTO job_runs (ts, job, ok, duration_ms, detail) VALUES (?, ?, ?, ?, ?)").run(
    started,
    job,
    ok ? 1 : 0,
    Date.now() - started,
    detail.slice(0, 500),
  );
  console.log(`${new Date(started).toISOString()} ${job} ${ok ? "ok" : "FAILED"} ${Date.now() - started}ms ${detail.slice(0, 200)}`);
  return ok;
}

export async function multiplierJob(db: Db, cache: MultiplierCache): Promise<string> {
  const configs = await fetchMultiplierConfigs(TOKENS.map((t) => t.mint));
  const ts = Date.now();
  const insert = db.prepare(
    "INSERT INTO multipliers (ts, mint, multiplier, new_multiplier, new_effective_ts, effective) VALUES (?, ?, ?, ?, ?, ?)",
  );
  let withExtension = 0;
  db.transaction(() => {
    for (const [mint, cfg] of configs) {
      cache.set(mint, cfg);
      if (cfg) withExtension++;
      insert.run(ts, mint, cfg?.multiplier ?? null, cfg?.newMultiplier ?? null, cfg?.newMultiplierEffectiveTimestamp ?? null, effectiveMultiplier(cfg, nowSec()));
    }
  })();
  return `${configs.size} mints, ${withExtension} with multiplier`;
}

export async function perpJob(db: Db): Promise<string> {
  const perps = await fetchXyzPerps();
  const ts = Date.now();
  const insert = db.prepare(
    "INSERT INTO perp_ticks (ts, stock, mid, mark, oracle, funding, day_volume) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  const missing: string[] = [];
  db.transaction(() => {
    for (const [stock, name] of PERP_BY_STOCK) {
      const p = perps.get(name);
      if (!p) {
        missing.push(stock);
        continue;
      }
      insert.run(ts, stock, p.mid, p.mark, p.oracle, p.funding, p.dayVolume);
    }
  })();
  if (missing.length === PERP_BY_STOCK.size) throw new Error("no perps found in xyz dex response");
  return `${PERP_BY_STOCK.size - missing.length} perps${missing.length ? `, missing ${missing.join(",")}` : ""}`;
}

interface QuoteRow {
  ts: number;
  sweep_id: number;
  stock: string;
  issuer: string;
  side: "buy" | "sell";
  usd: number | null;
  raw_in: string | null;
  raw_out: string | null;
  multiplier: number;
  shares: number | null;
  pps: number | null;
  router: string | null;
  swap_type: string | null;
  fee_bps: number | null;
  error: string | null;
}

export function buyRow(token: Token, sweepId: number, usd: number, order: UltraOrder, multiplier: number, ts: number): QuoteRow {
  const shares = order.outAmount ? rawToShares(order.outAmount, token.decimals, multiplier) : null;
  return {
    ts,
    sweep_id: sweepId,
    stock: token.stock,
    issuer: token.issuer,
    side: "buy",
    usd,
    raw_in: order.inAmount,
    raw_out: order.outAmount,
    multiplier,
    shares,
    pps: shares ? pricePerShare(usd, shares) : null,
    router: order.router,
    swap_type: order.swapType,
    fee_bps: order.feeBps,
    error: order.error,
  };
}

export function sellRow(token: Token, sweepId: number, rawIn: string, order: UltraOrder, multiplier: number, ts: number): QuoteRow {
  const shares = rawToShares(rawIn, token.decimals, multiplier);
  const usd = order.outAmount ? rawToUnits(order.outAmount, USDC_DECIMALS) : null;
  return {
    ts,
    sweep_id: sweepId,
    stock: token.stock,
    issuer: token.issuer,
    side: "sell",
    usd,
    raw_in: rawIn,
    raw_out: order.outAmount,
    multiplier,
    shares,
    pps: usd != null ? pricePerShare(usd, shares) : null,
    router: order.router,
    swap_type: order.swapType,
    fee_bps: order.feeBps,
    error: order.error,
  };
}

/** Buys $sweepUsd of every token, then quotes selling what the buy would return. Quotes only, nothing executes. */
export async function sweepJob(db: Db, cache: MultiplierCache): Promise<string> {
  const sweepId = Date.now();
  const insert = db.prepare(
    `INSERT INTO quotes (ts, sweep_id, stock, issuer, side, usd, raw_in, raw_out, multiplier, shares, pps, router, swap_type, fee_bps, error)
     VALUES (@ts, @sweep_id, @stock, @issuer, @side, @usd, @raw_in, @raw_out, @multiplier, @shares, @pps, @router, @swap_type, @fee_bps, @error)`,
  );
  const usd = recorderConfig.sweepUsd;
  let buys = 0;
  let sells = 0;
  let misses = 0;
  let failures = 0;

  for (const token of TOKENS) {
    const multiplier = effectiveMultiplier(cache.get(token.mint), nowSec());
    try {
      const buy = await ultraOrder({ inputMint: USDC_MINT, outputMint: token.mint, amount: unitsToRaw(usd, USDC_DECIMALS) });
      insert.run(buyRow(token, sweepId, usd, buy, multiplier, Date.now()));
      await sleep(recorderConfig.sweepSpacingMs);
      if (!buy.outAmount) {
        misses++;
        continue;
      }
      buys++;
      const sell = await ultraOrder({ inputMint: token.mint, outputMint: USDC_MINT, amount: buy.outAmount });
      insert.run(sellRow(token, sweepId, buy.outAmount, sell, multiplier, Date.now()));
      if (sell.outAmount) sells++;
      else misses++;
      await sleep(recorderConfig.sweepSpacingMs);
    } catch (err) {
      failures++;
      const message = err instanceof Error ? err.message : String(err);
      insert.run({
        ts: Date.now(), sweep_id: sweepId, stock: token.stock, issuer: token.issuer, side: "buy", usd, raw_in: null,
        raw_out: null, multiplier, shares: null, pps: null, router: null, swap_type: null, fee_bps: null, error: `fetch: ${message.slice(0, 200)}`,
      });
      await sleep(recorderConfig.sweepSpacingMs * 3);
    }
  }
  const detail = `sweep ${sweepId}: ${buys} buys, ${sells} sells, ${misses} no-quote, ${failures} fetch failures`;
  if (failures > TOKENS.length / 2) throw new Error(detail);
  return detail;
}
