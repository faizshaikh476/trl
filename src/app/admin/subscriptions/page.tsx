import type React from "react";
import { CreditCard, ListChecks, Plus, Trash2 } from "lucide-react";
import { AdminSectionPage } from "@/components/admin/admin-section-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentAdmin } from "@/lib/auth/current-user";
import { billingService } from "@/lib/billing/billing-service";
import { workspaceService } from "@/lib/workspaces/workspace-service";
import { createPlanAction, deletePlanAction, updatePlanAction } from "@/server-actions/billing-actions";
import type { Plan } from "@/types/domain";

export default async function AdminSubscriptionsPage() {
  await getCurrentAdmin();
  const [plans, workspaces] = await Promise.all([
    billingService.listPlans(),
    workspaceService.list(),
  ]);
  const activePlans = plans.filter((plan) => plan.status === "active").length;
  const assignedPlanIds = new Set(workspaces.map((workspace) => workspace.planId));

  return (
    <AdminSectionPage
      active="Subscriptions"
      title="Plans"
      description="Build plans and control how many live property pages each broker workspace can publish."
      cards={[
        {
          title: "Only one enforced limit",
          description: "V1 plans limit published listings only. Drafts, archives, sold, and rented listings stay available.",
          status: "live",
        },
        {
          title: "Active plans",
          description: `${activePlans} plan${activePlans === 1 ? "" : "s"} available for workspace assignment.`,
          status: "catalog",
        },
        {
          title: "Payments later",
          description: "Razorpay can be connected after the plan catalog and usage enforcement are stable.",
          status: "next",
        },
      ]}
    >
      <section className="grid gap-4 xl:grid-cols-[1fr_26rem]">
        <div className="space-y-4">
          {plans.map((plan) => (
            <PlanEditor key={plan.id} plan={plan} isAssigned={assignedPlanIds.has(plan.id)} />
          ))}
        </div>

        <aside className="space-y-4">
          <form action={createPlanAction} className="rounded-lg border border-cyan-300/10 bg-white/[0.06] p-5 text-white">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-cyan-300 text-slate-950">
                <Plus className="size-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Create plan</h2>
                <p className="text-sm text-slate-400">Add a plan with a live listing limit.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              <Field label="Plan name" name="name" placeholder="Growth" required />
              <Field label="Price label" name="priceLabel" placeholder="₹7,999/mo" required />
              <Field label="Published listing limit" name="activeListingLimit" type="number" min="1" defaultValue="50" required />
              <Field label="Sort order" name="sortOrder" type="number" defaultValue="40" required />
              <input type="hidden" name="status" value="active" />
              <Button type="submit" className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">
                Create plan
              </Button>
            </div>
          </form>

          <div className="rounded-lg border border-cyan-300/10 bg-white/[0.06] p-5 text-white">
            <div className="flex items-center gap-3">
              <CreditCard className="size-5 text-cyan-200" />
              <h2 className="text-lg font-semibold">Upgrade behaviour</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              When a broker reaches their live listing limit, WhatsApp and dashboard publishing both ask them to archive an older listing or upgrade.
            </p>
          </div>
        </aside>
      </section>
    </AdminSectionPage>
  );
}

function PlanEditor({ plan, isAssigned }: { plan: Plan; isAssigned: boolean }) {
  return (
    <section className="rounded-lg border border-cyan-300/10 bg-white/[0.06] p-5 text-white">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-cyan-300/10 text-cyan-200">
            <ListChecks className="size-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">{plan.name}</h2>
              <Badge className={plan.status === "active" ? "bg-cyan-300 text-slate-950" : "bg-white/10 text-slate-200"}>
                {plan.status}
              </Badge>
              {isAssigned ? <Badge variant="secondary">assigned</Badge> : null}
            </div>
            <p className="mt-1 text-sm text-slate-400">
              {plan.activeListingLimit} published listings · {plan.priceLabel}
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-500">ID: {plan.id}</p>
      </div>

      <form action={updatePlanAction.bind(null, plan.id)} className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_12rem_9rem_10rem_auto]">
        <Field label="Name" name="name" defaultValue={plan.name} required />
        <Field label="Price" name="priceLabel" defaultValue={plan.priceLabel} required />
        <Field label="Live limit" name="activeListingLimit" type="number" min="1" defaultValue={String(plan.activeListingLimit)} required />
        <Field label="Sort" name="sortOrder" type="number" defaultValue={String(plan.sortOrder)} required />
        <label className="grid gap-1 text-sm font-medium text-slate-300">
          Status
          <select name="status" defaultValue={plan.status} className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <div className="flex items-end">
          <Button type="submit" className="w-full bg-cyan-300 text-slate-950 hover:bg-cyan-200">
            Save
          </Button>
        </div>
      </form>

      {!isAssigned ? (
        <details className="mt-4 rounded-md border border-red-400/20 bg-red-500/10 p-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-red-100">
            <Trash2 className="size-4" />
            Delete plan
          </summary>
          <form action={deletePlanAction.bind(null, plan.id)} className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              name="confirmation"
              pattern="delete"
              required
              placeholder="type delete"
              className="h-10 flex-1 rounded-md border border-red-300/30 bg-slate-950 px-3 text-sm text-white outline-none placeholder:text-red-100/30"
            />
            <Button type="submit" variant="destructive">
              Delete
            </Button>
          </form>
        </details>
      ) : null}
    </section>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...inputProps } = props;
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-300">
      {label}
      <input
        {...inputProps}
        className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none placeholder:text-slate-600"
      />
    </label>
  );
}
