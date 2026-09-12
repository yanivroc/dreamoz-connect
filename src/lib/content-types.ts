export interface WaImage {
  id: number;
  alt: string;
  hyperlink: string | null;
  orderNo: number;
  url: string;
}

export interface WaProduct {
  enabled: boolean;
  price: number | null;
  minQty: number | null;
  maxQty: number | null;
  shippingPrice: number | null;
}

export interface WaPage {
  id: number;
  parentId: number | null;
  orderNo: number;
  title: string;
  description: string;
  seoDescription: string | null;
  keywords: string | null;
  enabled: boolean;
  videoUrl: string | null;
  videoEmbed: string | null;
  hyperlink: string | null;
  product: WaProduct;
  images: WaImage[];
  children: WaPage[];
}

export interface WaShippingRate {
  type: string;
  threshold: number;
  rate: number;
  currency: string;
}

export interface SiteContent {
  webApp: {
    id: number;
    title: string;
    description: string;
    email: string;
    link: string;
    enabled: boolean;
  };
  settings: { logo: string | null; favicon: string | null };
  shippingRates: { byQuantity: WaShippingRate[]; byAmount: WaShippingRate[] };
  pages: WaPage[];
}

export const EMPTY_CONTENT: SiteContent = {
  webApp: {
    id: 0,
    title: "DreamozTech",
    description: "",
    email: "",
    link: "",
    enabled: true,
  },
  settings: { logo: null, favicon: null },
  shippingRates: { byQuantity: [], byAmount: [] },
  pages: [],
};

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function sortPages(pages: WaPage[]): WaPage[] {
  return [...pages].filter((p) => p.enabled).sort((a, b) => a.orderNo - b.orderNo);
}

export function sortImages(images: WaImage[]): WaImage[] {
  return [...images].sort((a, b) => a.orderNo - b.orderNo);
}

export function isProductPage(page: WaPage): boolean {
  return Boolean(page.product?.enabled);
}

/** A "blog" section: a page whose children include at least one product page. */
export function isBlogSection(page: WaPage): boolean {
  return sortPages(page.children ?? []).some(isProductPage);
}

export function flattenPages(pages: WaPage[]): WaPage[] {
  const out: WaPage[] = [];
  const walk = (list: WaPage[]) => {
    for (const p of sortPages(list)) {
      out.push(p);
      walk(p.children ?? []);
    }
  };
  walk(pages);
  return out;
}

export function findPageBySlug(pages: WaPage[], slug: string): WaPage | undefined {
  return flattenPages(pages).find((p) => slugify(p.title) === slug);
}

export function findParent(pages: WaPage[], page: WaPage): WaPage | undefined {
  if (page.parentId == null) return undefined;
  return flattenPages(pages).find((p) => p.id === page.parentId);
}

/** Minimal HTML sanitizer for CMS-authored descriptions. */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<\s*(script|style|iframe|object|embed)[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

export function formatMoney(amount: number, currency = "AUD"): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(amount);
}
