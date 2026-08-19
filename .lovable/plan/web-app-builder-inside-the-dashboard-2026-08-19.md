# Web app builder inside the dashboard

## 1. Navigation change

- Remove "Build Web Apps" from the site header.
- The Dashboard gets a "Build Web Apps" section with a link (and quick list of your web apps) into the builder page. The page itself stays at `/build-web-apps` and remains sign-in only.

## 2. Builder page with tabs

Pick a web app first (from your existing list), then work inside two tabs:

### Tab A — Web pages

Each page belongs to the selected web app and has:

| Field | Notes |
|---|---|
| Order number | controls position; parents reorder by drag and drop |
| Page title | required |
| Description | multi-line |
| SEO description | short meta text |
| Keywords | comma separated |
| Enabled | on by default |
| Images | uploaded, resized in the browser (max ~1MB), stored in the database |
| Videos | link or embed code |
| Parent page | blank = top-level; otherwise it becomes a child page |

- Parent pages are listed in order-number order and can be dragged to reorder; their child pages nest underneath and can be reordered within the parent.
- A child page has a "This page sells a product" switch. When on, extra fields appear: price, minimum quantity, maximum quantity, shipping price (optional).

### Tab B — General settings

Per web app: upload logo image, upload favicon (both stored in the database, browser-resized), and an optional site-wide default shipping price.

## Database changes

New tables (created automatically on first use):

```sql
CREATE TABLE web_pages (
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
  price REAL, min_qty INTEGER, max_qty INTEGER, shipping_price REAL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE web_page_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
  mime TEXT NOT NULL, data TEXT NOT NULL, alt TEXT NOT NULL DEFAULT '',
  order_no INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
CREATE TABLE web_app_settings (
  app_id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL,
  logo_mime TEXT, logo_data TEXT, favicon_mime TEXT, favicon_data TEXT,
  default_shipping_price REAL, updated_at TEXT NOT NULL
);
```

Images are stored as base64 data in the database (no physical folders) and rendered as data URLs.

## Technical notes

- `src/lib/db.server.ts`: add `ensureWebPagesTables(db)` creating the three tables plus indexes on `app_id` and `parent_id`.
- `src/lib/webpages.functions.ts` (new): `listWebPages`, `createWebPage`, `updateWebPage`, `deleteWebPage`, `reorderWebPages`, `addPageImage`, `deletePageImage`, `getAppSettings`, `saveAppSettings`. Each handler reuses the existing session + ownership pattern from `webapps.functions.ts` (owner or admin only, every query scoped by `user_id`/`app_id`). Zod validation: title 1-200, description ≤ 4000, seo description ≤ 300, keywords ≤ 500, embed ≤ 4000, numeric product fields non-negative with max ≥ min; product fields only accepted when `parent_id` is set and `product_enabled` is true. Base64 payload capped server-side (~1.4MB encoded) and mime restricted to png/jpeg/webp/svg (favicon also ico).
- Client-side upload helper resizes/compresses via canvas before encoding to base64; server rejects oversized payloads.
- `src/components/WebAppsPanel.tsx`: unchanged CRUD, plus a "Manage pages" action that selects the app in the builder.
- `src/components/WebPagesPanel.tsx` (new): tabbed UI (Web pages / General settings), tree list of parents with nested children, HTML5 drag-and-drop reordering that persists via `reorderWebPages`, inline create/edit form, sonner toasts, confirm before delete.
- `src/routes/build-web-apps.tsx`: add the tab shell and app selector; keeps `beforeLoad` auth redirect and head metadata.
- `src/routes/dashboard.tsx`: new "Build Web Apps" card linking to the builder.
- `src/components/SiteLayout.tsx`: drop the `/build-web-apps` nav item.
