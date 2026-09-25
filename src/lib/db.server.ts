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
  for (const ddl of [
    `ALTER TABLE users ADD COLUMN trial_ends_at TEXT`,
    `ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'none'`,
    `ALTER TABLE users ADD COLUMN plan_expires_at TEXT`,
  ]) {
    try {
      await db.execute(ddl);
    } catch {
      // Column already exists.
    }
  }
  // Existing accounts get a fresh 14-day trial from launch day.
  await db.execute({
    sql: `UPDATE users SET trial_ends_at = ? WHERE trial_ends_at IS NULL`,
    args: [new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()],
  });
  await ensureBillingTables(db);
  tableReady = true;
}

let billingReady = false;

export async function ensureBillingTables(db: Client): Promise<void> {
  if (billingReady) return;
  await db.execute(`CREATE TABLE IF NOT EXISTS plan_settings (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'AUD',
    days INTEGER NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
  )`);
  const now = new Date().toISOString();
  await db.execute({
    sql: `INSERT OR IGNORE INTO plan_settings (id, label, amount_cents, currency, days, enabled, updated_at)
          VALUES ('monthly', 'Monthly', 4900, 'AUD', 30, 1, ?), ('annual', 'Annual', 47000, 'AUD', 365, 1, ?)`,
    args: [now, now],
  });
  await db.execute(`CREATE TABLE IF NOT EXISTS platform_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);
  await db.execute(
    `INSERT OR IGNORE INTO platform_settings (key, value) VALUES ('trial_days', '14')`,
  );
  await db.execute(`CREATE TABLE IF NOT EXISTS subscription_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plan TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL,
    square_payment_id TEXT NOT NULL,
    receipt_url TEXT,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`);
  try {
    await db.execute(`ALTER TABLE subscription_payments ADD COLUMN invoice_no TEXT`);
  } catch {
    // Column already exists.
  }
  await db.execute(
    `CREATE UNIQUE INDEX IF NOT EXISTS subscription_payments_sq ON subscription_payments (square_payment_id)`,
  );
  await db.execute(
    `CREATE INDEX IF NOT EXISTS subscription_payments_user ON subscription_payments (user_id)`,
  );
  billingReady = true;
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
    embed_code TEXT NOT NULL DEFAULT '',
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
  const pageColumns = await db.execute(`PRAGMA table_info(web_pages)`);
  const columnNames = new Set(
    pageColumns.rows.map((row) => String((row as unknown as Record<string, unknown>)["name"])),
  );
  if (columnNames.has("video_embed") && !columnNames.has("embed_code")) {
    await db.execute(`ALTER TABLE web_pages RENAME COLUMN video_embed TO embed_code`);
    columnNames.delete("video_embed");
    columnNames.add("embed_code");
  } else if (columnNames.has("video_embed") && columnNames.has("embed_code")) {
    await db.execute(
      `UPDATE web_pages SET embed_code = video_embed WHERE embed_code = '' AND video_embed <> ''`,
    );
    await db.execute(`ALTER TABLE web_pages DROP COLUMN video_embed`);
    columnNames.delete("video_embed");
  }
  if (columnNames.has("video_url")) {
    await db.execute(`ALTER TABLE web_pages DROP COLUMN video_url`);
  }
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
  try {
    await db.execute(`ALTER TABLE web_pages ADD COLUMN hyperlink TEXT NOT NULL DEFAULT ''`);
  } catch {
    // Column already exists.
  }
  try {
    await db.execute(
      `ALTER TABLE web_page_images ADD COLUMN hyperlink TEXT NOT NULL DEFAULT ''`,
    );
  } catch {
    // Column already exists.
  }
  try {
    await db.execute(`ALTER TABLE web_pages ADD COLUMN weight REAL`);
  } catch {
    // Column already exists.
  }
  try {
    await db.execute(
      `ALTER TABLE web_pages ADD COLUMN contact_enabled INTEGER NOT NULL DEFAULT 0`,
    );
  } catch {
    // Column already exists.
  }
  await db.execute(`CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id INTEGER NOT NULL,
    page_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL,
    attachment1_asset_id TEXT,
    attachment2_asset_id TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`);
  await db.execute(
    `CREATE INDEX IF NOT EXISTS contact_messages_app ON contact_messages (app_id)`,
  );
  await db.execute(`CREATE TABLE IF NOT EXISTS web_app_settings (
    app_id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    logo_mime TEXT,
    logo_data TEXT,
    favicon_mime TEXT,
    favicon_data TEXT,
    updated_at TEXT NOT NULL
  )`);
  try {
    await db.execute(`ALTER TABLE web_app_settings DROP COLUMN default_shipping_price`);
  } catch {
    // Column already dropped (or unsupported); ignored.
  }
  try {
    await db.execute(
      `ALTER TABLE web_app_settings ADD COLUMN country TEXT NOT NULL DEFAULT 'AU'`,
    );
  } catch {
    // Column already exists.
  }
  await db.execute(`CREATE TABLE IF NOT EXISTS web_app_shipping_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    rate_type TEXT NOT NULL,
    threshold REAL NOT NULL,
    rate REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'AUD',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
  await db.execute(
    `CREATE INDEX IF NOT EXISTS web_app_shipping_rates_app ON web_app_shipping_rates (app_id)`,
  );
  await db.execute(
    `CREATE UNIQUE INDEX IF NOT EXISTS web_app_shipping_rates_unique
       ON web_app_shipping_rates (app_id, rate_type, threshold)`,
  );
  await db.execute(`CREATE TABLE IF NOT EXISTS web_app_api_keys (
    app_id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    api_key TEXT NOT NULL,
    secret_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    rotated_at TEXT
  )`);
  await db.execute(
    `CREATE UNIQUE INDEX IF NOT EXISTS web_app_api_keys_key ON web_app_api_keys (api_key)`,
  );
  await db.execute(`CREATE TABLE IF NOT EXISTS web_assets (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    app_id INTEGER,
    kind TEXT NOT NULL,
    mime TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    data TEXT NOT NULL,
    size INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`);
  await db.execute(
    `CREATE INDEX IF NOT EXISTS web_assets_app ON web_assets (app_id)`,
  );
  await db.execute(
    `CREATE INDEX IF NOT EXISTS web_assets_user ON web_assets (user_id)`,
  );
  webPagesReady = true;
}

let ordersReady = false;

export async function ensureOrdersTables(db: Client): Promise<void> {
  if (ordersReady) return;
  await db.execute(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    order_no TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting_for_confirmation',
    payment_provider TEXT NOT NULL DEFAULT 'square',
    payment_id TEXT NOT NULL,
    receipt_url TEXT,
    buyer_name TEXT NOT NULL,
    buyer_email TEXT NOT NULL,
    buyer_phone TEXT NOT NULL DEFAULT '',
    buyer_address TEXT NOT NULL DEFAULT '',
    buyer_city TEXT NOT NULL DEFAULT '',
    buyer_postcode TEXT NOT NULL DEFAULT '',
    buyer_country TEXT NOT NULL DEFAULT '',
    subtotal REAL NOT NULL,
    shipping REAL NOT NULL,
    total REAL NOT NULL,
    currency TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    payment_confirmed_at TEXT,
    completed_at TEXT,
    cancelled_at TEXT
  )`);
  await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS orders_order_no ON orders (order_no)`);
  await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_id ON orders (payment_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS orders_app ON orders (app_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS orders_status ON orders (status)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    page_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    qty INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    line_total REAL NOT NULL
  )`);
  await db.execute(`CREATE INDEX IF NOT EXISTS order_items_order ON order_items (order_id)`);
  ordersReady = true;
}
