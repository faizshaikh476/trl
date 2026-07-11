import Link from "next/link";
import { AppShell } from "@/components/dashboard/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { billingService, buildWorkspaceBillingSummary } from "@/lib/billing/billing-service";
import { creditWalletService } from "@/lib/billing/credit-wallet-service";
import { paymentService } from "@/lib/billing/payment-service";
import { ownerProfileIdForPhone, ownerProfileService } from "@/lib/owners/owner-profile-service";
import { workspaceService } from "@/lib/workspaces/workspace-service";
import { updateWorkspaceProfileAction } from "@/server-actions/workspace-actions";

const workspaceSettings = [
  {
    title: "Public profile",
    description: "Your name, company, city and contact details.",
    status: "Active",
  },
  {
    title: "WhatsApp",
    description: "The number connected to your listings and enquiries.",
    status: "Connected",
  },
  {
    title: "Catalogue",
    description: "Your public profile and all published properties.",
    status: "Public",
  },
  {
    title: "Billing",
    description: "Your listing credits and purchase history.",
    status: "Current",
  },
];

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const workspace = await workspaceService.findById(user.workspaceId!);
  if (!workspace) notFound();
  const ownerProfile = workspace.contactPhone
    ? await ownerProfileService.findById(
        workspace.id,
        ownerProfileIdForPhone(workspace.contactPhone),
      )
    : null;
  const [plans, purchases, wallet] = await Promise.all([
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
    <AppShell active="Settings">
      <div className="space-y-6 pb-10">
        <section className="rounded-[2rem] bg-white p-6 shadow-sm shadow-stone-200/70 ring-1 ring-stone-200 sm:p-8">
          <p className="text-sm font-medium text-emerald-700">{workspace.name}</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-950">Profile settings</h1>
          <p className="mt-3 max-w-2xl text-stone-500">
            Keep your public profile and catalogue details up to date.
          </p>
        </section>

        <section className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/60 sm:p-6">
          <div className="flex flex-col justify-between gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-start">
            <div>
              <p className="text-sm font-medium text-emerald-700">Public profile</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
                Public broker details
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">
                These details appear on your catalogue and property pages.
              </p>
            </div>
            <Badge variant="secondary">Phone locked</Badge>
          </div>

          <form action={updateWorkspaceProfileAction} className="mt-6 grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <SettingsField
                name="name"
                label="Company or broker brand"
                defaultValue={workspace.name}
                placeholder="The Rare Address"
              />
              <SettingsField
                name="contactName"
                label="Public broker name"
                defaultValue={workspace.contactName}
                placeholder="Deepak S."
              />
              <SettingsField
                name="occupation"
                label="Occupation / role"
                defaultValue={ownerProfile?.occupation || "Real estate broker"}
                placeholder="Real estate broker"
              />
              <SettingsField
                name="contactEmail"
                label="Email"
                type="email"
                defaultValue={workspace.contactEmail || ownerProfile?.email || ""}
                placeholder="name@example.com"
              />
              <SettingsField
                name="city"
                label="City"
                defaultValue={workspace.city}
                placeholder="Pune"
              />
              <div>
                <label className="text-sm font-medium text-stone-700" htmlFor="websiteTheme">
                  Website theme
                </label>
                <select
                  id="websiteTheme"
                  name="websiteTheme"
                  defaultValue={workspace.websiteTheme}
                  className="mt-2 h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-950 outline-none transition focus:border-stone-950 focus:ring-2 focus:ring-stone-950/10"
                >
                  <option value="premium">Premium</option>
                  <option value="minimal">Minimal</option>
                  <option value="editorial">Editorial</option>
                </select>
              </div>
            </div>

            <SettingsField
              name="logoURL"
              label="Logo URL"
              type="url"
              defaultValue={workspace.logoURL}
              placeholder="https://..."
            />

            <div className="rounded-[1rem] border border-stone-200 bg-stone-50 p-4">
              <p className="text-sm font-medium text-stone-700">Locked WhatsApp number</p>
              <p className="mt-1 text-lg font-semibold tracking-tight text-stone-950">
                {workspace.contactPhone}
              </p>
              <p className="mt-1 text-sm leading-6 text-stone-500">
                This verified number receives listing and enquiry updates. Contact support to change it.
              </p>
            </div>

            <div className="flex flex-col gap-3 border-t border-stone-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-stone-500">
                Changes appear across your catalogue and property pages.
              </p>
              <Button type="submit" className="bg-stone-950 text-white hover:bg-stone-800">
                Save profile
              </Button>
            </div>
          </form>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workspaceSettings.map((item) => (
            <div key={item.title} className="rounded-[1.25rem] border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/50">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-lg font-semibold text-stone-950">{item.title}</h2>
                  <Badge variant="secondary">{item.status}</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-stone-500">{item.description}</p>
            </div>
          ))}
        </section>

        <section className="rounded-[1.5rem] border border-stone-200 bg-white shadow-sm shadow-stone-200/60">
          <div className="grid gap-5 p-5 md:grid-cols-3">
            <div>
              <p className="text-sm text-stone-500">Catalogue address</p>
              <p className="mt-1 font-medium text-stone-950">/{workspace.slug}</p>
            </div>
            <div>
              <p className="text-sm text-stone-500">Contact phone</p>
              <p className="mt-1 font-medium text-stone-950">{workspace.contactPhone}</p>
            </div>
            <div>
              <p className="text-sm text-stone-500">Credits</p>
              <p className="mt-1 font-medium text-stone-950">
                {billingSummary.availableCredits} · {billingSummary.currentPackageName}
              </p>
              <Link href="/dashboard/billing" className="mt-2 inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-800">
                View purchases
              </Link>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function SettingsField({
  name,
  label,
  defaultValue,
  placeholder,
  type = "text",
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-stone-700" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-stone-950 focus:ring-2 focus:ring-stone-950/10"
      />
    </div>
  );
}
