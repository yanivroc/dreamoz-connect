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
  const { member, servicePages, logo, favicon } =
    Route.useLoaderData() as SiteOverview;

  return (
    <SiteLayout member={member} logo={logo} favicon={favicon}>
      <section className="hero-surface border-b border-border/60">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h1 className="text-4xl font-bold md:text-5xl">Services</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            {member.metaDesc}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-16 px-5 py-16">
        {servicePages.map((page, i) => (
          <div key={`${page.title}-${i}`}>
            <h2 className="text-2xl font-bold">{page.title}</h2>
            {page.html ? (
              <div
                className="prose-api mt-4 max-w-3xl"
                dangerouslySetInnerHTML={{ __html: page.html }}
              />
            ) : null}
            {page.posts.length > 0 && (
              <div className="mt-8 grid gap-6 md:grid-cols-2">
                {page.posts.map((s) => (
                  <article
                    key={`${page.title}-${i}-${s.slug}-${s.title}`}
                    className="rounded-xl border border-border/70 bg-surface p-7 shadow-card"
                  >
                    <h3 className="text-lg font-semibold">{s.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {s.excerpt}
                    </p>
                    {s.link ? (
                      <a
                        href={s.link}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline"
                      >
                        Learn more ↗
                      </a>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>

    </SiteLayout>
  );
}
