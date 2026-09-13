import { env } from "../config.js";
import { fetchJson } from "../lib/http.js";

export interface PerpTick {
  /** e.g. "xyz:NVDA" */
  name: string;
  mid: number | null;
  mark: number;
  oracle: number | null;
  funding: number | null;
  dayVolume: number | null;
}

type MetaAndCtxs = [
  { universe: Array<{ name: string }> },
  Array<{ markPx?: string; midPx?: string | null; oraclePx?: string; funding?: string; dayNtlVlm?: string }>,
];

const num = (v: string | null | undefined) => (v == null || v === "" ? null : Number(v));

export function parseXyzPerps(json: MetaAndCtxs): Map<string, PerpTick> {
  const [meta, ctxs] = json;
  const out = new Map<string, PerpTick>();
  meta.universe.forEach((asset, i) => {
    const c = ctxs[i];
    const mark = num(c?.markPx);
    if (!c || mark == null || !Number.isFinite(mark)) return;
    out.set(asset.name, {
      name: asset.name,
      mid: num(c.midPx),
      mark,
      oracle: num(c.oraclePx),
      funding: num(c.funding),
      dayVolume: num(c.dayNtlVlm),
    });
  });
  return out;
}

/** All XYZ builder-dex perps (stocks, indices, commodities) in one call. */
export async function fetchXyzPerps(): Promise<Map<string, PerpTick>> {
  const json = await fetchJson<MetaAndCtxs>(env.hyperliquidUrl, {
    method: "POST",
    body: { type: "metaAndAssetCtxs", dex: "xyz" },
  });
  return parseXyzPerps(json);
}
