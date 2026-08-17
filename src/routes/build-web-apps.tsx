import { createFileRoute, redirect } from "@tanstack/react-router";
import { overviewFn } from "@/lib/dreamoz.functions";
import { SiteLayout } from "@/components/SiteLayout";
import type { SiteOverview } from "@/lib/dreamoz.types";
import { me, type CurrentUser } from "@/lib/auth.functions";
import { WebAppsPanel } from "@/components/WebAppsPanel";

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
  head: () => ({
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

function BuildWebAppsPage() {
  const { overview, user } = Route.useLoaderData() as {
    overview: SiteOverview;
    user: CurrentUser;
  };

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
            Capture the web apps you are building — title, description, contact email
            and link. Signed in as {user.name}.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-14">
        <WebAppsPanel isAdmin={user.role === "admin"} />
      </section>
    </SiteLayout>
  );
}
