import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listSellerBalances,
  recordSellerPayout,
  type SellerBalance,
} from "@/lib/payouts.functions";
import { formatMoney } from "@/lib/currency";

export function AdminPayoutsPanel() {
  const load = useServerFn(listSellerBalances);
  const { data, isLoading } = useQuery({
    queryKey: ["seller-balances"],
    queryFn: () => load(),
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Member payouts</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Transfer the available amount from your bank, then record it here to clear the balance.
        </p>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No member sales yet.</p>
      ) : (
        <div className="space-y-4">
          {(data ?? []).map((s) => (
            <SellerCard key={s.userId} s={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function SellerCard({ s }: { s: SellerBalance }) {
  const record = useServerFn(recordSellerPayout);
  const qc = useQueryClient();
  const [amount, setAmount] = useState(String(s.earnings.available.toFixed(2)));
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error("Could not copy.");
    }
  }

  async function onRecord() {
    setSaving(true);
    try {
      await record({
        data: {
          userId: s.userId,
          amount: Number(amount),
          currency: s.earnings.currency,
          reference,
          notes,
        },
      });
      toast.success("Payout recorded.");
      setReference("");
      setNotes("");
      await qc.invalidateQueries({ queryKey: ["seller-balances"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record payout.");
    } finally {
      setSaving(false);
    }
  }

  const cur = s.earnings.currency;
  const field =
    "rounded-md border border-border/70 bg-background px-2 py-1 text-sm outline-none focus:border-primary";

  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-surface/40 p-5 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-semibold">{s.name}</p>
          <p className="text-xs text-muted-foreground">{s.email}</p>
        </div>
        <p className="text-lg font-semibold">
          {formatMoney(s.earnings.available, cur)}{" "}
          <span className="text-xs font-normal text-muted-foreground">available</span>
        </p>
      </div>

      <div className="grid gap-2 text-sm sm:grid-cols-4">
        <p className="text-muted-foreground">Gross: <span className="text-foreground">{formatMoney(s.earnings.grossSales, cur)}</span></p>
        <p className="text-muted-foreground">Commission: <span className="text-foreground">{formatMoney(s.earnings.commission, cur)}</span></p>
        <p className="text-muted-foreground">Pending: <span className="text-foreground">{formatMoney(s.earnings.pending, cur)}</span></p>
        <p className="text-muted-foreground">Paid: <span className="text-foreground">{formatMoney(s.earnings.paidOut, cur)}</span></p>
      </div>

      {s.bank ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 p-3 text-sm">
          <span>{s.bank.accountName}</span>
          <button type="button" onClick={() => void copy(s.bank!.bsb, "BSB")} className="rounded-md border border-border/70 px-2 py-1 hover:bg-surface/60">
            BSB {s.bank.bsb}
          </button>
          <button type="button" onClick={() => void copy(s.bank!.accountNumber, "Account number")} className="rounded-md border border-border/70 px-2 py-1 hover:bg-surface/60">
            Acct {s.bank.accountNumber}
          </button>
        </div>
      ) : (
        <p className="text-sm text-destructive">No bank details saved by this member yet.</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input className={`${field} w-28`} type="number" min="0" max={s.earnings.available} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <input className={`${field} w-44`} placeholder="Bank reference" maxLength={60} value={reference} onChange={(e) => setReference(e.target.value)} />
        <input className={`${field} w-56`} placeholder="Notes (optional)" maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button
          type="button"
          onClick={() => void onRecord()}
          disabled={saving || !s.bank || s.earnings.available <= 0}
          className="rounded-full bg-gradient-accent px-4 py-2 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Record payout"}
        </button>
      </div>
      {s.earnings.available <= 0 && (
        <p className="text-xs text-muted-foreground">
          Nothing to pay right now — earnings become available once orders are marked complete
          {s.earnings.pending > 0 ? ` (${formatMoney(s.earnings.pending, cur)} awaiting completion)` : ""}.
        </p>
      )}
    </div>
  );
}
