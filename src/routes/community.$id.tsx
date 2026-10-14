import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getCommunityPage } from "@/lib/community.functions";
import { formatMoney } from "@/lib/content-types";
import { parseEmbedCode } from "@/lib/embed-code";
import { RichText } from "@/components/site/RichText";
import { AddToCartPanel } from "@/components/site/AddToCartPanel";
import { PageContactForm } from "@/components/site/PageContactForm";


const pageQuery = (id: string) =>
  queryOptions({
    queryKey: ["community-page", id],
    queryFn: () => getCommunityPage({ data: { id } }),
  });

export const Route = createFileRoute("/community/$id")({
  loader: async ({ context, params }) => {
    const id = communityIdFromParam(params.id);
    const page = await context.queryClient.ensureQueryData(pageQuery(id));
    if (page) {
      const canonical = communitySlug(page.id, page.title);
      if (params.id !== canonical) {
        throw redirect({ to: "/community/$id", params: { id: canonical }, statusCode: 301 });
      }
    }
    return {
      found: !!page,
      title: page?.title ?? "Community",
      description: page?.seoDescription || plainExcerpt(page?.description ?? ""),
      keywords: page?.keywords ?? "",
      image: page?.images[0]?.url ?? "",
      path: page ? `/community/${communitySlug(page.id, page.title)}` : "/community",
      isProduct: !!page?.isProduct && page?.price != null,
      price: page?.price ?? null,
      currency: page?.currency ?? "AUD",
      seller: page ? page.ownerName || page.appTitle : "",
      parent:
        page?.parentId != null && page.parentTitle
          ? { name: page.parentTitle, path: `/community/${communitySlug(page.parentId, page.parentTitle)}` }
          : null,
    };
  },
  head: ({ loaderData: d }) => {
    const title = d?.found ? `${d.title} — Community | DreamozTech` : "Community | DreamozTech";
    const description = d?.description || "A page shared by a DreamozTech member in the community.";
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: d?.isProduct ? "product" : "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ];
    if (!d?.found) meta.push({ name: "robots", content: "noindex" });
    if (d?.path) meta.push({ property: "og:url", content: d.path });
    if (d?.keywords) meta.push({ name: "keywords", content: d.keywords.replace(/\s*\n\s*/g, ", ") });
    if (d?.image && /^https?:\/\//.test(d.image)) {
      meta.push({ property: "og:image", content: d.image }, { name: "twitter:image", content: d.image });
    }
    const crumbs = [
      { name: "Community", path: "/community" },
      ...(d?.parent ? [d.parent] : []),
      ...(d?.found ? [{ name: d.title, path: d.path }] : []),
    ];
    const ld: object[] = [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.path })),
      },
    ];
    if (d?.found) {
      ld.push(
        d.isProduct
          ? {
              "@context": "https://schema.org",
              "@type": "Product",
              name: d.title,
              description,
              ...(d.image ? { image: d.image } : {}),
              offers: { "@type": "Offer", price: d.price, priceCurrency: d.currency, availability: "https://schema.org/InStock", seller: { "@type": "Organization", name: d.seller } },
            }
          : {
              "@context": "https://schema.org",
              "@type": "Article",
              headline: d.title,
              description,
              ...(d.image ? { image: d.image } : {}),
              author: { "@type": "Person", name: d.seller },
            },
      );
    }
    return {
      meta,
      links: d?.path ? [{ rel: "canonical", href: d.path }] : [],
      scripts: ld.map((x) => ({ type: "application/ld+json", children: JSON.stringify(x) })),
    };
  },
  component: CommunityDetail,
});

function CommunityDetail() {
  const { id: param } = Route.useParams();
  const id = communityIdFromParam(param);
  const { data: page } = useSuspenseQuery(pageQuery(id));

  if (!page) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-3xl font-bold text-foreground">Not available</h1>
        <p className="mt-3 text-muted-foreground">
          This page is no longer shared in the community.
        </p>
        <Link to="/community" className="mt-6 inline-block text-primary underline">
          Back to Community
        </Link>
      </div>
    );
  }

  const embed = parseEmbedCode(page.embedCode ?? "");
  const cover = page.images[0];

  return (
    <article className="mx-auto max-w-5xl px-6 py-16">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link to="/community" className="hover:text-primary">
          Community
        </Link>
        {page.parentTitle ? (
          <>
            <span className="mx-2">/</span>
            {page.parentId != null ? (
              <Link
                to="/community/$id"
                params={{ id: String(page.parentId) }}
                className="hover:text-primary"
              >
                {page.parentTitle}
              </Link>
            ) : (
              <span>{page.parentTitle}</span>
            )}
          </>
        ) : null}
        <span className="mx-2">/</span>
        <span className="text-foreground">{page.title}</span>
      </nav>

      <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{page.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Shared by {page.ownerName || page.appTitle}
      </p>

      <div className="mt-6 after:block after:clear-both after:content-['']">
        {cover ? (
          <div className="mt-2 w-full md:float-right md:mb-4 md:ml-8 md:w-1/2 lg:w-[46%]">
            <img
              src={cover.url}
              alt={cover.alt || page.title}
              className="w-full rounded-xl border border-border object-contain"
            />
          </div>
        ) : null}

        {page.isProduct && page.price != null ? (
          <>
            <p className="text-2xl font-bold text-primary">
              {formatMoney(page.price, page.currency)}
            </p>
            <AddToCartPanel
              className="mt-4"
              item={{
                id: page.id,
                title: page.title,
                slug: page.title,
                price: page.price,
                ...(cover ? { image: cover.url } : {}),
                shippingPrice: page.shippingPrice ?? 0,
                minQty: page.minQty,
                maxQty: page.maxQty,
                appId: page.appId,
                sellerName: page.ownerName || page.appTitle,
              }}
            />
          </>
        ) : null}


        <RichText html={page.description} className="home-copy mt-4" />

        {embed ? (
          <div className="mt-6 aspect-video overflow-hidden rounded-xl border border-border">
            <iframe
              src={embed.src}
              title={embed.title || `${page.title} embedded content`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
              allowFullScreen
            />
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          {page.internalSlug ? (
            <Link
              to="/page/$slug"
              params={{ slug: page.internalSlug }}
              className="rounded-full bg-gradient-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90"
            >
              {page.isProduct ? "Buy this" : "Open full page"}
            </Link>
          ) : null}
          {page.hyperlink ? (
            <a
              href={page.hyperlink}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition hover:bg-card"
            >
              Visit link
            </a>
          ) : null}
        </div>
      </div>

      {page.images.length > 1 ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {page.images.slice(1).map((img) => (
            <img
              key={img.id}
              src={img.url}
              alt={img.alt || page.title}
              loading="lazy"
              className="w-full rounded-xl border border-border object-cover"
            />
          ))}
        </div>
      ) : null}

      {page.contactEnabled ? <PageContactForm pageId={page.id} /> : null}

      {page.children.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-foreground">Inside this collection</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {page.children.map((child) => (
              <Link
                key={child.id}
                to="/community/$id"
                params={{ id: String(child.id) }}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/60"
              >
                {child.imageUrl ? (
                  <img
                    src={child.imageUrl}
                    alt={child.title}
                    loading="lazy"
                    className="h-44 w-full object-cover"
                  />
                ) : null}
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <h3 className="font-semibold text-foreground group-hover:text-primary">
                    {child.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{child.excerpt}</p>
                  {child.isProduct && child.price != null ? (
                    <span className="mt-auto text-sm font-semibold text-primary">
                      {formatMoney(child.price, page.currency)}
                    </span>
                  ) : null}
                  <span className="text-xs font-medium text-primary">
                    {child.isProduct ? "View product →" : "Open →"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
