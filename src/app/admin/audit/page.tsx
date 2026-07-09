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
      description="Review important account and listing activity."
      cards={[
        {
          title: "Protected history",
          description: "Audit records cannot be edited or deleted.",
          status: "Protected",
        },
        {
          title: "Listing activity",
          description: "Track publishing, archiving and ownership changes.",
          status: "Active",
        },
        {
          title: "Account access",
          description: "Review administrative access to broker accounts.",
          status: "Secure",
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
