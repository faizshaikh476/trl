import Link from "next/link";
import { ArrowLeft, Save, Sparkles } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { ListingForm } from "@/components/listings/listing-form";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { requireWorkspacePermission } from "@/lib/rbac/require-permission";
import { createManualListingAction } from "@/server-actions/listing-actions";

export default async function NewListingPage() {
  const user = await getCurrentUser();
  requireWorkspacePermission(user, user.workspaceId!, PERMISSIONS.LISTINGS_CREATE);

  return (
    <AppShell active="Listings">
      <div className="space-y-6 pb-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm" className="text-stone-600 hover:bg-stone-100 hover:text-stone-950">
            <Link href="/dashboard/listings">
              <ArrowLeft className="size-4" />
              Back to listings
            </Link>
          </Button>
          <Button type="submit" form="new-listing-form" className="bg-stone-950 text-white hover:bg-stone-800">
            <Save className="size-4" />
            Create draft
          </Button>
        </div>
        <section className="rounded-[2rem] bg-white p-6 shadow-sm shadow-stone-200/70 ring-1 ring-stone-200 sm:p-8 lg:p-10">
          <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
            <Sparkles className="size-4" />
            Manual listing studio
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">Create listing</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-stone-500">
            Add a production-ready draft with the details needed for publishing, SEO, and sharing.
          </p>
        </section>
        <ListingForm
          action={createManualListingAction}
          submitLabel="Create draft"
          appearance="studio"
          formId="new-listing-form"
        />
      </div>
    </AppShell>
  );
}
