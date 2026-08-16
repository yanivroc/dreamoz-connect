# Soft delete for users + "Build Web Apps" page

## 1. Soft delete users

- Admin "Delete" no longer removes the row — it marks the account as deleted (deleted date stored).
- Deleted users appear greyed out in the admin Users panel with a **Restore** button.
- A "Show deleted" toggle keeps the default list clean; deleted users are hidden until switched on.
- A soft-deleted user cannot log in ("Invalid email or password"), and their session stops working immediately.
- Sign-up with a soft-deleted email tells the user the account already exists (admin can restore it) rather than creating a duplicate.
- Admin still cannot delete their own account.

## 2. New page: Build Web Apps (`/build-web-apps`)

Signed-in only (redirects to `/login` like the dashboard). Linked in the header next to Dashboard.

Each record belongs to the logged-in user and has:

| Field | Notes |
|---|---|
| Title | required |
| Description | multi-line |
| Email | validated email |
| Hyperlink | validated URL |
| Enabled | on by default, toggleable |
| Created / Updated | set automatically, shown read-only |

The page lists the user's own records as cards/rows with an inline "Add new" form, edit and delete. Admins see everyone's records with the owner's name shown.

## Database change

Run once in Turso:

```sql
ALTER TABLE users ADD COLUMN deleted_at TEXT;

CREATE TABLE IF NOT EXISTS web_apps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS web_apps_user ON web_apps (user_id);
```

The app also creates these automatically on first use, so a fresh database matches.

## Technical notes

- `src/lib/db.server.ts`: add `deleted_at TEXT` to the users `CREATE TABLE` plus a guarded `ALTER TABLE`; add `ensureWebAppsTable(db)` for the new table and index.
- `src/lib/auth.functions.ts`: `login` and `me` add `AND deleted_at IS NULL` to their queries; `me` returns `null` (forcing re-login) for a deleted account.
- `src/lib/signup.functions.ts`: duplicate check ignores `deleted_at`, so a soft-deleted email still reports "already exists".
- `src/lib/admin.functions.ts`: `deleteUser` becomes `UPDATE users SET deleted_at = ?`; add `restoreUser`; `listUsers` accepts `{ includeDeleted?: boolean }` and returns `deletedAt`. `requireAdmin` also rejects a soft-deleted admin.
- `src/components/AdminUsersPanel.tsx`: "Show deleted" checkbox, muted styling and a Restore button for deleted rows; role select and delete disabled on deleted rows.
- `src/lib/webapps.functions.ts` (new): `listWebApps`, `createWebApp`, `updateWebApp`, `deleteWebApp`, `toggleWebApp`. Every handler reads the session, re-reads the caller's row, and scopes queries by `user_id` (admins may act on any row). Zod validation: title 1-200, description ≤ 4000, optional email, optional `https?://` link.
- `src/routes/build-web-apps.tsx` (new): `beforeLoad` calls `me()` and redirects to `/login` with the `redirect` search param; wrapped in `SiteLayout` with `overviewFn()` for header/footer data, own `head()` title/description and `noindex`.
- `src/components/WebAppsPanel.tsx` (new): TanStack Query list + create/edit form, sonner toasts, confirmation before delete.
- `src/components/SiteLayout.tsx`: add the "Build Web Apps" nav link for signed-in users.
