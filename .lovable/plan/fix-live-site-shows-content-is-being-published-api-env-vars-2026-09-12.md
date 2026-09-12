# Fix: live site shows "Content is being published" — API env vars not visible in production

## Diagnosis (confirmed)

The Vercel log error `getSiteContent failed Error: DREAMOZTECH_API_KEY / DREAMOZTECH_API_SECRET are not configured.` is thrown from `src/lib/content.server.ts` when `process.env.DREAMOZTECH_API_KEY` or `DREAMOZTECH_API_SECRET` is empty **at runtime**. The code reads them correctly (inside the handler, trimmed). So the running production deployment simply does not have these variables. On Vercel this happens for one of three reasons:

1. The variables were added only to the **Preview** or **Development** environment, not **Production**.
2. The variables were added **after** the current deployment was built — Vercel only injects env vars into **new** deployments; the live one predates them.
3. A name mismatch (extra spaces, different casing).

The preview here in Lovable works because the variables are set in this environment.

## Plan

### Step 1 — You (in Vercel dashboard, 2 minutes)

1. Project **dreamoz-connect** → **Settings → Environment Variables**.
2. Confirm both `DREAMOZTECH_API_KEY` and `DREAMOZTECH_API_SECRET` exist and are scoped to **Production** (tick Production; values: the `WA-…` key and `SEC-…` secret).
3. Also confirm `SESSION_SECRET`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` are scoped to Production.
4. Go to **Deployments** → latest → **⋯ → Redeploy** (or push any commit). Env vars only take effect on a fresh deployment.

### Step 2 — Me (code changes, this session)

1. **Config health endpoint**: add `GET /api/public/health` that returns `{ ok, missing: [...] }` listing which required variables are absent (names only, never values). After your redeploy you can open this URL and instantly see whether Vercel injected everything, instead of digging through function logs.
2. **Better startup diagnostics**: in `content.server.ts`, when configuration is missing, log exactly which of the two variables is absent (name only) so future Vercel logs are self-explanatory.
3. **Graceful fallback stays**: the home page keeps showing the branded "content being published" placeholder rather than an error page if configuration is missing — no change needed, just verified.

### Step 3 — Verify together

1. After redeploy, open `https://dreamoztech.com/api/public/health` → expect `{ "ok": true, "missing": [] }`.
2. Open `https://dreamoztech.com/` → real DreamozTech content loads (hero, sections, footer links).
3. Open `https://dreamoztech.com/contact` → contact details render.
4. Test `POST /api/public/wa/token` with the WA-/SEC- pair → returns a token (200).

## Technical notes

- No changes to how secrets are stored or verified; the v2 fingerprint migration from earlier stays as-is.
- The health endpoint exposes only variable **names** that are missing — never values — and lives under `/api/public/` so it works without login.
- If Step 1 shows the vars were already Production-scoped and a redeploy still fails, the health endpoint output will tell us exactly which one is missing.
