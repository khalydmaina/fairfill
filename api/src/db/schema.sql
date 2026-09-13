-- All ts columns are unix milliseconds. Raw token amounts are TEXT (u64 does not fit a JS number).

CREATE TABLE IF NOT EXISTS tokens (
  mint     TEXT PRIMARY KEY,
  stock    TEXT NOT NULL,
  issuer   TEXT NOT NULL CHECK (issuer IN ('xstocks', 'ondo')),
  decimals INTEGER NOT NULL,
  perp     TEXT
);

CREATE TABLE IF NOT EXISTS multipliers (
  ts                INTEGER NOT NULL,
  mint              TEXT NOT NULL,
  multiplier        REAL,
  new_multiplier    REAL,
  new_effective_ts  INTEGER,  -- unix seconds, as stored on-chain
  effective         REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_multipliers ON multipliers (mint, ts);

CREATE TABLE IF NOT EXISTS perp_ticks (
  ts          INTEGER NOT NULL,
  stock       TEXT NOT NULL,
  mid         REAL,
  mark        REAL NOT NULL,
  oracle      REAL,
  funding     REAL,
  day_volume  REAL
);
CREATE INDEX IF NOT EXISTS idx_perp_ticks ON perp_ticks (stock, ts);

CREATE TABLE IF NOT EXISTS real_ticks (
  ts          INTEGER NOT NULL,  -- trade time reported by the source
  stock       TEXT NOT NULL,
  price       REAL NOT NULL,
  source      TEXT NOT NULL,
  fetched_ts  INTEGER            -- when we saw it, to measure source delay
);
CREATE INDEX IF NOT EXISTS idx_real_ticks ON real_ticks (stock, ts);

CREATE TABLE IF NOT EXISTS quotes (
  ts          INTEGER NOT NULL,
  sweep_id    INTEGER NOT NULL,
  stock       TEXT NOT NULL,
  issuer      TEXT NOT NULL,
  side        TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  usd         REAL,     -- buy: USDC paid, sell: USDC received
  raw_in      TEXT,
  raw_out     TEXT,
  multiplier  REAL,
  shares      REAL,
  pps         REAL,     -- price per share
  router      TEXT,
  swap_type   TEXT,
  fee_bps     INTEGER,
  error       TEXT
);
CREATE INDEX IF NOT EXISTS idx_quotes ON quotes (stock, ts);
CREATE INDEX IF NOT EXISTS idx_quotes_sweep ON quotes (sweep_id);

CREATE TABLE IF NOT EXISTS basis (
  day    TEXT NOT NULL,
  stock  TEXT NOT NULL,
  b      REAL NOT NULL,
  s      REAL NOT NULL,
  n      INTEGER NOT NULL,
  PRIMARY KEY (day, stock)
);

CREATE TABLE IF NOT EXISTS swaps (
  ts              INTEGER NOT NULL,
  wallet_hash     TEXT NOT NULL,
  stock           TEXT NOT NULL,
  side            TEXT NOT NULL,
  issuer          TEXT NOT NULL,
  usd             REAL NOT NULL,
  shares          REAL NOT NULL,
  pps             REAL NOT NULL,
  fair            REAL,
  premium         REAL,
  saved_vs_other  REAL,
  signature       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS job_runs (
  ts           INTEGER NOT NULL,
  job          TEXT NOT NULL,
  ok           INTEGER NOT NULL,
  duration_ms  INTEGER NOT NULL,
  detail       TEXT
);
CREATE INDEX IF NOT EXISTS idx_job_runs ON job_runs (job, ts);
