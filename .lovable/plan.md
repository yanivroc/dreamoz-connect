# Use the API/cache favicon everywhere

Right now the browser tab icon is declared statically in the root route as `/favicon.ico` (a file in the public folder). The API favicon (`logoFavicon` from the Webs data, already loaded into the cached overview as `favicon`) is only applied afterwards by a small client-side effect in the site layout, which can be overridden when the router re-renders head tags — so the public-folder icon wins.

## What changes

1. Remove the hardcoded `/favicon.ico` icon link from the root route so nothing competes with the API value.
2. Emit the favicon in each page's `head()` from loader data, so it is present in the served HTML (no flash, works for crawlers):
   - Home, Contact, Post detail, Login, Sign Up, Dashboard, Build Web Apps — each already loads the overview which contains `favicon`.
   - Link entry: `{ rel: "icon", href: overview.favicon }` only when a favicon value exists.
3. Keep a hardened client-side fallback in the site layout: update every existing `link[rel~='icon']` (not just the first) to the API favicon, and remove stale icon links, so no cached `/favicon.ico` remains.
4. If the cached/API favicon is missing, fall back to the site logo, then to no icon override.

## Technical notes

- `favicon` comes from `getOverview()` in `src/lib/dreamoz.server.ts` via `mediaUrl(web?.logoFavicon)`, which already routes Vercel Blob URLs through `/api/media`, so the cached snapshot works with the endpoint off.
- Files touched: `src/routes/__root.tsx`, `src/components/SiteLayout.tsx`, and the `head()` of the routes listed above.
- The public `favicon.ico` file stays in place only as a last-resort default; no icon link points to it once the API value exists.
