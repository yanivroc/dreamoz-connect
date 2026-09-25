# Contact pages, contact form, Contacts tab and API

## What you'll get
1. **"This is a contact page" checkbox** in the Add/Edit web page form (next to "This page sells a product"). Optional, off by default.
2. **Contact form on the public page** — when a page is marked as a contact page, a form appears at the bottom with: Name, Email, Phone, Message, Attachment 1, Attachment 2 (PDF or images, optional, max 5 MB each), plus the same spam check used elsewhere. Success/error shown as toasts.
3. **Email notification** — each submission is also emailed to the web app's email address with the attachments.
4. **New "Contacts" tab** in Build Web Apps (after Orders), scoped to the selected web app like Orders: list of messages showing date, page, name, email, phone, message, and download links for attachments. Owners see their apps only; admins see all. Mark as read and delete (with in-app confirm dialog).
5. **API** (same bearer token as the existing web app API, which identifies the member's web app):
   - `GET /api/public/wa/contacts` — list messages for that web app (optional `pageId`, paging).
   - `POST /api/public/wa/contacts` — submit a message for a contact page (JSON with base64 attachments), validated the same way as the site form.
   - The `/webapp` payload gains `contactEnabled` per page. API tab docs updated with examples.

## Technical details
- DB: `web_pages.contact_enabled INTEGER DEFAULT 0` (idempotent ALTER); new `contact_messages` table (id, app_id, page_id, name, email, phone, message, attachment1_asset_id, attachment2_asset_id, is_read, created_at). Attachments stored in existing `web_assets` (base64, mime check: pdf/png/jpeg/webp/gif) and served via `/api/asset/$id` (restricted to owner session or API token for contact attachments).
- Server fns: `src/lib/contacts.functions.ts` — `submitContactMessage` (public, Zod + captcha, verifies page is enabled & contact_enabled), `listContactMessages`, `markContactRead`, `deleteContactMessage` (ownership checked like orders).
- Files: webpages.functions.ts / WebPagesPanel.tsx (checkbox), content-types.ts + webapp-payload.server.ts + api/wa-webapp.ts (`contactEnabled`), new `PageContactForm.tsx` rendered in `page.$slug.tsx` (and home sections if applicable), new `ContactsPanel.tsx`, build-web-apps.tsx tab, new route `src/routes/api/public/wa/contacts.ts` + matching vercel.json rewrite, ApiPanel docs.
