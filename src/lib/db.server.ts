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
  try {
    await db.execute(`ALTER TABLE users ADD COLUMN marketing_consent INTEGER`);
  } catch {
    // Column already exists.
  }
  try {
    await db.execute(`ALTER TABLE users ADD COLUMN marketing_consent_at TEXT`);
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

let webPagesReady = false;

export async function ensureWebPagesTables(db: Client): Promise<void> {
  if (webPagesReady) return;
  await db.execute(`CREATE TABLE IF NOT EXISTS web_pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    parent_id INTEGER,
    order_no INTEGER NOT NULL DEFAULT 0,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    seo_description TEXT NOT NULL DEFAULT '',
    keywords TEXT NOT NULL DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 1,
    video_url TEXT NOT NULL DEFAULT '',
    video_embed TEXT NOT NULL DEFAULT '',
    product_enabled INTEGER NOT NULL DEFAULT 0,
    price REAL,
    min_qty INTEGER,
    max_qty INTEGER,
    shipping_price REAL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
  await db.execute(
    `CREATE INDEX IF NOT EXISTS web_pages_app ON web_pages (app_id)`,
  );
  await db.execute(
    `CREATE INDEX IF NOT EXISTS web_pages_parent ON web_pages (parent_id)`,
  );
  await db.execute(`CREATE TABLE IF NOT EXISTS web_page_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    mime TEXT NOT NULL,
    data TEXT NOT NULL,
    alt TEXT NOT NULL DEFAULT '',
    order_no INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`);
  await db.execute(
    `CREATE INDEX IF NOT EXISTS web_page_images_page ON web_page_images (page_id)`,
  );
  await db.execute(`CREATE TABLE IF NOT EXISTS web_app_settings (
    app_id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    logo_mime TEXT,
    logo_data TEXT,
    favicon_mime TEXT,
    favicon_data TEXT,
    default_shipping_price REAL,
    updated_at TEXT NOT NULL
  )`);
  webPagesReady = true;
}
