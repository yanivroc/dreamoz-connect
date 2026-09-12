import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { formatMoney, slugify, sortImages, type WaPage } from "@/lib/content-types";
import { cartItemFromPage, useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { QuantityInput } from "./QuantityInput";

export function ProductCard({ page, currency }: { page: WaPage; currency: string }) {
  const { add, setOpen } = useCart();
  const min = page.product.minQty ?? 1;
  const max = page.product.maxQty ?? 99;
  const [qty, setQty] = useState(min);
  const image = sortImages(page.images ?? [])[0];
  const slug = slugify(page.title);

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <Link
        to="/page/$slug"
        params={{ slug }}
        className="block aspect-4/3 overflow-hidden bg-muted"
      >
        {image ? (
          <img
            src={image.url}
            alt={image.alt || page.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {page.title}
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <Link to="/page/$slug" params={{ slug }} className="group">
          <h3 className="text-lg font-semibold text-foreground group-hover:text-primary">
            {page.title}
          </h3>
        </Link>
        <p className="text-xl font-bold text-primary">
          {formatMoney(page.product.price ?? 0, currency)}
        </p>

        <div className="mt-auto flex items-center gap-3">
          <QuantityInput
            value={qty}
            onChange={setQty}
            min={min}
            max={max}
            label={`Quantity for ${page.title}`}
          />
          <Button
            className="flex-1"
            onClick={() => {
              add(cartItemFromPage(page), qty);
              toast.success(`${page.title} added to cart`);
              setOpen(true);
            }}
          >
            Add to cart
          </Button>
        </div>
      </div>
    </article>
  );
}
