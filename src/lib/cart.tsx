import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { SiteContent, WaPage } from "./content-types";

export interface CartItem {
  id: number;
  title: string;
  slug: string;
  price: number;
  qty: number;
  image?: string;
  shippingPrice: number;
  minQty: number | null;
  maxQty: number | null;
}

interface CartValue {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">, qty: number) => void;
  setQty: (id: number, qty: number) => void;
  remove: (id: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const STORAGE_KEY = "dreamoz-cart-v1";
const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items]);

  const add = useCallback((item: Omit<CartItem, "qty">, qty: number) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        const next = Math.max(existing.qty + qty, item.minQty ?? 1);
        return prev.map((i) =>
          i.id === item.id ? { ...i, qty: item.maxQty ? Math.min(next, item.maxQty) : next } : i,
        );
      }
      return [
        ...prev,
        { ...item, qty: Math.min(Math.max(qty, item.minQty ?? 1), item.maxQty ?? 99) },
      ];
    });
  }, []);

  const setQty = useCallback((id: number, qty: number) => {
    setItems((prev) =>
      prev
        .map((i) =>
          i.id === id
            ? { ...i, qty: Math.min(Math.max(qty, i.minQty ?? 1), i.maxQty ?? 99) }
            : i,
        )
        .filter((i) => i.qty > 0),
    );
  }, []);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartValue>(() => {
    const count = items.reduce((n, i) => n + i.qty, 0);
    const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
    return { items, add, setQty, remove, clear, count, subtotal, open, setOpen };
  }, [items, add, setQty, remove, clear, open]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

export function cartItemFromPage(page: WaPage): Omit<CartItem, "qty"> {
  const image = [...(page.images ?? [])].sort((a, b) => a.orderNo - b.orderNo)[0]?.url;
  return {
    id: page.id,
    title: page.title,
    slug: page.title,
    price: page.product.price ?? 0,
    ...(image ? { image } : {}),
    shippingPrice: page.product.shippingPrice ?? 0,
    minQty: page.product.minQty ?? null,
    maxQty: page.product.maxQty ?? null,
  };
}

export interface Totals {
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
}

/** Shipping = per-item shipping price + the best matching configured rate. */
export function calcTotals(items: CartItem[], content: SiteContent): Totals {
  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
  const qty = items.reduce((n, i) => n + i.qty, 0);
  const perItemShipping = items.reduce((n, i) => n + i.shippingPrice * i.qty, 0);

  const byQuantity = [...(content.shippingRates?.byQuantity ?? [])].sort(
    (a, b) => a.threshold - b.threshold,
  );
  const byAmount = [...(content.shippingRates?.byAmount ?? [])].sort(
    (a, b) => a.threshold - b.threshold,
  );

  let currency = "AUD";
  let ruleShipping = 0;

  const qtyMatch = byQuantity.filter((r) => qty >= r.threshold).pop() ?? byQuantity[0];
  const amountMatch = byAmount.filter((r) => subtotal >= r.threshold).pop() ?? byAmount[0];

  const candidates = [qtyMatch, amountMatch].filter(Boolean);
  if (candidates.length > 0) {
    currency = candidates[0]!.currency || "AUD";
    ruleShipping = Math.min(...candidates.map((r) => r!.rate));
  }

  const shipping = items.length === 0 ? 0 : perItemShipping + ruleShipping;
  return { subtotal, shipping, total: subtotal + shipping, currency };
}
