# Fix signed-in header + new General settings fields

## 1. Header doesn't show you're signed in after login

Confirmed cause: the header reads the session through a cached query (`session-user`, 30s stale time). The login form only calls `router.invalidate()`, which refreshes route loaders but not that cache — so the nav keeps showing Login / Sign Up until a full page reload. Opening the builder does a route load with its own session check, which is why it looks correct there.

Fix: after a successful login, clear and refetch the session query before navigating, so the header immediately shows your name, Dashboard link and Sign out. Same handling stays on sign-out (already clears the cache).

## 2. New fields under General settings

Add these to the General settings tab, grouped into sections, saved per web app:

- Google: GoogleMapsKey
- Square: SQUARE_ENVIRONMENT (sandbox / production select), SQUARE_APPLICATION_ID, SQUARE_LOCATION_ID, SQUARE_ACCESS_TOKEN
- Mail: MAIL_FROM_NAME, MAIL_FROM_EMAIL
- SMTP: SMTP_HOST, SMTP_PORT, SMTP_SECURE (true/false select), SMTP_USER, SMTP_PASSWORD

Secret values (SQUARE_ACCESS_TOKEN, SMTP_PASSWORD, GoogleMapsKey) are shown masked once saved; leaving the masked value untouched keeps the stored value, typing a new one replaces it. These values are never included in the public web app JSON API.

## Technical notes

- `src/lib/db.server.ts`: add nullable TEXT columns to `web_app_settings` for each field via guarded `ALTER TABLE ... ADD COLUMN` (ignore "duplicate column" errors), keeping the existing auto-migration style. `SMTP_PORT` stored as INTEGER, `SMTP_SECURE` as TEXT 'true'/'false'.
- `src/lib/webpages.functions.ts`: extend `AppSettings` type, `getAppSettings` (return secrets as a `hasX: true` flag plus masked placeholder rather than raw value) and `saveAppSettings` Zod schema (email format for MAIL_FROM_EMAIL, port 1-65535, max lengths 255-500). Secret fields accept `undefined` = keep existing.
- `src/components/AppSettingsPanel.tsx`: add the grouped inputs with `maxLength` caps matching server limits; existing logo/favicon UI unchanged.
- `src/components/LoginForm.tsx`: `queryClient.removeQueries({ queryKey: ["session-user"] })` + `await queryClient.refetchQueries(...)` before `navigate`.
- `src/routes/api/public/wa/webapp.ts`: confirm settings serialization only emits logo/favicon — no credentials.
