import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listArchivedPages,
  restoreWebPage,
  purgeWebPage,
  type ArchivedPage,
} from "@/lib/webpages.functions";
import { Button } from "@/components/ui/button";

export function ArchivedPagesPanel({ appId }: { appId: number }) {
  const fetchArchived = useServerFn(listArchivedPages);
  const restore = useServerFn(restoreWebPage);
  const purge = useServerFn(purgeWebPage);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const { data } = useQuery<ArchivedPage[]>({
    queryKey: ["archived-pages", appId],
    queryFn: () => fetchArchived({ data: { appId } }),
  });
  const pages = data ?? [];
  if (pages.length === 0) return null;
  const ids = new Set(pages.map((p) => p.id));
  const titleOf = (id: number | null) => pages.find((p) => p.id === id)?.title;

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["archived-pages", appId] });
    await qc.invalidateQueries({ queryKey: ["web-pages", appId] });
  };

  async function onRestore(id: number) {
    setBusyId(id);
    try {
      await restore({ data: { id } });
      toast.success("Page restored.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not restore the page.");
    } finally {
      setBusyId(null);
    }
  }

  async function onPurge(id: number) {
    setBusyId(id);
    try {
      await purge({ data: { id } });
      toast.success("Page permanently deleted. Past orders are not affected.");
      setConfirmId(null);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the page.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="font-semibold">Archived pages ({pages.length})</span>
        <span className="text-sm text-muted-foreground">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <ul className="mt-4 space-y-2">
          {pages.map((p) => {
            const parentArchived = p.parentId !== null && ids.has(p.parentId);
            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {p.title}
                    {p.productEnabled && (
                      <span className="ml-2 text-xs text-primary">Product</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Archived {new Date(p.deletedAt).toLocaleString()}
                    {parentArchived && ` · sub page of "${titleOf(p.parentId)}"`}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!parentArchived && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === p.id}
                      onClick={() => void onRestore(p.id)}
                    >
                      Restore
                    </Button>
                  )}
                  {confirmId === p.id ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busyId === p.id}
                      onClick={() => void onPurge(p.id)}
                    >
                      Confirm delete forever
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setConfirmId(p.id)}>
                      Delete forever
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
