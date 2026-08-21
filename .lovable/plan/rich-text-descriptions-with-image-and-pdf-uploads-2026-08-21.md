# Rich text descriptions with image and PDF uploads

## What changes

The plain Description textarea in **Add a web app** and **Add a web page** becomes a rich text editor with:

- Bold, italic, underline, headings, bullet/numbered lists, links
- Insert image (uploaded, resized in the browser, max ~1MB)
- Attach PDF (max ~1MB) shown as a download link inside the text

Everything else on those forms stays as it is.

## Where uploads get stored

Uploads are stored **in the Turso database as base64**, matching how page images already work today — no physical folders, no external storage. A new `web_assets` table holds one row per uploaded image or PDF, scoped to the owning user and web app. The editor content references each asset by a stable URL (`/api/asset/<id>`) rather than embedding the base64 inline, so descriptions stay small.

Existing plain-text descriptions keep working: they are rendered as-is and can be edited in the new editor.

## Size limits

- Images: resized/compressed in the browser (same helper used for page images), max ~1MB
- PDFs: max ~1MB, rejected client-side and server-side
- Description HTML: max 20,000 characters (up from 4,000 plain text)

## Technical notes

- Editor: add `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-image`, `@tiptap/extension-underline`. New `src/components/RichTextEditor.tsx` with a small toolbar, controlled `value`/`onChange` as HTML string.
- `src/lib/db.server.ts`: `ensureWebPagesTables` gains
  `web_assets (id, user_id, app_id, kind TEXT CHECK images/pdf, mime, name, data TEXT base64, size INTEGER, created_at)` plus an index on `(app_id)`.
- `src/lib/assets.functions.ts` (new): `uploadAsset` (session + ownership check, mime allowlist `image/png|jpeg|webp|svg+xml` and `application/pdf`, base64 length cap ~1.4MB) returning `{ id, url }`; `deleteAsset`.
- `src/routes/api/asset.$id.ts` (new): public GET returning the decoded bytes with correct `Content-Type`, `Content-Disposition` for PDFs, and long-lived cache headers. Asset ids are random, non-sequential strings so they are not enumerable.
- `src/lib/image-upload.ts`: add `encodePdf(file)` returning `{ mime, name, data }` with the 1MB guard; reuse `encodeImage` for images.
- Zod: `description` max raised to 20000 in `webapps.functions.ts` and `webpages.functions.ts`; server sanitises the HTML (allowlist of tags/attributes, strip `script`, `on*`, `javascript:`) before storing.
- Rendering: description output in `WebPagesPanel` preview and in the public web-app JSON API is the sanitised HTML; the panel renders it with `dangerouslySetInnerHTML` inside the existing `prose-site` styling, safe because sanitisation happens on write.
- `WebAppsPanel.tsx` and `WebPagesPanel.tsx`: swap the description `<textarea>` for `<RichTextEditor>`; page-level uploads pass the current `appId` for scoping.
