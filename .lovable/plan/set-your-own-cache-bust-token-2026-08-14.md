# Set your own cache-bust token

## Goal
Replace the hidden auto-generated `CACHE_BUST_TOKEN` with a value you choose, so you can actually use the cache refresh link.

## Steps
1. Pick a strong random value yourself — e.g. run `openssl rand -hex 24`, or use a password manager. Keep a copy.
2. I open the secure secret form for `CACHE_BUST_TOKEN`; you paste that value in. The value goes straight to the encrypted store — it never passes through chat.
3. You add the exact same name/value to Vercel: Project Settings, Environment Variables, then redeploy.
4. Refresh the cache any time with:
   `https://your-domain/api/public/cache-bust?token=<your value>`
   Wrong or missing token returns 401.

## Notes
- The token stays the same until you rotate it; rotating means repeating steps 1-3.
- No code changes are needed — `/api/public/cache-bust` already reads `CACHE_BUST_TOKEN` at request time.
