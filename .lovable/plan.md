# Revert the web app description to plain text

The **Add a web app / Edit web app** form goes back to a simple multi-line Description textarea. The rich text editor stays exactly as it is on **Add a web page**.

## What changes

- Web app form: `RichTextEditor` replaced by a plain `<textarea>` (max 4,000 characters), same styling as the other fields.
- Web app cards: description shown as plain text again (no HTML rendering), with line breaks preserved.
- Existing web app descriptions that already contain HTML markup would show raw tags, so on save the server strips tags and keeps the text; the card display also strips tags when reading old rows.

## Technical notes

- `src/components/WebAppsPanel.tsx`: drop the `RichTextEditor` import, use a textarea bound to `form.description` with `maxLength={4000}`; replace the `dangerouslySetInnerHTML` block with a `whitespace-pre-line` paragraph rendering a tag-stripped value.
- `src/lib/webapps.functions.ts`: description validator back to `z.string().trim().max(4000)` with a plain-text strip (remove tags, decode basic entities) instead of `sanitizeHtml`.
- No database schema change; `web_assets`, the asset route, and `sanitize-html` remain in place for web pages.
