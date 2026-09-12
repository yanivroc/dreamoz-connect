# Plan: Show "Learn More" instead of raw URL on page links

## What we will change
On child/root page detail views, the page-level hyperlink currently prints the raw URL (e.g. `https://store.dreamoztech.com/`). We will change the link text to "Learn More".

## Files to update
- `src/routes/page.$slug.tsx` — change the page hyperlink anchor text from `{page.hyperlink}` to `"Learn More"`.

## Details
- Keep the link opening in a new tab (`target="_blank"`, `rel="noreferrer"`).
- Preserve the existing `text-primary underline` styling and top margin.
- The per-image hyperlink in `PageMedia.tsx` already wraps the image and does not display text, so it is unaffected.

## Verification
- Read the updated file to confirm the anchor text is "Learn More".
- Optionally open a page with a hyperlink in the preview to confirm the rendered label.
