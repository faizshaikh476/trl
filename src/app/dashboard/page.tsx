import { AppShell } from "@/components/dashboard/app-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { ListingTable } from "@/components/listings/listing-table";
import { notFound } from "next/navigation";
import { Activity, ArrowUpRight, Building2, Inbox, Sparkles } from "lucide-react";
import { analyticsService } from "@/lib/analytics/analytics-service";
import { auditLogService } from "@/lib/audit/audit-log-service";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatNumber } from "@/lib/format";
import { leadService } from "@/lib/leads/lead-service";
import { listingService } from "@/lib/listings/listing-service";
import { workspaceService } from "@/lib/workspaces/workspace-service";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const workspace = await workspaceService.findById(user.workspaceId!);
  if (!workspace) notFound();
  const [listings, leads, totals, auditLogs] = await Promise.all([
    listingService.listByWorkspace(workspace.id),
    leadService.listByWorkspace(workspace.id),
    analyticsService.totals(workspace.id),
    auditLogService.listByWorkspace(workspace.id),
  ]);

  return (
    <AppShell active="Overview">
      <div className="flex flex-col gap-8 pb-10">
        <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm shadow-stone-200/70 ring-1 ring-stone-200">
          <div className="grid gap-0 lg:grid-cols-[1fr_20rem]">
            <div className="p-6 sm:p-8 lg:p-10">
              <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
                <Sparkles className="size-4" />
                {workspace.name}
              </p>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
                Broker workspace
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-stone-500">
                Manage published pages, buyer enquiries, and listing freshness from one calm operating desk.
              </p>
            </div>
            <div className="border-t border-stone-100 bg-stone-50 p-6 lg:border-l lg:border-t-0">
              <p className="text-sm font-semibold text-stone-950">Today’s focus</p>
              <div className="mt-5 space-y-4 text-sm text-stone-600">
                <FocusRow icon={Building2} label={`${listings.filter((item) => item.status === "published").length} live listings`} />
                <FocusRow icon={Inbox} label={`${leads.length} buyer enquiries`} />
                <FocusRow icon={Activity} label={`${formatNumber(totals.views)} listing views`} />
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard tone="light" label="Active listings" value={listings.filter((item) => item.status === "published").length} detail="Published and visible" />
          <StatCard tone="light" label="Drafts" value={listings.filter((item) => item.status !== "published").length} detail="Need review or publishing" />
          <StatCard tone="light" label="Leads" value={leads.length} detail="Captured in CRM" />
          <StatCard tone="light" label="Listing views" value={formatNumber(totals.views)} detail="Tracked public traffic" />
        </div>
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold text-stone-950">Listings</h2>
              <p className="text-sm text-stone-500">Quality score, lead count, and public preview.</p>
            </div>
          </div>
          <ListingTable listings={listings} />
        </section>
        <section className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/60">
          <h2 className="text-xl font-semibold text-stone-950">Recent activity</h2>
          <div className="mt-4 space-y-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between border-b border-stone-100 pb-3 text-sm last:border-0">
                <span className="capitalize text-stone-700">{log.action.replaceAll("_", " ")}</span>
                <span className="text-stone-400">{new Date(log.createdAt).toLocaleDateString("en-IN")}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function FocusRow({ icon: Icon, label }: { icon: typeof ArrowUpRight; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 items-center justify-center rounded-full bg-white text-emerald-700">
        <Icon className="size-4" />
      </span>
      <span>{label}</span>
    </div>
  );
}
