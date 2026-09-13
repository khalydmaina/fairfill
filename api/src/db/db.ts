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
  seedTokens(db);
  return db;
}

function seedTokens(db: Db) {
  const upsert = db.prepare(
    `INSERT INTO tokens (mint, stock, issuer, decimals, perp) VALUES (@mint, @stock, @issuer, @decimals, @perp)
     ON CONFLICT (mint) DO UPDATE SET stock = excluded.stock, issuer = excluded.issuer,
       decimals = excluded.decimals, perp = excluded.perp`,
  );
  db.transaction(() => TOKENS.forEach((t) => upsert.run(t)))();
}
