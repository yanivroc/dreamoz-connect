import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { siteContentQuery } from "@/lib/content-query";
import { calcTotals, useCart } from "@/lib/cart";
import { EMPTY_CONTENT, formatMoney } from "@/lib/content-types";
import { Button } from "@/components/ui/button";
import { QuantityInput } from "@/components/site/QuantityInput";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — DreamozTech" },
      { name: "description", content: "Review the items in your DreamozTech cart before checkout." },
      { property: "og:title", content: "Your cart — DreamozTech" },
      {
        property: "og:description",
        content: "Review the items in your DreamozTech cart before checkout.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, setQty, remove } = useCart();
  const { data } = useQuery(siteContentQuery);
  const totals = calcTotals(items, data?.content ?? EMPTY_CONTENT);

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-bold text-foreground">Your cart</h1>

      {items.length === 0 ? (
        <div className="mt-10 rounded-xl border border-border bg-card p-10 text-center">
          <p className="text-muted-foreground">Your cart is empty.</p>
          <Link to="/" className="mt-4 inline-block text-primary underline">
            Continue browsing
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-8 divide-y divide-border rounded-xl border border-border bg-card">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 p-4">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-20 w-20 rounded-md object-cover"
                  />
                ) : null}
                <div className="flex-1">
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatMoney(item.price, totals.currency)}
                  </p>
                </div>
                <QuantityInput
                  value={item.qty}
                  onChange={(qty) => setQty(item.id, qty)}
                  min={item.minQty ?? 1}
                  max={item.maxQty ?? 99}
                  label={`Quantity for ${item.title}`}
                />
                <p className="w-24 text-right font-semibold text-foreground">
                  {formatMoney(item.price * item.qty, totals.currency)}
                </p>
                <button
                  onClick={() => remove(item.id)}
                  aria-label={`Remove ${item.title}`}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-8 ml-auto max-w-sm space-y-2 rounded-xl border border-border bg-card p-6">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatMoney(totals.subtotal, totals.currency)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Shipping</span>
              <span>{formatMoney(totals.shipping, totals.currency)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold text-foreground">
              <span>Total</span>
              <span>{formatMoney(totals.total, totals.currency)}</span>
            </div>
            <Button asChild className="w-full">
              <Link to="/checkout">Proceed to checkout</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
