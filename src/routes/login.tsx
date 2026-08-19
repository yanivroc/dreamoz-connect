import { createFileRoute } from "@tanstack/react-router";
import { overviewFn } from "@/lib/dreamoz.functions";
import { SiteLayout } from "@/components/SiteLayout";
import type { SiteOverview } from "@/lib/dreamoz.types";
import { LoginForm } from "@/components/LoginForm";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const r = search["redirect"];
    return typeof r === "string" ? { redirect: r } : {};
  },
  loader: () => overviewFn(),
  head: ({ loaderData }) => {
    const brand = loaderData?.member?.memberFullName?.trim() || "DreamozTech";
    const title = `Login | ${brand}`;
    const description = `Sign in to your ${brand} account to access your dashboard.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: loaderData?.favicon ? [{ rel: "icon", href: loaderData.favicon }] : [],
    };
  },
  component: LoginPage,
});

function LoginPage() {
  const { member, logo, favicon } = Route.useLoaderData() as SiteOverview;
  const { redirect } = Route.useSearch();

  return (
    <SiteLayout member={member} logo={logo} favicon={favicon}>
      <section className="hero-surface border-b border-border/60">
        <div className="mx-auto w-full max-w-7xl px-5 py-14">
          <h1 className="text-4xl font-bold md:text-5xl">Sign in</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Welcome back — sign in to reach your dashboard.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-14">
        <div className="max-w-lg rounded-2xl border border-border/60 bg-surface/40 p-6 shadow-card md:p-8">
          <LoginForm redirectTo={redirect} />
        </div>
      </section>
    </SiteLayout>
  );
}
