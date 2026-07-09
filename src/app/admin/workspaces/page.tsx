import { Building2, CheckCircle2, Gift, Save, WalletCards } from "lucide-react";
import { AdminSectionPage } from "@/components/admin/admin-section-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentAdmin } from "@/lib/auth/current-user";
import { billingService, formatPlanPrice } from "@/lib/billing/billing-service";
import { getAdminDb } from "@/lib/firebase/admin";
import { firestorePaths } from "@/lib/firebase/paths";
import { workspaceService } from "@/lib/workspaces/workspace-service";
import { assignWorkspacePlanAction } from "@/server-actions/billing-actions";
import { grantPromotionalCreditsAction } from "@/server-actions/credit-actions";
import type { CreditLedgerEntry, CreditWallet } from "@/types/domain";

type WalletInspection = {
  workspaceId: string;
  wallet: CreditWallet | null;
  lastGrant: CreditLedgerEntry | null;
};

export default async function AdminWorkspacesPage() {
  await getCurrentAdmin();
  const [workspaces, plans] = await Promise.all([
    workspaceService.list(),
    billingService.listActivePlans(),
  ]);
  const walletInspections = await Promise.all(
    workspaces.map((workspace) => getWalletInspection(workspace.id)),
  );
  const walletByWorkspaceId = new Map(
    walletInspections.map((inspection) => [inspection.workspaceId, inspection]),
  );
  const planById = new Map(plans.map((plan) => [plan.id, plan]));

  return (
    <AdminSectionPage
      active="Workspaces"
      title="Workspaces"
      description="Manage broker accounts, package assignment and listing-credit wallets."
      cards={[
        {
          title: "Broker accounts",
          description: "Review every broker workspace in one place.",
          status: "Accounts",
        },
        {
          title: "Wallets",
          description: "Inspect available listing credits and wallet validity.",
          status: "Credits",
        },
        {
          title: "Promotions",
          description: "Grant promotional credits with a reason and confirmation.",
          status: "Grants",
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
            const walletInspection = walletByWorkspaceId.get(workspace.id) ?? {
              workspaceId: workspace.id,
              wallet: null,
              lastGrant: null,
            };
            const wallet = walletInspection.wallet;
            const availableCredits = wallet?.availableCredits ?? 0;
            const hasWallet = Boolean(wallet);
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
                          <p className="text-sm text-slate-400">Wallet balance</p>
                          <p className="mt-1 text-lg font-semibold">
                            {availableCredits} credit{availableCredits === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {hasWallet ? (
                            <CheckCircle2 className="size-4 text-emerald-300" />
                          ) : (
                            <WalletCards className="size-4 text-amber-300" />
                          )}
                          <span className={hasWallet ? "text-emerald-200" : "text-amber-200"}>
                            {hasWallet ? `Valid until ${formatDate(wallet?.validUntil)}` : "No wallet yet"}
                          </span>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-slate-400">
                        {lastGrantLabel(walletInspection.lastGrant, wallet)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <form
                    action={assignWorkspacePlanAction.bind(null, workspace.id)}
                    className="grid gap-3 rounded-lg border border-white/10 bg-slate-950/60 p-4 sm:grid-cols-[1fr_auto]"
                  >
                    <label className="grid gap-1 text-sm font-medium text-slate-300">
                      Assigned package
                      <select
                        name="planId"
                        defaultValue={workspace.planId}
                        className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white"
                      >
                        {plans.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} · {item.listingCredits} credits · {formatPlanPrice(item)}
                          </option>
                        ))}
                      </select>
                      <span className="text-xs font-normal text-slate-500">
                        Changes apply to package assignment and upgrade prompts.
                      </span>
                    </label>
                    <div className="flex items-end">
                      <Button type="submit" className="w-full bg-cyan-300 text-slate-950 hover:bg-cyan-200">
                        <Save className="size-4" />
                        Save
                      </Button>
                    </div>
                  </form>

                  <form
                    action={grantPromotionalCreditsAction.bind(null, workspace.id)}
                    className="grid gap-3 rounded-lg border border-white/10 bg-slate-950/60 p-4"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                      <Gift className="size-4 text-cyan-200" />
                      Grant promotional credits
                    </div>
                    <label className="grid gap-1 text-sm font-medium text-slate-300">
                      Quantity
                      <input
                        name="quantity"
                        type="number"
                        min="1"
                        step="1"
                        required
                        className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-slate-300">
                      Reason
                      <input
                        name="reason"
                        required
                        minLength={2}
                        placeholder="Launch promotion"
                        className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white placeholder:text-slate-600"
                      />
                    </label>
                    <label className="flex items-start gap-2 text-sm text-slate-300">
                      <input
                        name="confirmation"
                        value="confirm"
                        type="checkbox"
                        required
                        className="mt-1 size-4 accent-cyan-300"
                      />
                      I confirm this promotional credit grant should be added to the wallet.
                    </label>
                    <Button type="submit" className="w-full bg-cyan-300 text-slate-950 hover:bg-cyan-200">
                      <Gift className="size-4" />
                      Grant credits
                    </Button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </AdminSectionPage>
  );
}

async function getWalletInspection(workspaceId: string): Promise<WalletInspection> {
  const db = getAdminDb();
  const [walletSnapshot, ledgerSnapshot] = await Promise.all([
    db.doc(firestorePaths.workspaceWallet(workspaceId)).get(),
    db
      .collection(firestorePaths.workspaceCreditLedger(workspaceId))
      .orderBy("createdAt", "desc")
      .limit(10)
      .get(),
  ]);
  const entries = ledgerSnapshot.docs.map((doc) => doc.data() as CreditLedgerEntry);
  return {
    workspaceId,
    wallet: walletSnapshot.exists ? (walletSnapshot.data() as CreditWallet) : null,
    lastGrant: entries.find((entry) => entry.type === "grant") ?? null,
  };
}

function lastGrantLabel(lastGrant: CreditLedgerEntry | null, wallet: CreditWallet | null) {
  if (lastGrant) {
    const source = lastGrant.sourceType === "purchase" ? "Last purchase" : "Last grant";
    return `${source}: ${lastGrant.quantity} credit${lastGrant.quantity === 1 ? "" : "s"} on ${formatDate(
      lastGrant.createdAt,
    )} · ${lastGrant.reason}`;
  }
  if (wallet?.lastPurchaseId) return `Last purchase: ${wallet.lastPurchaseId}`;
  return "No grants or purchases recorded yet.";
}

function formatDate(value?: string | null) {
  if (!value) return "not set";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "not set";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(timestamp));
}
