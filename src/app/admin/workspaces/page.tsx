import { Building2, Save } from "lucide-react";
import { AdminSectionPage } from "@/components/admin/admin-section-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentAdmin } from "@/lib/auth/current-user";
import { billingService } from "@/lib/billing/billing-service";
import { listingService } from "@/lib/listings/listing-service";
import { workspaceService } from "@/lib/workspaces/workspace-service";
import { assignWorkspacePlanAction } from "@/server-actions/billing-actions";

export default async function AdminWorkspacesPage() {
  await getCurrentAdmin();
  const [workspaces, plans, allListings] = await Promise.all([
    workspaceService.list(),
    billingService.listActivePlans(),
    listingService.listAll(),
  ]);
  const planById = new Map(plans.map((plan) => [plan.id, plan]));

  return (
    <AdminSectionPage
      active="Workspaces"
      title="Workspaces"
      description="Manage broker accounts, plan assignment, support access, and moderation state."
      cards={[
        {
          title: "Workspace control",
          description: "Assign plans and review active usage for every broker workspace.",
          status: "platform",
        },
        {
          title: "Listing limits",
          description: "Only published listings count against the assigned plan.",
          status: "live",
        },
        {
          title: "Custom domains",
          description: "Track custom domain readiness before DNS and Vercel domain setup.",
          status: "ready",
        },
      ]}
    >
      <section className="overflow-hidden rounded-lg border border-cyan-300/10 bg-white/[0.06] text-white">
        <div className="border-b border-cyan-300/10 p-5">
          <h2 className="text-xl font-semibold">Broker workspaces</h2>
        </div>
        <div className="divide-y divide-cyan-300/10">
          {workspaces.map((workspace) => {
            const plan = planById.get(workspace.planId);
            const liveCount = allListings.filter(
              (listing) => listing.workspaceId === workspace.id && listing.status === "published",
            ).length;
            const limit = plan?.activeListingLimit ?? 0;
            return (
              <div key={workspace.id} className="grid gap-4 p-5 xl:grid-cols-[1fr_26rem]">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-cyan-300/10 text-cyan-200">
                    <Building2 className="size-5" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{workspace.name}</h3>
                      <Badge className="capitalize" variant="secondary">
                        {workspace.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{workspace.city || "City not set"}</p>
                    <p className="mt-2 text-sm text-slate-300">
                      {liveCount}/{limit || "unassigned"} published listings
                    </p>
                  </div>
                </div>

                <form action={assignWorkspacePlanAction.bind(null, workspace.id)} className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <label className="grid gap-1 text-sm font-medium text-slate-300">
                    Assigned plan
                    <select
                      name="planId"
                      defaultValue={workspace.planId}
                      className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white"
                    >
                      {plans.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} · {item.activeListingLimit} live
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex items-end">
                    <Button type="submit" className="w-full bg-cyan-300 text-slate-950 hover:bg-cyan-200">
                      <Save className="size-4" />
                      Save
                    </Button>
                  </div>
                </form>
              </div>
            );
          })}
        </div>
      </section>
    </AdminSectionPage>
  );
}
