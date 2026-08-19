# Local timestamps + Vercel Analytics

## 1. Show dates in the viewer's own time

Timestamps are already stored correctly: every web app / web page row saves `new Date().toISOString()`, i.e. UTC. The only problem is display — the dashboard cuts the ISO string into `2026-08-19 19:35` and shows raw UTC.

No signup field is needed. The browser already knows the visitor's zone (`Intl.DateTimeFormat().resolvedOptions().timeZone` → `Australia/Melbourne`) and the OS applies AEST/AEDT daylight saving automatically. Capturing a location at signup would be worse: it goes stale when people travel and needs manual DST rules.

Changes:
- Add a `formatDateTime()` helper in `src/lib/format.ts` that parses the stored UTC value and renders it with `Intl.DateTimeFormat` using the browser's locale/zone, e.g. `19 Aug 2026, 5:35 am AEST`.
- Use it in `src/components/WebAppsPanel.tsx` (replacing the current `fmt`) and anywhere else showing Created/Updated.
- Because SSR has no browser zone, render these cells only after hydration (a small `useHydrated` guard or `suppressHydrationWarning`) so the server and client markup don't conflict.
- Add a `title` attribute with the full UTC value for reference on hover.

## 2. Vercel Web Analytics

The screenshot's snippet (`@vercel/analytics/next`) is the Next.js entry point; this app is TanStack Start, so it uses the React entry instead.

- Install `@vercel/analytics`.
- Import `{ Analytics } from "@vercel/analytics/react"` and render `<Analytics />` once in `src/routes/__root.tsx`, next to `<Toaster />`.
- Data only appears for the deployed Vercel site (dreamoztech.com), not the local preview, and Web Analytics must be enabled in the Vercel project.

Optional follow-up if you want it: also enable Speed Insights (`@vercel/speed-insights/react`) the same way.
