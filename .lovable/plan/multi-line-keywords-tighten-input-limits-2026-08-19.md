# Multi-line keywords + tighten input limits

## 1. Keywords and Video link as multi-line boxes

In the "Add a web page" form (`src/components/WebPagesPanel.tsx`):
- Keywords (comma separated) becomes a `<textarea>` (same look as SEO description), still saved as one comma-separated string.
- Video link becomes a multi-line `<textarea>` too, so long URLs are readable.

## 2. Field limits so nothing can be over-stuffed

The server already enforces limits with Zod; the UI is missing some, which lets a user type far more than can be saved and only see an error afterwards. Add matching `maxLength` on every visible field so the two agree.

Web page form (limits already enforced server-side):
- Title 200, Description 4000, SEO description 300, Keywords 500, Video link 500 (currently no UI limit), Video embed 4000
- Order number: clamp input to 0–9999
- Price / shipping price: 0–1,000,000; Min/Max quantity: whole numbers 0–1,000,000
- Image alt text already truncated at 200

Web app form (`src/components/WebAppsPanel.tsx`):
- Email gets `maxLength={255}`, Link gets `maxLength={500}` (both missing today; the server already caps them)

General settings (`src/components/AppSettingsPanel.tsx`):
- Default shipping price bounded 0–1,000,000 to match the server

No server-side validation changes are needed — those caps already exist and remain the real enforcement. This work only makes the UI honest about them.
