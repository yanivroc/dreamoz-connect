# Match Root and Child Page Typography to Home

## Goal
Apply the same polished font hierarchy and rich-text styling used for API content on the Home page to every root and child page.

## Current finding
Home descriptions use the `home-copy` typography treatment, including consistent body font, heading sizes, spacing, colors, lists, and left alignment. The shared root/child detail page renders the same API content without that treatment, so its text can inherit inconsistent formatting from saved rich text.

## Changes
- Apply the existing Home typography treatment to descriptions on the shared page-detail view, covering both root and child pages.
- Preserve the current product price, image gallery, video, cart, breadcrumb, page link, and child-page sections.
- Keep the detail page’s wider reading layout while matching Home’s font family, heading hierarchy, paragraph rhythm, list styling, links, and text colors.
- Check floated-image and non-floated layouts so typography remains consistent in both paths.

## Verification
- Compare a root page and a child page against the Home page on desktop and mobile.
- Confirm rich-text headings, paragraphs, lists, links, images, and product content remain readable and aligned.
- Confirm there are no browser errors or layout overlaps.

## Technical details
- Reuse the existing `home-copy` utility rather than creating a second typography system.
- Update both `RichText` render branches in the shared `/page/$slug` page.
