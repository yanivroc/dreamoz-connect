import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getBillingOverview,
  listUserAccess,
  extendTrial,
  setPlanUntil,
  updatePlanSettings,
  type UserAccessRow,
} from "@/lib/billing.functions";
import { computeAccess, type PlanSetting } from "@/lib/plans";
import { formatDate } from "@/lib/format";

const input =
  "w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm outline-none transition focus:border-primary";

export function PlanSettingsPanel() {
  const fetchOverview = useServerFn(getBillingOverview);
  const save = useServerFn(updatePlanSettings);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["billing"], queryFn: () => fetchOverview() });
  const [plans, setPlans] = useState<PlanSetting[]>([]);
  const [trialDays, setTrialDays] = useState(14);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setPlans(data.plans);
      setTrialDays(data.trialDays);
    }
  }, [data]);

  const update = (id: string, patch: Partial<PlanSetting>) =>
    setPlans((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  async function onSave() {
    setSaving(true);
    try {
      await save({
        data: {
          trialDays,
          plans: plans.map((p) => ({
            id: p.id,
            label: p.label,
            amountCents: p.amountCents,
            days: p.days,
            enabled: p.enabled,
          })),
        },
      });
      toast.success("Plan settings saved.");
      await qc.invalidateQueries({ queryKey: ["billing"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-10">
      <div className="max-w-2xl space-y-5 rounded-2xl border border-border/60 bg-surface/40 p-6 shadow-card">
        <h2 className="text-xl font-semibold">Plan settings</h2>
        <label className="block max-w-xs space-y-1.5 text-sm">
          <span className="text-muted-foreground">Free trial length (days, for new sign-ups)</span>
          <input
            type="number"
            min={1}
            max={365}
            className={input}
            value={trialDays}
            onChange={(e) => setTrialDays(Number(e.target.value))}
          />
        </label>
        {plans.map((p) => (
          <div key={p.id} className="grid gap-3 rounded-xl border border-border/60 p-4 sm:grid-cols-4">
            <label className="space-y-1.5 text-sm">
              <span className="text-muted-foreground">Name</span>
              <input className={input} maxLength={40} value={p.label} onChange={(e) => update(p.id, { label: e.target.value })} />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="text-muted-foreground">Price ({p.currency})</span>
              <input
                type="number"
                min={0}
                step="0.01"
                className={input}
                value={(p.amountCents / 100).toString()}
                onChange={(e) => update(p.id, { amountCents: Math.round(Number(e.target.value) * 100) })}
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="text-muted-foreground">Days of access</span>
              <input
                type="number"
                min={1}
                max={3660}
                className={input}
                value={p.days}
                onChange={(e) => update(p.id, { days: Number(e.target.value) })}
              />
            </label>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input type="checkbox" checked={p.enabled} onChange={(e) => update(p.id, { enabled: e.target.checked })} />
              <span>Available</span>
            </label>
          </div>
        ))}
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-full bg-gradient-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save plan settings"}
        </button>
      </div>

      <UserAccessTable />
    </div>
  );
}

function UserAccessTable() {
  const fetchUsers = useServerFn(listUserAccess);
  const extend = useServerFn(extendTrial);
  const setPlan = useServerFn(setPlanUntil);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["user-access"], queryFn: () => fetchUsers() });

  async function run(fn: () => Promise<unknown>, msg: string) {
    try {
      await fn();
      toast.success(msg);
      await qc.invalidateQueries({ queryKey: ["user-access"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed.");
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">User access</h2>
      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-surface/60 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Trial ends</th>
              <th className="px-4 py-3 font-medium">Plan ends</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((u) => (
              <UserRow key={u.id} u={u} onExtend={(d) => run(() => extend({ data: { id: u.id, days: d } }), "Trial extended.")} onSetPlan={(plan, until) => run(() => setPlan({ data: { id: u.id, plan, until } }), "Plan updated.")} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserRow({
  u,
  onExtend,
  onSetPlan,
}: {
  u: UserAccessRow;
  onExtend: (days: number) => void;
  onSetPlan: (plan: "none" | "monthly" | "annual", until: string | null) => void;
}) {
  const [days, setDays] = useState(7);
  const [plan, setPlan] = useState<"none" | "monthly" | "annual">(
    u.plan === "monthly" || u.plan === "annual" ? u.plan : "monthly",
  );
  const [until, setUntil] = useState(u.planExpiresAt ? u.planExpiresAt.slice(0, 10) : "");
  const access = computeAccess(u);
  if (u.role === "admin") {
    return (
      <tr className="border-t border-border/60">
        <td className="px-4 py-3">{u.name}<div className="text-xs text-muted-foreground">{u.email}</div></td>
        <td className="px-4 py-3">admin</td>
        <td className="px-4 py-3" colSpan={3}>Always has access</td>
      </tr>
    );
  }
  return (
    <tr className="border-t border-border/60 align-top">
      <td className="px-4 py-3">{u.name}<div className="text-xs text-muted-foreground">{u.email}</div></td>
      <td className={`px-4 py-3 ${access.state === "expired" ? "text-destructive" : ""}`}>
        {access.state}{access.state !== "expired" ? ` (${access.daysLeft}d)` : ""}
      </td>
      <td className="px-4 py-3">{u.trialEndsAt ? formatDate(u.trialEndsAt) : "—"}</td>
      <td className="px-4 py-3">{u.planExpiresAt ? `${formatDate(u.planExpiresAt)} (${u.plan})` : "—"}</td>
      <td className="space-y-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-16 rounded-md border border-border/70 bg-background px-2 py-1" />
          <button type="button" onClick={() => onExtend(days)} className="rounded-md border border-border/70 px-2 py-1 hover:bg-surface/60">Add trial days</button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={plan} onChange={(e) => setPlan(e.target.value as typeof plan)} className="rounded-md border border-border/70 bg-background px-2 py-1">
            <option value="monthly">monthly</option>
            <option value="annual">annual</option>
            <option value="none">none (remove)</option>
          </select>
          <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} disabled={plan === "none"} className="rounded-md border border-border/70 bg-background px-2 py-1" />
          <button
            type="button"
            onClick={() => (plan === "none" || until ? onSetPlan(plan, plan === "none" ? null : until) : undefined)}
            className="rounded-md border border-border/70 px-2 py-1 hover:bg-surface/60"
          >
            Set plan
          </button>
        </div>
      </td>
    </tr>
  );
}
