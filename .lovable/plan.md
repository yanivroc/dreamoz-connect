# Bind page hyperlink to section image ("Scale with Confidence")

## What changes

For pages that have the optional Hyperlink field filled in (such as "Scale with Confidence"):

1. **Image becomes clickable** — the section's image/slider links to the page's hyperlink, opening in a new tab. A per-image hyperlink (set on an individual image in the builder) still takes priority; the page hyperlink is the fallback when an image has none.
2. **Hyperlink shown on the home section** — a "Visit link" style text link appears under the section text (next to the existing "Read more" link) when the page has a hyperlink, so the field is visibly bound on the home page, not just on the detail page.
3. **Detail page unchanged** — `/page/{slug}` already shows the hyperlink at the bottom; it stays.

Pages without a hyperlink are unaffected — images stay non-clickable and no extra link appears.

## Technical notes

- `src/components/site/PageMedia.tsx`: when wrapping an image, use `current.hyperlink || page.hyperlink` as the href.
- `src/routes/index.tsx`: in the section renderer, when `page.hyperlink` is set, render an external link (`target="_blank" rel="noreferrer"`) alongside the existing "Read more" link.
- No database or API changes — `hyperlink` is already stored per page and returned in the payload.
