import { createClient, type Client } from "@libsql/client/web";

let client: Client | null = null;
let tableReady = false;
let webAppsReady = false;

export function dbClient(): Client | null {
  const url = process.env["TURSO_DATABASE_URL"]?.trim();
  const authToken = process.env["TURSO_AUTH_TOKEN"]?.trim();
  if (!url) return null;
  if (!client) client = createClient(authToken ? { url, authToken } : { url });
  return client;
}

export async function ensureUsersTable(db: Client): Promise<void> {
  if (tableReady) return;
  await db.execute(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL,
    deleted_at TEXT
  )`);
  await db.execute(
    `CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email)`,
  );
  try {
    await db.execute(
      `ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`,
    );
  } catch {
    // Column already exists.
  }
  try {
    await db.execute(`ALTER TABLE users ADD COLUMN deleted_at TEXT`);
  } catch {
    // Column already exists.
  }
  tableReady = true;
}

export async function ensureWebAppsTable(db: Client): Promise<void> {
  if (webAppsReady) return;
  await db.execute(`CREATE TABLE IF NOT EXISTS web_apps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    link TEXT NOT NULL DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
  await db.execute(
    `CREATE INDEX IF NOT EXISTS web_apps_user ON web_apps (user_id)`,
  );
  webAppsReady = true;
}
