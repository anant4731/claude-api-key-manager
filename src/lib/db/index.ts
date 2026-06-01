import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { env } from "../env";
import * as schema from "./schema";

declare global {

  var __dbClient: ReturnType<typeof createClient> | undefined;
  var __dbReady: Promise<void> | undefined;
}

function client() {
  if (!globalThis.__dbClient) {
    const url = env().DATABASE_URL;
    if (url.startsWith("file:")) {
      const path = url.slice("file:".length);
      try {
        mkdirSync(dirname(path), { recursive: true });
      } catch {}
    }
    globalThis.__dbClient = createClient({ url });
    globalThis.__dbReady = bootstrap(globalThis.__dbClient);
  }
  return globalThis.__dbClient;
}

export async function ensureDbReady(): Promise<void> {
  client();
  if (globalThis.__dbReady) {
    await globalThis.__dbReady;
  }
}

const SCHEMA_VERSION = 5;

async function bootstrap(c: ReturnType<typeof createClient>) {
  try {
    await c.execute(
      `CREATE TABLE IF NOT EXISTS _meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`
    );

    const r = await c.execute(
      `SELECT value FROM _meta WHERE key = 'schema_version'`
    );
    const current = Number(r.rows[0]?.value ?? "0");

    if (current === 0) {
      await createSchema(c);
    } else if (current < SCHEMA_VERSION) {
      await migrate(c, current);
    }

    await c.execute({
      sql: `INSERT INTO _meta (key, value) VALUES ('schema_version', ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      args: [String(SCHEMA_VERSION)],
    });
  } catch (e) {
    console.error("[keymaster] DB bootstrap failed:", e);
  }
}

async function migrate(
  c: ReturnType<typeof createClient>,
  from: number
) {
  if (from < 4) {
    await c.execute(
      `ALTER TABLE api_keys ADD COLUMN monthly_budget_cents INTEGER NOT NULL DEFAULT 500`
    );
  }
  if (from < 5) {
    await c.executeMultiple(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL DEFAULT 'user',
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_by TEXT,
        last_login_at TEXT
      );
      CREATE INDEX IF NOT EXISTS users_email ON users(email);

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

      CREATE TABLE IF NOT EXISTS api_key_assignments (
        api_key_id TEXT NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_at TEXT NOT NULL,
        assigned_by TEXT,
        PRIMARY KEY (api_key_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS assignments_user ON api_key_assignments(user_id);
      CREATE INDEX IF NOT EXISTS assignments_key ON api_key_assignments(api_key_id);
    `);
  }
}

function createSchema(c: ReturnType<typeof createClient>) {
  return c.executeMultiple(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      encrypted_admin_key TEXT NOT NULL,
      partial_admin_key_hint TEXT NOT NULL DEFAULT '',
      org_id TEXT NOT NULL,
      org_name TEXT NOT NULL,
      connected_at TEXT NOT NULL,
      last_synced_at TEXT
    );
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
      anthropic_key_id TEXT UNIQUE,
      name TEXT NOT NULL,
      workspace_id TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      partial_key_hint TEXT NOT NULL DEFAULT '',
      encrypted_key TEXT,
      proxy_token TEXT NOT NULL UNIQUE,
      purpose_clarity TEXT NOT NULL DEFAULT 'unknown',
      purpose_clarity_reason TEXT NOT NULL DEFAULT '',
      purpose_clarity_checked_for TEXT NOT NULL DEFAULT '',
      monthly_budget_cents INTEGER NOT NULL DEFAULT 500,
      created_at TEXT NOT NULL,
      synced_at TEXT
    );
    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      api_key_id TEXT NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
      timestamp TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      cache_read_tokens INTEGER NOT NULL DEFAULT 0,
      cache_write_tokens INTEGER NOT NULL DEFAULT 0,
      cost_cents REAL NOT NULL DEFAULT 0,
      prompt_excerpt TEXT NOT NULL DEFAULT '',
      classification TEXT NOT NULL DEFAULT 'pending',
      classification_reason TEXT NOT NULL DEFAULT '',
      latency_ms INTEGER NOT NULL DEFAULT 0,
      status_code INTEGER NOT NULL DEFAULT 200
    );
    CREATE INDEX IF NOT EXISTS requests_key_ts ON requests(api_key_id, timestamp);
    CREATE INDEX IF NOT EXISTS requests_class ON requests(classification);

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'user',
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_by TEXT,
      last_login_at TEXT
    );
    CREATE INDEX IF NOT EXISTS users_email ON users(email);

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS api_key_assignments (
      api_key_id TEXT NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assigned_at TEXT NOT NULL,
      assigned_by TEXT,
      PRIMARY KEY (api_key_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS assignments_user ON api_key_assignments(user_id);
    CREATE INDEX IF NOT EXISTS assignments_key ON api_key_assignments(api_key_id);
  `);
}

export function db() {
  return drizzle(client(), { schema });
}

export { schema };
