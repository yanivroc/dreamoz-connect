import { createFileRoute, Link } from "@tanstack/react-router";
import { siteContentQuery } from "@/lib/content-query";
import { LoginForm } from "@/components/LoginForm";
import { getPublicPlanOffer } from "@/lib/billing.functions";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const r = search["redirect"];
    return typeof r === "string" ? { redirect: r } : {};
  },
  loader: async ({ context }) => {
    const [result, offer] = await Promise.all([
      context.queryClient.ensureQueryData(siteContentQuery),
      getPublicPlanOffer(),
    ]);
    return {
      brand: result.content.webApp.title?.trim() || "DreamozTech",
      trialDays: offer.trialDays,
    };
  },
  head: ({ loaderData }) => {
    const brand = loaderData?.brand || "DreamozTech";
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
    };
  },
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  const { brand, trialDays } = Route.useLoaderData();

  const highlights = [
    { t: `${trialDays}-day full-access trial`, d: "Every feature and the API from day one." },
    { t: "No credit card required", d: "Choose a plan only when your trial ends." },
    { t: "API & marketplace tools", d: "Pages, storefront, Community and payouts." },
  ];

  return (
    <>
      <section className="hero-surface border-b border-border/60">
        <div className="mx-auto w-full max-w-7xl px-5 py-14">
          <h1 className="text-4xl font-bold md:text-5xl">Sign in</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Welcome back — sign in to reach your dashboard.
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-start">
        <div className="rounded-2xl border border-border/60 bg-surface/40 p-6 shadow-card md:p-8">
          <LoginForm redirectTo={redirect} />
        </div>

        <aside className="rounded-2xl border border-primary/30 bg-primary/5 p-6 shadow-card md:p-8 lg:sticky lg:top-24">
          <h2 className="text-2xl font-bold">New to {brand}?</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Create an account in minutes and start building straight away.
          </p>
          <ul className="mt-6 grid gap-4">
            {highlights.map((h) => (
              <li key={h.t}>
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
                  {h.t}
                </p>
                <p className="mt-1 pl-4 text-xs leading-5 text-muted-foreground">{h.d}</p>
              </li>
            ))}
          </ul>
          <Link
            to="/signup"
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Create an account
          </Link>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Need help?{" "}
            <Link to="/contact" className="text-primary hover:underline">
              Contact support
            </Link>
          </p>
        </aside>
      </section>
    </>
  );
}
