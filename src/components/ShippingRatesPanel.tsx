import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listShippingRates,
  saveShippingRates,
  type ShippingRatesResult,
} from "@/lib/webpages.functions";
import { detectCurrency, formatMoney } from "@/lib/currency";

const inputClass =
  "w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm outline-none transition focus:border-primary";

type Row = { threshold: string; rate: string };

const emptyRow: Row = { threshold: "", rate: "" };

function hasDuplicates(rows: Row[]): string | null {
  const seen = new Set<string>();
  for (const r of rows) {
    if (r.threshold.trim() === "") continue;
    const key = String(Number(r.threshold));
    if (seen.has(key)) return r.threshold;
    seen.add(key);
  }
  return null;
}

function RateRows({
  label,
  unitLabel,
  rows,
  currency,
  onChange,
}: {
  label: string;
  unitLabel: string;
  rows: Row[];
  currency: string;
  onChange: (rows: Row[]) => void;
}) {
  const set = (i: number, patch: Partial<Row>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-3 rounded-xl border border-border/60 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{label}</h4>
        <button
          type="button"
          onClick={() => onChange([...rows, { ...emptyRow }])}
          className="rounded-full border border-border/70 px-3 py-1 text-xs transition hover:bg-surface/60"
        >
          Add row
        </button>
      </div>

      {rows.length === 0 && (
        <p className="text-xs text-muted-foreground">No rates added yet.</p>
      )}

      {rows.map((r, i) => (
        <div key={i} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">{unitLabel}</span>
            <input
              className={inputClass}
              type="number"
              min={0}
              max={1000000}
              step={unitLabel.toLowerCase().includes("quantity") ? 1 : 0.01}
              value={r.threshold}
              onChange={(e) => set(i, { threshold: e.target.value })}
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Shipping rate ({currency})</span>
            <input
              className={inputClass}
              type="number"
              min={0}
              max={1000000}
              step="0.01"
              value={r.rate}
              onChange={(e) => set(i, { rate: e.target.value })}
            />
          </label>
          <button
            type="button"
            onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
            className="h-10 rounded-full border border-border/70 px-3 text-xs text-destructive transition hover:bg-surface/60"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

export function ShippingRatesPanel({ appId }: { appId: number }) {
  const fetchRates = useServerFn(listShippingRates);
  const save = useServerFn(saveShippingRates);
  const queryClient = useQueryClient();

  const [qtyRows, setQtyRows] = useState<Row[]>([]);
  const [amountRows, setAmountRows] = useState<Row[]>([]);
  const [currency, setCurrency] = useState("AUD");
  const [saving, setSaving] = useState(false);

  const { data, isLoading, error } = useQuery<ShippingRatesResult>({
    queryKey: ["shipping-rates", appId],
    queryFn: () => fetchRates({ data: { appId } }),
  });

  useEffect(() => {
    setCurrency(detectCurrency());
  }, []);

  useEffect(() => {
    if (!data) return;
    setQtyRows(
      data.rates
        .filter((r) => r.rateType === "qty")
        .map((r) => ({ threshold: String(r.threshold), rate: String(r.rate) })),
    );
    setAmountRows(
      data.rates
        .filter((r) => r.rateType === "amount")
        .map((r) => ({ threshold: String(r.threshold), rate: String(r.rate) })),
    );
  }, [data]);

  const preview = useMemo(
    () =>
      [...qtyRows, ...amountRows]
        .filter((r) => r.rate.trim() !== "")
        .slice(0, 1)
        .map((r) => formatMoney(Number(r.rate), currency))[0] ?? null,
    [qtyRows, amountRows, currency],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const dupQty = hasDuplicates(qtyRows);
    if (dupQty) {
      toast.error(`Duplicate quantity ${dupQty}. Each quantity can appear once.`);
      return;
    }
    const dupAmount = hasDuplicates(amountRows);
    if (dupAmount) {
      toast.error(`Duplicate amount ${dupAmount}. Each amount can appear once.`);
      return;
    }

    const rates = [
      ...qtyRows.map((r) => ({ rateType: "qty" as const, ...r })),
      ...amountRows.map((r) => ({ rateType: "amount" as const, ...r })),
    ]
      .filter((r) => r.threshold.trim() !== "" && r.rate.trim() !== "")
      .map((r) => ({
        rateType: r.rateType,
        threshold: Number(r.threshold),
        rate: Number(r.rate),
      }));

    setSaving(true);
    try {
      await save({ data: { appId, currency, rates } });
      toast.success("Shipping rates saved.");
      await queryClient.invalidateQueries({ queryKey: ["shipping-rates", appId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save shipping rates.");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error)
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : "Could not load shipping rates."}
      </p>
    );

  if (!data?.hasProducts) {
    return (
      <p className="rounded-2xl border border-border/60 bg-surface/40 p-6 text-sm text-muted-foreground">
        No products are configured, setup product to create shipping rates
      </p>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="max-w-3xl space-y-6 rounded-2xl border border-border/60 bg-surface/40 p-6 shadow-card"
    >
      <div>
        <h3 className="text-xl font-semibold">Shipping rates</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Currency detected from your location: <strong>{currency}</strong>
          {preview ? ` (e.g. ${preview})` : ""}
        </p>
      </div>

      <RateRows
        label="By quantity"
        unitLabel="Quantity"
        rows={qtyRows}
        currency={currency}
        onChange={setQtyRows}
      />
      <RateRows
        label="By amount"
        unitLabel="Order amount"
        rows={amountRows}
        currency={currency}
        onChange={setAmountRows}
      />

      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-gradient-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save shipping rates"}
      </button>
    </form>
  );
}
