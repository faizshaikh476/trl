import type React from "react";
import { CreditCard, ListChecks, Plus, Sparkles, Trash2 } from "lucide-react";
import { AdminSectionPage } from "@/components/admin/admin-section-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentAdmin } from "@/lib/auth/current-user";
import { billingService, formatPlanPrice } from "@/lib/billing/billing-service";
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
      title="Listing packages"
      description="Build listing-credit packages and control how long purchased credits and published listings stay active."
      cards={[
        {
          title: "Credit wallet",
          description: "Publishing a new listing consumes one purchased or granted credit.",
          status: "Credits",
        },
        {
          title: "Active packages",
          description: `${activePlans} plan${activePlans === 1 ? "" : "s"} available for workspace assignment.`,
          status: "Available",
        },
        {
          title: "Validity",
          description: "Package credits and listing visibility are configured per plan.",
          status: "Pricing",
        },
      ]}
    >
      <section className="min-w-0 space-y-4 overflow-hidden">
        <form action={createPlanAction} className="rounded-lg border border-cyan-300/10 bg-white/[0.06] p-5 text-white">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-cyan-300 text-slate-950">
                <Plus className="size-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Create package</h2>
                <p className="text-sm text-slate-400">Add a one-time listing-credit package.</p>
              </div>
            </div>
            <Button type="submit" className="w-full bg-cyan-300 text-slate-950 hover:bg-cyan-200 sm:w-auto">
              Create package
            </Button>
          </div>

          <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Plan name" name="name" placeholder="Growth" required />
            <Field label="Amount in rupees" name="amountRupees" type="text" inputMode="decimal" placeholder="7999" required />
            <Field label="Listing credits" name="listingCredits" type="number" min="1" defaultValue="50" required />
            <Field label="Credit validity days" name="creditValidityDays" type="number" min="1" defaultValue="30" required />
            <Field label="Listing visibility days" name="listingVisibilityDays" type="number" min="1" defaultValue="60" required />
            <Field label="Sort order" name="sortOrder" type="number" defaultValue="40" required />
            <TextArea label="Description" name="description" placeholder="For growing broker teams" />
            <label className="grid min-w-0 gap-1 text-sm font-medium text-slate-300">
              Status
              <select name="status" defaultValue="active" className="h-10 min-w-0 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="flex h-10 min-w-0 items-center gap-2 self-end rounded-md border border-white/10 bg-slate-950 px-3 text-sm font-medium text-slate-300">
              <input name="featured" type="checkbox" value="true" className="size-4 accent-cyan-300" />
              Featured
            </label>
            <input type="hidden" name="currency" value="INR" />
          </div>
        </form>

        <div className="min-w-0 space-y-4">
          {plans.map((plan) => (
            <PlanEditor key={plan.id} plan={plan} isAssigned={assignedPlanIds.has(plan.id)} />
          ))}
        </div>

        <div className="rounded-lg border border-cyan-300/10 bg-white/[0.06] p-5 text-white">
          <div className="flex items-center gap-3">
            <CreditCard className="size-5 text-cyan-200" />
            <h2 className="text-lg font-semibold">Package behaviour</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Prices and credit quantities are resolved server-side. Publishing consumes a credit once; reactivation depends on an active wallet.
          </p>
        </div>
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
              {plan.listingCredits} credits · {formatPlanPrice(plan)} · {plan.creditValidityDays} day wallet
            </p>
            {plan.description ? <p className="mt-2 max-w-2xl text-sm text-slate-400">{plan.description}</p> : null}
          </div>
        </div>
        <p className="text-xs text-slate-500">ID: {plan.id}</p>
      </div>

      <form action={updatePlanAction.bind(null, plan.id)} className="mt-5 grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Name" name="name" defaultValue={plan.name} required />
        <Field label="Amount in rupees" name="amountRupees" type="text" inputMode="decimal" defaultValue={paiseToRupees(plan.amountPaise)} required />
        <Field label="Listing credits" name="listingCredits" type="number" min="1" defaultValue={String(plan.listingCredits)} required />
        <Field label="Credit validity days" name="creditValidityDays" type="number" min="1" defaultValue={String(plan.creditValidityDays)} required />
        <Field label="Listing visibility days" name="listingVisibilityDays" type="number" min="1" defaultValue={String(plan.listingVisibilityDays)} required />
        <Field label="Order" name="sortOrder" type="number" defaultValue={String(plan.sortOrder)} required />
        <TextArea label="Description" name="description" defaultValue={plan.description} />
        <label className="grid min-w-0 gap-1 text-sm font-medium text-slate-300">
          Status
          <select name="status" defaultValue={plan.status} className="h-10 min-w-0 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <label className="flex h-10 min-w-0 items-center gap-2 self-end rounded-md border border-white/10 bg-slate-950 px-3 text-sm font-medium text-slate-300">
          <input name="featured" type="checkbox" value="true" defaultChecked={plan.featured} className="size-4 accent-cyan-300" />
          <Sparkles className="size-4 text-cyan-200" />
          Featured
        </label>
        <input type="hidden" name="currency" value="INR" />
        <div className="flex min-w-0 items-end md:col-span-2 xl:col-span-1">
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
    <label className="grid min-w-0 gap-1 text-sm font-medium text-slate-300">
      {label}
      <input
        {...inputProps}
        className="h-10 min-w-0 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none placeholder:text-slate-600"
      />
    </label>
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const { label, ...textareaProps } = props;
  return (
    <label className="grid min-w-0 gap-1 text-sm font-medium text-slate-300 sm:col-span-2 xl:col-span-1">
      {label}
      <textarea
        {...textareaProps}
        className="min-h-10 min-w-0 rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600"
      />
    </label>
  );
}

function paiseToRupees(amountPaise: number) {
  const rupees = Math.trunc(amountPaise / 100);
  const paise = Math.abs(amountPaise % 100);
  return paise ? `${rupees}.${String(paise).padStart(2, "0")}` : String(rupees);
}
