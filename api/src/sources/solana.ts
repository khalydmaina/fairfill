import { env } from "../config.js";
import type { MultiplierConfig } from "../engine/shares.js";
import { fetchJson } from "../lib/http.js";

interface ParsedExtension {
  extension: string;
  state?: Record<string, unknown>;
}

interface AccountValue {
  data?: { parsed?: { info?: { extensions?: ParsedExtension[] } } };
}

/** Reads the Token-2022 scaled UI amount config from a jsonParsed mint account. null if absent. */
export function parseMultiplierConfig(value: AccountValue | null): MultiplierConfig | null {
  const ext = value?.data?.parsed?.info?.extensions?.find((e) => e.extension === "scaledUiAmountConfig");
  if (!ext?.state) return null;
  const { multiplier, newMultiplier, newMultiplierEffectiveTimestamp } = ext.state;
  const m = Number(multiplier);
  const nm = Number(newMultiplier);
  const ts = Number(newMultiplierEffectiveTimestamp);
  if (!Number.isFinite(m) || !Number.isFinite(nm) || !Number.isFinite(ts)) return null;
  return { multiplier: m, newMultiplier: nm, newMultiplierEffectiveTimestamp: ts };
}

export async function fetchMultiplierConfigs(mints: string[]): Promise<Map<string, MultiplierConfig | null>> {
  const out = new Map<string, MultiplierConfig | null>();
  for (let i = 0; i < mints.length; i += 100) {
    const batch = mints.slice(i, i + 100);
    const res = await fetchJson<{ result?: { value: (AccountValue | null)[] }; error?: { message: string } }>(
      env.solanaRpcUrl,
      {
        method: "POST",
        body: { jsonrpc: "2.0", id: 1, method: "getMultipleAccounts", params: [batch, { encoding: "jsonParsed" }] },
      },
    );
    if (!res.result) throw new Error(`getMultipleAccounts failed: ${res.error?.message ?? "no result"}`);
    batch.forEach((mint, j) => out.set(mint, parseMultiplierConfig(res.result!.value[j])));
  }
  return out;
}
