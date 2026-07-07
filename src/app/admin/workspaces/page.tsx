import { AdminSectionPage } from "@/components/admin/admin-section-page";
import { getCurrentAdmin } from "@/lib/auth/current-user";
import { workspaceService } from "@/lib/workspaces/workspace-service";

export default async function AdminWorkspacesPage() {
  await getCurrentAdmin();
  const workspaces = await workspaceService.list();

  return (
    <AdminSectionPage
      active="Workspaces"
      title="Workspaces"
      description="Manage broker accounts, workspace status, plan assignment, support access, and moderation state."
      cards={[
        {
          title: "Workspace control",
          description: "Create, edit, suspend, and review broker workspaces from one platform surface.",
          status: "platform",
        },
        {
          title: "Support impersonation",
          description: "Audited support access into broker workspaces with clear operator boundaries.",
          status: "next",
        },
        {
          title: "Custom domains",
          description: "Track custom domain readiness before DNS and Vercel domain setup.",
          status: "ready",
        },
      ]}
      tableTitle="Broker workspaces"
      tableRows={workspaces.map((workspace) => ({
        name: workspace.name,
        city: workspace.city,
        plan: workspace.planId,
        status: workspace.status,
        owner: workspace.ownerId,
      }))}
    />
  );
}
