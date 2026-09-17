# Move the embedded map/video under the text on the home page

Today the embed (Google Map, video, etc.) appears in the right-hand column above the images. You want it in the left column instead: title, description, then the embed, then the "Read more about …" and "Learn More" links. Images stay on the right.

## What changes

- On each home page section, the embed renders directly below the description text and above the links.
- The right column keeps only the image slider. If a section has an embed but no images, the right column simply stays empty and the text column keeps its normal width.
- Section pages (the full page view opened by "Read more") keep their current layout — no change there.

## Technical notes

- Split the embed rendering out of `src/components/site/PageMedia.tsx` into a small `PageEmbed` component in the same file (same iframe markup, sandbox, lazy loading and title fallback).
- Add an `embed?: boolean` prop (default true) to `PageMedia` so callers can suppress it; `PageMedia` returns null when there are no images and the embed is suppressed.
- In `src/routes/index.tsx`, render `<PageEmbed page={page} />` between the `RichText` description and the links row, and pass `embed={false}` to the `PageMedia` call in the right column.
- `src/routes/page.$slug.tsx` is untouched (still uses the default, embed included).
