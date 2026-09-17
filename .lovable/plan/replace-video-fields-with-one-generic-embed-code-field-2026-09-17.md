# Replace video fields with one generic embed-code field

## Page editor

- Remove the **Video link** box from Add/Edit web page.
- Rename **Video embed code** to **Embed code** and keep it as a multi-line box with the existing 4,000-character limit.
- Add a neutral example indicating that users can paste an iframe embed from services such as Google Maps, YouTube, or Vimeo.

## Safe embed handling

- Accept one HTTPS iframe embed only; reject scripts, objects, event handlers, unsafe URLs, and unrelated HTML on the server.
- Render the validated iframe through React rather than injecting arbitrary HTML.
- Use a generic accessible title and retain fullscreen/media permissions needed by common map and video embeds.

## Consistent saved data and API

- Rename the database column from `video_embed` to `embed_code`, preserving existing embed values.
- Remove the obsolete `video_url` column and its saved values.
- Rename the application field from `videoEmbed` to `embedCode` throughout page editing, content loading, page display, and shared types.
- Update both public web-app API implementations and the API documentation to return only `embedCode`; remove `videoUrl` and `videoEmbed` as requested.

## Verification

- Confirm an iframe pasted in Add a web page saves, reloads, edits, and displays correctly.
- Confirm unsafe or malformed embed HTML is rejected with a clear notification.
- Confirm existing saved embed content survives the database rename and the public API exposes the new field only.
- Check the page editor and rendered page at desktop and mobile sizes.
