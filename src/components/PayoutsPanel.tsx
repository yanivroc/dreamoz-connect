import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getMyPayoutProfile, saveMyBankDetails } from "@/lib/payouts.functions";
import { formatMoney } from "@/lib/currency";
import { formatDateTime } from "@/lib/format";

const input =
  "w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm outline-none transition focus:border-primary";

export function PayoutsPanel() {
  const load = useServerFn(getMyPayoutProfile);
  const save = useServerFn(saveMyBankDetails);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["payout-profile"], queryFn: () => load() });

  const [accountName, setAccountName] = useState("");
  const [bsb, setBsb] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.bank) {
      setAccountName(data.bank.accountName);
      setBsb(data.bank.bsb);
      setAccountNumber(data.bank.accountNumber);
      setBankName(data.bank.bankName);
    }
  }, [data]);

  async function onSave() {
    setSaving(true);
    try {
      await save({ data: { accountName, bsb, accountNumber, bankName } });
      toast.success("Bank details saved.");
      await qc.invalidateQueries({ queryKey: ["payout-profile"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save bank details.");
    } finally {
      setSaving(false);
    }
  }

  const e = data?.earnings;
  const cur = e?.currency ?? "AUD";
  const isAdmin = data?.isAdmin ?? false;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Gross sales", value: e?.grossSales ?? 0 },
          { label: `Platform commission (${e?.commissionPercent ?? 0}%)`, value: e?.commission ?? 0 },
          { label: "Awaiting completion", value: e?.pending ?? 0 },
          { label: isAdmin ? "Direct revenue" : "Available for payout", value: isAdmin ? (e?.netEarned ?? 0) : (e?.available ?? 0) },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-border/60 bg-surface/40 p-5 shadow-card"
          >
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold">{formatMoney(card.value, cur)}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {isAdmin
          ? "Direct revenue — these sales are deposited straight into your own bank account by Square, so no payout transfer is needed. No platform commission applies to your sales."
          : `Earnings become available once an order is marked complete. Paid so far: ${formatMoney(e?.paidOut ?? 0, cur)}.`}
      </p>


      {!isAdmin && (
      <div className="max-w-2xl space-y-4 rounded-2xl border border-border/60 bg-surface/40 p-6 shadow-card">
        <div>
          <h2 className="text-xl font-semibold">Bank account for payouts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Australian bank account only. Payouts are transferred manually to this account.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Account holder name</span>
            <input className={input} maxLength={80} value={accountName} onChange={(ev) => setAccountName(ev.target.value)} />
          </label>
          <span className="hidden sm:block" />
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">BSB (6 digits)</span>
            <input className={input} inputMode="numeric" maxLength={7} value={bsb} onChange={(ev) => setBsb(ev.target.value)} />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Account number</span>
            <input className={input} inputMode="numeric" maxLength={10} value={accountNumber} onChange={(ev) => setAccountNumber(ev.target.value)} />
          </label>
        </div>
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={saving || isLoading}
          className="rounded-full bg-gradient-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save bank details"}
        </button>
        {data?.bank?.updatedAt ? (
          <p className="text-xs text-muted-foreground">
            Last updated {formatDateTime(data.bank.updatedAt)}
          </p>
        ) : null}
      </div>
      )}


      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Payout history</h2>
        {(data?.payouts ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No payouts yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-surface/60 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {(data?.payouts ?? []).map((p) => (
                  <tr key={p.id} className="border-t border-border/60">
                    <td className="px-4 py-3">{formatDateTime(p.createdAt)}</td>
                    <td className="px-4 py-3">{formatMoney(p.amount, p.currency)}</td>
                    <td className="px-4 py-3">{p.reference || "—"}</td>
                    <td className="px-4 py-3">{p.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
