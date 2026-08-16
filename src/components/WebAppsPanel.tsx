import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listWebApps,
  createWebApp,
  updateWebApp,
  deleteWebApp,
  toggleWebApp,
  type WebApp,
} from "@/lib/webapps.functions";

type FormState = {
  title: string;
  description: string;
  email: string;
  link: string;
  enabled: boolean;
};

const empty: FormState = {
  title: "",
  description: "",
  email: "",
  link: "",
  enabled: true,
};

const inputClass =
  "w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm outline-none transition focus:border-primary";

function fmt(value: string) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toISOString().slice(0, 16).replace("T", " ");
}

export function WebAppsPanel({ isAdmin }: { isAdmin: boolean }) {
  const fetchApps = useServerFn(listWebApps);
  const create = useServerFn(createWebApp);
  const update = useServerFn(updateWebApp);
  const remove = useServerFn(deleteWebApp);
  const toggle = useServerFn(toggleWebApp);
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery<WebApp[]>({
    queryKey: ["web-apps"],
    queryFn: () => fetchApps(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["web-apps"] });

  function startEdit(app: WebApp) {
    setEditingId(app.id);
    setForm({
      title: app.title,
      description: app.description,
      email: app.email,
      link: app.link,
      enabled: app.enabled,
    });
  }

  function reset() {
    setEditingId(null);
    setForm(empty);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    setSaving(true);
    try {
      if (editingId === null) {
        await create({ data: form });
        toast.success("Web app created.");
      } else {
        await update({ data: { id: editingId, ...form } });
        toast.success("Web app updated.");
      }
      reset();
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function run(id: number, fn: () => Promise<unknown>, done: string) {
    setBusy(id);
    try {
      await fn();
      toast.success(done);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-10">
      <form
        onSubmit={submit}
        className="max-w-3xl space-y-4 rounded-2xl border border-border/60 bg-surface/40 p-6 shadow-card"
      >
        <h2 className="text-xl font-semibold">
          {editingId === null ? "Add a web app" : "Edit web app"}
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Title</span>
            <input
              className={inputClass}
              value={form.title}
              maxLength={200}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Email</span>
            <input
              className={inputClass}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
        </div>

        <label className="block space-y-1.5 text-sm">
          <span className="text-muted-foreground">Hyperlink</span>
          <input
            className={inputClass}
            placeholder="https://example.com"
            value={form.link}
            onChange={(e) => setForm({ ...form, link: e.target.value })}
          />
        </label>

        <label className="block space-y-1.5 text-sm">
          <span className="text-muted-foreground">Description</span>
          <textarea
            className={`${inputClass} min-h-28`}
            maxLength={4000}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
          />
          <span>Enabled</span>
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-gradient-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : editingId === null ? "Create" : "Save changes"}
          </button>
          {editingId !== null && (
            <button
              type="button"
              onClick={reset}
              className="rounded-full border border-border/70 px-5 py-2.5 text-sm transition hover:bg-surface/60"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          {isAdmin ? "All web apps" : "Your web apps"}
        </h2>

        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && (
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : "Could not load your web apps."}
          </p>
        )}
        {!isLoading && !error && (data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nothing here yet — add your first web app above.
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {(data ?? []).map((app) => (
            <article
              key={app.id}
              className="rounded-2xl border border-border/60 bg-surface/40 p-5 shadow-card"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold">{app.title}</h3>
                <span
                  className={`rounded-full px-3 py-1 text-xs ${
                    app.enabled
                      ? "bg-primary/15 text-primary"
                      : "bg-muted/40 text-muted-foreground"
                  }`}
                >
                  {app.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>

              {app.description && (
                <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
                  {app.description}
                </p>
              )}

              <dl className="mt-4 space-y-1.5 text-sm">
                {isAdmin && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Owner</dt>
                    <dd>{app.ownerName || `#${app.userId}`}</dd>
                  </div>
                )}
                {app.email && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Email</dt>
                    <dd>
                      <a className="hover:text-primary" href={`mailto:${app.email}`}>
                        {app.email}
                      </a>
                    </dd>
                  </div>
                )}
                {app.link && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Link</dt>
                    <dd className="truncate">
                      <a
                        className="hover:text-primary"
                        href={app.link}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {app.link}
                      </a>
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Created</dt>
                  <dd>{fmt(app.createdAt)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Updated</dt>
                  <dd>{fmt(app.updatedAt)}</dd>
                </div>
              </dl>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(app)}
                  className="rounded-full border border-border/70 px-3 py-1 text-xs transition hover:bg-surface/60"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={busy === app.id}
                  onClick={() =>
                    void run(
                      app.id,
                      () => toggle({ data: { id: app.id, enabled: !app.enabled } }),
                      app.enabled ? "Disabled." : "Enabled.",
                    )
                  }
                  className="rounded-full border border-border/70 px-3 py-1 text-xs transition hover:bg-surface/60 disabled:opacity-60"
                >
                  {app.enabled ? "Disable" : "Enable"}
                </button>
                <button
                  type="button"
                  disabled={busy === app.id}
                  onClick={() => {
                    if (!window.confirm(`Delete "${app.title}"?`)) return;
                    if (editingId === app.id) reset();
                    void run(app.id, () => remove({ data: { id: app.id } }), "Deleted.");
                  }}
                  className="rounded-full border border-destructive/60 px-3 py-1 text-xs text-destructive transition hover:bg-destructive/10 disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
