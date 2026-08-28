import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

/**
 * Lazily-opened SQLite connection using Node's built-in `node:sqlite`
 * (no native module to compile). Initialization is deferred to the first
 * query so that `next build` — which imports route modules for analysis —
 * never opens the database file.
 */
const globalForDb = globalThis as unknown as { __investigatexDb?: DatabaseSync };

function openDb(): DatabaseSync {
  const dbPath = resolve(process.env.INVESTIGATEX_DB || "./data/investigatex.db");
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec("PRAGMA foreign_keys = ON;");
  bootstrap(db);
  return db;
}

function bootstrap(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS location_requests (
      id            TEXT PRIMARY KEY,
      case_id       TEXT NOT NULL,
      target_e164   TEXT,
      target_raw    TEXT,
      purpose       TEXT NOT NULL,
      token_hash    TEXT NOT NULL UNIQUE,
      single_use    INTEGER NOT NULL DEFAULT 0,
      status        TEXT NOT NULL DEFAULT 'PENDING',
      created_at    TEXT NOT NULL,
      expires_at    TEXT NOT NULL,
      created_by    TEXT NOT NULL DEFAULT 'investigator',
      officer_name  TEXT
    );

    CREATE TABLE IF NOT EXISTS location_sessions (
      id                TEXT PRIMARY KEY,
      request_id        TEXT NOT NULL REFERENCES location_requests(id),
      started_at        TEXT NOT NULL,
      ended_at          TEXT,
      permission_status TEXT NOT NULL DEFAULT 'unknown'
    );

    CREATE TABLE IF NOT EXISTS location_records (
      id            TEXT PRIMARY KEY,
      session_id    TEXT NOT NULL REFERENCES location_sessions(id),
      request_id    TEXT NOT NULL REFERENCES location_requests(id),
      ts            TEXT NOT NULL,
      received_at   TEXT NOT NULL,
      latitude      REAL NOT NULL,
      longitude     REAL NOT NULL,
      accuracy      REAL,
      source        TEXT NOT NULL DEFAULT 'BROWSER_GEOLOCATION',
      provider      TEXT NOT NULL DEFAULT 'W3C_GEOLOCATION_API',
      metadata_json TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id          TEXT PRIMARY KEY,
      ts          TEXT NOT NULL,
      actor       TEXT NOT NULL,
      case_id     TEXT,
      action      TEXT NOT NULL,
      target      TEXT,
      detail_json TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_records_request ON location_records(request_id, ts);
    CREATE INDEX IF NOT EXISTS idx_sessions_request ON location_sessions(request_id);
    CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_logs(ts);
  `);

  // Lightweight column migrations for databases created by earlier versions.
  const cols = db.prepare(`PRAGMA table_info(location_requests)`).all() as { name: string }[];
  if (!cols.some((c) => c.name === "officer_name")) {
    db.exec(`ALTER TABLE location_requests ADD COLUMN officer_name TEXT`);
  }
}

export function getDb(): DatabaseSync {
  if (!globalForDb.__investigatexDb) globalForDb.__investigatexDb = openDb();
  return globalForDb.__investigatexDb;
}

type Param = string | number | bigint | null | Uint8Array;

/** Typed helpers around node:sqlite (its row type does not overlap our interfaces). */
export function queryAll<T>(sql: string, ...params: Param[]): T[] {
  return getDb().prepare(sql).all(...params) as unknown as T[];
}

export function queryOne<T>(sql: string, ...params: Param[]): T | undefined {
  return getDb().prepare(sql).get(...params) as unknown as T | undefined;
}

export function run(sql: string, ...params: Param[]): void {
  getDb().prepare(sql).run(...params);
}
