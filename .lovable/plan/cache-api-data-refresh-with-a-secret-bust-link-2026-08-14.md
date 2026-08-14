# Cache API data, refresh with a secret bust link

## Goal

Stop hitting the Dreamoz API (and its database) on every page load. The site loads a cached snapshot of the API data and only refetches when you visit a private refresh link.

## How it will work

- The first request after a deploy or cold start fetches member, posts and webs once, then keeps that snapshot in memory.
- Every later page view (home, contact, blog posts) is served from that snapshot — no API calls, no automatic expiry.
- Visiting `/api/public/cache-bust?token=YOUR_SECRET` clears the snapshot, refetches fresh data immediately, and returns a small JSON confirmation (status, item counts, refresh time).
- A wrong or missing token returns 401 and does nothing.

## Technical changes

- `src/lib/dreamoz.server.ts`: remove the 10-minute TTL so the cached snapshot never expires on its own; keep the existing single-flight and stale-fallback behaviour. Export `bustCache()` which clears the data cache and the API token cache, then reloads and returns the fresh snapshot's counts.
- New `src/routes/api/public/cache-bust.ts`: GET handler; reads `CACHE_BUST_TOKEN` inside the handler, compares it to the `token` query param, calls `bustCache()`, responds JSON with `no-store`.
- New secret `CACHE_BUST_TOKEN` (generated value) stored in project secrets. It must also be added to Vercel's environment variables for the deployed site.

## Note on Vercel

Each serverless instance keeps its own copy in memory. One bust refreshes the instance that handles it; other warm instances refresh on their next cold start or when they also receive the bust call. Hitting the link a couple of times after a content update covers this. A fully shared cache would need a database — can be added later if needed.
