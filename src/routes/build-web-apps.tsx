import { createFileRoute, redirect } from "@tanstack/react-router";

// The builder now lives inside the dashboard; keep the old URL working.
export const Route = createFileRoute("/build-web-apps")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard", search: { tab: "build" } });
  },
});
