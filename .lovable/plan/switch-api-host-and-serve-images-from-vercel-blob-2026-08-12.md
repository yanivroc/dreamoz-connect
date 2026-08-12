# Switch API host and serve images from Vercel Blob

## What changes
1. All content (member details, posts, webs) is fetched from the new API host instead of `https://dreamoz.com.au`. The old host is returning a 502 on the token request, which is why pages currently fail.
2. Images no longer live on `dreamoztech.com`. They come back as full Vercel Blob URLs that require a bearer token, so the browser cannot load them directly. The app will fetch each image on the server (with the token attached) and stream it to the page through its own image URL, so the token is never exposed to visitors.

## Technical detail
- `src/lib/dreamoz.server.ts`: change `BASE` to `https://dtapicoreappservice-b7cqgucahsbnckdh.australiaeast-01.azurewebsites.net`. Token flow, `Member/Get`, `Member/Posts?item=500`, `Member/Webs` unchanged.
- `mediaUrl()` becomes: if the path is already absolute (Vercel Blob), rewrite it to `/api/media?src=<encoded url>`; relative paths keep the existing base fallback.
- New server route `src/routes/api/media.ts` (GET): validates that `src` is on the allowed `*.blob.vercel-storage.com` host, fetches it with `Authorization: Bearer <VERCEL_BLOB_TOKEN>` read inside the handler, and returns the bytes with the upstream content-type plus a long cache header.
- The blob token is stored as a project secret (`VERCEL_BLOB_TOKEN`), never in code or the client bundle.

## Verification
Call the token endpoint and the three member endpoints on the new host, then load Home, Services, Insights and Contact to confirm content and images render and the 500/502 errors are gone.
