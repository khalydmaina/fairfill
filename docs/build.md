# Fairfill · Build Spec

Buy tokenized US stocks on Solana at the best price, from the right issuer, even when NASDAQ is closed.

*"Fairfill" is a working name. Rename before submission if you want.*

---

## 0. At a glance

| | |
|---|---|
| **Event** | Stocklana (Solana Foundation), $100,000 pool, main track only |
| **Deadline** | **Fri 18 Sep 2026, 16:00 ET = 20:00 UTC**. Judging through 2 Oct |
| **Build window** | Sun 13 Sep to Fri 18 Sep (6 days including today) |
| **Wedge** | Trading: stock-to-stablecoin swaps |
| **Team** | Solo (confirm) |
| **Pitch line** | "The only place to buy a stock on a Sunday at the right price." |
| **Judging question** | "Could this be a real app that people will actually use?" Real user, working end-to-end demo, reason it belongs on Solana, execution quality |

What it does in one breath: for a stock like NVDA, Fairfill gets live executable quotes for **both** Solana issuers (xStocks and Ondo), converts them to a true **price per share**, compares them to a **fair price** that keeps working nights and weekends (built from 24/7 stock perps on Hyperliquid), then buys the cheaper one through Jupiter from the user's own wallet and shows exactly what they saved.

---

## 1. Evidence: live snapshot, Sun 13 Sep 2026, 15:13 UTC (NASDAQ closed)

Executable $100 buys via Jupiter Ultra, converted to price per share using each token's on-chain multiplier, against the Hyperliquid 24/7 perp mid. The perp column is **not yet basis-corrected**, so "vs perp" is a raw gap, not the final fair premium.

| Stock | xStocks $/share | Ondo $/share | 24/7 perp | xStocks vs perp | Ondo vs perp | Cheaper |
|---|---|---|---|---|---|---|
| NVDA | 215.81 | 215.98 | 215.26 | +0.26% | +0.33% | xStocks |
| TSLA | 363.63 | 364.11 | 363.04 | +0.16% | +0.29% | xStocks |
| AAPL | 332.33 | 332.18 | 331.17 | +0.35% | +0.31% | Ondo |
| MSFT | 492.78 | 493.22 | 492.22 | +0.11% | +0.20% | xStocks |
| GOOGL | 338.36 | 338.01 | 337.15 | +0.36% | +0.25% | Ondo |
| AMZN | 254.70 | 254.85 | 254.33 | +0.15% | +0.20% | xStocks |
| META | 643.68 | 644.23 | 643.09 | +0.09% | +0.18% | xStocks |
| **AMD** | **510.04** | **503.70** | **501.98** | **+1.61%** | **+0.34%** | **Ondo, by 1.26%** |
| COIN | 174.06 | 174.13 | 173.70 | +0.21% | +0.25% | xStocks |
| CRCL | 90.27 | 90.42 | 90.24 | +0.03% | +0.21% | xStocks |
| HOOD | 108.54 | no quote | 108.17 | +0.34% | n/a | xStocks only |
| MSTR | 129.36 | 129.54 | 129.16 | +0.15% | +0.29% | xStocks |
| PLTR | 166.52 | no quote | 164.84 | +1.02% | n/a | xStocks only |
| SPY | 761.20 | 762.99 | no perp | n/a | n/a | xStocks |
| QQQ | 709.78 | 710.82 | no perp | n/a | n/a | xStocks |

**What the snapshot proves:**

1. **The cheaper issuer changes by stock.** xStocks won 10 of 13 stocks with two quotes, Ondo won 3. On AMD the gap was 1.26%, so a $1,000 buy through the wrong issuer cost about **$12.60 extra**.
2. **Per-token is not per-share.** Both issuers use a Token-2022 multiplier for dividends, and they differ: SPY is 1.00571 (xStocks) vs 1.00772 (Ondo), a 0.20% gap. NVDAx's multiplier moved from 1.00092 to 1.00170 on 10 Sep 2026. Any app that compares raw token prices is wrong by up to 0.2%.
3. **The price everyone displays is misleading.** Jupiter's token API `usdPrice` is a last trade, not an executable price: AMD xStocks showed **$463.78** while actually buying cost **$510.04** per share. TSLA Ondo showed $373.13 while buying cost $364.11.
4. **Buyers pay a weekend premium.** Buying on Sunday cost 0.03% to 1.61% above the 24/7 perp, before basis correction.
5. **Liquidity is structurally different.** xStocks fill through AMM pools (HumidiFi, Raydium CLMM, Whirlpool, Manifest, Meteora DLMM). Ondo fills through JupiterZ RFQ, showing only ~$500 of pool liquidity yet quoting $1,000 cleanly. Ondo had no quote at all for HOOD and PLTR on Sunday.

**What the snapshot killed:** the "one-tap issuer swap" idea. A round trip costs 0.40% to 0.55% (3.57% on AMD xStocks), while issuers usually differ by 0.05% to 0.17%. Swapping AMD xStocks into AMD Ondo would have **lost 2.2%**. It is out of scope (see 3.3).

---

## 2. User and problem

**Primary user:** someone outside the US holding USDC on Solana who buys US stocks in $50 to $5,000 tickets, often in their own evening or weekend, which is when NASDAQ is closed.

**Their problems today:**

1. **Two issuers, one stock, no comparison.** Jupiter finds the best route for one token. It does not know NVDAx and NVDAon are the same stock, so it never tells you the other one is cheaper.
2. **Wrong unit.** Wallets and aggregators show price per token. Dividend multipliers mean a token is not exactly one share, and the two issuers drift apart.
3. **No reference when the market is closed.** For 64+ hours every weekend there is no official price. A buyer on Sunday cannot tell a real move from a thin-liquidity premium.
4. **Displayed prices are stale.** Last-trade prices can be 9% away from what you actually pay.

**Why a brokerage app can't do this:** a brokerage is closed on Sunday. Fairfill trades then and tells you whether Sunday's price is fair.

**Why Solana:**
- Both major stock issuers and one aggregator (Jupiter, AMM plus RFQ) on the same chain, so one app can compare and execute across them.
- 24/7 settlement, cents in fees, so a $50 buy makes sense.
- Dividend multipliers live on-chain in the Token-2022 mint (`scaledUiAmountConfig`), readable by anyone, which is what makes honest per-share pricing possible.

---

## 3. Scope

### 3.1 MVP (P0, must ship)

| ID | Feature | Done means |
|---|---|---|
| P0-1 | **Price board** | 13 stocks, each row: market status, fair price with band, per-share buy price and premium for each issuer, "best" marker. Refreshes every 15 s |
| P0-2 | **Fair price engine** | Section 6 implemented, sessions correct, basis calibrated from recorded data, "calibrating" and "no fair price" states handled |
| P0-3 | **Best-issuer buy** | Enter USD amount, see both issuers side by side per share, buy the cheaper one via Jupiter Ultra, signed in the user's wallet |
| P0-4 | **Sell with fair check** | Sell a held token to USDC, shown against fair price |
| P0-5 | **Premium guard** | If the best price is more than 0.75% above fair (user can change), show the dollar cost of buying now and a countdown to the next open before allowing it |
| P0-6 | **Receipt** | After a fill: shares received, price per share, premium vs fair, saved vs the other issuer in $, Solscan link |
| P0-7 | **Recorder + replay chart** | Per stock: both issuers' per-share buy price vs the fair band over the last days, closed hours shaded |
| P0-8 | **Method page** | The formula, per-stock calibration numbers (basis, spread, sample count, last update), data sources, known limits |

### 3.2 Should (P1, only after P0 works end to end)

| ID | Feature | Note |
|---|---|---|
| P1-1 | **Buy-at-fair order** | When the guard fires, offer a Jupiter Trigger (limit) order at fair + band, expiring at next open + 1 h. Trigger API answered 200 on 13 Sep; **Token-2022 stock support unverified**, test on Tuesday with a $2 order |
| P1-2 | **Holdings** | Connected wallet's stock tokens, shares (raw × multiplier), value at fair, current sell premium |
| P1-3 | **Shareable receipt image** | PNG card for X posts |

### 3.3 Not this week

Baskets and recurring buys (other entries already do them) · issuer swap (loses money after two legs, see section 1) · lending or yield · our own on-chain program · native mobile app · Sunday fair price for SPY and QQQ (no single-name perp, show them market-hours only) · pre-market, after-hours and overnight **real** prices (paid feeds) · US users.

---

## 4. Core definitions

```
shares           = raw_amount / 10^decimals × multiplier
multiplier       = mint.scaledUiAmountConfig.newMultiplier  if now >= newMultiplierEffectiveTimestamp
                   else mint.scaledUiAmountConfig.multiplier
                   (1.0 if the extension is absent)

buy_pps          = usdc_in  / shares_out           price per share when buying
sell_pps         = usdc_out / shares_in            price per share when selling
premium          = buy_pps / fair - 1              positive = paying above fair
saved_vs_other   = (other_buy_pps - best_buy_pps) × best_shares_out     in USD
```

- USDC mint: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`, 6 decimals.
- xStocks tokens: 8 decimals. Ondo tokens: 9 decimals. Both Token-2022.
- **Monday check on the multiplier interpretation:** during regular hours, both issuers' per-share prices must sit within their spreads of the real price. If raw per-token prices line up better than per-share prices, the interpretation is wrong and must be fixed before anything else. Also read each issuer's docs on scaled UI amount.

---

## 5. Market sessions

Use `America/New_York` via a timezone library, never hardcoded offsets. September 2026 is EDT (UTC-4).

| Status label | ET | UTC (Sep 2026) | Fair price source |
|---|---|---|---|
| **Market open** | Mon-Fri 09:30-16:00 | 13:30-20:00 | Real price |
| **Pre-market** | Mon-Fri 04:00-09:30 | 08:00-13:30 | Perp model |
| **After hours** | Mon-Fri 16:00-20:00 | 20:00-00:00 | Perp model |
| **Overnight** | Sun-Thu 20:00-04:00 | 00:00-08:00 | Perp model |
| **Weekend** | Fri 20:00 to Sun 20:00 | Sat 00:00 to Mon 00:00 | Perp model |
| **Holiday / early close** | from calendar | | Perp model |

Holiday calendar: Pyth's free metadata endpoint (answered 200 on 13 Sep) returns a schedule string per stock, for example `0907/C, 1126/C, 1127/0930-1300`. Parse it once a day. Fallback: hardcode the 2026 NYSE holidays.

---

## 6. Fair price method (publish this on the Method page)

### 6.1 Inputs

| Symbol | What | Source | Verified |
|---|---|---|---|
| `P` | Perp mid price per stock, 24/7 | Hyperliquid `POST https://api.hyperliquid.xyz/info` with `{"type":"metaAndAssetCtxs","dex":"xyz"}`. One call returns all 120 XYZ markets (`xyz:NVDA` etc) with `midPx`, `markPx`, `oraclePx`, `funding`, `dayNtlVlm` | Yes, no key, 13 Sep |
| `R` | Real price during regular session | Pick on Monday from: (a) Finnhub `/quote` free tier (needs key, confirm it is real-time), (b) Ondo RFQ mid per share (Ondo sources liquidity from the listing exchange), (c) Hyperliquid `oraclePx` during market hours. Cross-check all three for an hour, pick the steadiest | Pyth Hermes price updates returned **HTTP 401** without a key on 13 Sep, so not Pyth |

### 6.2 Calibration (the perp is not the stock)

A perp trades at a small, fairly stable gap to the real price because of funding and positioning. Measure it while both are visible, then remove it when the market is closed.

```
every minute during Market open:
    g = P / R - 1

daily at 20:05 UTC, per stock, over the last 5 regular sessions:
    basis  b = median(g)
    spread s = standard deviation(g)
    n        = number of samples
```

### 6.3 Fair price and band

```
Market open:
    fair = R
    band = ± max(0.05%, R source half-spread)

Market closed, calibrated (n >= 60):
    fair = P / (1 + b)
    band = ± ( max(0.15%, 2 × s) + perp half-spread )

Market closed, calibrating (n < 60):
    fair = P,  band = ± 0.50%,  label "Estimate · calibrating"

No fair price (show last close instead, label "Last close · market closed"):
    Hyperliquid data older than 90 s, or perp dayNtlVlm < $500k, or stock has no perp (SPY, QQQ)
```

### 6.4 Verdict shown to the user

| Condition | Label | Colour |
|---|---|---|
| premium within band | **Fair** | neutral |
| premium above band | **Above fair by x%** | amber |
| premium below band | **Below fair by x%** | green |

### 6.5 Stated limits (put these on the page, judges respect it)

- The perp is a derivative. Weekend news moves it before the stock can move, and that is the point, but it can also overshoot.
- Basis comes from the last 5 sessions and can drift.
- Fairfill shows prices and routes orders. It is not investment advice.

---

## 7. Routing and execution

### 7.1 Jupiter Ultra

```
GET  https://lite-api.jup.ag/ultra/v1/order
       ?inputMint=<mint>&outputMint=<mint>&amount=<raw>&taker=<wallet>
     -> { requestId, transaction (base64, only when taker is set),
          inAmount, outAmount, router ("metis" | "jupiterz" | ...),
          swapType ("aggregator" | "rfq"), routePlan[] }

POST https://lite-api.jup.ag/ultra/v1/execute
     { signedTransaction, requestId }
     -> { status, signature, ... }
```

- Keyless `lite-api` worked on 13 Sep (about 60 quotes in 65 s with no rate-limit errors). Get a free key from Jupiter's developer portal as a backup and read the current rate limits.
- Never use `usdPrice` from the tokens API as a price. It is a last trade.
- Ignore `priceImpactPct` for decisions. It is computed against `usdPrice`. Use our own per-share premium.

### 7.2 Buy

```
issuers = issuers_with_token(stock)                      # xStocks, Ondo
quotes  = parallel: ultra.order(USDC -> mint_i, usd_raw, taker=wallet)

for q in quotes (skip errors / empty outAmount):
    q.shares  = q.outAmount / 10^dec_i × multiplier_i
    q.pps     = usd / q.shares
    q.premium = q.pps / fair - 1

best = lowest pps
if |pps_xstocks - pps_ondo| / pps < 0.02%: prefer the issuer with deeper liquidity (xStocks)

if best.premium > guard (default 0.75%):
    show guard: "Buying now costs $X more than fair. Market opens in 14h 20m."
    actions: [Buy anyway] [Place buy-at-fair order (P1)] [Cancel]

on Buy click:
    if quote age > 20 s: requote
    wallet.signTransaction(best.transaction)
    ultra.execute(signed, best.requestId)
    confirm, then write receipt + swaps row
```

### 7.3 Sell

The user holds a specific issuer's token, so there is no issuer choice. Quote `mint -> USDC`, compute `sell_pps`, compare to fair, and apply the guard in reverse ("Selling now gets $X less than fair"). Show the other issuer's sell price for reference only.

### 7.4 Eligibility

Both issuers exclude US persons and some other jurisdictions. Show a one-time acknowledgement before the first trade and link both issuers' terms. No KYC in the app.

---

## 8. Architecture

```
┌──────────────────────────── Browser ────────────────────────────┐
│  web/  Vite + React + TS                                         │
│  Board · Stock page · Guard · Receipt · Method · (Holdings)      │
│  Solana wallet adapter (Phantom, Solflare, Backpack)             │
│  Signs Jupiter transactions locally. Keys never leave the wallet │
└───────────────┬──────────────────────────────┬───────────────────┘
                │ REST (quotes, board, history)│ signed tx
                ▼                              ▼
┌──────────── api/ (Node + Hono) ───────────┐  Jupiter Ultra execute
│  board · quote · execute proxy · history  │
│  fair price engine · session model        │
│  recorder (interval jobs)                 │
│  SQLite (better-sqlite3)                  │
└──┬──────────┬──────────┬──────────┬───────┘
   ▼          ▼          ▼          ▼
Jupiter    Hyperliquid  Real price  Solana RPC (Helius)
Ultra      info API     (Mon pick)  mints, balances, confirms
(+Trigger)              Pyth metadata (sessions, holidays)
```

Why a backend at all: it records history (needed for calibration and the replay), caches quotes against rate limits, and keeps API keys off the client. It never holds user funds or keys.

### 8.1 API

| Method | Path | Returns |
|---|---|---|
| GET | `/api/board` | per stock: status, fair, band, calibrating flag, per issuer {buy_pps, premium, available}, best |
| GET | `/api/quote?stock=NVDA&side=buy&usd=100&wallet=<pk>` | both issuer quotes with shares, pps, premium, requestId, transaction; best; guard verdict |
| POST | `/api/execute` | proxies Ultra execute, stores receipt, returns signature + receipt |
| GET | `/api/history?stock=NVDA&hours=120` | fair band series + per-issuer buy pps series + session shading |
| GET | `/api/method` | formula text + per-stock b, s, n, updated_at + sources |
| GET | `/api/holdings?wallet=<pk>` | (P1) stock tokens, shares, value at fair, sell premium |
| GET | `/api/health` | last recorder run per job, data age per source |

---

## 9. Data model (SQLite)

```sql
CREATE TABLE tokens (
  stock TEXT, issuer TEXT CHECK (issuer IN ('xstocks','ondo')),
  mint TEXT PRIMARY KEY, decimals INTEGER, perp TEXT            -- 'xyz:NVDA' or NULL
);

CREATE TABLE multipliers (
  ts INTEGER, mint TEXT, multiplier REAL, next_multiplier REAL, next_effective_ts INTEGER
);

CREATE TABLE perp_ticks (
  ts INTEGER, stock TEXT, mid REAL, mark REAL, oracle REAL, funding REAL, day_volume REAL
);

CREATE TABLE real_ticks (
  ts INTEGER, stock TEXT, price REAL, source TEXT
);

CREATE TABLE quotes (
  ts INTEGER, stock TEXT, issuer TEXT, side TEXT, usd REAL,
  raw_in TEXT, raw_out TEXT, multiplier REAL, pps REAL,
  router TEXT, swap_type TEXT, error TEXT
);

CREATE TABLE basis (
  day TEXT, stock TEXT, b REAL, s REAL, n INTEGER, PRIMARY KEY (day, stock)
);

CREATE TABLE swaps (
  ts INTEGER, wallet_hash TEXT, stock TEXT, side TEXT, issuer TEXT, usd REAL,
  shares REAL, pps REAL, fair REAL, premium REAL, saved_vs_other REAL, signature TEXT
);

CREATE INDEX idx_quotes ON quotes (stock, ts);
CREATE INDEX idx_perp ON perp_ticks (stock, ts);
```

Store raw amounts as TEXT (u64 overflows JS numbers). Store the wallet as a hash, not the address.

---

## 10. Recorder

**This is the only thing that cannot wait.** Every hour it is not running is replay and calibration data you never get back, and today is the only weekend before the deadline.

| Job | Interval | Calls | Notes |
|---|---|---|---|
| Perp ticks | 60 s | 1 | All 13 stocks in one Hyperliquid call |
| Real price | 60 s, Market open only | up to 13 | Stay under the chosen source's per-minute limit |
| Quote sweep | 5 min | 52 | 26 tokens × (buy $100, sell the same shares), spaced 1.1 s |
| Multipliers | 10 min | 1 | `getMultipleAccounts` on all 30 mints, `jsonParsed` |
| Basis | daily 20:05 UTC | 0 | From stored ticks |
| Sessions | daily | 13 | Pyth metadata schedule strings |

- Log gaps honestly. Never interpolate missing data on the chart.
- Run it now on this machine (keep the laptop awake), move it to an always-on host (Railway, Fly or Render, with a persistent disk) by Tuesday.
- Moments that matter this week: **Sun 20:00 ET** (overnight session opens), **Mon 09:30 ET** (first open after the weekend, the gap), and each weeknight close to open.

---

## 11. UI

**Look:** dark, calm, data-dense, same family as your proof-desk work, no neon. Numbers in a tabular monospace. Amber for "above fair", green for "below fair" and "saved", grey for "fair". Nothing flashes.

### 11.1 Screens

**A. Board (home)**
- Top strip: market status pill ("Weekend · opens in 1d 2h 17m"), data freshness dot.
- Table: Stock · Status · Fair (± band) · xStocks buy/share + premium · Ondo buy/share + premium · Best · 5-day sparkline.
- Row click opens the stock page. Phone width: each row becomes a card.

**B. Stock page**
- Left: chart. Fair band as a shaded ribbon, xStocks and Ondo per-share buy prices as two lines, closed hours shaded, dots where the premium exceeded the guard.
- Right: trade panel. Buy / Sell tabs, USD input with $2 / $10 / $100 chips and Max, two issuer cards side by side (per-share price, premium, route type "AMM" or "RFQ"), one card marked **Best**, a single line of reasoning ("Ondo is $6.34/share cheaper right now"), big Buy button.

**C. Guard (modal)**
"NVDA is 1.4% above fair right now. Buying $500 costs about $7.00 more than fair. Market opens in 14h 20m." Buttons: Buy anyway · Buy at fair when available (P1) · Cancel.

**D. Receipt**
Shares received · price per share · fair at fill · premium · saved vs other issuer ($) · issuer · route · Solscan link · Share button (P1).

**E. Method**
The formula from section 6, a per-stock calibration table, data sources with last update times, and the limits list.

**F. Holdings (P1)**
Stock tokens in the wallet, shares, value at fair, and "selling now gets x% below/above fair".

### 11.2 States to design (each must exist, not just the happy path)

Wallet not connected · amount under an issuer's minimum (Ondo: $2, USDC only; xStocks: $0.50) · not enough SOL for the network fee or a new token account deposit (show the exact SOL needed) · no quote from one issuer ("Ondo isn't quoting HOOD right now") · no quote from either · calibrating · no fair price · stale data (> 90 s) · quote expired · user rejected signature · transaction failed (show Jupiter's error) · slow confirmation.

---

## 12. Repo structure

```
fairfill/
  api/
    src/
      index.ts            # Hono server
      config.ts           # tokens registry (Appendix A), env
      sources/
        jupiter.ts        # ultra order/execute, trigger (P1)
        hyperliquid.ts    # metaAndAssetCtxs xyz
        realprice.ts      # chosen on Monday
        solana.ts         # multipliers, balances
        sessions.ts       # schedule parsing, status, next open
      engine/
        shares.ts         # raw <-> shares, pps
        fair.ts           # basis, fair, band, verdict
        route.ts          # best issuer, guard
      recorder/
        jobs.ts
      db/
        schema.sql
        db.ts
    test/
      shares.test.ts      # multiplier math incl. newMultiplier switch
      fair.test.ts        # each fair-price state
      sessions.test.ts    # weekend, overnight, holiday, early close
      route.test.ts       # best pick, tie-break, guard
  web/
    src/
      pages/ Board.tsx Stock.tsx Method.tsx Holdings.tsx
      components/ IssuerCard.tsx GuardModal.tsx Receipt.tsx FairChart.tsx StatusPill.tsx
      lib/ api.ts wallet.ts format.ts
  docs/
    build.md              # this file
    demo-script.md
  README.md
```

**Stack:** TypeScript end to end · Node 20 (installed) · Hono · better-sqlite3 · Vitest · Vite + React · `@solana/wallet-adapter-react` · `@solana/web3.js` · `lightweight-charts` for the chart · TanStack Query.

---

## 13. Day-by-day plan

All times UTC. Deadline is **Fri 20:00 UTC**; aim to submit by **Fri 16:00 UTC**.

### Sun 13 Sep (today): data starts flowing
- [ ] Repo, tokens registry (Appendix A), SQLite schema
- [ ] `shares.ts` + multiplier reader + tests
- [ ] Recorder jobs: perp ticks, quote sweep, multipliers
- [ ] **Recorder running before Mon 00:00 UTC (Sun 20:00 ET)** to catch the overnight open

### Mon 14 Sep: prove the method
- [ ] Sessions module + tests (weekend, overnight, holiday)
- [ ] Real price source: cross-check the three candidates during 13:30-20:00, pick one, record it
- [ ] Multiplier interpretation check (section 4)
- [ ] Basis job, `fair.ts` + tests, `/api/board`, `/api/method`
- [ ] **Gate 20:30 UTC:** look at Sunday night + Monday open data. Is there a measurable closed-hours premium, and does the cheaper issuer change? If yes, continue. If the premium is flat under 0.1% everywhere, reframe the pitch around per-share truth and the AMD-style outliers (still valid) and keep going. Do not change the product

### Tue 15 Sep: money moves
- [ ] Web: board + stock page against real API
- [ ] Wallet connect, `/api/quote` with taker, Ultra execute
- [ ] **First real mainnet buy, ~$2.10** through the cheaper issuer, then sell back and buy through the other one (prove both routes fill for your wallet)
- [ ] Sell flow
- [ ] P1-1 probe: can a Trigger order be placed on a stock token? Note yes/no, don't build it yet

### Wed 16 Sep: the standout parts
- [ ] Guard modal with countdown
- [ ] Receipt with saved vs other issuer
- [ ] Replay chart from recorded history
- [ ] Method page with live calibration table
- [ ] Move api + recorder to an always-on host, web to Vercel

### Thu 17 Sep: finish and harden
- [ ] Every state from 11.2
- [ ] Phone layout
- [ ] README (what, why Solana, formula in plain language, data sources, OSS used, limits)
- [ ] P1 items only if all P0 boxes are ticked
- [ ] **Record the closed-market segment of the demo tonight after 00:00 UTC** (overnight session, live premium on screen)

### Fri 18 Sep: ship, no new features
- [ ] Record the open-market segment and one live buy (after 13:30 UTC)
- [ ] Edit video (under 3 min), upload
- [ ] Submit by 16:00 UTC with GitHub, live demo and video links. Edits are allowed until 20:00 UTC

---

## 14. Demo script (under 3 minutes)

1. **The problem (20 s).** Jupiter token page shows AMD xStocks at a last price. Cut to what buying actually costs: 9% different. "The price you see isn't the price you pay, and there are two versions of every stock."
2. **The board (30 s).** 13 stocks, both issuers, per-share prices, market status "Overnight". Point at a row where the other issuer is cheaper.
3. **The Sunday price (40 s).** Replay chart over last weekend: fair band from the 24/7 market, token prices drifting above it while brokerages were closed, then snapping back at Monday's open. Open the Method page for 5 seconds: "here's the formula and today's calibration."
4. **The guard (20 s).** Try to buy a stock that's above fair. Guard: "costs $X more than fair, market opens in 9h."
5. **The buy (40 s).** Buy $2 of a stock through the cheaper issuer. Sign in Phantom. Receipt: shares, premium, saved vs the other issuer, Solscan link.
6. **Close (15 s).** "Two issuers, one chain, open all weekend. Fairfill makes sure you pay the stock's price, not the weekend's."

Fallback: if the live buy fails on camera, cut to Tuesday's recorded buy and say so in the voiceover.

---

## 15. Submission checklist

- [ ] Registered on the Stocklana page, project submitted before Fri 20:00 UTC
- [ ] Public GitHub repo, README complete, OSS components named
- [ ] Live demo URL works on desktop and phone, with a wallet connected
- [ ] Video under 3 minutes, shows a real mainnet fill
- [ ] At least one real buy through each issuer on record
- [ ] Method page live with real calibration numbers, not placeholders
- [ ] Every screen labels closed-market prices as estimates
- [ ] Eligibility notice shown before the first trade
- [ ] No API keys in the repo or the client bundle

---

## 16. What you need

| Need | Status | Action |
|---|---|---|
| Node 20, Git, gh | Have | |
| Phantom (or Solflare) wallet on mainnet | Has ~0.03 SOL (~$3) | Swap ~0.022 SOL to ~$2.20 USDC on Tuesday and recycle it: buy, sell back, buy through the other issuer, final buy on camera. Keep at least 0.004 SOL for fees and token account deposits (~0.0015-0.0017 SOL each, refundable when closed) |
| Jupiter API | Keyless `lite-api` works | Get a free key as backup, check rate limits |
| Hyperliquid info API | Works, no key | |
| Real price source | Not chosen | Finnhub free key (Monday cross-check), fallbacks need no key |
| Solana RPC | Public RPC works for light reads | Free Helius key for balances and confirmations |
| Hosting | Vercel account exists | Railway / Fly / Render for api + recorder (may need a card) |
| Stocklana registration | ? | Register today |
| Eligibility | ? | Confirm you may buy xStocks and Ondo tokens where you live |
| Rust, Anchor, Solana CLI | Not needed | No on-chain program in this build |

---

## 17. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Multiplier interpretation wrong, every comparison off by up to 0.2% | Monday check in section 4 before building UI on top of it |
| Perp basis moves on weekends (funding, news) | Band widens with measured spread, "estimate" label, Method page shows the numbers |
| Not enough calibration data by Friday (5 sessions wanted, only 4 exist Mon-Thu) | Use what exists, show `n` on the Method page, "calibrating" state is honest |
| Jupiter rate limits during sweeps | 1.1 s spacing, 10 s quote cache for the board, API key |
| Ondo RFQ refuses some stocks or hours (HOOD, PLTR on Sunday) | "No quote" state, route to the other issuer |
| RFQ fills refused for your wallet or region | Tuesday $10 test on both issuers. If Ondo won't fill, show its quote as reference only |
| Recorder dies overnight (laptop sleeps) | Move to a host by Tuesday, `/api/health` shows data age, log gaps |
| Live demo fails | Recorded fills from Tuesday to Thursday |
| "Isn't this just Jupiter?" | See 18 |

---

## 18. Judge questions to be ready for

- **"Isn't this just Jupiter?"** Jupiter finds the best route for one token. It doesn't know two tokens are the same stock, doesn't convert to shares, and has no fair price when NASDAQ is closed. We use Jupiter to execute. On 13 Sep Jupiter's own listed AMD xStocks price was 9% off what buying cost.
- **"Why trust a perp price?"** We don't trust it raw. We measure its gap to the real price every trading day and publish that number. It's an estimate with a band, and the UI says so.
- **"Who uses this?"** Anyone outside the US buying stocks on Solana, most of whom trade outside NYSE hours in their time zone. On 13 Sep, buying $1,000 of AMD through the wrong issuer cost $12.60.
- **"Business model?"** An integrator fee on routed swaps (Jupiter supports referral fees on Ultra, confirm the terms), plus a price API for other apps once the fair-price data has history.
- **"Is it legal?"** Fairfill is a non-custodial interface. Issuers set eligibility, the app shows their restrictions before trading and never holds funds.

---

## Appendix A: token registry

Resolved 13 Sep 2026 from Jupiter's token API, matching exact symbol plus issuer name and issuer logo domain (to avoid copycat tokens). All Token-2022. **Re-verify each mint on the issuer's site before the first real buy.**

| Stock | xStocks mint (8 dec) | Ondo mint (9 dec) | Perp |
|---|---|---|---|
| NVDA | `Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh` | `gEGtLTPNQ7jcg25zTetkbmF7teoDLcrfTnQfmn2ondo` | `xyz:NVDA` |
| TSLA | `XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB` | `KeGv7bsfR4MheC1CkmnAVceoApjrkvBhHYjWb67ondo` | `xyz:TSLA` |
| AAPL | `XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp` | `123mYEnRLM2LLYsJW3K6oyYh8uP1fngj732iG638ondo` | `xyz:AAPL` |
| MSFT | `XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX` | `FRmH6iRkMr33DLG6zVLR7EM4LojBFAuq6NtFzG6ondo` | `xyz:MSFT` |
| GOOGL | `XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN` | `bbahNA5vT9WJeYft8tALrH1LXWffjwqVoUbqYa1ondo` | `xyz:GOOGL` |
| AMZN | `Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg` | `14Tqdo8V1FhzKsE3W2pFsZCzYPQxxupXRcqw9jv6ondo` | `xyz:AMZN` |
| META | `Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu` | `fDxs5y12E7x7jBwCKBXGqt71uJmCWsAQ3Srkte6ondo` | `xyz:META` |
| AMD | `XsXcJ6GZ9kVnjqGsjBnktRcuwMBmvKWh8S93RefZ1rF` | `14diAn5z8kjrKwSC8WLqvBqqe5YmihJhjxRxd8Z6ondo` | `xyz:AMD` |
| COIN | `Xs7ZdzSHLU9ftNJsii5fCeJhoRWSC32SQGzGQtePxNu` | `5u6KDiNJXxX4rGMfYT4BApZQC5CuDNrG6MHkwp1ondo` | `xyz:COIN` |
| CRCL | `XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1` | `6xHEyem9hmkGtVq6XGCiQUGpPsHBaoYuYdFNZa5ondo` | `xyz:CRCL` |
| HOOD | `XsvNBAYkrDRNhA7wPHQfX3ZUXZyZLdnCQDfHZ56bzpg` | `BVdXGvmgi6A9oAiwWvBvP76fyTqcCNRJMM7zMN6ondo` | `xyz:HOOD` |
| MSTR | `XsP7xzNPvEHS1m6qfanPUGjNmdnmsLKEoNAnHjdxxyZ` | `FSz4ouiqXpHuGPcpacZfTzbMjScoj5FfzHkiyu2ondo` | `xyz:MSTR` |
| PLTR | `XsoBhf2ufR8fTyNSjqfU71DYGaE6Z3SUGAidpzriAA4` | `HfsnTS5qtdStwec9DfBrunRqnAMYMMz1kjv9Hu9ondo` | `xyz:PLTR` |
| SPY | `XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W` | `k18WJUULWheRkSpSquYGdNNmtuE2Vbw1hpuUi92ondo` | none |
| QQQ | `Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ` | `HrYNm6jTQ71LoFphjVKBTdAE4uja7WsmLG8VxB8ondo` | none |

## Appendix B: API calls used in the snapshot

```bash
# token lookup (identity only, never use usdPrice as a price)
curl "https://lite-api.jup.ag/tokens/v2/search?query=NVDAx"

# executable quote, no taker = quote only
curl "https://lite-api.jup.ag/ultra/v1/order?inputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&outputMint=Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh&amount=100000000"

# all XYZ stock perps in one call
curl -X POST https://api.hyperliquid.xyz/info -H 'content-type: application/json' \
  -d '{"type":"metaAndAssetCtxs","dex":"xyz"}'

# multipliers: read scaledUiAmountConfig from the mint
curl https://api.mainnet-beta.solana.com -H 'content-type: application/json' -d \
  '{"jsonrpc":"2.0","id":1,"method":"getAccountInfo","params":["Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh",{"encoding":"jsonParsed"}]}'

# sessions and holidays (free metadata)
curl "https://hermes.pyth.network/v2/price_feeds?query=NVDA&asset_type=equity"
```

## Appendix C: originality note for the submission

All Fairfill code is written during the event (from 13 Sep 2026). External pieces, all named in the README: Jupiter Ultra and Trigger APIs, Hyperliquid public info API, Pyth metadata, Solana wallet adapter, lightweight-charts, Hono, better-sqlite3. No code reused from earlier projects.
