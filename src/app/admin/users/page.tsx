import { AdminSectionPage } from "@/components/admin/admin-section-page";
import { getCurrentAdmin } from "@/lib/auth/current-user";
import { listAuthenticatedUsers } from "@/lib/auth/user-repository";

export default async function AdminUsersPage() {
  await getCurrentAdmin();
  const users = await listAuthenticatedUsers();

  return (
    <AdminSectionPage
      active="Users"
      title="Users"
      description="Review platform users, workspace memberships, role assignments, and support access boundaries."
      cards={[
        {
          title: "Role assignment",
          description: "Super Admin can inspect workspace roles without replacing broker-owner controls.",
          status: "RBAC",
        },
        {
          title: "Account safety",
          description: "Future Firebase Auth actions: disable user, reset auth provider, revoke sessions.",
          status: "next",
        },
        {
          title: "Workspace membership",
          description: "Memberships resolve from workspace subcollections for tenant isolation.",
          status: "ready",
        },
      ]}
      tableTitle="User directory"
      tableRows={users.map((user) => ({
        name: user.name,
        email: user.email,
        role: user.role,
        workspace: user.workspaceId ?? "Platform",
        status: user.status,
      }))}
    />
  );
}
