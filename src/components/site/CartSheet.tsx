import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { siteContentQuery } from "@/lib/content-query";
import { calcTotals, useCart } from "@/lib/cart";
import { EMPTY_CONTENT, formatMoney } from "@/lib/content-types";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { QuantityInput } from "./QuantityInput";

export function CartSheet() {
  const { items, setQty, remove, open, setOpen } = useCart();
  const { data } = useQuery(siteContentQuery);
  const content = data?.content ?? EMPTY_CONTENT;
  const totals = calcTotals(items, content);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Your cart</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4">
          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Your cart is empty.</p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3 py-4">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-16 w-16 rounded-md object-cover"
                    />
                  ) : null}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatMoney(item.price, totals.currency)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <QuantityInput
                        value={item.qty}
                        onChange={(qty) => setQty(item.id, qty)}
                        min={item.minQty ?? 1}
                        max={item.maxQty ?? 99}
                        label={`Quantity for ${item.title}`}
                        className="h-8 w-16 px-2"
                      />
                      <button
                        onClick={() => remove(item.id)}
                        aria-label={`Remove ${item.title}`}
                        className="text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2 border-t border-border p-4">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatMoney(totals.subtotal, totals.currency)}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Shipping</span>
            <span>{formatMoney(totals.shipping, totals.currency)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-foreground">
            <span>Total</span>
            <span>{formatMoney(totals.total, totals.currency)}</span>
          </div>
          <Button asChild className="w-full" disabled={items.length === 0}>
            <Link to="/checkout" onClick={() => setOpen(false)}>
              Checkout
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
