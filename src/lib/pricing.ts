import type { SiteContent, WaPage } from "./content-types";
import { calcTotals, type CartItem } from "./cart";

export interface PricedLine {
  id: number;
  title: string;
  qty: number;
  price: number;
  lineTotal: number;
}

export interface PricedOrder {
  lines: PricedLine[];
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
  error?: string;
}

/** Recomputes an order's price from CMS data. Client-supplied prices are ignored. */
export function priceOrder(
  items: { id: number; title: string; qty: number }[],
  pages: WaPage[],
  content: SiteContent,
): PricedOrder {
  const lines: PricedLine[] = [];
  const cartItems: CartItem[] = [];

  for (const item of items) {
    const page = pages.find((p) => p.id === item.id);
    if (!page || !page.enabled || !page.product?.enabled || page.product.price == null) {
      return {
        lines: [],
        subtotal: 0,
        shipping: 0,
        total: 0,
        currency: "AUD",
        error: `"${item.title}" is no longer available.`,
      };
    }
    const min = page.product.minQty ?? 1;
    const max = page.product.maxQty ?? 999;
    const qty = Math.min(Math.max(item.qty, min), max);
    const price = page.product.price;
    lines.push({ id: page.id, title: page.title, qty, price, lineTotal: price * qty });
    cartItems.push({
      id: page.id,
      title: page.title,
      slug: page.title,
      price,
      qty,
      shippingPrice: page.product.shippingPrice ?? 0,
      minQty: page.product.minQty ?? null,
      maxQty: page.product.maxQty ?? null,
    });
  }

  const totals = calcTotals(cartItems, content);
  return {
    lines,
    subtotal: totals.subtotal,
    shipping: totals.shipping,
    total: totals.total,
    currency: totals.currency,
  };
}
