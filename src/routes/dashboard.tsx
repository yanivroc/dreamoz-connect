import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { overviewFn } from "@/lib/dreamoz.functions";
import { SiteLayout } from "@/components/SiteLayout";
import type { SiteOverview } from "@/lib/dreamoz.types";
import { me, type CurrentUser } from "@/lib/auth.functions";
import { AdminUsersPanel } from "@/components/AdminUsersPanel";

export const Route = createFileRoute("/dashboard")({
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
      { title: "Dashboard | DreamozTech" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Your DreamozTech account dashboard." },
      { property: "og:title", content: "Dashboard | DreamozTech" },
      { property: "og:description", content: "Your DreamozTech account dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
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
          <h1 className="text-4xl font-bold md:text-5xl">Dashboard</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Signed in as {user.name} ({user.role}).
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl space-y-10 px-5 py-14">
        <div className="max-w-xl rounded-2xl border border-border/60 bg-surface/40 p-6 shadow-card">
          <h2 className="text-xl font-semibold">Your profile</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Name</dt>
              <dd>{user.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Role</dt>
              <dd>{user.role}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Member since</dt>
              <dd>{user.createdAt ? user.createdAt.slice(0, 10) : "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="max-w-xl rounded-2xl border border-border/60 bg-surface/40 p-6 shadow-card">
          <h2 className="text-xl font-semibold">Build Web Apps</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create web apps, build their pages and sub pages, and manage logo,
            favicon and shipping settings.
          </p>
          <Link
            to="/build-web-apps"
            className="mt-4 inline-block rounded-full bg-gradient-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90"
          >
            Open builder
          </Link>
        </div>

        {user.role === "admin" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Users</h2>
            <AdminUsersPanel currentUserId={user.id} />
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
