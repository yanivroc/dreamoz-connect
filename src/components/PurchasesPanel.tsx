import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  downloadOrderInvoice,
  listMyPurchases,
  ORDER_STATUS_LABELS,
  type Purchase,
} from "@/lib/orders.functions";
import { formatMoney } from "@/lib/currency";
import { formatDateTime } from "@/lib/format";
import { downloadBase64Pdf } from "@/lib/download-pdf";

export function useOrderInvoiceDownload() {
  const getInvoice = useServerFn(downloadOrderInvoice);
  const [busy, setBusy] = useState<number | null>(null);
  const download = async (id: number) => {
    setBusy(id);
    try {
      const res = await getInvoice({ data: { id } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      downloadBase64Pdf(res.name, res.content);
    } catch {
      toast.error("Could not prepare the invoice. Please try again.");
    } finally {
      setBusy(null);
    }
  };
  return { busy, download };
}

export function PurchasesPanel() {
  const fetchPurchases = useServerFn(listMyPurchases);
  const { data, isLoading, error } = useQuery<Purchase[]>({
    queryKey: ["my-purchases"],
    queryFn: () => fetchPurchases(),
  });
  const { busy, download } = useOrderInvoiceDownload();

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading orders…</p>;
  if (error) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : "Could not load your orders."}
      </p>
    );
  }
  const orders = data ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">My orders</h2>
      {orders.length === 0 ? (
        <div className="rounded-xl border border-border/60 p-6 text-sm text-muted-foreground">
          You haven't placed any orders yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li
              key={o.id}
              className="grid gap-2 rounded-xl border border-border/60 bg-card px-4 py-3 text-sm md:grid-cols-[1fr_1fr_auto_auto_auto] md:items-center md:gap-4"
            >
              <span>
                <span className="font-semibold text-foreground">{o.orderNo}</span>
                <span className="block text-xs text-muted-foreground">
                  {formatDateTime(o.createdAt)}
                </span>
              </span>
              <span>
                <span className="text-foreground">{o.storeName}</span>
                <span className="block text-xs text-muted-foreground">
                  {o.items.map((i) => `${i.title} × ${i.qty}`).join(", ")}
                </span>
              </span>
              <span className="font-semibold text-foreground">
                {formatMoney(o.total, o.currency)}
              </span>
              <span className="text-xs text-muted-foreground">
                {ORDER_STATUS_LABELS[o.status]}
              </span>
              <button
                type="button"
                disabled={busy === o.id}
                onClick={() => download(o.id)}
                className="text-left text-primary underline disabled:opacity-50 md:text-right"
              >
                {busy === o.id ? "Preparing…" : "PDF invoice"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
