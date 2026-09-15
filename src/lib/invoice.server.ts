// Server-only invoice PDF builder (pure JS, edge/Worker safe).
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface InvoiceLine {
  title: string;
  qty: number;
  price: number;
  lineTotal: number;
}

export interface InvoiceInput {
  orderNo?: string;
  paymentId: string;
  date?: Date;
  brand: string;
  ownerEmail?: string | null;
  buyer: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    postcode?: string;
    country?: string;
  };
  lines: InvoiceLine[];
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
}

const money = (n: number, cur: string) => {
  const code = (cur || "AUD").toUpperCase();
  try {
    return `${code} ${new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
    }).format(n)}`;
  } catch {
    return `${code} ${n.toFixed(2)}`;
  }
};

/** Strip characters the standard PDF fonts cannot encode. */
const clean = (s: string) => (s ?? "").replace(/[^\x20-\x7E]/g, " ").trim();

function wrap(text: string, font: any, size: number, maxWidth: number): string[] {
  const words = clean(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines.length > 0 ? lines : [""];
}

/** Builds an invoice PDF and returns it base64-encoded. */
export async function buildInvoicePdf(input: InvoiceInput): Promise<string> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const left = 50;
  const right = width - 50;
  const dark = rgb(0.07, 0.07, 0.09);
  const grey = rgb(0.45, 0.45, 0.5);
  const line = rgb(0.85, 0.85, 0.88);
  let y = height - 60;

  const cur = input.currency.toUpperCase();
  const date = input.date ?? new Date();

  const text = (
    s: string,
    x: number,
    size = 10,
    f: any = font,
    color = dark,
    align: "left" | "right" | "center" = "left",
  ) => {
    const str = clean(s);
    let px = x;
    if (align === "right") px = x - f.widthOfTextAtSize(str, size);
    if (align === "center") px = x - f.widthOfTextAtSize(str, size) / 2;
    page.drawText(str, { x: px, y, size, font: f, color });
  };

  const hr = (c = line) => {
    page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: c });
  };

  const newPageIfNeeded = (needed: number) => {
    if (y - needed > 60) return;
    page = pdf.addPage([595.28, 841.89]);
    y = height - 60;
  };

  // Header
  text(input.brand, left, 20, bold);
  text("INVOICE", right, 20, bold, grey, "right");
  y -= 16;
  if (input.ownerEmail) {
    text(input.ownerEmail, left, 9, font, grey);
  }
  y -= 18;
  hr();
  y -= 20;

  // Meta
  const label = input.orderNo || input.paymentId;
  text("Invoice / Order number", left, 9, font, grey);
  text("Date", right - 160, 9, font, grey);
  y -= 13;
  text(label, left, 11, bold);
  text(
    date.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }),
    right - 160,
    11,
    bold,
  );
  y -= 18;
  text("Payment reference", left, 9, font, grey);
  y -= 13;
  text(input.paymentId, left, 10);
  y -= 26;

  // Bill to
  text("Bill to", left, 9, font, grey);
  y -= 14;
  text(input.buyer.name, left, 11, bold);
  y -= 13;
  text(input.buyer.email, left, 10);
  if (input.buyer.phone) {
    y -= 13;
    text(input.buyer.phone, left, 10);
  }
  const addr = [
    input.buyer.address,
    [input.buyer.city, input.buyer.postcode].filter(Boolean).join(" "),
    input.buyer.country,
  ]
    .filter((v) => v && String(v).trim())
    .join(", ");
  if (addr) {
    for (const l of wrap(addr, font, 10, right - left - 200)) {
      y -= 13;
      text(l, left, 10);
    }
  }
  y -= 28;

  // Table header
  const colQty = right - 210;
  const colPrice = right - 110;
  page.drawRectangle({
    x: left,
    y: y - 6,
    width: right - left,
    height: 22,
    color: rgb(0.96, 0.96, 0.97),
  });
  y += 1;
  text("Item", left + 8, 10, bold);
  text("Qty", colQty, 10, bold, dark, "right");
  text("Unit price", colPrice, 10, bold, dark, "right");
  text("Amount", right - 8, 10, bold, dark, "right");
  y -= 25;

  for (const l of input.lines) {
    const titleLines = wrap(l.title, font, 10, colQty - left - 20);
    newPageIfNeeded(titleLines.length * 13 + 20);
    const startY = y;
    titleLines.forEach((tl, i) => {
      if (i > 0) y -= 13;
      text(tl, left + 8, 10);
    });
    const saved = y;
    y = startY;
    text(String(l.qty), colQty, 10, font, dark, "right");
    text(money(l.price, cur), colPrice, 10, font, dark, "right");
    text(money(l.lineTotal, cur), right - 8, 10, font, dark, "right");
    y = saved - 10;
    hr();
    y -= 14;
  }

  // Totals
  newPageIfNeeded(90);
  y -= 4;
  const totalRow = (name: string, value: string, strong = false) => {
    text(name, colPrice, strong ? 11 : 10, strong ? bold : font, strong ? dark : grey, "right");
    text(value, right - 8, strong ? 11 : 10, strong ? bold : font, dark, "right");
    y -= 16;
  };
  totalRow("Subtotal", money(input.subtotal, cur));
  totalRow("Shipping", money(input.shipping, cur));
  y -= 2;
  page.drawLine({
    start: { x: colPrice - 80, y: y + 12 },
    end: { x: right, y: y + 12 },
    thickness: 1,
    color: dark,
  });
  y -= 4;
  totalRow(`Total (${cur})`, money(input.total, cur), true);

  y -= 24;
  text("Thank you for your order.", left, 10, font, grey);

  const bytes = await pdf.save();
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}
