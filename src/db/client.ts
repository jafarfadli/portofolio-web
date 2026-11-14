import "server-only";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import { dataDir } from "@/lib/env";
import { isAdminRole } from "@/lib/role";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;
export type OpenOptions = { mustExist?: boolean; queryOnly?: boolean };

/** Open a SQLite file (or ":memory:") with WAL and foreign keys on. Never migrates: see migrateDb. */
export function openDb(file: string, opts: OpenOptions = {}): Db {
  if (file !== ":memory:" && !opts.mustExist) fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file, { fileMustExist: Boolean(opts.mustExist) });
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("foreign_keys = ON");
  if (opts.queryOnly) sqlite.pragma("query_only = ON");
  return drizzle(sqlite, { schema });
}

/** Apply pending migrations from ./drizzle. Only the CLIs call this (`pnpm db:migrate`, `pnpm db:seed`). */
export function migrateDb(db: Db): Db {
  migrate(db, { migrationsFolder: path.join(/*turbopackIgnore: true*/ process.cwd(), "drizzle") });
  return db;
}

export function dbFile(): string {
  return path.join(dataDir(), "portfolio.db");
}

// One connection per process. globalThis survives dev HMR module reloads; a module-level variable does not.
const g = globalThis as typeof globalThis & { __portfolioDb?: Db };

/** The process-wide connection. The public role is query-only, so it can never write or race a migration. */
export function getDb(): Db {
  g.__portfolioDb ??= openDb(dbFile(), { mustExist: true, queryOnly: !isAdminRole() });
  return g.__portfolioDb;
}
