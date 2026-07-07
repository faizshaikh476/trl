import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { ListingForm } from "@/components/listings/listing-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentAdmin } from "@/lib/auth/current-user";
import { formatRupees } from "@/lib/format";
import { listingService } from "@/lib/listings/listing-service";
import { workspaceService } from "@/lib/workspaces/workspace-service";
import {
  deleteListingInWorkspaceAction,
  updateListingStatusInWorkspaceAction,
  updateManualListingInWorkspaceAction,
} from "@/server-actions/listing-actions";

export default async function AdminListingReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ workspaceId?: string }>;
}) {
  await getCurrentAdmin();
  const { id } = await params;
  const { workspaceId } = await searchParams;
  const workspaces = workspaceId ? [] : await workspaceService.list();
  const listing = workspaceId
    ? await listingService.findByWorkspaceId(workspaceId, id)
    : await findListingAcrossWorkspaces(id, workspaces.map((workspace) => workspace.id));
  if (!listing) notFound();

  const workspace = workspaceId
    ? await workspaceService.findById(listing.workspaceId)
    : workspaces.find((item) => item.id === listing.workspaceId) ?? null;
  const updateStatus = updateListingStatusInWorkspaceAction.bind(
    null,
    listing.workspaceId,
    listing.id,
  );
  const updateManual = updateManualListingInWorkspaceAction.bind(null, listing.workspaceId, listing.id);
  const deleteListing = deleteListingInWorkspaceAction.bind(null, listing.workspaceId, listing.id);

  return (
    <AdminShell active="Listings">
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm" className="text-slate-300 hover:text-white">
          <Link href="/admin/listings">
            <ArrowLeft className="size-4" />
            Listings
          </Link>
        </Button>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-cyan-200">{workspace?.name ?? "Workspace"}</p>
            <h1 className="mt-2 text-3xl font-semibold">{listing.title}</h1>
            <p className="mt-2 max-w-2xl text-slate-400">{listing.location}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[32rem]">
            <Metric label="Status" value={listing.status.replaceAll("_", " ")} />
            <Metric label="Quality" value={`${listing.qualityScore}/100`} />
            <Metric label="Price" value={formatRupees(listing.price)} />
          </div>
        </div>

        {(listing.missingFields.length > 0 || listing.riskFlags.length > 0) && (
          <section className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-5">
            <div className="flex flex-wrap gap-2">
              {listing.missingFields.map((item) => (
                <Badge key={`missing-${item}`} variant="secondary">
                  Missing {item}
                </Badge>
              ))}
              {listing.riskFlags.map((item) => (
                <Badge key={`risk-${item}`} variant="destructive">
                  {item.replaceAll("_", " ")}
                </Badge>
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-wrap gap-3">
          {listing.status !== "published" ? (
            <form action={updateStatus.bind(null, "published")}>
              <Button type="submit" className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">
                Publish
              </Button>
            </form>
          ) : (
            <Button asChild className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">
              <Link href={`/l/${listing.slug}`}>View public page</Link>
            </Button>
          )}
          {listing.status === "published" ? (
            <form action={updateStatus.bind(null, "unpublished")}>
              <Button type="submit" variant="secondary">
                Unpublish
              </Button>
            </form>
          ) : null}
          <form action={updateStatus.bind(null, "archived")}>
            <Button type="submit" variant="secondary">
              Archive
            </Button>
          </form>
          <form action={updateStatus.bind(null, "sold")}>
            <Button type="submit" variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
              Mark sold
            </Button>
          </form>
          <form action={updateStatus.bind(null, "rented")}>
            <Button type="submit" variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
              Mark rented
            </Button>
          </form>
        </div>

        <ListingForm
          listing={listing}
          action={updateManual}
          submitLabel="Save review changes"
        />

        <section className="rounded-lg border border-red-400/30 bg-red-500/10 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-red-100">Danger zone</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-red-100/75">
                Hard delete permanently removes this listing document and its public slug index.
                Archive first when you only want to hide it from the public site.
              </p>
            </div>
            <form action={deleteListing} className="grid gap-3 sm:min-w-80">
              <label className="text-sm font-medium text-red-100" htmlFor="confirmation">
                Type delete to permanently delete
              </label>
              <input
                id="confirmation"
                name="confirmation"
                pattern="delete"
                required
                className="h-10 rounded-md border border-red-300/30 bg-slate-950 px-3 text-sm text-white outline-none"
              />
              <Button type="submit" variant="destructive">
                Permanently delete
              </Button>
            </form>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

async function findListingAcrossWorkspaces(id: string, workspaceIds: string[]) {
  for (const workspaceId of workspaceIds) {
    const listing = await listingService.findByWorkspaceId(workspaceId, id);
    if (listing) return listing;
  }
  return null;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-cyan-300/10 bg-white/[0.06] p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold capitalize text-white">{value}</p>
    </div>
  );
}
