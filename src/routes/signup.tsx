import { createFileRoute } from "@tanstack/react-router";
import { siteContentQuery } from "@/lib/content-query";
import { SignUpForm } from "@/components/SignUpForm";
import { getPublicPlanOffer } from "@/lib/billing.functions";
import { formatPlanPrice, type PlanSetting } from "@/lib/plans";

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
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-14 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)] lg:items-start">
        <div className="rounded-2xl border border-border/60 bg-surface/40 p-6 shadow-card md:p-8">
          <SignUpForm />
        </div>
        <aside className="space-y-5 lg:sticky lg:top-24">
          <div>
            <p className="text-sm font-semibold text-primary">{offer.trialDays}-day free trial</p>
            <h2 className="mt-1 text-2xl font-semibold">Choose after your trial</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Create your account now. Pick a plan only when your free trial ends.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {offer.plans.map((plan) => <PlanSummary key={plan.id} plan={plan} />)}
          </div>
        </aside>
      </section>
    </>
  );
}

function PlanSummary({ plan }: { plan: PlanSetting }) {
  const period = plan.days >= 365 ? "per year" : plan.days >= 28 && plan.days <= 31 ? "per month" : `for ${plan.days} days`;
  return (
    <div className="rounded-xl border border-border/60 bg-surface/40 p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-semibold">{plan.label}</h3>
        <span className="rounded-full border border-border/70 px-2.5 py-1 text-xs text-muted-foreground">
          {plan.days} days
        </span>
      </div>
      <p className="mt-4 text-2xl font-bold">{formatPlanPrice(plan.amountCents, plan.currency)}</p>
      <p className="mt-1 text-sm text-muted-foreground">{period}</p>
    </div>
  );
}
