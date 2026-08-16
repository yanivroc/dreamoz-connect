import { createClient, type Client } from "@libsql/client/web";

let client: Client | null = null;
let tableReady = false;

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
    created_at TEXT NOT NULL
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
  tableReady = true;
}
