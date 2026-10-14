import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { siteContentQuery } from "@/lib/content-query";
import {
  findPageBySlug,
  findParent,
  formatMoney,
  isProductPage,
  siteCurrency,
  siteWeightUnit,
  slugify,
  sortPages,
  sortImages,
  plainExcerpt,
} from "@/lib/content-types";
import { RichText } from "@/components/site/RichText";
import { PageMedia, PageEmbed } from "@/components/site/PageMedia";
import { PageCardGrid } from "@/components/site/PageCardGrid";
import { AddToCartPanel } from "@/components/site/AddToCartPanel";
import { cartItemFromPage } from "@/lib/cart";

import { PageContactForm } from "@/components/site/PageContactForm";

export const Route = createFileRoute("/page/$slug")({
  loader: async ({ context, params }) => {
    const result = await context.queryClient.ensureQueryData(siteContentQuery);
    const content = result.content;
    const page = findPageBySlug(content.pages, params.slug);
    const parent = page ? findParent(content.pages, page) : undefined;
    const img = page ? sortImages(page.images ?? [])[0]?.url ?? "" : "";
    return {
      found: !!page,
      title: page?.title ?? "Page",
      description:
        page?.seoDescription || plainExcerpt(page?.description ?? "") || content.webApp.description || "",
      keywords: page?.keywords ?? "",
      image: img,
      path: `/page/${params.slug}`,
      product: page && isProductPage(page) ? { price: page.product.price, currency: siteCurrency(content) } : null,
      parent: parent ? { name: parent.title, path: `/page/${slugify(parent.title)}` } : null,
    };
  },
  head: ({ loaderData: d }) => {
    const title = d?.found ? `${d.title} — DreamozTech` : "Page not found — DreamozTech";
    const description = d?.description || "Digital innovation, web apps and growth by DreamozTech.";
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: d?.product ? "product" : "article" },
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
    const ld: object[] = [];
    if (d?.found) {
      const crumbs = [{ name: "Home", path: "/" }, ...(d.parent ? [d.parent] : []), { name: d.title, path: d.path }];
      ld.push({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.path })),
      });
      ld.push(
        d.product
          ? {
              "@context": "https://schema.org",
              "@type": "Product",
              name: d.title,
              description,
              ...(d.image ? { image: d.image } : {}),
              offers: { "@type": "Offer", price: d.product.price, priceCurrency: d.product.currency, availability: "https://schema.org/InStock" },
            }
          : {
              "@context": "https://schema.org",
              "@type": "Article",
              headline: d.title,
              description,
              ...(d.image ? { image: d.image } : {}),
              publisher: { "@type": "Organization", name: "DreamozTech" },
            },
      );
    }
    return {
      meta,
      links: d?.found ? [{ rel: "canonical", href: d.path }] : [],
      scripts: ld.map((x) => ({ type: "application/ld+json", children: JSON.stringify(x) })),
    };
  },
  component: PageDetail,
});

function PageDetail() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(siteContentQuery);
  const content = data.content;
  const page = findPageBySlug(content.pages, slug);

  if (!page) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-3xl font-bold text-foreground">Page not found</h1>
        <p className="mt-3 text-muted-foreground">
          This page may have been renamed or disabled.
        </p>
        <Link to="/" className="mt-6 inline-block text-primary underline">
          Back home
        </Link>
      </div>
    );
  }

  const parent = findParent(content.pages, page);
  const canFloatMedia = (page.images?.length ?? 0) >= 1;
  const children = sortPages(page.children ?? []);
  const currency = siteCurrency(content);
  const seller = {
    appId: content.webApp.id,
    sellerName: content.webApp.title || "DreamozTech",
  };

  const weightLabel =
    isProductPage(page) && page.product.weight != null
      ? `${page.product.weight} ${siteWeightUnit(content)}`
      : null;

  return (
    <article className="mx-auto max-w-5xl px-6 py-16">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-primary">
          Home
        </Link>
        {parent ? (
          <>
            <span className="mx-2">/</span>
            <Link
              to="/page/$slug"
              params={{ slug: slugify(parent.title) }}
              className="hover:text-primary"
            >
              {parent.title}
            </Link>
          </>
        ) : null}
        <span className="mx-2">/</span>
        <span className="text-foreground">{page.title}</span>
      </nav>

      <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{page.title}</h1>

      {canFloatMedia ? (
        <div className="mt-6 after:block after:clear-both after:content-['']">
          <PageMedia page={page} float embed={false} />
          {isProductPage(page) ? (
            <p className="text-2xl font-bold text-primary">
              {formatMoney(page.product.price ?? 0, currency)}
            </p>
          ) : null}
          <RichText
            html={page.description}
            className={isProductPage(page) ? "home-copy mt-4" : "home-copy"}
          />
          <PageEmbed page={page} className="mt-6" />
          {weightLabel ? (
            <p className="mt-3 text-sm text-muted-foreground">Weight: {weightLabel}</p>
          ) : null}
          {isProductPage(page) ? (
            <AddToCartPanel item={cartItemFromPage(page, seller)} />
          ) : null}

        </div>
      ) : (
        <>
          {isProductPage(page) ? (
            <p className="mt-3 text-2xl font-bold text-primary">
              {formatMoney(page.product.price ?? 0, currency)}
            </p>
          ) : null}
          <RichText html={page.description} className="home-copy mt-6 max-w-3xl" />
          <PageEmbed page={page} className="mt-6" />
          <PageMedia page={page} embed={false} />
          {weightLabel ? (
            <p className="mt-3 text-sm text-muted-foreground">Weight: {weightLabel}</p>
          ) : null}
          {isProductPage(page) ? (
            <AddToCartPanel item={cartItemFromPage(page, seller)} />
          ) : null}

        </>
      )}


      {page.hyperlink ? (
        <a
          href={page.hyperlink}
          target="_blank"
          rel="noreferrer"
          className="mt-8 inline-block text-primary underline"
        >
          Learn More
        </a>
      ) : null}

      {page.contactEnabled ? <PageContactForm pageId={page.id} /> : null}

      {children.length > 0 ? (
        <section className="mt-16">
          <h2 className="text-2xl font-semibold text-foreground">Explore</h2>
          <PageCardGrid pages={children} currency={currency} seller={seller} />
        </section>
      ) : null}
    </article>
  );
}
