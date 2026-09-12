import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { siteContentQuery } from "@/lib/content-query";
import { calcTotals, useCart } from "@/lib/cart";
import { EMPTY_CONTENT, formatMoney } from "@/lib/content-types";
import { createSquarePayment, getSquareConfig } from "@/lib/square.functions";
import { sendOrderEmails } from "@/lib/order-email.functions";
import { AddressAutocomplete } from "@/components/site/AddressAutocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/checkout/")({
  head: () => ({
    meta: [
      { title: "Checkout — DreamozTech" },
      { name: "description", content: "Securely pay for your DreamozTech order by card." },
      { property: "og:title", content: "Checkout — DreamozTech" },
      {
        property: "og:description",
        content: "Securely pay for your DreamozTech order by card.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

interface SquareCard {
  attach: (selector: string) => Promise<void>;
  tokenize: () => Promise<{ status: string; token?: string; errors?: { message: string }[] }>;
}

function CheckoutPage() {
  const navigate = useNavigate();
  const { items, clear } = useCart();
  const { data: contentData } = useQuery(siteContentQuery);
  const { data: squareConfig } = useQuery({
    queryKey: ["square-config"],
    queryFn: () => getSquareConfig(),
  });
  const pay = useServerFn(createSquarePayment);
  const sendEmails = useServerFn(sendOrderEmails);

  const totals = calcTotals(items, contentData?.content ?? EMPTY_CONTENT);
  const cardRef = useRef<SquareCard | null>(null);
  const [cardReady, setCardReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postcode: "",
    country: "Australia",
  });

  useEffect(() => {
    if (!squareConfig?.configured || cardRef.current) return;
    let cancelled = false;

    const src =
      squareConfig.environment === "production"
        ? "https://web.squarecdn.com/v1/square.js"
        : "https://sandbox.web.squarecdn.com/v1/square.js";

    const init = async () => {
      try {
        const w = window as unknown as { Square?: { payments: (a: string, l: string) => unknown } };
        if (!w.Square) {
          await new Promise<void>((resolve, reject) => {
            const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
            if (existing) {
              existing.addEventListener("load", () => resolve());
              existing.addEventListener("error", () => reject(new Error("load failed")));
              return;
            }
            const script = document.createElement("script");
            script.src = src;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("load failed"));
            document.head.appendChild(script);
          });
        }
        const Square = (window as unknown as { Square: { payments: (a: string, l: string) => { card: () => Promise<SquareCard> } } }).Square;
        const payments = Square.payments(squareConfig.applicationId!, squareConfig.locationId!);
        const card = await payments.card();
        if (cancelled) return;
        await card.attach("#square-card");
        cardRef.current = card;
        setCardReady(true);
      } catch (err) {
        console.error("Square init failed", err);
        toast.error("Could not load the card form.");
      }
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, [squareConfig]);

  const handlePay = async () => {
    if (!form.name || !form.email) {
      toast.error("Please enter your name and email.");
      return;
    }
    if (!cardRef.current) {
      toast.error("Card form is not ready yet.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await cardRef.current.tokenize();
      if (result.status !== "OK" || !result.token) {
        toast.error(result.errors?.[0]?.message ?? "Card details were declined.");
        return;
      }
      const payment = await pay({
        data: {
          sourceId: result.token,
          currency: totals.currency,
          customer: form,
          items: items.map((i) => ({ id: i.id, title: i.title, qty: i.qty })),
        },
      });
      if (!payment.ok) {
        toast.error(payment.error ?? "Payment failed.");
        return;
      }

      // Emails are best-effort — a captured payment must never fail on them.
      try {
        const mailed = await sendEmails({
          data: {
            paymentId: payment.paymentId ?? "",
            receiptUrl: payment.receiptUrl ?? null,
            buyer: form,
            items: items.map((i) => ({ id: i.id, title: i.title, qty: i.qty })),
          },
        });
        if (!mailed.ok) {
          toast.warning("Payment succeeded, but the confirmation email couldn't be sent.");
        }
      } catch (err) {
        console.error("order email failed", err);
        toast.warning("Payment succeeded, but the confirmation email couldn't be sent.");
      }

      clear();
      void navigate({
        to: "/checkout/success",
        search: { payment: payment.paymentId ?? "" },
      });
    } catch (err) {
      console.error(err);
      toast.error("Payment could not be completed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-3xl font-bold text-foreground">Checkout</h1>
        <p className="mt-3 text-muted-foreground">Your cart is empty.</p>
        <Link to="/" className="mt-6 inline-block text-primary underline">
          Continue browsing
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-6 py-16 lg:grid-cols-[1fr_360px]">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Checkout</h1>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {(
            [
              ["name", "Full name"],
              ["email", "Email"],
              ["phone", "Phone"],
              ["address", "Address"],
              ["city", "City"],
              ["postcode", "Postcode"],
              ["country", "Country"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className={key === "address" ? "sm:col-span-2" : ""}>
              <Label htmlFor={key}>{label}</Label>
              {key === "address" ? (
                <AddressAutocomplete
                  id="address"
                  value={form.address}
                  className="mt-1.5"
                  onChange={(v) => setForm((f) => ({ ...f, address: v }))}
                  onSelect={(p) =>
                    setForm((f) => ({
                      ...f,
                      address: p.address || f.address,
                      city: p.city || f.city,
                      postcode: p.postcode || f.postcode,
                      country: p.country || f.country,
                    }))
                  }
                />
              ) : (
                <Input
                  id={key}
                  value={form[key]}
                  type={key === "email" ? "email" : "text"}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="mt-1.5"
                />
              )}
            </div>
          ))}
        </div>

        <h2 className="mt-10 text-xl font-semibold text-foreground">Card details</h2>
        {squareConfig && !squareConfig.configured ? (
          <p className="mt-3 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            Card payments aren't active yet. Add your Square credentials
            (SQUARE_APPLICATION_ID, SQUARE_LOCATION_ID, SQUARE_ACCESS_TOKEN, SQUARE_ENVIRONMENT) to
            enable checkout.
          </p>
        ) : (
          <div
            id="square-card"
            className="mt-4 min-h-[90px] rounded-lg border border-border bg-card p-3"
          />
        )}

        <Button
          className="mt-6 w-full sm:w-auto"
          size="lg"
          disabled={!cardReady || submitting}
          onClick={handlePay}
        >
          {submitting ? "Processing…" : `Pay ${formatMoney(totals.total, totals.currency)}`}
        </Button>
      </div>

      <aside className="h-fit rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Order summary</h2>
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {item.title} × {item.qty}
              </span>
              <span className="text-foreground">
                {formatMoney(item.price * item.qty, totals.currency)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Shipping</span>
            <span>{formatMoney(totals.shipping, totals.currency)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-foreground">
            <span>Total</span>
            <span>{formatMoney(totals.total, totals.currency)}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
