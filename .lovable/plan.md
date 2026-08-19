# Fix images and favicon on the live site

Diagnosis (verified just now against dreamoztech.com):

- `https://dreamoztech.com/api/media?src=...` returns **404 NOT_FOUND** from Vercel — the in-app media proxy route is not served in production, exactly like the SMTP issue that was solved with a Vercel Node function (`api/send-mail.ts`).
- The blob URL fetched directly returns **403** — the private Vercel Blob store requires the read token, so images cannot be linked directly from the browser.
- In the Lovable preview and locally the proxy works (200, real JPEG bytes), which is why the problem only shows on the live site.

## What changes

1. Add `api/media.ts` — a Vercel Node serverless function that mirrors the existing proxy:
   - accepts `?src=`, only allows hosts ending in `.blob.vercel-storage.com` and `https:`
   - fetches with `Authorization: Bearer <blob token>`
   - streams the bytes back with the upstream `content-type` and long cache headers
   - reads the token from `VERCEL_BLOB_TOKEN`, falling back to `BLOB_READ_WRITE_TOKEN` (the name Vercel sets automatically for a linked Blob store)
2. Keep the existing TanStack route `src/routes/api/media.ts` for local/preview, and give it the same token fallback so both environments behave identically.
3. No change to how URLs are generated — `mediaUrl()` keeps pointing at `/api/media?src=...`, so both images and the favicon are fixed by the same function.

## After deploy

Confirm the Vercel project has `VERCEL_BLOB_TOKEN` (or `BLOB_READ_WRITE_TOKEN`) set for Production; without it the proxy will return 403 for the private blob store. I will note this again when the change is deployed.
