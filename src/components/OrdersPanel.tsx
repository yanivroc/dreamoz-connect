import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listOrders,
  nextStatuses,
  ORDER_STATUS_LABELS,
  updateOrderStatus,
  type Order,
  type OrderStatus,
} from "@/lib/orders.functions";
import { formatMoney } from "@/lib/currency";
import { formatDateTime } from "@/lib/format";

const statusClass: Record<OrderStatus, string> = {
  waiting_for_confirmation: "bg-accent/20 text-accent-foreground",
  payment_confirmed: "bg-primary/15 text-primary",
  order_complete: "bg-primary/25 text-primary",
  cancelled: "bg-destructive/15 text-destructive",
};

const actionLabel: Record<OrderStatus, string> = {
  waiting_for_confirmation: "Reopen",
  payment_confirmed: "Confirm payment",
  order_complete: "Mark complete",
  cancelled: "Cancel order",
};

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass[status]}`}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

export function OrdersPanel({ appId }: { appId: number }) {
  const qc = useQueryClient();
  const fetchOrders = useServerFn(listOrders);
  const changeStatus = useServerFn(updateOrderStatus);
  const [openId, setOpenId] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery<Order[]>({
    queryKey: ["orders", appId],
    queryFn: () => fetchOrders({ data: { appId } }),
  });

  const mutation = useMutation({
    mutationFn: (vars: { id: number; status: OrderStatus }) => changeStatus({ data: vars }),
    onSuccess: (updated) => {
      qc.setQueryData<Order[]>(["orders", appId], (prev) =>
        (prev ?? []).map((o) => (o.id === updated.id ? updated : o)),
      );
      toast.success(`Order ${updated.orderNo} is now "${ORDER_STATUS_LABELS[updated.status]}".`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update order."),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading orders…</p>;
  if (error) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : "Could not load orders."}
      </p>
    );
  }

  const orders = data ?? [];

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 p-6 text-sm text-muted-foreground">
        No orders yet. Orders appear here automatically once a customer pays at checkout.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Orders move from <strong>Waiting for confirmation</strong> to{" "}
        <strong>Payment confirmed</strong> once you verify the money arrived, and then to{" "}
        <strong>Order complete</strong> after shipping or delivery.
      </p>

      <ul className="space-y-3">
        {orders.map((o) => {
          const open = openId === o.id;
          const actions = nextStatuses(o.status);
          return (
            <li key={o.id} className="rounded-xl border border-border/60 bg-card">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : o.id)}
                className="grid w-full gap-2 px-4 py-3 text-left text-sm md:grid-cols-[auto_1fr_1fr_auto_auto] md:items-center md:gap-4"
              >
                <span className="text-muted-foreground">{open ? "▾" : "▸"}</span>
                <span>
                  <span className="font-semibold text-foreground">{o.orderNo}</span>
                  <span className="block text-xs text-muted-foreground">
                    {formatDateTime(o.createdAt)}
                  </span>
                </span>
                <span>
                  <span className="text-foreground">{o.buyer.name}</span>
                  <span className="block text-xs text-muted-foreground">{o.buyer.email}</span>
                </span>
                <span className="font-semibold text-foreground">
                  {formatMoney(o.total, o.currency)}
                </span>
                <StatusBadge status={o.status} />
              </button>

              {open && (
                <div className="grid gap-6 border-t border-border/60 px-4 py-4 text-sm md:grid-cols-2">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground">Items</h4>
                    <table className="w-full text-sm">
                      <tbody>
                        {o.items.map((it) => (
                          <tr key={it.id} className="border-b border-border/40">
                            <td className="py-1.5 pr-2 text-foreground">{it.title}</td>
                            <td className="py-1.5 pr-2 text-center text-muted-foreground">
                              × {it.qty}
                            </td>
                            <td className="py-1.5 text-right text-foreground">
                              {formatMoney(it.lineTotal, o.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="space-y-1 text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{formatMoney(o.subtotal, o.currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shipping</span>
                        <span>{formatMoney(o.shipping, o.currency)}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-foreground">
                        <span>Total</span>
                        <span>{formatMoney(o.total, o.currency)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Square payment ID: <span className="text-foreground">{o.paymentId}</span>
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground">Customer</h4>
                    <p className="text-muted-foreground">
                      {o.buyer.name}
                      <br />
                      {o.buyer.email}
                      {o.buyer.phone && (
                        <>
                          <br />
                          {o.buyer.phone}
                        </>
                      )}
                      <br />
                      {[o.buyer.address, o.buyer.city, o.buyer.postcode, o.buyer.country]
                        .filter(Boolean)
                        .join(", ")}
                    </p>

                    <h4 className="pt-2 font-semibold text-foreground">Timeline</h4>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      <li>Placed: {formatDateTime(o.createdAt)}</li>
                      {o.paymentConfirmedAt && (
                        <li>Payment confirmed: {formatDateTime(o.paymentConfirmedAt)}</li>
                      )}
                      {o.completedAt && <li>Completed: {formatDateTime(o.completedAt)}</li>}
                      {o.cancelledAt && <li>Cancelled: {formatDateTime(o.cancelledAt)}</li>}
                    </ul>

                    {actions.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {actions.map((s) => (
                          <button
                            key={s}
                            type="button"
                            disabled={mutation.isPending}
                            onClick={() => mutation.mutate({ id: o.id, status: s })}
                            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                              s === "cancelled"
                                ? "border border-destructive/50 text-destructive hover:bg-destructive/10"
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                            }`}
                          >
                            {actionLabel[s]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
