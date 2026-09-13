import { fileURLToPath } from "node:url";

export type Issuer = "xstocks" | "ondo";

export interface Token {
  stock: string;
  issuer: Issuer;
  mint: string;
  decimals: number;
  /** Hyperliquid XYZ perp name, e.g. "xyz:NVDA". null when no single-name perp exists. */
  perp: string | null;
}

export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const USDC_DECIMALS = 6;

const XSTOCKS_DECIMALS = 8;
const ONDO_DECIMALS = 9;

// Resolved 13 Sep 2026 from Jupiter's token API (exact symbol + issuer name + issuer logo domain).
// Re-verify on the issuer's site before the first real buy.
const REGISTRY: Array<[stock: string, xstocksMint: string, ondoMint: string, hasPerp: boolean]> = [
  ["NVDA", "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh", "gEGtLTPNQ7jcg25zTetkbmF7teoDLcrfTnQfmn2ondo", true],
  ["TSLA", "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB", "KeGv7bsfR4MheC1CkmnAVceoApjrkvBhHYjWb67ondo", true],
  ["AAPL", "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp", "123mYEnRLM2LLYsJW3K6oyYh8uP1fngj732iG638ondo", true],
  ["MSFT", "XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX", "FRmH6iRkMr33DLG6zVLR7EM4LojBFAuq6NtFzG6ondo", true],
  ["GOOGL", "XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN", "bbahNA5vT9WJeYft8tALrH1LXWffjwqVoUbqYa1ondo", true],
  ["AMZN", "Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg", "14Tqdo8V1FhzKsE3W2pFsZCzYPQxxupXRcqw9jv6ondo", true],
  ["META", "Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu", "fDxs5y12E7x7jBwCKBXGqt71uJmCWsAQ3Srkte6ondo", true],
  ["AMD", "XsXcJ6GZ9kVnjqGsjBnktRcuwMBmvKWh8S93RefZ1rF", "14diAn5z8kjrKwSC8WLqvBqqe5YmihJhjxRxd8Z6ondo", true],
  ["COIN", "Xs7ZdzSHLU9ftNJsii5fCeJhoRWSC32SQGzGQtePxNu", "5u6KDiNJXxX4rGMfYT4BApZQC5CuDNrG6MHkwp1ondo", true],
  ["CRCL", "XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1", "6xHEyem9hmkGtVq6XGCiQUGpPsHBaoYuYdFNZa5ondo", true],
  ["HOOD", "XsvNBAYkrDRNhA7wPHQfX3ZUXZyZLdnCQDfHZ56bzpg", "BVdXGvmgi6A9oAiwWvBvP76fyTqcCNRJMM7zMN6ondo", true],
  ["MSTR", "XsP7xzNPvEHS1m6qfanPUGjNmdnmsLKEoNAnHjdxxyZ", "FSz4ouiqXpHuGPcpacZfTzbMjScoj5FfzHkiyu2ondo", true],
  ["PLTR", "XsoBhf2ufR8fTyNSjqfU71DYGaE6Z3SUGAidpzriAA4", "HfsnTS5qtdStwec9DfBrunRqnAMYMMz1kjv9Hu9ondo", true],
  ["SPY", "XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W", "k18WJUULWheRkSpSquYGdNNmtuE2Vbw1hpuUi92ondo", false],
  ["QQQ", "Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ", "HrYNm6jTQ71LoFphjVKBTdAE4uja7WsmLG8VxB8ondo", false],
];

export const STOCKS = REGISTRY.map(([stock]) => stock);

export const TOKENS: Token[] = REGISTRY.flatMap(([stock, xstocksMint, ondoMint, hasPerp]) => {
  const perp = hasPerp ? `xyz:${stock}` : null;
  return [
    { stock, issuer: "xstocks" as const, mint: xstocksMint, decimals: XSTOCKS_DECIMALS, perp },
    { stock, issuer: "ondo" as const, mint: ondoMint, decimals: ONDO_DECIMALS, perp },
  ];
});

export const PERP_BY_STOCK = new Map(REGISTRY.filter(([, , , p]) => p).map(([stock]) => [stock, `xyz:${stock}`]));

export const env = {
  dbPath: process.env.FAIRFILL_DB ?? fileURLToPath(new URL("../data/fairfill.db", import.meta.url)),
  solanaRpcUrl: process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com",
  jupiterBaseUrl: process.env.JUPITER_BASE_URL ?? "https://lite-api.jup.ag",
  jupiterApiKey: process.env.JUPITER_API_KEY || undefined,
  hyperliquidUrl: process.env.HYPERLIQUID_URL ?? "https://api.hyperliquid.xyz/info",
};

export const recorderConfig = {
  perpIntervalMs: 60_000,
  multiplierIntervalMs: 10 * 60_000,
  sweepIntervalMs: 5 * 60_000,
  sweepUsd: 100,
  /** Spacing between Jupiter calls inside a sweep. 1.1 s ran 60 quotes cleanly on 13 Sep 2026. */
  sweepSpacingMs: 1_100,
  realPriceIntervalMs: 60_000,
  /** Outside the regular session the last close does not move, so poll rarely. */
  realPriceClosedEveryMinutes: 30,
  realPriceSpacingMs: 1_500,
};
