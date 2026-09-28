import { useState } from "react";
import { toast } from "sonner";
import type { CartItem } from "@/lib/cart";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { QuantityInput } from "./QuantityInput";

/** Quantity picker + add-to-cart for any seller's product. */
export function AddToCartPanel({
  item,
  className,
}: {
  item: Omit<CartItem, "qty">;
  className?: string;
}) {
  const { add, setOpen } = useCart();
  const min = item.minQty ?? 1;
  const max = item.maxQty ?? 99;
  const [qty, setQty] = useState(min);

  return (
    <div
      className={`flex max-w-md items-center gap-3 rounded-xl border border-border bg-card p-4 ${className ?? "mt-8"}`}
    >
      <QuantityInput
        value={qty}
        onChange={setQty}
        min={min}
        max={max}
        label="Quantity"
        className="h-11 w-24 px-3"
      />
      <Button
        size="lg"
        className="flex-1"
        onClick={() => {
          add(item, qty);
          toast.success(`${item.title} added to cart`);
          setOpen(true);
        }}
      >
        Add to cart
      </Button>
      {item.maxQty ? <span className="text-xs text-muted-foreground">Max {max}</span> : null}
    </div>
  );
}
