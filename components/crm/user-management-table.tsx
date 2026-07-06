"use client";

import { setUserStatusAction, updateUserRoleAction } from "@/app/(app)/admin-tools/users/actions";
import type { AppUserSummary } from "@/lib/crm/admin-mutations";
import { formatCrmDateTime } from "@/lib/crm/timezone";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

function fieldClassName() {
  return "h-9 rounded-control border border-border bg-white px-2 text-sm text-text-body outline-none focus:border-brand-forest";
}

function buttonClassName(tone: "primary" | "secondary" | "danger" = "secondary") {
  const base =
    "inline-flex h-9 items-center justify-center rounded-control px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";
  if (tone === "primary") return `${base} bg-brand-forest text-white hover:bg-brand-deep`;
  if (tone === "danger") return `${base} border border-red-200 bg-red-50 text-red-800 hover:bg-red-100`;
  return `${base} border border-border bg-surface text-text-body hover:border-border-strong hover:bg-surface-subtle`;
}

export function UserManagementTable({
  currentProfileId,
  users
}: {
  currentProfileId: string;
  users: AppUserSummary[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const changeRole = (profileId: string, role: "admin" | "outreach_editor") => {
    setError(null);
    startTransition(async () => {
      const result = await updateUserRoleAction({ profileId, role });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const changeStatus = (profileId: string, status: "active" | "inactive") => {
    setError(null);
    startTransition(async () => {
      const result = await setUserStatusAction({ profileId, status });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="mt-6 space-y-3">
      {error ? (
        <p className="rounded-card border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}
      <div className="overflow-hidden rounded-card border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-subtle text-text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Last active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-text-heading">{user.displayName}</p>
                  <p className="text-text-muted">{user.email}</p>
                </td>
                <td className="px-4 py-3">
                  <select
                    className={fieldClassName()}
                    defaultValue={user.role}
                    disabled={pending}
                    onChange={(event) => changeRole(user.id, event.target.value as "admin" | "outreach_editor")}
                  >
                    <option value="admin">Administrator</option>
                    <option value="outreach_editor">Outreach editor</option>
                  </select>
                </td>
                <td className="px-4 py-3 capitalize">{user.status}</td>
                <td className="px-4 py-3 text-text-muted">
                  {user.lastActiveAt ? formatCrmDateTime(user.lastActiveAt) : "Never"}
                </td>
                <td className="px-4 py-3 text-right">
                  {user.id === currentProfileId ? (
                    <span className="text-xs text-text-muted">This is you</span>
                  ) : (
                    <button
                      className={buttonClassName(user.status === "active" ? "danger" : "primary")}
                      disabled={pending}
                      onClick={() => changeStatus(user.id, user.status === "active" ? "inactive" : "active")}
                      type="button"
                    >
                      {user.status === "active" ? "Deactivate" : "Reactivate"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
