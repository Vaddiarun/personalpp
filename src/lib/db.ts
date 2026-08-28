import { mkdirSync } from "node:fs";
import { createClient as createWebClient } from "@libsql/client/web";

/**
 * Database access for InvestigateX.
 *
 *  - PRODUCTION / any serverless host (Vercel, Lambda, Netlify): a hosted libSQL
 *    database is REQUIRED — set TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN). We use
 *    `@libsql/client/web`, which is pure JavaScript (no native addon to install
 *    for the deploy platform).
 *  - LOCAL DEV with those vars unset: falls back to a file on disk via Node's
 *    built-in `node:sqlite` (Node 22.5+). Never used on a read-only filesystem.
 *
 * Everything is async so both back-ends share one interface.
 */

type Param = string | number | bigint | boolean | null | Uint8Array;
type Row = Record<string, unknown>;

interface Adapter {
  all(sql: string, args: Param[]): Promise<Row[]>;
  exec(sql: string, args: Param[]): Promise<void>;
  bootstrap(): Promise<void>;
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

async function runMigrations(a: Adapter): Promise<void> {
  // Add columns introduced after a database was first created by an older version.
  try {
    const cols = await a.all(`PRAGMA table_info(location_requests)`, []);
    if (!cols.some((c) => c.name === "officer_name")) {
      await a.exec(`ALTER TABLE location_requests ADD COLUMN officer_name TEXT`, []);
    }
  } catch {
    /* PRAGMA unsupported or column already present — safe to ignore */
  }
}

/** Hosted libSQL / Turso over HTTP — pure JS, works on any serverless platform. */
function remoteAdapter(rawUrl: string, authToken?: string): Adapter {
  const url = rawUrl.replace(/^libsql:\/\//i, "https://");
  const client = createWebClient(authToken ? { url, authToken } : { url });
  const adapter: Adapter = {
    async all(sql, args) {
      const rs = await client.execute({ sql, args });
      return rs.rows.map((row) => {
        const obj: Row = {};
        rs.columns.forEach((c, i) => {
          obj[c] = (row as unknown as unknown[])[i];
        });
        return obj;
      });
    },
    async exec(sql, args) {
      await client.execute({ sql, args });
    },
    async bootstrap() {
      await client.batch(SCHEMA, "write");
      await runMigrations(adapter);
    },
  };
  return adapter;
}

/** Local development only: a file on disk via Node's built-in synchronous SQLite. */
async function localAdapter(): Promise<Adapter> {
  const { DatabaseSync } = (await import("node:sqlite")) as typeof import("node:sqlite");
  const file = process.env.INVESTIGATEX_DB || "./data/investigatex.db";
  try {
    mkdirSync("./data", { recursive: true });
  } catch {
    /* already exists */
  }
  const db = new DatabaseSync(file.replace(/^file:/, ""));
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec("PRAGMA foreign_keys = ON;");
  const adapter: Adapter = {
    async all(sql, args) {
      return db.prepare(sql).all(...(args as never[])) as Row[];
    },
    async exec(sql, args) {
      db.prepare(sql).run(...(args as never[]));
    },
    async bootstrap() {
      for (const stmt of SCHEMA) db.exec(stmt);
      await runMigrations(adapter);
    },
  };
  return adapter;
}

function selectAdapter(): Promise<Adapter> {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

  if (url) {
    if (/^libsql:\/\//i.test(url) && !authToken) {
      return Promise.reject(
        new Error(
          "TURSO_DATABASE_URL is a libsql:// URL but TURSO_AUTH_TOKEN is missing. " +
            "Add both env vars in the Vercel project settings and redeploy.",
        ),
      );
    }
    return Promise.resolve(remoteAdapter(url, authToken));
  }

  const onServerless =
    !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.NETLIFY;
  if (onServerless) {
    return Promise.reject(
      new Error(
        "No database configured. This deployment has a read-only filesystem and needs a hosted " +
          "libSQL database: set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in the project's " +
          "Environment Variables and redeploy. See .env.example.",
      ),
    );
  }

  return localAdapter();
}

const g = globalThis as unknown as { __ixReady?: Promise<Adapter> };

/** Resolves to a bootstrapped adapter; retried on the next call if it fails. */
function ready(): Promise<Adapter> {
  if (!g.__ixReady) {
    g.__ixReady = selectAdapter()
      .then(async (a) => {
        await a.bootstrap();
        return a;
      })
      .catch((err) => {
        g.__ixReady = undefined; // don't cache a rejection
        throw err;
      });
  }
  return g.__ixReady;
}

/** Typed helpers. `T` is one of the *Row interfaces in ./types. */
export async function queryAll<T>(sql: string, ...params: Param[]): Promise<T[]> {
  const a = await ready();
  return (await a.all(sql, params)) as unknown as T[];
}

export async function queryOne<T>(sql: string, ...params: Param[]): Promise<T | undefined> {
  return (await queryAll<T>(sql, ...params))[0];
}

export async function run(sql: string, ...params: Param[]): Promise<void> {
  const a = await ready();
  await a.exec(sql, params);
}
