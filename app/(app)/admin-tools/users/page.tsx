import { PageHeader } from "@/components/crm/page-header";
import { UserManagementTable } from "@/components/crm/user-management-table";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/roles";
import { listAppUsers } from "@/lib/crm/admin-mutations";

export default async function AdminUsersPage() {
  const profile = await requirePermission(PERMISSIONS.MANAGE_USERS);
  const users = await listAppUsers();

  return (
    <section className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Administration"
        title="Application users"
        subtitle="Only administrators can view this page or change a user's role or access."
      />
      {"error" in users ? (
        <p className="rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-800">{users.error}</p>
      ) : (
        <UserManagementTable currentProfileId={profile.id} users={users} />
      )}
    </section>
  );
}
