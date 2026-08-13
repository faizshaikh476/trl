import { billingService } from "@/lib/billing/billing-service";
import { leadService } from "@/lib/leads/lead-service";
import { listingService } from "@/lib/listings/listing-service";
import { workspaceService } from "@/lib/workspaces/workspace-service";

interface AdminOverviewDependencies {
  workspaces: Pick<typeof workspaceService, "list">;
  listings: Pick<typeof listingService, "listAll">;
  leads: Pick<typeof leadService, "listByWorkspace">;
  billing: Pick<typeof billingService, "listPlans">;
}

export async function loadAdminOverview(
  dependencies: AdminOverviewDependencies = {
    workspaces: workspaceService,
    listings: listingService,
    leads: leadService,
    billing: billingService,
  },
) {
  const [workspaces, listings, plans] = await Promise.all([
    dependencies.workspaces.list(),
    dependencies.listings.listAll(),
    dependencies.billing.listPlans(),
  ]);
  const leadsByWorkspace = await Promise.all(
    workspaces.map((workspace) => dependencies.leads.listByWorkspace(workspace.id)),
  );

  return {
    workspaceCount: workspaces.length,
    listingCount: listings.length,
    leadCount: leadsByWorkspace.reduce((total, leads) => total + leads.length, 0),
    plans,
  };
}
