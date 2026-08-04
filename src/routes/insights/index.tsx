import { createFileRoute } from "@tanstack/react-router";
import { overviewFn } from "@/lib/dreamoz.functions";
import { SiteLayout } from "@/components/SiteLayout";
import type { SiteOverview } from "@/lib/dreamoz.types";
import { PostCard } from "@/components/PostCard";

export const Route = createFileRoute("/insights/")({
  loader: () => overviewFn(),
  head: ({ loaderData }) => ({
    meta: [
      { title: "Insights — DreamozTech Engineering Blog" },
      {
        name: "description",
        content:
          "Articles on AI tooling, web engineering, data platforms and digital growth from the DreamozTech team.",
      },
      { property: "og:title", content: "DreamozTech Insights" },
      {
        property: "og:description",
        content: "Engineering and growth articles from DreamozTech.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...(loaderData?.member?.metaKey
        ? [{ name: "keywords", content: loaderData.member.metaKey.replace(/\s+/g, " ").trim() }]
        : []),
    ],
  }),
  component: Insights,
});

function Insights() {
  const { member, articles, logo, favicon } =
    Route.useLoaderData() as SiteOverview;

  return (
    <SiteLayout member={member} logo={logo} favicon={favicon}>
      <section className="hero-surface border-b border-border/60">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h1 className="text-4xl font-bold md:text-5xl">Insights</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Notes from the build: AI tooling, platform engineering and growth.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {articles.map((a) => (
            <PostCard key={a.slug} item={a} />
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
