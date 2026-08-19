import { createFileRoute } from "@tanstack/react-router";
import { overviewFn } from "@/lib/dreamoz.functions";
import { SiteLayout } from "@/components/SiteLayout";
import type { SiteOverview } from "@/lib/dreamoz.types";
import { SignUpForm } from "@/components/SignUpForm";

export const Route = createFileRoute("/signup")({
  loader: () => overviewFn(),
  head: ({ loaderData }) => {
    const brand = loaderData?.member?.memberFullName?.trim() || "DreamozTech";
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
      links: loaderData?.favicon ? [{ rel: "icon", href: loaderData.favicon }] : [],
    };
  },
  component: SignUpPage,
});

function SignUpPage() {
  const { member, logo, favicon } = Route.useLoaderData() as SiteOverview;

  return (
    <SiteLayout member={member} logo={logo} favicon={favicon}>
      <section className="hero-surface border-b border-border/60">
        <div className="mx-auto w-full max-w-7xl px-5 py-14">
          <h1 className="text-4xl font-bold md:text-5xl">Create your account</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Sign up to get started. It only takes a moment — we&apos;ll send a welcome
            email once your account is ready.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-14">
        <div className="max-w-2xl rounded-2xl border border-border/60 bg-surface/40 p-6 shadow-card md:p-8">
          <SignUpForm />
        </div>
      </section>
    </SiteLayout>
  );
}
