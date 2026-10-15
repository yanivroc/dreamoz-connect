import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { saveMyAbn } from "@/lib/auth.functions";

/** One ABN per account — shown on all of this account's invoices. */
export function AbnField({ initial }: { initial: string }) {
  const save = useServerFn(saveMyAbn);
  const router = useRouter();
  const qc = useQueryClient();
  const [abn, setAbn] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function onSave() {
    setSaving(true);
    try {
      const res = await save({ data: { abn } });
      setAbn(res.abn);
      toast.success("ABN saved.");
      await qc.invalidateQueries();
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save ABN.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-3 rounded-2xl border border-border/60 bg-surface/40 p-6 shadow-card">
      <h2 className="text-xl font-semibold">Business details</h2>
      <label className="block max-w-xs space-y-1.5 text-sm">
        <span className="text-muted-foreground">ABN</span>
        <input
          className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
          inputMode="numeric"
          maxLength={14}
          placeholder="12 345 678 901"
          value={abn}
          onChange={(e) => setAbn(e.target.value)}
        />
        <span className="block text-xs text-muted-foreground">
          Required if any of your pages sell products. Shown on your invoices.
        </span>
      </label>
      <button
        type="button"
        onClick={() => void onSave()}
        disabled={saving}
        className="rounded-full bg-gradient-accent px-5 py-2 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save ABN"}
      </button>
    </div>
  );
}
