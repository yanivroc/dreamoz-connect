# Fix "not signed in" header + credentials via environment variables

## 1. Header doesn't show you're signed in

Confirmed cause: the header reads the session through a cached query (`session-user`, 30s stale time). The login form only calls `router.invalidate()`, which refreshes route loaders but not that cache — so the nav keeps showing Login / Sign Up (and no name / Sign out) until a full page reload. Opening the builder does a fresh route load with its own session check, which is why it looks right there.

Fix: after a successful login, clear and refetch the session query before navigating, so the header immediately shows your name, the Dashboard link and Sign out — on the dashboard and everywhere else.

## 2. The new credential fields

Google Maps, Square and SMTP credentials are secrets, so they stay out of the database and out of the builder UI. They are set as environment variables at deployment (Vercel → Settings → Environment Variables):

```text
GoogleMapsKey
SQUARE_ENVIRONMENT, SQUARE_APPLICATION_ID, SQUARE_LOCATION_ID, SQUARE_ACCESS_TOKEN
MAIL_FROM_NAME, MAIL_FROM_EMAIL
SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD
```

To make that discoverable, the General settings tab gets a short read-only "Deployment configuration" note listing these names and saying they are configured as environment variables, never stored in the app database. No values are ever displayed.

## Technical notes

- `src/components/LoginForm.tsx`: on success, `queryClient.removeQueries({ queryKey: ["session-user"] })` then `await queryClient.refetchQueries({ queryKey: ["session-user"] })` before `router.invalidate()` and `navigate(...)`.
- `src/components/AppSettingsPanel.tsx`: add the static informational block listing the env-var names; no new inputs, no new server calls.
- No database or public API changes.
