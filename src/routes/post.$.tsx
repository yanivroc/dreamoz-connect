import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy blog URLs from the old site: permanently redirect to Community (SEO-friendly 301).
export const Route = createFileRoute("/post/$")({
  beforeLoad: () => {
    throw redirect({ to: "/community", statusCode: 301 });
  },
});
