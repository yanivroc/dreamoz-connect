import { Link } from "@tanstack/react-router";
import { isProductPage, slugify, sortImages, sortPages, type WaPage } from "@/lib/content-types";
import { ProductCard } from "./ProductCard";

function InfoCard({ page }: { page: WaPage }) {
  const image = sortImages(page.images ?? [])[0];
  const excerpt = page.seoDescription || page.description.replace(/<[^>]*>/g, "").slice(0, 160);

  return (
    <Link
      to="/page/$slug"
      params={{ slug: slugify(page.title) }}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/60"
    >
      {image ? (
        <img
          src={image.url}
          alt={image.alt || page.title}
          loading="lazy"
          className="h-44 w-full object-cover"
        />
      ) : null}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary">
          {page.title}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{excerpt}</p>
      </div>
    </Link>
  );
}

export function PageCardGrid({ pages, currency }: { pages: WaPage[]; currency: string }) {
  const visible = sortPages(pages);
  if (visible.length === 0) return null;

  return (
    <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map((child) =>
        isProductPage(child) ? (
          <ProductCard key={child.id} page={child} currency={currency} />
        ) : (
          <InfoCard key={child.id} page={child} />
        ),
      )}
    </div>
  );
}
