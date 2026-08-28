import { createClient, type Client, type InArgs } from "@libsql/client";
import { mkdirSync } from "node:fs";

/**
 * libSQL / Turso connection. In production set TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN)
 * so the app talks to a hosted database — Vercel's filesystem is read-only, so a
 * local SQLite file cannot be used there. With no env vars we fall back to a
 * file-backed libSQL database for local development.
 *
 * Everything is async: `@libsql/client` has no synchronous API.
 */
const globalForDb = globalThis as unknown as {
  __investigatexDb?: Client;
  __investigatexReady?: Promise<void>;
};

function createDbClient(): Client {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

  if (url) {
    return createClient(authToken ? { url, authToken } : { url });
  }

  // Local dev fallback — a file on disk. Never reached on Vercel (env var is set there).
  const file = process.env.INVESTIGATEX_DB || "./data/investigatex.db";
  try {
    mkdirSync("./data", { recursive: true });
  } catch {
    /* directory already exists / not writable — libSQL will surface a clearer error */
  }
  return createClient({ url: file.startsWith("file:") ? file : `file:${file}` });
}

function client(): Client {
  if (!globalForDb.__investigatexDb) globalForDb.__investigatexDb = createDbClient();
  return globalForDb.__investigatexDb;
}

const SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS location_requests (
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
   )`,
  `CREATE TABLE IF NOT EXISTS location_sessions (
     id                TEXT PRIMARY KEY,
     request_id        TEXT NOT NULL REFERENCES location_requests(id),
     started_at        TEXT NOT NULL,
     ended_at          TEXT,
     permission_status TEXT NOT NULL DEFAULT 'unknown'
   )`,
  `CREATE TABLE IF NOT EXISTS location_records (
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
   )`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
     id          TEXT PRIMARY KEY,
     ts          TEXT NOT NULL,
     actor       TEXT NOT NULL,
     case_id     TEXT,
     action      TEXT NOT NULL,
     target      TEXT,
     detail_json TEXT
   )`,
  `CREATE INDEX IF NOT EXISTS idx_records_request ON location_records(request_id, ts)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_request ON location_sessions(request_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_logs(ts)`,
];

async function bootstrap(db: Client): Promise<void> {
  await db.batch(SCHEMA, "write");

  // Lightweight column migration for databases created by earlier versions.
  try {
    const info = await db.execute(`PRAGMA table_info(location_requests)`);
    const hasOfficer = info.rows.some((r) => (r as Record<string, unknown>).name === "officer_name");
    if (!hasOfficer) {
      await db.execute(`ALTER TABLE location_requests ADD COLUMN officer_name TEXT`);
    }
  } catch {
    /* PRAGMA unsupported or column already present — safe to ignore */
  }
}

/** Runs schema bootstrap exactly once per process. */
function ensureReady(): Promise<void> {
  if (!globalForDb.__investigatexReady) {
    globalForDb.__investigatexReady = bootstrap(client()).catch((err) => {
      // Allow a later request to retry rather than caching a rejected promise.
      globalForDb.__investigatexReady = undefined;
      throw err;
    });
  }
  return globalForDb.__investigatexReady;
}

type Param = string | number | bigint | boolean | null | Uint8Array;

function toObjects<T>(columns: string[], rows: unknown[][]): T[] {
  return rows.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((c, i) => {
      obj[c] = (row as unknown[])[i];
    });
    return obj as T;
  });
}

/** Typed helpers around @libsql/client (its row type does not overlap our interfaces). */
export async function queryAll<T>(sql: string, ...params: Param[]): Promise<T[]> {
  await ensureReady();
  const rs = await client().execute({ sql, args: params as InArgs });
  return toObjects<T>(rs.columns as string[], rs.rows as unknown as unknown[][]);
}

export async function queryOne<T>(sql: string, ...params: Param[]): Promise<T | undefined> {
  const rows = await queryAll<T>(sql, ...params);
  return rows[0];
}

export async function run(sql: string, ...params: Param[]): Promise<void> {
  await ensureReady();
  await client().execute({ sql, args: params as InArgs });
}
