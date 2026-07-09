import Link from "next/link";
import { Archive, Copy, Eye, Pencil, Plus, Search, Trash2, UploadCloud, XCircle } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentAdmin } from "@/lib/auth/current-user";
import { formatRupees } from "@/lib/format";
import { listingService } from "@/lib/listings/listing-service";
import { workspaceService } from "@/lib/workspaces/workspace-service";
import {
  deleteListingInWorkspaceAction,
  duplicateListingInWorkspaceAction,
  updateListingStatusInWorkspaceAction,
} from "@/server-actions/listing-actions";
import type { Listing, ListingStatus } from "@/types/domain";

const statuses: Array<ListingStatus | "all"> = [
  "all",
  "published",
  "draft",
  "ready_to_publish",
  "needs_review",
  "unpublished",
  "archived",
  "sold",
  "rented",
  "rejected",
];

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; workspaceId?: string; status?: string }>;
}) {
  await getCurrentAdmin();
  const query = await searchParams;
  const [allListings, workspaces] = await Promise.all([
    listingService.listAll(),
    workspaceService.list(),
  ]);
  const workspaceById = new Map(workspaces.map((workspace) => [workspace.id, workspace]));
  const q = (query.q ?? "").trim().toLowerCase();
  const selectedWorkspace = query.workspaceId ?? "all";
  const selectedStatus = query.status ?? "all";
  const listings = allListings.filter((listing) => {
    const workspace = workspaceById.get(listing.workspaceId);
    const searchable = [
      listing.title,
      listing.location,
      listing.city,
      listing.locality,
      listing.societyName,
      workspace?.name,
      listing.ownerPhone,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return (
      (!q || searchable.includes(q)) &&
      (selectedWorkspace === "all" || listing.workspaceId === selectedWorkspace) &&
      (selectedStatus === "all" || listing.status === selectedStatus)
    );
  });

  return (
    <AdminShell active="Listings">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-cyan-200">Super Admin</p>
            <h1 className="mt-2 text-3xl font-semibold">Listings</h1>
            <p className="mt-2 max-w-3xl text-slate-400">
              Manage every property across all broker accounts.
            </p>
          </div>
          <Button asChild className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">
            <Link href="/admin/listings/new">
              <Plus className="size-4" />
              New listing
            </Link>
          </Button>
        </div>

        <section className="grid gap-4 md:grid-cols-4">
          <Stat label="Total" value={String(allListings.length)} />
          <Stat label="Published" value={String(allListings.filter((item) => item.status === "published").length)} />
          <Stat label="Needs review" value={String(allListings.filter((item) => item.riskFlags.length || item.missingFields.length).length)} />
          <Stat label="Archived" value={String(allListings.filter((item) => item.status === "archived").length)} />
        </section>

        <form className="grid gap-3 rounded-lg border border-cyan-300/10 bg-white/[0.06] p-4 lg:grid-cols-[1fr_220px_220px_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <Input
              name="q"
              placeholder="Search title, location, workspace, phone"
              defaultValue={query.q ?? ""}
              className="bg-slate-950 pl-9 text-white"
            />
          </label>
          <select
            name="workspaceId"
            defaultValue={selectedWorkspace}
            className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white"
          >
            <option value="all">All workspaces</option>
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={selectedStatus}
            className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-sm capitalize text-white"
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <Button type="submit" className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">
            Apply
          </Button>
        </form>

        <section className="overflow-hidden rounded-lg border border-cyan-300/10 bg-white/[0.06]">
          <div className="border-b border-cyan-300/10 p-5">
            <h2 className="text-xl font-semibold">{listings.length} listing(s)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-white/[0.04] text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Listing</th>
                  <th className="px-5 py-3 font-medium">Workspace</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Price</th>
                  <th className="px-5 py-3 font-medium">Quality</th>
                  <th className="px-5 py-3 font-medium">Risk</th>
                  <th className="px-5 py-3 font-medium">Updated</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => {
                  const workspace = workspaceById.get(listing.workspaceId);
                  return (
                    <tr key={listing.id} className="border-t border-cyan-300/10 align-top">
                      <td className="px-5 py-4">
                        <p className="max-w-md font-medium text-white">{listing.title}</p>
                        <p className="mt-1 text-slate-400">{listing.location || listing.city}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-200">{workspace?.name ?? listing.workspaceId}</td>
                      <td className="px-5 py-4">
                        <Badge className="capitalize" variant={listing.status === "published" ? "default" : "secondary"}>
                          {listing.status.replaceAll("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-slate-200">{formatRupees(listing.price)}</td>
                      <td className="px-5 py-4 text-slate-200">{listing.qualityScore}/100</td>
                      <td className="px-5 py-4 text-slate-200">
                        {listing.riskFlags.length + listing.missingFields.length || "-"}
                      </td>
                      <td className="px-5 py-4 text-slate-400">{formatDate(listing.updatedAt)}</td>
                      <td className="px-5 py-4">
                        <ListingRowActions listing={listing} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

function ListingRowActions({ listing }: { listing: Listing }) {
  const updateStatus = updateListingStatusInWorkspaceAction.bind(
    null,
    listing.workspaceId,
    listing.id,
  );
  const duplicateListing = duplicateListingInWorkspaceAction.bind(
    null,
    listing.workspaceId,
    listing.id,
  );
  const deleteListing = deleteListingInWorkspaceAction.bind(
    null,
    listing.workspaceId,
    listing.id,
  );
  const canView = listing.status !== "archived" && listing.status !== "rejected";

  return (
    <div className="min-w-56 space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button asChild size="xs" variant="secondary">
          <Link href={`/admin/listings/${listing.id}?workspaceId=${listing.workspaceId}`}>
            <Pencil className="size-3" />
            Edit
          </Link>
        </Button>
        {canView ? (
          <Button asChild size="xs" variant="outline" className="border-white/15 bg-white/5 text-white">
            <Link href={`/l/${listing.slug}`}>
              <Eye className="size-3" />
              View
            </Link>
          </Button>
        ) : null}
        <form action={duplicateListing}>
          <Button type="submit" size="xs" variant="outline" className="border-white/15 bg-white/5 text-white">
            <Copy className="size-3" />
            Copy
          </Button>
        </form>
      </div>

      <div className="flex flex-wrap gap-2">
        {listing.status !== "published" ? (
          <form action={updateStatus.bind(null, "published")}>
            <Button type="submit" size="xs" className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">
              <UploadCloud className="size-3" />
              Publish
            </Button>
          </form>
        ) : (
          <form action={updateStatus.bind(null, "unpublished")}>
            <Button type="submit" size="xs" variant="outline" className="border-white/15 bg-white/5 text-white">
              <XCircle className="size-3" />
              Unpublish
            </Button>
          </form>
        )}
        {listing.status !== "archived" ? (
          <form action={updateStatus.bind(null, "archived")}>
            <Button type="submit" size="xs" variant="outline" className="border-amber-300/30 bg-amber-300/10 text-amber-100 hover:bg-amber-300/20">
              <Archive className="size-3" />
              Archive
            </Button>
          </form>
        ) : null}
      </div>

      <details className="group rounded-md border border-red-400/20 bg-red-500/10 p-2">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-red-100">
          <Trash2 className="size-3" />
          Delete listing
        </summary>
        <form action={deleteListing} className="mt-3 grid gap-2">
          <label className="text-[11px] leading-4 text-red-100/80">
            Type delete to permanently remove this listing.
          </label>
          <input
            name="confirmation"
            pattern="delete"
            required
            placeholder="delete"
            className="h-8 rounded-md border border-red-300/30 bg-slate-950 px-2 text-xs text-white outline-none placeholder:text-red-100/30"
          />
          <Button type="submit" size="xs" variant="destructive">
            Permanently delete
          </Button>
        </form>
      </details>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-cyan-300/10 bg-white/[0.06] p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
