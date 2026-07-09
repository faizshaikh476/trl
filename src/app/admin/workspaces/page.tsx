import { Building2, CheckCircle2, Save, ShieldAlert } from "lucide-react";
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
      description="Manage broker accounts, plans and listing usage."
      cards={[
        {
          title: "Broker accounts",
          description: "Review every broker workspace in one place.",
          status: "Accounts",
        },
        {
          title: "Listing limits",
          description: "Only published listings count against the assigned plan.",
          status: "Plans",
        },
        {
          title: "Catalogue",
          description: "Open each broker’s public property catalogue.",
          status: "Public",
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
            const usagePercent = limit ? Math.min(100, Math.round((liveCount / limit) * 100)) : 0;
            const remaining = limit ? Math.max(0, limit - liveCount) : 0;
            const isFull = limit > 0 && liveCount >= limit;
            return (
              <div key={workspace.id} className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_28rem]">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-cyan-300/10 text-cyan-200">
                    <Building2 className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{workspace.name}</h3>
                      <Badge className="capitalize" variant="secondary">
                        {workspace.status}
                      </Badge>
                      {plan ? (
                        <Badge className="bg-cyan-300 text-slate-950">{plan.name}</Badge>
                      ) : (
                        <Badge className="bg-amber-300 text-slate-950">No active plan</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{workspace.city || "City not set"}</p>
                    <div className="mt-4 max-w-xl rounded-lg border border-white/10 bg-slate-950/60 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-slate-400">Published listing usage</p>
                          <p className="mt-1 text-lg font-semibold">
                            {liveCount}/{limit || "unassigned"} live
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {isFull ? <ShieldAlert className="size-4 text-amber-300" /> : <CheckCircle2 className="size-4 text-emerald-300" />}
                          <span className={isFull ? "text-amber-200" : "text-emerald-200"}>
                            {limit ? (isFull ? "Upgrade needed" : `${remaining} slots left`) : "Assign plan"}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={isFull ? "h-full rounded-full bg-amber-300" : "h-full rounded-full bg-cyan-300"}
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <form
                  action={assignWorkspacePlanAction.bind(null, workspace.id)}
                  className="grid gap-3 rounded-lg border border-white/10 bg-slate-950/60 p-4 sm:grid-cols-[1fr_auto]"
                >
                  <label className="grid gap-1 text-sm font-medium text-slate-300">
                    Assigned plan
                    <select
                      name="planId"
                      defaultValue={workspace.planId}
                      className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white"
                    >
                      {plans.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} · {item.activeListingLimit} live · {item.priceLabel}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs font-normal text-slate-500">
                      Changes apply to WhatsApp publishing, dashboard publishing, and upgrade prompts.
                    </span>
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
