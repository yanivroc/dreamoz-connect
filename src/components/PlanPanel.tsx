import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { downloadPlanInvoice, getBillingOverview, purchasePlan } from "@/lib/billing.functions";
import type { CurrentUser } from "@/lib/auth.functions";
import { formatPlanPrice, type PlanId } from "@/lib/plans";
import { formatDateTime } from "@/lib/format";

interface SquareCard {
  attach: (selector: string) => Promise<void>;
  tokenize: () => Promise<{ status: string; token?: string; errors?: { message: string }[] }>;
  destroy?: () => Promise<void>;
}

function StatusBadge({ user }: { user: CurrentUser }) {
  const a = user.access;
  const when = a.endsAt ? formatDateTime(a.endsAt) : null;
  const text =
    a.state === "admin"
      ? "Admin — full access"
      : a.state === "active"
        ? `Active (${user.plan}) until ${when}`
        : a.state === "trial"
          ? `Free trial — ${a.daysLeft} day${a.daysLeft === 1 ? "" : "s"} left`
          : "Expired — choose a plan to continue";
  const tone =
    a.state === "expired"
      ? "bg-destructive/15 text-destructive"
      : "bg-primary/15 text-primary";
  return <span className={`rounded-full px-3 py-1 text-sm font-semibold ${tone}`}>{text}</span>;
}

export function PlanPanel({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const fetchOverview = useServerFn(getBillingOverview);
  const buy = useServerFn(purchasePlan);
  const { data, refetch } = useQuery({ queryKey: ["billing"], queryFn: () => fetchOverview() });
  const [choice, setChoice] = useState<PlanId>("monthly");
  const [ready, setReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const [invoiceBusy, setInvoiceBusy] = useState<number | null>(null);
  const cardRef = useRef<SquareCard | null>(null);
  const getInvoice = useServerFn(downloadPlanInvoice);

  const downloadInvoice = async (id: number) => {
    setInvoiceBusy(id);
    try {
      const res = await getInvoice({ data: { id } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const bytes = Uint8Array.from(atob(res.content), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = res.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not prepare the invoice. Please try again.");
    } finally {
      setInvoiceBusy(null);
    }
  };

  const plans = (data?.plans ?? []).filter((p) => p.enabled);
  const selected = plans.find((p) => p.id === choice) ?? plans[0];
  const sq = data?.square;

  const isAdmin = user.access.state === "admin";

  useEffect(() => {
    if (isAdmin) return;
    if (!sq?.configured || cardRef.current) return;
    if (!document.getElementById("plan-card")) return;
    let cancelled = false;
    const sdkUrl =
      sq.mode === "production"
        ? "https://web.squarecdn.com/v1/square.js"
        : "https://sandbox.web.squarecdn.com/v1/square.js";
    const init = async () => {
      try {
        const w = window as unknown as { Square?: unknown };
        if (!w.Square) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement("script");
            s.src = sdkUrl;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error("Could not load Square"));
            document.head.appendChild(s);
          });
        }
        const Square = (window as unknown as {
          Square: { payments: (a: string, l: string) => { card: () => Promise<SquareCard> } };
        }).Square;
        const card = await Square.payments(sq.applicationId!, sq.locationId!).card();
        if (cancelled) return;
        await card.attach("#plan-card");
        cardRef.current = card;
        setReady(true);
      } catch (err) {
        console.error("Square init failed", err);
        toast.error("The card form could not load. Please refresh and try again.");
      }
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, sq?.configured, sq?.applicationId, sq?.locationId, sq?.mode]);

  async function onPay() {
    if (!cardRef.current || !selected) return;
    setPaying(true);
    try {
      const t = await cardRef.current.tokenize();
      if (t.status !== "OK" || !t.token) {
        toast.error(t.errors?.[0]?.message ?? "Please check your card details.");
        return;
      }
      const result = await buy({ data: { plan: selected.id, sourceId: t.token } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Payment received. Your plan is active until ${formatDateTime(result.planExpiresAt)}.`);
      await refetch();
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed.");
    } finally {
      setPaying(false);
    }
  }

  const expiringSoon =
    user.access.state === "active" && user.access.daysLeft <= 7;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold">Your plan</h2>
        <StatusBadge user={user} />
      </div>

      {expiringSoon && (
        <p className="rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm">
          Your plan ends in {user.access.daysLeft} day{user.access.daysLeft === 1 ? "" : "s"}. Pay
          now to add another period on top — you won't lose any remaining days.
        </p>
      )}
      {user.access.state === "expired" && (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          Your trial or plan has ended. Build Web Apps and your web app API are paused until you
          choose a plan.
        </p>
      )}

      {user.access.state !== "admin" && (
        <div className="max-w-xl space-y-5 rounded-2xl border border-border/60 bg-surface/40 p-6 shadow-card">
          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">No plans are available right now.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {plans.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setChoice(p.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    selected?.id === p.id
                      ? "border-primary bg-primary/10"
                      : "border-border/70 hover:bg-surface/60"
                  }`}
                >
                  <div className="font-semibold">{p.label}</div>
                  <div className="mt-1 text-lg">{formatPlanPrice(p.amountCents, p.currency)}</div>
                  <div className="text-xs text-muted-foreground">{p.days} days of access</div>
                </button>
              ))}
            </div>
          )}

          {!sq?.configured ? (
            <p className="text-sm text-muted-foreground">Payments not configured yet.</p>
          ) : (
            <>
              {sq.mode === "sandbox" && (
                <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
                  Test mode (sandbox) — no real money is charged. Use Square's test cards. This
                  switches to live payments automatically once the production settings are added.
                </p>
              )}
              <div id="plan-card" className="min-h-[90px]" />
              <button
                type="button"
                disabled={!ready || paying || !selected}
                onClick={onPay}
                className="w-full rounded-full bg-gradient-accent px-5 py-3 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90 disabled:opacity-60"
              >
                {paying
                  ? "Processing…"
                  : selected
                    ? `Pay ${formatPlanPrice(selected.amountCents, selected.currency)}`
                    : "Pay"}
              </button>
              <p className="text-xs text-muted-foreground">
                One-off payment, no automatic renewal. Paying early adds time to the end of your
                current plan.
              </p>
            </>
          )}
        </div>
      )}

      {(data?.payments.length ?? 0) > 0 && (
        <div className="max-w-xl space-y-2">
          <h3 className="font-semibold">Payment history</h3>
          <ul className="divide-y divide-border/60 rounded-xl border border-border/60 text-sm">
            {data!.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-2 px-4 py-3">
                <span>
                  {formatDateTime(p.createdAt)} — {p.plan}
                  {p.invoiceNo && (
                    <span className="ml-2 text-muted-foreground">({p.invoiceNo})</span>
                  )}
                </span>
                <span>
                  {formatPlanPrice(p.amountCents, p.currency)}
                  <button
                    type="button"
                    onClick={() => downloadInvoice(p.id)}
                    disabled={invoiceBusy === p.id}
                    className="ml-3 text-primary underline disabled:opacity-60"
                  >
                    {invoiceBusy === p.id ? "Preparing…" : "Invoice (PDF)"}
                  </button>
                  {p.receiptUrl && (
                    <a href={p.receiptUrl} target="_blank" rel="noreferrer" className="ml-3 text-primary underline">
                      Receipt
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
