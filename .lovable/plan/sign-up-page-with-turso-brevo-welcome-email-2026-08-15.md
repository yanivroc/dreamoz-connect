# Sign Up page with Turso + Brevo welcome email

## What you get
A new "Sign Up" page linked in the nav right after Contact. The form collects name, email, password (with confirm) and the same maths anti-spam question used on the contact form.

On submit:
- If the email already has an account, the form says "An account with this email already exists."
- Otherwise the account is created in the Turso database and a welcome email is sent through Brevo, with a success message on screen.

## Data
The app creates the table automatically on first use in `dreamoztechdb`:

```text
users
  id            integer primary key
  name          text
  email         text unique (stored lowercase)
  password_hash text
  created_at    text (ISO timestamp)
```

Passwords are never stored in plain text — they are hashed with PBKDF2-SHA256 plus a per-user random salt (Web Crypto, works on the Vercel/Worker runtime).

## Environment
Signup uses `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` from Vercel. Since those aren't set in the Lovable preview, submitting the form here will show a clear "signup is not configured" message; it will work once deployed. Brevo reuses the existing `BREVO_API_KEY` setup.

## Technical notes
- Add `@libsql/client` (web/fetch build) for Turso access.
- New `src/lib/db.server.ts`: lazy libSQL client from `process.env` inside handlers, plus `ensureUsersTable()` running `CREATE TABLE IF NOT EXISTS` + unique index on email.
- New `src/lib/auth.server.ts`: `hashPassword` / salt generation via `crypto.subtle`.
- New `src/lib/signup.functions.ts`: `createServerFn({ method: 'POST' })` with Zod validation (name 1-100, email, password min 8, captcha check server-side), duplicate-email check, insert, then `sendBrevoEmail` welcome message. Returns `{ ok: true }` or a typed `{ ok: false, reason: 'exists' | 'not_configured' }` — no raw provider errors leaked.
- Welcome email: brand-styled HTML sent from the existing Brevo sender config to the new user, addressed by name.
- New route `src/routes/signup.tsx` with its own `head()` metadata (unique title/description, og/twitter tags), reusing the contact page's card styling and sonner toasts.
- New `src/components/SignUpForm.tsx` mirroring `ContactForm.tsx` (captcha regenerated after each attempt).
- `src/components/SiteLayout.tsx`: add `Sign Up` to header and footer nav after `Contact`.
- Email uniqueness is enforced both by the pre-check and the DB unique index, so a race still fails safely and reports "already exists".
