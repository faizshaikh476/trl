import { AdminSectionPage } from "@/components/admin/admin-section-page";
import { auditLogService } from "@/lib/audit/audit-log-service";
import { getCurrentAdmin } from "@/lib/auth/current-user";
import { workspaceService } from "@/lib/workspaces/workspace-service";

export default async function AdminAuditPage() {
  await getCurrentAdmin();
  const workspace = (await workspaceService.list())[0];
  const logs = workspace ? await auditLogService.listByWorkspace(workspace.id) : [];

  return (
    <AdminSectionPage
      active="Audit logs"
      title="Audit logs"
      description="Review important platform and workspace actions including role changes, listing actions, AI generations, and support impersonation."
      cards={[
        {
          title: "Immutable records",
          description: "Rules now prevent client updates and deletes for audit records.",
          status: "locked",
        },
        {
          title: "Workspace actions",
          description: "Listing publish, archive, lead assignment, and AI generation events should all emit audit rows.",
          status: "active",
        },
        {
          title: "Support access",
          description: "Impersonation start/stop events need first-class audit tracking.",
          status: "next",
        },
      ]}
      tableTitle="Recent audit records"
      tableRows={logs.map((log) => ({
        action: log.action,
        actor: log.actorId,
        target: log.targetId ?? "-",
        date: new Date(log.createdAt).toLocaleDateString("en-IN"),
      }))}
    />
  );
}
