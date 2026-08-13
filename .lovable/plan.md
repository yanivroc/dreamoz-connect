# Clickable slider images + captions + post titles

## What changes

1. Each slider image becomes clickable when the API provides a link for that picture (`picUrl`), opening the target in a new tab. Images without a link stay non-clickable.
2. The picture description (`picDescription`) is shown as a caption bar directly above the image inside the slider, so it reads as a label for what's on screen. Hidden when empty.
3. Post titles keep using `bizCustomTitle` (falling back to the post name) and body content uses `bizDesc` — confirmed already the case; the same mapping stays applied to every post rendered under the web-page sections and on the post detail page, so behaviour is consistent everywhere.

Applies to all sliders: home page sections (Brand, Testimonial, Services, etc.) and the `/post/{slug}` detail page, since they share one slider component.

## Technical notes

- `src/lib/dreamoz.types.ts`: add `url: string | null` to `MediaImage`.
- `src/lib/dreamoz.server.ts`: in `toCard` (and the page/post detail mappers that build images), map `url: p.picUrl?.trim() || null`.
- `src/components/MediaSlider.tsx`:
  - render a caption strip above the media frame using `current.caption` (image slides only).
  - wrap the `<img>` in an `<a href={url} target="_blank" rel="noreferrer">` when `url` exists, with a subtle hover cue; otherwise render the plain image.
  - videos and the thumbnail rail are unchanged.
