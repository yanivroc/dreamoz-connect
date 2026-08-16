# Login, sessions and dashboard with admin role

## What you get

- A **Login** page (`/login`) in the nav next to Sign Up: email, password, and the same maths captcha used on sign up.
- A **Dashboard** page (`/dashboard`) that only signed-in users can open. Visiting it while signed out redirects to `/login` (and returns you there after a successful login).
- **Session-based login** using an encrypted cookie — no token handling in the browser, the session survives refreshes and expires after 7 days.
- Header shows the signed-in user's name plus a **Sign out** button instead of Login/Sign Up.
- **Two roles**: `user` and `admin`.
  - Normal user: sees their own profile details on the dashboard.
  - Admin: additionally sees a **Users** panel — list all users (name, email, role, signup date), change a user's role, delete a user, and set a new password for a user.

## Database change

The `users` table needs a role column. Run this in Turso once:

```sql
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

New sign-ups get `role = 'user'`. The app's auto-create statement will be updated to include the column so a fresh database matches.

## Secret needed

`SESSION_SECRET` — a random 32+ character string used to encrypt the session cookie. It must be added in Lovable and in Vercel (Settings → Environment Variables) with the same value.

## Technical notes

- `src/lib/db.server.ts`: add `role TEXT NOT NULL DEFAULT 'user'` to `CREATE TABLE`.
- `src/lib/auth.server.ts`: add `verifyPassword(password, storedHash)` re-deriving PBKDF2 with the stored salt/iterations and comparing in constant time; keep `hashPassword` as-is.
- `src/lib/session.server.ts`: `getSessionConfig()` built inside the call (reads `process.env['SESSION_SECRET']`), plus `readSession()` / `setSession()` / `clearSession()` wrappers over `useSession` from `@tanstack/react-start/server`. Session payload is `{ userId, role }` only; name/email are re-read from the DB per request so a role change takes effect immediately.
- `src/lib/auth.functions.ts`: `login` (Zod-validated, captcha checked server-side, generic "Invalid email or password" for both unknown email and bad password), `logout`, `me`.
- `src/lib/admin.functions.ts`: `listUsers`, `setUserRole`, `deleteUser`, `adminResetPassword`. Every handler re-reads the caller's row from the DB and refuses unless `role === 'admin'`; admins cannot demote or delete their own account (avoids locking out the last admin).
- `src/routes/login.tsx` + `src/components/LoginForm.tsx`: mirrors the sign-up form styling, sonner toasts, captcha regenerated after each attempt, `redirect` search param support. On success, navigate with TanStack `navigate()` and `router.invalidate()`.
- `src/routes/dashboard.tsx`: `beforeLoad` calls the `me` server function; when there is no session it throws `redirect({ to: '/login', search: { redirect: location.href } })`. Route UI is a guard for UX only — the admin server functions carry their own role check as the real boundary.
- `src/components/AdminUsersPanel.tsx`: table of users with role select, delete and reset-password actions via `useServerFn` + confirmation dialogs.
- `src/components/SiteLayout.tsx`: session-aware nav — Login/Sign Up when signed out; user name, Dashboard link and Sign out when signed in. Session state is loaded in the root route and invalidated on login/logout.
- Own SEO `head()` on `/login`; `/dashboard` gets a title plus `noindex`.
- Passwords are never returned to the client; hashes stay server-side.
