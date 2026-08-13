# Blog posts: also filter by bizPublic

## Current state

Posts shown inside the web-page sections (Home, Brand, Blog, etc.) are filtered on `bizEnable === true` only — `bizPublic` is not checked there (`src/lib/dreamoz.server.ts`, line 215). The `bizPublic` check exists only for the separate insights/articles feed.

Brand posts were deliberately kept visible even when not public, so the fix should be scoped rather than global.

## Change

In the section builder, require both `bizEnable === true` and `bizPublic === true` for posts under the **Blog** page. Other pages keep the current `bizEnable`-only rule so Brand and similar sections are unaffected.

## Technical note

`src/lib/dreamoz.server.ts` → `servicePages()`: when the page title is `blog`, apply the stricter filter (reuse the existing `isPublicPost` helper); otherwise keep `bizEnable === true`.
