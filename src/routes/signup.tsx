import { createFileRoute } from "@tanstack/react-router";
import { siteContentQuery } from "@/lib/content-query";
import { SignUpForm } from "@/components/SignUpForm";
import { getPublicPlanOffer } from "@/lib/billing.functions";
import {
  formatPlanPrice,
  planInterval,
  planTier,
  TIER_FEATURES,
  TIER_LABEL,
  type PlanSetting,
  type PlanTier,
} from "@/lib/plans";


export const Route = createFileRoute("/signup")({
  loader: async ({ context }) => {
    const [result, offer] = await Promise.all([
      context.queryClient.ensureQueryData(siteContentQuery),
      getPublicPlanOffer(),
    ]);
    return { brand: result.content.webApp.title?.trim() || "DreamozTech", offer };
  },
  head: ({ loaderData }) => {
    const brand = loaderData?.brand || "DreamozTech";
    const title = `Sign Up | ${brand}`;
    const description = `Create your ${brand} account to get started with our software development, web platform and growth services.`;
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
  component: SignUpPage,
});

function SignUpPage() {
  const { offer } = Route.useLoaderData();

  return (
    <>
      <section className="hero-surface border-b border-border/60">
        <div className="mx-auto w-full max-w-7xl px-5 py-14">
          <h1 className="text-4xl font-bold md:text-5xl">Create your account</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Start your {offer.trialDays}-day free trial. No card is required to create
            your account.
          </p>
          <p className="mt-6 text-sm font-semibold text-primary">
            {offer.trialDays}-day free trial
          </p>
          <h2 className="mt-1 text-2xl font-semibold md:text-3xl">
            Everything included, free for {offer.trialDays} days
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Your trial includes every feature, API access as well. Pick a plan only when it ends.
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {offer.commissionPercent > 0
              ? `Selling products? A ${offer.commissionPercent}% platform commission applies to each sale, and your net earnings are paid out to your Australian bank account.`
              : "Selling products? No platform commission applies at the moment — your full sale earnings are paid out to your Australian bank account."}
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-14 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)] lg:items-start">
        <div className="rounded-2xl border border-border/60 bg-surface/40 p-6 shadow-card md:p-8">
          <SignUpForm />
        </div>
        <aside className="lg:sticky lg:top-24">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {(["base", "pro"] as const).map((tier) => (
              <TierCard key={tier} tier={tier} plans={offer.plans} />
            ))}
          </div>
        </aside>
      </section>
    </>
  );
}

function TierCard({ tier, plans }: { tier: PlanTier; plans: PlanSetting[] }) {
  const monthly = plans.find((p) => planTier(p.id) === tier && planInterval(p.id) === "monthly");
  const annual = plans.find((p) => planTier(p.id) === tier && planInterval(p.id) === "annual");
  if (!monthly && !annual) return null;
  return (
    <div className="rounded-xl border border-border/60 bg-surface/40 p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">{TIER_LABEL[tier]}</h3>
        {tier === "pro" && (
          <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary">
            API included
          </span>
        )}
      </div>
      {monthly && (
        <p className="mt-3 text-2xl font-bold">
          {formatPlanPrice(monthly.amountCents, monthly.currency)}
          <span className="ml-1 text-sm font-normal text-muted-foreground">per month</span>
        </p>
      )}
      {annual && (
        <p className="mt-1 text-sm text-muted-foreground">
          or {formatPlanPrice(annual.amountCents, annual.currency)} per year — 2 months free
        </p>
      )}
      <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
        {TIER_FEATURES[tier].map((f) => (
          <li key={f}>• {f}</li>
        ))}
      </ul>
    </div>
  );
}
