import { AdminShell } from "@/components/admin/admin-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { listAIProviders } from "@/lib/ai/ai-router";
import { getCurrentAdmin } from "@/lib/auth/current-user";
import { billingService } from "@/lib/billing/billing-service";
import { leadService } from "@/lib/leads/lead-service";
import { listingService } from "@/lib/listings/listing-service";
import { workspaceService } from "@/lib/workspaces/workspace-service";

export default async function AdminPage() {
  await getCurrentAdmin();
  const workspaces = await workspaceService.list();
  const primaryWorkspace = workspaces[0];
  const listings = primaryWorkspace ? await listingService.listByWorkspace(primaryWorkspace.id) : [];
  const leads = primaryWorkspace ? await leadService.listByWorkspace(primaryWorkspace.id) : [];
  const plans = await billingService.listPlans();

  return (
    <AdminShell active="Overview">
      <div className="space-y-6">
        <div>
          <p className="text-sm text-cyan-200">Super Admin</p>
          <h1 className="mt-2 text-3xl font-semibold">Platform overview</h1>
          <p className="mt-2 max-w-3xl text-slate-400">
            Platform-wide controls for workspaces, moderation, provider settings, subscriptions,
            usage logs, and support impersonation.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Workspaces" value={workspaces.length} detail="Broker accounts" />
          <StatCard label="Listings" value={listings.length} detail="All workspace listings" />
          <StatCard label="Leads" value={leads.length} detail="Across platform" />
          <StatCard label="AI cost" value="₹0" detail="Provider routing ready" />
        </div>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="border-cyan-300/10 bg-white/[0.06] text-white">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Global AI providers</h2>
                  <p className="mt-1 text-sm text-slate-400">Platform defaults and fallback chain.</p>
                </div>
                <Badge className="bg-cyan-300 text-slate-950">platform</Badge>
              </div>
              <div className="mt-5 space-y-3">
                {listAIProviders().map((provider) => (
                  <div key={provider.id} className="flex items-center justify-between">
                    <span>{provider.label}</span>
                    <Badge variant={provider.enabled ? "default" : "secondary"}>
                      {provider.enabled ? "enabled" : "needs key"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-cyan-300/10 bg-white/[0.06] text-white">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Platform plans</h2>
                  <p className="mt-1 text-sm text-slate-400">Global listing limits and billing catalog.</p>
                </div>
                <Badge className="bg-cyan-300 text-slate-950">Razorpay-ready</Badge>
              </div>
              <div className="mt-5 space-y-3">
                {plans.map((plan) => (
                  <div key={plan.id} className="flex items-center justify-between">
                    <span>{plan.name}</span>
                    <span className="text-slate-400">
                      {plan.activeListingLimit} listings · {plan.priceLabel}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className="border-cyan-300/10 bg-white/[0.06] text-white">
          <CardContent className="grid gap-4 p-5 text-sm text-slate-300 md:grid-cols-4">
            <p>Workspace moderation and suspension belong here.</p>
            <p>AI and WhatsApp provider credentials belong here.</p>
            <p>Subscription catalog and Razorpay settings belong here.</p>
            <p>Broker workspace settings stay inside `/dashboard/settings`.</p>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
