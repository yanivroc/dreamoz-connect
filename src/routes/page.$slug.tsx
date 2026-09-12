import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { siteContentQuery } from "@/lib/content-query";
import {
  findPageBySlug,
  findParent,
  formatMoney,
  isProductPage,
  slugify,
  sortPages,
} from "@/lib/content-types";
import { RichText } from "@/components/site/RichText";
import { PageMedia } from "@/components/site/PageMedia";
import { PageCardGrid } from "@/components/site/PageCardGrid";
import { AddToCartPanel } from "@/components/site/AddToCartPanel";

export const Route = createFileRoute("/page/$slug")({
  loader: async ({ context, params }) => {
    const result = await context.queryClient.ensureQueryData(siteContentQuery);
    const page = findPageBySlug(result.content.pages, params.slug);
    return {
      title: page?.title ?? "Page",
      description: page?.seoDescription ?? result.content.webApp.description ?? "",
    };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.title} — DreamozTech` : "DreamozTech";
    const description =
      loaderData?.description || "Digital innovation, web apps and growth by DreamozTech.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
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
  const canFloatMedia =
    (page.images?.length ?? 0) >= 1 && !page.videoUrl && !page.videoEmbed;
  const children = sortPages(page.children ?? []);
  const currency =
    content.shippingRates.byAmount[0]?.currency ??
    content.shippingRates.byQuantity[0]?.currency ??
    "AUD";

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
          <PageMedia page={page} float />
          {isProductPage(page) ? (
            <p className="text-2xl font-bold text-primary">
              {formatMoney(page.product.price ?? 0, currency)}
            </p>
          ) : null}
          <RichText html={page.description} className={isProductPage(page) ? "mt-4" : ""} />
          {isProductPage(page) ? <AddToCartPanel page={page} /> : null}
        </div>
      ) : (
        <>
          {isProductPage(page) ? (
            <p className="mt-3 text-2xl font-bold text-primary">
              {formatMoney(page.product.price ?? 0, currency)}
            </p>
          ) : null}
          <RichText html={page.description} className="mt-6 max-w-3xl" />
          <PageMedia page={page} />
          {isProductPage(page) ? <AddToCartPanel page={page} /> : null}
        </>
      )}


      {page.hyperlink ? (
        <a
          href={page.hyperlink}
          target="_blank"
          rel="noreferrer"
          className="mt-8 inline-block text-primary underline"
        >
          {page.hyperlink}
        </a>
      ) : null}

      {children.length > 0 ? (
        <section className="mt-16">
          <h2 className="text-2xl font-semibold text-foreground">Explore</h2>
          <PageCardGrid pages={children} currency={currency} />
        </section>
      ) : null}
    </article>
  );
}
