import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { overviewFn } from "@/lib/dreamoz.functions";
import { SiteLayout } from "@/components/SiteLayout";
import type { SiteOverview } from "@/lib/dreamoz.types";
import { me, type CurrentUser } from "@/lib/auth.functions";
import { WebAppsPanel } from "@/components/WebAppsPanel";
import { WebPagesPanel } from "@/components/WebPagesPanel";
import { AppSettingsPanel } from "@/components/AppSettingsPanel";
import { ApiPanel } from "@/components/ApiPanel";
import { listWebApps, type WebApp } from "@/lib/webapps.functions";

export const Route = createFileRoute("/build-web-apps")({
  beforeLoad: async ({ location }) => {
    const user = await me();
    if (!user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    return { user };
  },
  loader: async ({ context }) => {
    const overview = await overviewFn();
    return { overview, user: (context as { user: CurrentUser }).user };
  },
  head: ({ loaderData }) => ({
    links: loaderData?.overview?.favicon
      ? [{ rel: "icon", href: loaderData.overview.favicon }]
      : [],
    meta: [
      { title: "Build Web Apps | DreamozTech" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content: "Create and manage your DreamozTech web app projects.",
      },
      { property: "og:title", content: "Build Web Apps | DreamozTech" },
      {
        property: "og:description",
        content: "Create and manage your DreamozTech web app projects.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BuildWebAppsPage,
});

type Tab = "apps" | "pages" | "settings" | "api";

const tabs: { id: Tab; label: string }[] = [
  { id: "apps", label: "Web apps" },
  { id: "pages", label: "Build web pages" },
  { id: "settings", label: "General settings" },
  { id: "api", label: "API" },
];

function BuildWebAppsPage() {
  const { overview, user } = Route.useLoaderData() as {
    overview: SiteOverview;
    user: CurrentUser;
  };

  const [tab, setTab] = useState<Tab>("apps");
  const [appId, setAppId] = useState<number | null>(null);

  const fetchApps = useServerFn(listWebApps);
  const { data: apps } = useQuery<WebApp[]>({
    queryKey: ["web-apps"],
    queryFn: () => fetchApps(),
  });

  const list = apps ?? [];
  const selected = appId ?? list[0]?.id ?? null;

  return (
    <SiteLayout
      member={overview.member}
      logo={overview.logo}
      favicon={overview.favicon}
    >
      <section className="hero-surface border-b border-border/60">
        <div className="mx-auto w-full max-w-7xl px-5 py-14">
          <h1 className="text-4xl font-bold md:text-5xl">Build Web Apps</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Create web apps, build their pages and manage branding. Signed in as{" "}
            {user.name}.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl space-y-8 px-5 py-14">
        <div className="flex flex-wrap gap-2 border-b border-border/60 pb-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-2 text-sm transition ${
                tab === t.id
                  ? "bg-primary/15 font-semibold text-primary"
                  : "text-muted-foreground hover:bg-surface/60"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab !== "apps" && (
          <label className="block max-w-sm space-y-1.5 text-sm">
            <span className="text-muted-foreground">Web app</span>
            <select
              className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
              value={selected ?? ""}
              onChange={(e) => setAppId(Number(e.target.value))}
            >
              {list.length === 0 && <option value="">No web apps yet</option>}
              {list.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.title}
                </option>
              ))}
            </select>
          </label>
        )}

        {tab === "apps" && <WebAppsPanel isAdmin={user.role === "admin"} />}

        {tab !== "apps" && selected === null && (
          <p className="text-sm text-muted-foreground">
            Create a web app first on the “Web apps” tab.
          </p>
        )}

        {tab === "pages" && selected !== null && <WebPagesPanel appId={selected} />}
        {tab === "settings" && selected !== null && (
          <AppSettingsPanel appId={selected} />
        )}
        {tab === "api" && selected !== null && <ApiPanel appId={selected} />}
      </section>
    </SiteLayout>
  );
}
