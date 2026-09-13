import Database from "better-sqlite3";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { TOKENS } from "../config.js";

export type Db = Database.Database;

const schema = readFileSync(fileURLToPath(new URL("./schema.sql", import.meta.url)), "utf8");

export function openDb(path: string): Db {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.exec(schema);
  ensureColumn(db, "real_ticks", "fetched_ts", "INTEGER");
  seedTokens(db);
  return db;
}

/** CREATE TABLE IF NOT EXISTS never alters an existing table, so columns added later are migrated here. */
function ensureColumn(db: Db, table: string, column: string, type: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
}

function seedTokens(db: Db) {
  const upsert = db.prepare(
    `INSERT INTO tokens (mint, stock, issuer, decimals, perp) VALUES (@mint, @stock, @issuer, @decimals, @perp)
     ON CONFLICT (mint) DO UPDATE SET stock = excluded.stock, issuer = excluded.issuer,
       decimals = excluded.decimals, perp = excluded.perp`,
  );
  db.transaction(() => TOKENS.forEach((t) => upsert.run(t)))();
}
