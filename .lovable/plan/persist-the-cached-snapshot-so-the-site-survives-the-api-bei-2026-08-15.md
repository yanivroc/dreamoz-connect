# Persist the cached snapshot so the site survives the API being off

## Goal

Today the cached copy of the Dreamoz data lives only in the server's memory. If a fresh server instance starts while the Azure API is switched off, the site has nothing to show and errors. This change saves the snapshot to durable storage so a cold start can load it from there instead of the API.

## How it will work

1. When data is fetched from the API, a copy of the whole snapshot (member, posts, webs) is written to a JSON file in the existing Vercel Blob store.
2. On a cold start, the server first tries memory, then the saved snapshot file, and only calls the Azure API if neither exists.
3. Visiting the cache-bust link forces a fresh API fetch and overwrites the saved snapshot. If the API is unreachable, the bust returns an error and the saved snapshot stays untouched, so the site keeps working.
4. Result: after one successful load, the Azure API can be turned off indefinitely and the website keeps serving content.

## Testing it

- Hit `/api/public/cache-bust?token=...` once with the API on — response confirms counts and refresh time.
- Turn the Azure API off, then redeploy (this guarantees a cold start with empty memory) and load Home, a blog post and Contact — all should render from the saved snapshot.
- Hit the cache-bust link with the API off — it returns an error, and pages continue to render.
- A new protected `/api/public/cache-status?token=...` endpoint reports whether the snapshot came from memory or storage, its age, and item counts, so testing does not depend on guessing.

## Technical changes

- Add `@vercel/blob` and a `src/lib/snapshot-store.server.ts` helper with `readSnapshot()` / `writeSnapshot()` that store `dreamoz/snapshot.json` in the existing private blob store, using `VERCEL_BLOB_TOKEN` read inside the functions. Reads go through the same authenticated fetch path already used by `/api/media`.
- `src/lib/dreamoz.server.ts`:
  - `loadAll()` order becomes memory → persisted snapshot → API fetch. A snapshot loaded from storage is placed into memory and tagged with its source and saved timestamp.
  - After a successful `fetchAll()`, write the snapshot to storage (failures logged, never fatal).
  - `bustCache()` clears memory and token, forces `fetchAll()`, writes the new snapshot, and on failure restores/keeps the previous persisted copy and reports the error.
  - Export `cacheStatus()` returning source (`memory` | `storage` | `empty`), saved-at time and counts.
- New `src/routes/api/public/cache-status.ts`: token-protected GET returning the status JSON with `no-store`.
- No new secrets required — `VERCEL_BLOB_TOKEN` and `CACHE_BUST_TOKEN` already exist (both must be present in Vercel's env vars).

## Note

Each serverless instance still keeps its own in-memory copy, but every instance now falls back to the same shared saved snapshot, so behaviour is consistent across instances and across deploys.
