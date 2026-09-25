import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  deleteContact,
  listContacts,
  setContactRead,
  type ContactMessage,
} from "@/lib/contacts.functions";
import { formatDateTime } from "@/lib/format";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ContactsPanel({ appId }: { appId: number }) {
  const qc = useQueryClient();
  const fetchList = useServerFn(listContacts);
  const markRead = useServerFn(setContactRead);
  const remove = useServerFn(deleteContact);
  const [openId, setOpenId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ContactMessage | null>(null);
  const [busy, setBusy] = useState(false);
  const key = ["contacts", appId];

  const { data, isLoading, error } = useQuery<ContactMessage[]>({
    queryKey: key,
    queryFn: () => fetchList({ data: { appId } }),
  });

  async function toggle(m: ContactMessage) {
    const open = openId === m.id;
    setOpenId(open ? null : m.id);
    if (!open && !m.isRead) {
      try {
        await markRead({ data: { id: m.id, read: true } });
        qc.setQueryData<ContactMessage[]>(key, (prev) =>
          (prev ?? []).map((x) => (x.id === m.id ? { ...x, isRead: true } : x)),
        );
      } catch {
        // non-critical
      }
    }
  }

  async function onDelete() {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      await remove({ data: { id: pendingDelete.id } });
      qc.setQueryData<ContactMessage[]>(key, (prev) =>
        (prev ?? []).filter((x) => x.id !== pendingDelete.id),
      );
      toast.success("Message deleted.");
      setPendingDelete(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete the message.");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading contacts…</p>;
  if (error) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : "Could not load contacts."}
      </p>
    );
  }
  const list = data ?? [];
  if (list.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 p-6 text-sm text-muted-foreground">
        No messages yet. Tick “This is a contact page” on a web page to show a contact form;
        messages sent through it appear here.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {list.map((m) => {
          const open = openId === m.id;
          return (
            <li key={m.id} className="rounded-xl border border-border/60 bg-card">
              <button
                type="button"
                onClick={() => void toggle(m)}
                className="grid w-full gap-2 px-4 py-3 text-left text-sm md:grid-cols-[auto_1fr_1fr_1fr_auto] md:items-center md:gap-4"
              >
                <span className="text-muted-foreground">{open ? "▾" : "▸"}</span>
                <span>
                  <span className={m.isRead ? "text-foreground" : "font-semibold text-foreground"}>
                    {m.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {formatDateTime(m.createdAt)}
                  </span>
                </span>
                <span className="text-muted-foreground">{m.email}</span>
                <span className="text-muted-foreground">{m.pageTitle || `Page #${m.pageId}`}</span>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    m.isRead ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"
                  }`}
                >
                  {m.isRead ? "Read" : "New"}
                </span>
              </button>
              {open && (
                <div className="space-y-4 border-t border-border/60 px-4 py-4 text-sm">
                  <div className="grid gap-2 md:grid-cols-3">
                    <p>
                      <span className="text-muted-foreground">Email: </span>
                      <a href={`mailto:${m.email}`} className="text-primary underline">
                        {m.email}
                      </a>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Phone: </span>
                      <a href={`tel:${m.phone}`} className="text-primary underline">
                        {m.phone}
                      </a>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Page: </span>
                      {m.pageTitle}
                    </p>
                  </div>
                  <p className="whitespace-pre-wrap text-foreground">{m.message}</p>
                  {m.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {m.attachments.map((a) => (
                        <a
                          key={a.id}
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-border/70 px-3 py-1 text-xs hover:bg-surface/60"
                        >
                          {a.name}
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await markRead({ data: { id: m.id, read: !m.isRead } });
                        qc.setQueryData<ContactMessage[]>(key, (prev) =>
                          (prev ?? []).map((x) =>
                            x.id === m.id ? { ...x, isRead: !m.isRead } : x,
                          ),
                        );
                      }}
                      className="rounded-full border border-border/70 px-4 py-1.5 text-xs hover:bg-surface/60"
                    >
                      Mark as {m.isRead ? "unread" : "read"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(m)}
                      className="rounded-full border border-destructive/50 px-4 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => {
          if (!o && !busy) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this message?</AlertDialogTitle>
            <AlertDialogDescription>
              The message from {pendingDelete?.name} and its attachments will be removed
              permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void onDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
