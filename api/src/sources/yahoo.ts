/**
 * Yahoo Finance chart endpoint: keyless, unofficial. Used for the last regular-session close and as one of the
 * candidates for the market-hours real price (the Monday cross-check picks the source). Swap for a licensed
 * feed before any production use, and say so on the Method page.
 */
import { fetchJson } from "../lib/http.js";

export interface StockQuote {
  symbol: string;
  /** Last regular-session trade, or the close when the market is shut. */
  price: number;
  /** Unix ms of that trade. */
  marketTime: number;
}

interface ChartResponse {
  chart: {
    result: Array<{ meta: { symbol: string; regularMarketPrice?: number; regularMarketTime?: number } }> | null;
    error: { description?: string } | null;
  };
}

export function parseChartMeta(json: ChartResponse): StockQuote {
  const meta = json.chart.result?.[0]?.meta;
  if (!meta || typeof meta.regularMarketPrice !== "number" || typeof meta.regularMarketTime !== "number") {
    throw new Error(`yahoo: no quote (${json.chart.error?.description ?? "empty result"})`);
  }
  return { symbol: meta.symbol, price: meta.regularMarketPrice, marketTime: meta.regularMarketTime * 1000 };
}

export async function fetchStockQuote(symbol: string): Promise<StockQuote> {
  const json = await fetchJson<ChartResponse>(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
    { headers: { "user-agent": "Mozilla/5.0 (fairfill recorder)" }, retries: 1 },
  );
  return parseChartMeta(json);
}
