import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { ListingTable } from "@/components/listings/listing-table";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listingService } from "@/lib/listings/listing-service";

export default async function DashboardListingsPage() {
  const user = await getCurrentUser();
  const listings = await listingService.listByWorkspace(user.workspaceId!);

  return (
    <AppShell active="Listings">
      <div className="space-y-6 pb-10">
        <div className="flex flex-col gap-4 rounded-[2rem] bg-white p-6 shadow-sm shadow-stone-200/70 ring-1 ring-stone-200 sm:flex-row sm:items-end sm:justify-between sm:p-8">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
              <Sparkles className="size-4" />
              Broker catalogue
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-stone-950">Listings</h1>
            <p className="mt-2 max-w-2xl text-stone-500">Create, polish, publish, and share every property page from one catalogue.</p>
          </div>
          <Button asChild className="bg-stone-950 text-white hover:bg-stone-800">
            <Link href="/dashboard/listings/new">
              <Plus className="size-4" />
              New listing
            </Link>
          </Button>
        </div>
        <ListingTable listings={listings} />
      </div>
    </AppShell>
  );
}
