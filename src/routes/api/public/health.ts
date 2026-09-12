import { createFileRoute } from "@tanstack/react-router";

// Public configuration check: reports which required environment variables are
// missing (names only, never values) so deployments can be verified without
// digging through function logs.
const REQUIRED_VARS = [
  "DREAMOZ_API_KEY",
  "DREAMOZ_API_SECRET",
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
  "SESSION_SECRET",
] as const;

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const missing = REQUIRED_VARS.filter((name) => !process.env[name]?.trim());
        return Response.json(
          { ok: missing.length === 0, missing },
          { status: missing.length === 0 ? 200 : 503 },
        );
      },
    },
  },
});
