# Site updates: call button, service pages, contact form

## 1. Header CTA becomes "Call Us"
Replace the "Start a project" button in the header with a phone button that keeps the same gradient background, shows a phone icon, the label "Call Us" and the member's `mobileNumber` from `Member/Get`. It links with `tel:` so mobile users can dial directly.

## 2. Each "What we do" section gets its own page
Today every card on the home page links to `/services`. Instead, each web page from the API ("Home", "About", "Services", "Feature", "Growth", "Brand", "Testimonial", ...) gets its own URL built from the `pageUrl` field in `webs > webPages`, e.g. `/about`. The card links there, and that page shows the section's full content: description, its posts, their images/videos, categories and attributes — the same detail currently shown on the Services page.

The `/services` page stays as the combined overview.

## 3. Navigation
Remove the "Insights" link from the header and footer menus. The insights pages themselves stay reachable by direct URL.

## 4. Contact page
- Remove the "Innovate" section entirely.
- Add a contact form (name, email, subject, message, plus a simple math anti-spam check) that emails the enquiry to the member's email address through Brevo, using the same approach as the Dreamoztech Image Fetcher project (Brevo HTTP API, server-side only).
- Keep the map, the address block and the phone number (WhatsApp/call) and email buttons.

## 5. Footer
Remove the API-driven "Footer" section block. Keep only the bottom bar: copyright line and the nav links.

## Technical notes
- `src/lib/dreamoz.types.ts` / `dreamoz.server.ts`: carry `pageUrl` through `ServicePage`; add a `getServicePage(slug)` lookup by `pageUrl`.
- New route `src/routes/$pageSlug.tsx` (dynamic leaf) rendering a single web page with its own `head()` metadata; loader returns 404 via `notFound()` when the slug doesn't match a page. Excluded pages (footer, case, blog, return policy) remain excluded.
- Home cards use `<Link to="/$pageSlug" params={{ pageSlug }}>`.
- `src/components/SiteLayout.tsx`: drop Insights from `nav`, drop the `footerPage` block, swap the CTA for the `tel:` "Call Us" button.
- New `src/lib/brevo.server.ts` (Brevo HTTP API sender) and `src/lib/contact.functions.ts` (`createServerFn` with Zod validation + captcha check), copied in shape from the other project. New `src/components/ContactForm.tsx` with sonner toasts for success/failure.
- Requires a `BREVO_API_KEY` secret (plus optional `BREVO_FROM_EMAIL` / `BREVO_FROM_NAME`); I'll prompt for it during implementation if it isn't already set.
