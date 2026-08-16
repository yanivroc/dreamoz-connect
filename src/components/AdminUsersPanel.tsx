import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listUsers,
  setUserRole,
  deleteUser,
  adminResetPassword,
  type AdminUser,
} from "@/lib/admin.functions";

export function AdminUsersPanel({ currentUserId }: { currentUserId: number }) {
  const fetchUsers = useServerFn(listUsers);
  const changeRole = useServerFn(setUserRole);
  const removeUser = useServerFn(deleteUser);
  const resetPassword = useServerFn(adminResetPassword);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery<AdminUser[]>({
    queryKey: ["admin-users"],
    queryFn: () => fetchUsers(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-users"] });

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

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading users…</p>;
  if (error)
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : "Could not load users."}
      </p>
    );

  return (
    <div className="overflow-x-auto rounded-xl border border-border/60">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-surface/60 text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Joined</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {(data ?? []).map((u) => {
            const isSelf = u.id === currentUserId;
            return (
              <tr key={u.id} className="border-t border-border/60">
                <td className="px-4 py-3">{u.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    disabled={isSelf || busy === u.id}
                    onChange={(e) =>
                      run(
                        u.id,
                        () =>
                          changeRole({
                            data: { id: u.id, role: e.target.value as "user" | "admin" },
                          }),
                        "Role updated.",
                      )
                    }
                    className="rounded-md border border-border/70 bg-background px-2 py-1 text-sm disabled:opacity-60"
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {u.createdAt ? u.createdAt.slice(0, 10) : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy === u.id}
                      onClick={() => {
                        const pwd = window.prompt(
                          `New password for ${u.email} (min 8 characters):`,
                        );
                        if (!pwd) return;
                        if (pwd.length < 8) {
                          toast.error("Password must be at least 8 characters.");
                          return;
                        }
                        void run(
                          u.id,
                          () => resetPassword({ data: { id: u.id, password: pwd } }),
                          "Password reset.",
                        );
                      }}
                      className="rounded-full border border-border/70 px-3 py-1 text-xs transition hover:bg-surface/60 disabled:opacity-60"
                    >
                      Reset password
                    </button>
                    <button
                      type="button"
                      disabled={isSelf || busy === u.id}
                      onClick={() => {
                        if (!window.confirm(`Delete ${u.email}? This cannot be undone.`))
                          return;
                        void run(
                          u.id,
                          () => removeUser({ data: { id: u.id } }),
                          "User deleted.",
                        );
                      }}
                      className="rounded-full border border-destructive/60 px-3 py-1 text-xs text-destructive transition hover:bg-destructive/10 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
