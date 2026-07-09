import { Building2, Save, UserRound } from "lucide-react";
import { AdminSectionPage } from "@/components/admin/admin-section-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentAdmin } from "@/lib/auth/current-user";
import { listAuthenticatedUsers } from "@/lib/auth/user-repository";
import { billingService } from "@/lib/billing/billing-service";
import { listingService } from "@/lib/listings/listing-service";
import { workspaceService } from "@/lib/workspaces/workspace-service";
import { assignWorkspacePlanAction } from "@/server-actions/billing-actions";

export default async function AdminUsersPage() {
  await getCurrentAdmin();
  const [users, workspaces, plans, listings] = await Promise.all([
    listAuthenticatedUsers(),
    workspaceService.list(),
    billingService.listActivePlans(),
    listingService.listAll(),
  ]);
  const workspaceById = new Map(workspaces.map((workspace) => [workspace.id, workspace]));
  const planById = new Map(plans.map((plan) => [plan.id, plan]));
  const brokerUsers = users.filter((user) => user.workspaceId);
  const platformUsers = users.filter((user) => !user.workspaceId);

  return (
    <AdminSectionPage
      active="Users"
      title="Users"
      description="Manage broker accounts, access and plan assignments."
      cards={[
        {
          title: "Access",
          description: "Review each user’s role and workspace.",
          status: "Users",
        },
        {
          title: "Plans",
          description: "Assign a plan to any broker workspace.",
          status: "Manage",
        },
        {
          title: "Broker accounts",
          description: `${brokerUsers.length} active broker user${brokerUsers.length === 1 ? "" : "s"}.`,
          status: "Active",
        },
      ]}
    >
      <section className="overflow-hidden rounded-lg border border-cyan-300/10 bg-white/[0.06] text-white">
        <div className="border-b border-cyan-300/10 p-5">
          <h2 className="text-xl font-semibold">Broker users and plans</h2>
          <p className="mt-1 text-sm text-slate-400">
            Assign plans at workspace level. Every user in that broker workspace shares the same live listing limit.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-white/[0.04] text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Workspace</th>
                <th className="px-5 py-3 font-medium">Plan usage</th>
                <th className="px-5 py-3 font-medium">Assign plan</th>
              </tr>
            </thead>
            <tbody>
              {brokerUsers.map((user) => {
                const workspace = user.workspaceId ? workspaceById.get(user.workspaceId) : null;
                const plan = workspace ? planById.get(workspace.planId) : null;
                const liveCount = workspace
                  ? listings.filter((listing) => listing.workspaceId === workspace.id && listing.status === "published").length
                  : 0;
                const limit = plan?.activeListingLimit ?? 0;
                const remaining = limit ? Math.max(0, limit - liveCount) : 0;

                return (
                  <tr key={user.id} className="border-t border-cyan-300/10 align-top">
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cyan-300/10 text-cyan-200">
                          <UserRound className="size-4" />
                        </span>
                        <div>
                          <p className="font-medium text-slate-100">{user.name}</p>
                          <p className="mt-1 text-xs text-slate-400">{user.email}</p>
                          <Badge className="mt-2 capitalize" variant="secondary">
                            {user.status}
                          </Badge>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-200">{user.role.replaceAll("_", " ")}</td>
                    <td className="px-5 py-4">
                      {workspace ? (
                        <div className="flex items-start gap-2">
                          <Building2 className="mt-0.5 size-4 text-cyan-200" />
                          <div>
                            <p className="font-medium text-slate-100">{workspace.name}</p>
                            <p className="mt-1 text-xs text-slate-400">{workspace.city || "City not set"}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500">Workspace missing</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-100">{plan?.name ?? "No active plan"}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {liveCount}/{limit || "unassigned"} live listings
                      </p>
                      {limit ? (
                        <p className={remaining ? "mt-1 text-xs text-emerald-200" : "mt-1 text-xs text-amber-200"}>
                          {remaining ? `${remaining} slots left` : "Limit reached"}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4">
                      {workspace ? (
                        <form action={assignWorkspacePlanAction.bind(null, workspace.id)} className="flex min-w-72 gap-2">
                          <select
                            name="planId"
                            defaultValue={workspace.planId}
                            className="h-10 min-w-0 flex-1 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white"
                          >
                            {plans.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name} · {item.activeListingLimit} live
                              </option>
                            ))}
                          </select>
                          <Button type="submit" className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">
                            <Save className="size-4" />
                            Save
                          </Button>
                        </form>
                      ) : (
                        <span className="text-xs text-slate-500">Connect this user to a workspace first.</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {platformUsers.length ? (
        <section className="overflow-hidden rounded-lg border border-cyan-300/10 bg-white/[0.06] text-white">
          <div className="border-b border-cyan-300/10 p-5">
            <h2 className="text-xl font-semibold">Platform users</h2>
          </div>
          <div className="divide-y divide-cyan-300/10">
            {platformUsers.map((user) => (
              <div key={user.id} className="grid gap-2 p-5 md:grid-cols-[1fr_auto_auto]">
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="mt-1 text-sm text-slate-400">{user.email}</p>
                </div>
                <p className="text-sm capitalize text-slate-300">{user.role.replaceAll("_", " ")}</p>
                <Badge variant="secondary" className="w-fit capitalize">
                  {user.status}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </AdminSectionPage>
  );
}
