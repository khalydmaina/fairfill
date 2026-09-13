# Fairfill

Buy tokenized US stocks on Solana at the best price, from the right issuer, even when NASDAQ is closed.

Built for Stocklana (Solana Foundation), September 2026. Full spec: [docs/build.md](docs/build.md).

## Status

- [x] Token registry: 15 stocks, xStocks + Ondo mints
- [x] Recorder: Hyperliquid XYZ perps (60 s), Token-2022 multipliers (10 min), Jupiter Ultra buy/sell quote sweeps (5 min)
- [ ] Sessions + real price source + fair price engine
- [ ] API, web app, wallet swaps

## Run

```bash
cd api
npm install
npm test
npm run recorder   # or: systemctl --user enable --now fairfill-recorder (deploy/fairfill-recorder.service)
npm run status     # health + latest per-share table
```

## Open-source and external services

Jupiter Ultra API, Hyperliquid public info API, Solana JSON-RPC, better-sqlite3, tsx, Vitest.
