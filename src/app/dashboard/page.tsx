import Link from "next/link";
import { AppShell } from "@/components/dashboard/app-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { ListingTable } from "@/components/listings/listing-table";
import { notFound } from "next/navigation";
import { Activity, ArrowUpRight, Building2, Inbox, MessageCircle, Share2, Sparkles, WalletCards } from "lucide-react";
import { analyticsService } from "@/lib/analytics/analytics-service";
import { auditLogService } from "@/lib/audit/audit-log-service";
import { getCurrentUser } from "@/lib/auth/current-user";
import { billingService, buildWorkspaceBillingSummary } from "@/lib/billing/billing-service";
import { creditWalletService } from "@/lib/billing/credit-wallet-service";
import { paymentService } from "@/lib/billing/payment-service";
import { formatNumber } from "@/lib/format";
import { leadService } from "@/lib/leads/lead-service";
import { listingService } from "@/lib/listings/listing-service";
import { workspaceService } from "@/lib/workspaces/workspace-service";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const workspace = await workspaceService.findById(user.workspaceId!);
  if (!workspace) notFound();
  const [listings, leads, totals, auditLogs, plans, purchases, wallet] = await Promise.all([
    listingService.listByWorkspace(workspace.id),
    leadService.listByWorkspace(workspace.id),
    analyticsService.totals(workspace.id),
    auditLogService.listByWorkspace(workspace.id),
    billingService.listActivePlans(),
    paymentService.listPurchasesByWorkspace(workspace.id, 10),
    creditWalletService.getWallet(workspace.id),
  ]);
  const billingSummary = buildWorkspaceBillingSummary({
    workspace,
    plans,
    purchases,
    wallet,
  });

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
                Your business at a glance
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-stone-500">
                Track listings, enquiries and buyer activity.
              </p>
            </div>
            <div className="border-t border-stone-100 bg-stone-50 p-6 lg:border-l lg:border-t-0">
              <p className="text-sm font-semibold text-stone-950">Today’s focus</p>
              <div className="mt-5 space-y-4 text-sm text-stone-600">
                <FocusRow icon={Building2} label={`${listings.filter((item) => item.status === "published").length} live listings`} />
                <FocusRow icon={WalletCards} label={`${formatNumber(billingSummary.availableCredits)} credits available`} />
                <FocusRow icon={Inbox} label={`${leads.length} buyer enquiries`} />
                <FocusRow icon={Activity} label={`${formatNumber(totals.views)} listing views`} />
                <FocusRow icon={MessageCircle} label={`${formatNumber(totals.whatsappClicks)} WhatsApp taps`} />
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <StatCard tone="light" label="Active listings" value={listings.filter((item) => item.status === "published").length} detail="Published and visible" />
          <StatCard tone="light" label="Drafts" value={listings.filter((item) => item.status !== "published").length} detail="Need review or publishing" />
          <StatCard tone="light" label="Leads" value={leads.length} detail="Buyer enquiries" />
          <StatCard tone="light" label="Listing views" value={formatNumber(totals.views)} detail="Total property views" />
          <StatCard tone="light" label="WhatsApp taps" value={formatNumber(totals.whatsappClicks)} detail="WhatsApp enquiries" />
          <StatCard tone="light" label="Share + calls" value={formatNumber(totals.shares + totals.callClicks)} detail={`${formatNumber(totals.shares)} shares · ${formatNumber(totals.callClicks)} calls`} />
        </div>
        <section className="grid gap-4 lg:grid-cols-3">
          <Link href="/dashboard/billing" className="block rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 shadow-sm shadow-emerald-100/60 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-white text-emerald-700">
                <WalletCards className="size-5" />
              </span>
              <p className="text-sm font-medium text-emerald-800">Listing credits</p>
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-stone-950">
              {formatNumber(billingSummary.availableCredits)}
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              {billingSummary.currentPackageName} · valid until {billingSummary.validUntilLabel}
            </p>
          </Link>
          <EngagementCard icon={Activity} label="Enquiry rate" value={`${totals.conversionRate}%`} detail="Enquiries from property views." />
          <EngagementCard icon={MessageCircle} label="WhatsApp enquiries" value={formatNumber(totals.whatsappClicks)} detail="Buyers who opened WhatsApp." />
          <EngagementCard icon={Share2} label="Shares" value={formatNumber(totals.shares)} detail="Property links shared." />
        </section>
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold text-stone-950">Listings</h2>
              <p className="text-sm text-stone-500">Review performance and manage your properties.</p>
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

function EngagementCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof ArrowUpRight;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/60">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <Icon className="size-5" />
        </span>
        <p className="text-sm font-medium text-stone-500">{label}</p>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-stone-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-stone-500">{detail}</p>
    </div>
  );
}
