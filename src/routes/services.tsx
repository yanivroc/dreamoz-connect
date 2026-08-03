import { createFileRoute } from "@tanstack/react-router";
import { overviewFn } from "@/lib/dreamoz.functions";
import { SiteLayout } from "@/components/SiteLayout";
import type { SiteOverview } from "@/lib/dreamoz.types";

export const Route = createFileRoute("/services")({
  loader: () => overviewFn(),
  head: ({ loaderData }) => ({
    meta: [
      { title: "Services — DreamozTech Software Development" },
      {
        name: "description",
        content:
          "Custom software builds, web platforms, brand and digital growth services delivered by DreamozTech.",
      },
      { property: "og:title", content: "DreamozTech Services" },
      {
        property: "og:description",
        content: "Software engineering, web platforms and growth services.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...(loaderData?.member?.metaKey
        ? [{ name: "keywords", content: loaderData.member.metaKey.replace(/\s+/g, " ").trim() }]
        : []),
    ],
  }),
  component: Services,
});

function Services() {
  const { member, services } = Route.useLoaderData() as SiteOverview;

  return (
    <SiteLayout member={member}>
      <section className="hero-surface border-b border-border/60">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h1 className="text-4xl font-bold md:text-5xl">Services</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            {member.metaDesc}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-6 md:grid-cols-2">
          {services.map((s) => (
            <article
              key={s.slug + s.title}
              className="rounded-xl border border-border/70 bg-surface p-7 shadow-card"
            >
              <h2 className="text-xl font-semibold">{s.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {s.excerpt}
              </p>
            </article>
          ))}
        </div>
        {member.description ? (
          <div
            className="prose-api mt-16 max-w-3xl"
            dangerouslySetInnerHTML={{ __html: member.description }}
          />
        ) : null}
      </section>
    </SiteLayout>
  );
}
