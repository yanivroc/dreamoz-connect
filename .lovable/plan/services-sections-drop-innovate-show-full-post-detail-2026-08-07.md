# Services sections: drop Innovate, show full post detail

## What changes

1. **Exclude "Innovate" from the services list** (home + Services page). The Innovate content stays where it is today — on the Contact page — it just no longer appears as a service section.
2. **Brand stays included**, along with About, Services, Growth, Feature, Testimonial, Home. Footer, Case, Blog and Return Policy remain excluded.
3. **Each service section renders the full content in this order:**
   - Page title
   - Page description (HTML from the API)
   - For each post under that page: post title, category tags, attributes list, and an image/video slider (pics + videos)

   The page-level payload has no images of its own; all pics/videos come from the posts under each page, which is what gets displayed.
4. **Home page "What we do"** currently shows only a title + truncated summary. It will be upgraded to the same structure (description, then posts with their attributes, tags and media) so home and Services stay consistent.

## Technical notes

- `src/lib/dreamoz.server.ts`: add `innovate` to `EXCLUDED_PAGES` so `servicePages()` skips it; `innovatePage()` stays as-is so the Contact page keeps working.
- `src/routes/services.tsx`: already renders description + posts with `MediaSlider`, categories and attributes — no structural change needed beyond ordering (media below the description/title rather than above the post title).
- `src/routes/index.tsx`: replace the 3-column summary cards with sections mirroring the Services layout (description, posts, attributes, category tags, `MediaSlider`).
