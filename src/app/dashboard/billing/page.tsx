import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock3, CreditCard, ReceiptText, WalletCards, XCircle } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  billingService,
  buildWorkspaceBillingSummary,
  formatPlanPrice,
} from "@/lib/billing/billing-service";
import { paymentService } from "@/lib/billing/payment-service";
import { creditWalletService } from "@/lib/billing/credit-wallet-service";
import { getCurrentUser } from "@/lib/auth/current-user";
import { workspaceService } from "@/lib/workspaces/workspace-service";
import type { BillingPurchaseSummary } from "@/lib/billing/billing-service";

export default async function BillingPage() {
  const user = await getCurrentUser();
  const workspace = await workspaceService.findById(user.workspaceId!);
  if (!workspace) notFound();

  const [plans, purchases, wallet] = await Promise.all([
    billingService.listActivePlans(),
    paymentService.listPurchasesByWorkspace(workspace.id, 50),
    creditWalletService.getWallet(workspace.id),
  ]);
  const summary = buildWorkspaceBillingSummary({
    workspace,
    plans,
    purchases,
    wallet,
  });

  return (
    <AppShell active="Billing">
      <div className="space-y-6 pb-10">
        <section className="overflow-hidden rounded-[2rem] bg-white shadow-sm shadow-stone-200/70 ring-1 ring-stone-200">
          <div className="grid gap-0 lg:grid-cols-[1fr_22rem]">
            <div className="p-6 sm:p-8 lg:p-10">
              <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
                <WalletCards className="size-4" />
                {summary.currentPackageName}
              </p>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
                Credits & purchases
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-stone-500">
                See your available listing credits, recent purchases, and Razorpay payment status.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="bg-emerald-600 text-white hover:bg-emerald-700">
                  <Link href="/pricing">Buy credits</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/dashboard/listings">Manage listings</Link>
                </Button>
              </div>
            </div>
            <div className="border-t border-stone-100 bg-stone-50 p-6 lg:border-l lg:border-t-0">
              <p className="text-sm font-semibold text-stone-950">Current wallet</p>
              <div className="mt-5 space-y-4 text-sm text-stone-600">
                <WalletLine label="Available credits" value={summary.availableCredits} />
                <WalletLine label="Valid until" value={summary.validUntilLabel} />
                <WalletLine
                  label="Purchases"
                  value={`${summary.purchaseCount} order${summary.purchaseCount === 1 ? "" : "s"}`}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <BillingCard
            icon={WalletCards}
            label="Available credits"
            value={summary.availableCredits}
            detail={summary.isWalletActive ? "Ready for new listings" : "Buy credits to publish more listings"}
          />
          <BillingCard
            icon={Clock3}
            label="Credit validity"
            value={summary.validUntilLabel}
            detail="Credits are valid for the package window."
          />
          <BillingCard
            icon={ReceiptText}
            label="Latest package"
            value={summary.latestPaidPurchase?.planName ?? summary.currentPackageName}
            detail={summary.latestPaidPurchase?.amountLabel ?? "No paid purchase yet"}
          />
        </section>

        <section className="rounded-[1.5rem] border border-stone-200 bg-white shadow-sm shadow-stone-200/60">
          <div className="flex flex-col gap-3 border-b border-stone-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-stone-950">Purchase history</h2>
              <p className="mt-1 text-sm text-stone-500">Razorpay orders and credit grants for this workspace.</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/pricing">View packages</Link>
            </Button>
          </div>
          {summary.purchases.length ? (
            <div className="divide-y divide-stone-100">
              {summary.purchases.map((purchase) => (
                <PurchaseRow key={purchase.id} purchase={purchase} />
              ))}
            </div>
          ) : (
            <div className="p-6">
              <div className="rounded-[1.25rem] border border-dashed border-stone-300 bg-stone-50 p-6 text-center">
                <p className="text-lg font-semibold text-stone-950">No purchases yet</p>
                <p className="mt-2 text-sm text-stone-500">
                  Start with a free allowance or buy credits when you need more live listings.
                </p>
                <Button asChild className="mt-5 bg-emerald-600 text-white hover:bg-emerald-700">
                  <Link href="/pricing">Buy credits</Link>
                </Button>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/60">
          <div className="flex items-center gap-3">
            <CreditCard className="size-5 text-emerald-700" />
            <h2 className="text-lg font-semibold text-stone-950">Available packages</h2>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-[1rem] border border-stone-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-stone-950">{plan.name}</p>
                    <p className="mt-1 text-sm text-stone-500">{formatPlanPrice(plan)}</p>
                  </div>
                  {plan.id === summary.currentPackageId ? <Badge variant="secondary">Current</Badge> : null}
                </div>
                <p className="mt-4 text-sm text-stone-600">{plan.listingCredits} listing credits</p>
                <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                  <Link href={`/pricing?plan=${plan.id}`}>Buy {plan.name}</Link>
                </Button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function WalletLine({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span>{label}</span>
      <span className="font-semibold text-stone-950">{value}</span>
    </div>
  );
}

function BillingCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof WalletCards;
  label: string;
  value: string | number;
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

function PurchaseRow({ purchase }: { purchase: BillingPurchaseSummary }) {
  const status = statusMeta(purchase.status);
  const StatusIcon = status.icon;
  return (
    <div className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_12rem_12rem] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-stone-950">{purchase.planName}</p>
          <Badge className={status.badgeClassName}>
            <StatusIcon className="size-3" />
            {status.label}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-stone-500">
          {purchase.credits} credits · {purchase.amountLabel}
        </p>
        <p className="mt-2 truncate text-xs text-stone-400">Order {purchase.providerOrderId ?? purchase.id}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-stone-400">Payment</p>
        <p className="mt-1 truncate text-sm font-medium text-stone-700">
          {purchase.providerPaymentId ?? "Not captured yet"}
        </p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-stone-400">Date</p>
        <p className="mt-1 text-sm font-medium text-stone-700">
          {formatDateTime(purchase.paidAt ?? purchase.createdAt)}
        </p>
      </div>
    </div>
  );
}

function statusMeta(status: BillingPurchaseSummary["status"]) {
  switch (status) {
    case "paid":
      return {
        label: "Paid",
        icon: CheckCircle2,
        badgeClassName: "gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
      };
    case "failed":
      return {
        label: "Failed",
        icon: XCircle,
        badgeClassName: "gap-1 bg-red-100 text-red-800 hover:bg-red-100",
      };
    case "refunded":
      return {
        label: "Refunded",
        icon: CreditCard,
        badgeClassName: "gap-1 bg-stone-100 text-stone-700 hover:bg-stone-100",
      };
    default:
      return {
        label: "Pending",
        icon: Clock3,
        badgeClassName: "gap-1 bg-amber-100 text-amber-800 hover:bg-amber-100",
      };
  }
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
