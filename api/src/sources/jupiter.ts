import { env } from "../config.js";
import { fetchJson, HttpError } from "../lib/http.js";

export interface UltraOrder {
  requestId: string | null;
  inAmount: string | null;
  outAmount: string | null;
  router: string | null;
  swapType: string | null;
  feeBps: number | null;
  /** Base64 transaction, only present when a taker is given. */
  transaction: string | null;
  error: string | null;
}

interface RawUltraOrder {
  requestId?: string;
  inAmount?: string;
  outAmount?: string;
  router?: string;
  swapType?: string;
  feeBps?: number;
  transaction?: string | null;
  error?: string;
  errorMessage?: string;
  errorCode?: number | string;
}

export function parseUltraOrder(json: RawUltraOrder): UltraOrder {
  const hasOut = typeof json.outAmount === "string" && /^\d+$/.test(json.outAmount) && BigInt(json.outAmount) > 0n;
  const error =
    json.errorMessage ?? json.error ?? (json.errorCode != null ? `code ${json.errorCode}` : null) ?? (hasOut ? null : "no quote");
  return {
    requestId: json.requestId ?? null,
    inAmount: json.inAmount ?? null,
    outAmount: hasOut ? json.outAmount! : null,
    router: json.router ?? null,
    swapType: json.swapType ?? null,
    feeBps: typeof json.feeBps === "number" ? json.feeBps : null,
    transaction: json.transaction || null,
    error: hasOut ? null : error,
  };
}

export async function ultraOrder(params: {
  inputMint: string;
  outputMint: string;
  amount: bigint | string;
  taker?: string;
}): Promise<UltraOrder> {
  const qs = new URLSearchParams({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: params.amount.toString(),
  });
  if (params.taker) qs.set("taker", params.taker);
  const headers: Record<string, string> = env.jupiterApiKey ? { "x-api-key": env.jupiterApiKey } : {};
  try {
    const json = await fetchJson<RawUltraOrder>(`${env.jupiterBaseUrl}/ultra/v1/order?${qs}`, { headers });
    return parseUltraOrder(json);
  } catch (err) {
    // Jupiter answers some "no route" cases with a 4xx and a JSON body. Keep that as a recorded miss.
    if (err instanceof HttpError && err.status >= 400 && err.status < 500 && err.status !== 429) {
      let body: RawUltraOrder = {};
      try {
        body = JSON.parse(err.body);
      } catch {
        body = { error: err.body.slice(0, 200) };
      }
      return parseUltraOrder({ ...body, error: body.errorMessage ?? body.error ?? `HTTP ${err.status}` });
    }
    throw err;
  }
}
