import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CreditCard,
  ReceiptText,
  RotateCcw,
  Search,
  WalletCards,
  XCircle,
} from "lucide-react";
import { AdminSectionPage } from "@/components/admin/admin-section-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentAdmin } from "@/lib/auth/current-user";
import { getAdminDb } from "@/lib/firebase/admin";
import { firestorePaths } from "@/lib/firebase/paths";
import { billingService } from "@/lib/billing/billing-service";
import { workspaceService } from "@/lib/workspaces/workspace-service";
import type { CreditPurchase } from "@/types/domain";

const ORDER_LIMIT = 150;
const statuses = ["all", "pending", "paid", "failed", "refunded"] as const;

type StatusFilter = (typeof statuses)[number];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; workspaceId?: string }>;
}) {
  await getCurrentAdmin();
  const query = await searchParams;
  const [purchases, plans, workspaces] = await Promise.all([
    listRecentPurchases(),
    billingService.listPlans(),
    workspaceService.list(),
  ]);
  const planById = new Map(plans.map((plan) => [plan.id, plan]));
  const workspaceById = new Map(workspaces.map((workspace) => [workspace.id, workspace]));
  const selectedStatus = normalizeStatus(query.status);
  const selectedWorkspaceId = query.workspaceId ?? "all";
  const q = (query.q ?? "").trim().toLowerCase();
  const filteredPurchases = purchases.filter((purchase) => {
    const plan = planById.get(purchase.planId);
    const workspace = workspaceById.get(purchase.workspaceId);
    const searchable = [
      purchase.id,
      purchase.providerOrderId,
      purchase.providerPaymentId,
      purchase.providerRefundId,
      purchase.creditGrantLedgerEntryId,
      purchase.workspaceId,
      purchase.planId,
      plan?.name,
      workspace?.name,
      workspace?.contactPhone,
      workspace?.contactEmail,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      (selectedStatus === "all" || purchase.status === selectedStatus) &&
      (selectedWorkspaceId === "all" || purchase.workspaceId === selectedWorkspaceId) &&
      (!q || searchable.includes(q))
    );
  });
  const paidPurchases = purchases.filter((purchase) => purchase.status === "paid");
  const pendingPurchases = purchases.filter((purchase) => purchase.status === "pending");
  const unresolvedPaid = paidPurchases.filter((purchase) => !purchase.creditGrantLedgerEntryId);
  const revenuePaise = paidPurchases.reduce((total, purchase) => total + purchase.amountPaise, 0);

  return (
    <AdminSectionPage
      active="Orders"
      title="Orders"
      description="Track package purchases, Razorpay status, and credit wallet fulfilment."
      cards={[
        {
          title: "Paid revenue",
          description: "Captured package payments in the recent order window.",
          meta: formatRupeesFromPaise(revenuePaise),
          status: "Paid",
        },
        {
          title: "Pending checkouts",
          description: "Orders created but not captured or failed yet.",
          meta: `${pendingPurchases.length} pending`,
          status: "Open",
        },
        {
          title: "Credit fulfilment",
          description: "Paid purchases should have a credit grant ledger entry.",
          meta: unresolvedPaid.length ? `${unresolvedPaid.length} needs review` : "All paid orders fulfilled",
          status: unresolvedPaid.length ? "Review" : "Clear",
        },
      ]}
    >
      <section className="min-w-0 space-y-4">
        <form className="grid gap-3 rounded-lg border border-cyan-300/10 bg-white/[0.06] p-4 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
          <label className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <Input
              name="q"
              placeholder="Search order, payment ID, workspace, phone"
              defaultValue={query.q ?? ""}
              className="bg-slate-950 pl-9 text-white"
            />
          </label>
          <select
            name="status"
            defaultValue={selectedStatus}
            className="h-10 min-w-0 rounded-md border border-white/10 bg-slate-950 px-3 text-sm capitalize text-white"
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            name="workspaceId"
            defaultValue={selectedWorkspaceId}
            className="h-10 min-w-0 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white"
          >
            <option value="all">All workspaces</option>
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
          <Button type="submit" className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">
            Apply
          </Button>
        </form>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="overflow-hidden rounded-lg border border-cyan-300/10 bg-white/[0.06]">
            <div className="flex flex-col gap-2 border-b border-cyan-300/10 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{filteredPurchases.length} order(s)</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Showing latest {ORDER_LIMIT} orders, newest first.
                </p>
              </div>
              <Badge className="w-fit bg-cyan-300 text-slate-950">Razorpay</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] text-left text-sm">
                <thead className="bg-white/[0.04] text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-medium">Order</th>
                    <th className="px-5 py-3 font-medium">Workspace</th>
                    <th className="px-5 py-3 font-medium">Package</th>
                    <th className="px-5 py-3 font-medium">Amount</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Credits</th>
                    <th className="px-5 py-3 font-medium">Provider</th>
                    <th className="px-5 py-3 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchases.map((purchase) => {
                    const plan = planById.get(purchase.planId);
                    const workspace = workspaceById.get(purchase.workspaceId);
                    const reconciliation = reconcilePurchase(purchase);
                    const ReconciliationIcon = reconciliation.icon;
                    return (
                      <tr key={purchase.id} className="border-t border-cyan-300/10 align-top">
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-cyan-300/10 text-cyan-200">
                              <ReceiptText className="size-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="font-medium text-white">{shortId(purchase.id)}</p>
                              <p className="mt-1 text-xs text-slate-500">{purchase.id}</p>
                              <p className="mt-2 text-xs text-slate-400">Created {formatDateTime(purchase.createdAt)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-100">{workspace?.name ?? purchase.workspaceId}</p>
                          <p className="mt-1 text-xs text-slate-500">{purchase.workspaceId}</p>
                          <Button asChild size="xs" variant="outline" className="mt-3 border-white/15 bg-white/5 text-white">
                            <Link href={`/admin/workspaces?workspaceId=${purchase.workspaceId}`}>Open workspace</Link>
                          </Button>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-100">{plan?.name ?? purchase.planId}</p>
                          <p className="mt-1 text-xs text-slate-500">{purchase.quantity} credits · {purchase.validityDays} days</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-100">{formatRupeesFromPaise(purchase.amountPaise)}</p>
                          <p className="mt-1 text-xs text-slate-500">{purchase.currency}</p>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={purchase.status} />
                          {purchase.failureReason ? (
                            <p className="mt-2 max-w-56 text-xs leading-5 text-red-200">{purchase.failureReason}</p>
                          ) : null}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <ReconciliationIcon className={reconciliation.iconClassName} />
                            <span className={reconciliation.textClassName}>{reconciliation.label}</span>
                          </div>
                          {purchase.creditGrantLedgerEntryId ? (
                            <p className="mt-2 max-w-56 truncate text-xs text-slate-500">
                              {purchase.creditGrantLedgerEntryId}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-5 py-4">
                          <ProviderLine label="Order" value={purchase.providerOrderId} />
                          <ProviderLine label="Payment" value={purchase.providerPaymentId} />
                          <ProviderLine label="Refund" value={purchase.providerRefundId} />
                          {purchase.providerEventIds.length ? (
                            <p className="mt-2 text-xs text-slate-500">
                              {purchase.providerEventIds.length} webhook event{purchase.providerEventIds.length === 1 ? "" : "s"}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-5 py-4 text-slate-400">
                          <p>{formatDateTime(purchase.updatedAt)}</p>
                          {purchase.paidAt ? <p className="mt-2 text-xs text-emerald-200">Paid {formatDateTime(purchase.paidAt)}</p> : null}
                          {purchase.refundedAt ? <p className="mt-2 text-xs text-amber-200">Refunded {formatDateTime(purchase.refundedAt)}</p> : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="space-y-4">
            <section className="rounded-lg border border-cyan-300/10 bg-white/[0.06] p-5">
              <div className="flex items-center gap-3">
                <WalletCards className="size-5 text-cyan-200" />
                <h2 className="text-lg font-semibold">Reconciliation</h2>
              </div>
              <div className="mt-5 space-y-4 text-sm">
                <SignalRow label="Paid orders" value={paidPurchases.length} tone="good" />
                <SignalRow label="Pending orders" value={pendingPurchases.length} tone="neutral" />
                <SignalRow label="Credits pending" value={unresolvedPaid.length} tone={unresolvedPaid.length ? "bad" : "good"} />
                <SignalRow label="Failed orders" value={purchases.filter((purchase) => purchase.status === "failed").length} tone="bad" />
              </div>
            </section>

            <section className="rounded-lg border border-cyan-300/10 bg-white/[0.06] p-5">
              <div className="flex items-center gap-3">
                <CreditCard className="size-5 text-cyan-200" />
                <h2 className="text-lg font-semibold">How to check</h2>
              </div>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-400">
                <li>Paid orders should show a payment ID and a credit grant.</li>
                <li>Pending orders are usually abandoned checkouts until Razorpay captures payment.</li>
                <li>Webhook events confirm Razorpay reached our `/api/billing/webhook` endpoint.</li>
                <li>Use workspace wallet balance to confirm credits are available before the next listing.</li>
              </ul>
            </section>
          </aside>
        </section>
      </section>
    </AdminSectionPage>
  );
}

async function listRecentPurchases() {
  const snapshot = await getAdminDb()
    .collection(firestorePaths.purchases())
    .orderBy("createdAt", "desc")
    .limit(ORDER_LIMIT)
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as CreditPurchase);
}

function normalizeStatus(value: string | undefined): StatusFilter {
  return statuses.includes(value as StatusFilter) ? (value as StatusFilter) : "all";
}

function StatusBadge({ status }: { status: CreditPurchase["status"] }) {
  const styles = {
    pending: "bg-amber-300 text-slate-950",
    paid: "bg-emerald-300 text-slate-950",
    failed: "bg-red-300 text-slate-950",
    refunded: "bg-slate-200 text-slate-950",
  } satisfies Record<CreditPurchase["status"], string>;
  return <Badge className={styles[status]}>{status}</Badge>;
}

function reconcilePurchase(purchase: CreditPurchase) {
  if (purchase.status === "paid" && purchase.creditGrantLedgerEntryId) {
    return {
      label: "Granted",
      icon: CheckCircle2,
      iconClassName: "size-4 text-emerald-300",
      textClassName: "text-emerald-200",
    };
  }
  if (purchase.status === "paid") {
    return {
      label: "Credits pending",
      icon: AlertTriangle,
      iconClassName: "size-4 text-amber-300",
      textClassName: "text-amber-200",
    };
  }
  if (purchase.status === "pending") {
    return {
      label: "Awaiting payment",
      icon: Clock3,
      iconClassName: "size-4 text-slate-400",
      textClassName: "text-slate-300",
    };
  }
  if (purchase.status === "refunded") {
    return {
      label: "Refunded",
      icon: RotateCcw,
      iconClassName: "size-4 text-slate-300",
      textClassName: "text-slate-300",
    };
  }
  return {
    label: "Failed",
    icon: XCircle,
    iconClassName: "size-4 text-red-300",
    textClassName: "text-red-200",
  };
}

function ProviderLine({ label, value }: { label: string; value: string | null }) {
  return (
    <p className="max-w-56 truncate text-xs leading-5 text-slate-400">
      <span className="text-slate-500">{label}:</span> {value ?? "not set"}
    </p>
  );
}

function SignalRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "good" | "neutral" | "bad";
}) {
  const toneClassName = {
    good: "text-emerald-200",
    neutral: "text-cyan-200",
    bad: "text-red-200",
  }[tone];
  return (
    <div className="flex items-center justify-between gap-4 border-b border-cyan-300/10 pb-3 last:border-0 last:pb-0">
      <span className="text-slate-400">{label}</span>
      <span className={`font-semibold ${toneClassName}`}>{value}</span>
    </div>
  );
}

function formatRupeesFromPaise(amountPaise: number) {
  const hasPaise = amountPaise % 100 !== 0;
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: hasPaise ? 2 : 0,
    minimumFractionDigits: hasPaise ? 2 : 0,
    style: "currency",
  }).format(amountPaise / 100);
}

function formatDateTime(value?: string | null) {
  if (!value) return "not set";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "not set";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function shortId(value: string) {
  if (value.length <= 18) return value;
  return `${value.slice(0, 10)}…${value.slice(-6)}`;
}
