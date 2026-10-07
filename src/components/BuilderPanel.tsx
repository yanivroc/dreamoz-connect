import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import type { CurrentUser } from "@/lib/auth.functions";
import { WebAppsPanel } from "@/components/WebAppsPanel";
import { WebPagesPanel } from "@/components/WebPagesPanel";
import { AppSettingsPanel } from "@/components/AppSettingsPanel";
import { ShippingRatesPanel } from "@/components/ShippingRatesPanel";
import { ApiPanel } from "@/components/ApiPanel";
import { OrdersPanel } from "@/components/OrdersPanel";
import { ContactsPanel } from "@/components/ContactsPanel";
import { listWebApps, type WebApp } from "@/lib/webapps.functions";

type Tab = "apps" | "pages" | "settings" | "shipping" | "orders" | "contacts" | "api";

const tabs: { id: Tab; label: string }[] = [
  { id: "apps", label: "Web apps" },
  { id: "pages", label: "Web pages" },
  { id: "settings", label: "General settings" },
  { id: "shipping", label: "Shipping rates" },
  { id: "orders", label: "Orders" },
  { id: "contacts", label: "Contacts" },
  { id: "api", label: "API" },
];

export function BuilderPanel({ user }: { user: CurrentUser }) {
  const [tab, setTab] = useState<Tab>("apps");
  const [appId, setAppId] = useState<number | null>(null);

  const fetchApps = useServerFn(listWebApps);
  const { data: apps } = useQuery<WebApp[]>({
    queryKey: ["web-apps"],
    queryFn: () => fetchApps(),
  });

  const list = apps ?? [];
  const selected = appId ?? list[0]?.id ?? null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg border px-3 py-1.5 text-sm transition ${
              tab === t.id
                ? "border-primary/60 bg-primary/10 font-semibold text-primary"
                : "border-border/60 text-muted-foreground hover:bg-surface/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab !== "apps" && (
        <label className="block max-w-sm space-y-1.5 text-sm">
          <span className="text-muted-foreground">Web app</span>
          <select
            className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
            value={selected ?? ""}
            onChange={(e) => setAppId(Number(e.target.value))}
          >
            {list.length === 0 && <option value="">No web apps yet</option>}
            {list.map((app) => (
              <option key={app.id} value={app.id}>
                {app.title}
              </option>
            ))}
          </select>
        </label>
      )}

      {tab === "apps" && <WebAppsPanel isAdmin={user.role === "admin"} />}

      {tab !== "apps" && selected === null && (
        <p className="text-sm text-muted-foreground">
          Create a web app first on the “Web apps” tab.
        </p>
      )}

      {tab === "pages" && selected !== null && <WebPagesPanel appId={selected} />}
      {tab === "settings" && selected !== null && <AppSettingsPanel appId={selected} />}
      {tab === "shipping" && selected !== null && <ShippingRatesPanel appId={selected} />}
      {tab === "orders" && selected !== null && <OrdersPanel appId={selected} />}
      {tab === "contacts" && selected !== null && <ContactsPanel appId={selected} />}
      {tab === "api" && selected !== null && <ApiPanel appId={selected} user={user} />}
    </div>
  );
}
