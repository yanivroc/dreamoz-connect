import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { me, type CurrentUser } from "@/lib/auth.functions";
import { AdminUsersPanel } from "@/components/AdminUsersPanel";
import { PlanPanel } from "@/components/PlanPanel";
import { PlanSettingsPanel } from "@/components/PlanSettingsPanel";

const tabIds = ["overview", "plan", "plan-settings", "users"] as const;
type Tab = (typeof tabIds)[number];

export const Route = createFileRoute("/dashboard")({
  validateSearch: (search: Record<string, unknown>) =>
    z.object({ tab: z.enum(tabIds).optional() }).parse({
      tab: tabIds.includes(search["tab"] as Tab) ? search["tab"] : undefined,
    }),
  beforeLoad: async ({ location }) => {
    const user = await me();
    if (!user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    return { user };
  },
  loader: async ({ context }) => ({ user: (context as { user: CurrentUser }).user }),
  head: () => ({
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
  const { user } = Route.useLoaderData() as { user: CurrentUser };
  const search = Route.useSearch();
  const navigate = useNavigate();
  const isAdmin = user.role === "admin";
  const expired = user.access.state === "expired";

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "plan", label: "Plan" },
    ...(isAdmin
      ? ([
          { id: "plan-settings", label: "Plan settings" },
          { id: "users", label: "Users" },
        ] as { id: Tab; label: string }[])
      : []),
  ];
  const requested = search.tab ?? (expired ? "plan" : "overview");
  const tab: Tab = tabs.some((t) => t.id === requested) ? requested : "overview";

  return (
    <>
      <section className="hero-surface border-b border-border/60">
        <div className="mx-auto w-full max-w-7xl px-5 py-14">
          <h1 className="text-4xl font-bold md:text-5xl">Dashboard</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Signed in as {user.name} ({user.role}).
            {user.access.state === "trial" &&
              ` Free trial: ${user.access.daysLeft} day${user.access.daysLeft === 1 ? "" : "s"} left.`}
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl space-y-10 px-5 py-14">
        <div className="flex flex-wrap gap-2 border-b border-border/60 pb-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => navigate({ to: "/dashboard", search: { tab: t.id } })}
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

        {tab === "overview" && (
          <>
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
              {expired ? (
                <Link
                  to="/dashboard"
                  search={{ tab: "plan" }}
                  className="mt-4 inline-block rounded-full bg-gradient-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90"
                >
                  Choose a plan to continue
                </Link>
              ) : (
                <Link
                  to="/build-web-apps"
                  className="mt-4 inline-block rounded-full bg-gradient-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90"
                >
                  Open builder
                </Link>
              )}
            </div>
          </>
        )}

        {tab === "plan" && <PlanPanel user={user} />}
        {tab === "plan-settings" && isAdmin && <PlanSettingsPanel />}
        {tab === "users" && isAdmin && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Users</h2>
            <AdminUsersPanel currentUserId={user.id} />
          </div>
        )}
      </section>
    </>
  );
}
