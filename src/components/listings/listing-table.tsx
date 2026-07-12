import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  Building2,
  Copy,
  Eye,
  FilePenLine,
  IndianRupee,
  Inbox,
  Plus,
  Send,
  SlidersHorizontal,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRupees } from "@/lib/format";
import { mediaService } from "@/lib/media/media-service";
import {
  duplicateListingAction,
  updateListingStatusAction,
} from "@/server-actions/listing-actions";
import type { Listing, ListingStatus, MediaAsset } from "@/types/domain";

type ListingFilters = {
  q?: string;
  status?: string;
  transaction?: string;
  quality?: string;
};

const statusOptions: Array<{ label: string; value: ListingStatus }> = [
  { label: "Published", value: "published" },
  { label: "Draft", value: "draft" },
  { label: "Needs review", value: "needs_review" },
  { label: "Ready to publish", value: "ready_to_publish" },
  { label: "Unpublished", value: "unpublished" },
  { label: "Sold", value: "sold" },
  { label: "Rented", value: "rented" },
  { label: "Archived", value: "archived" },
];

export async function ListingTable({
  listings,
  filters = {},
  resetHref = "/dashboard/listings",
}: {
  listings: Listing[];
  filters?: ListingFilters;
  resetHref?: string;
}) {
  if (!listings.length) {
    return (
      <div className="rounded-[1.5rem] border border-stone-200 bg-white p-8 text-center shadow-sm shadow-stone-200/60">
        <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Building2 className="size-5" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-stone-950">No listings yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
          Create your first draft manually, or use the Super Admin WhatsApp intake to turn a real
          property message into a listing.
        </p>
        <Button asChild className="mt-5 bg-stone-950 text-white hover:bg-stone-800">
          <Link href="/dashboard/listings/new">
            <Plus className="size-4" />
            New listing
          </Link>
        </Button>
      </div>
    );
  }

  const heroEntries = await Promise.all(
    listings.map(
      async (listing) =>
        [listing.id, await mediaService.heroForListing(listing.workspaceId, listing.id)] as const,
    ),
  );
  const heroes = new Map<string, MediaAsset | null>(heroEntries);
  const filteredListings = filterListings(listings, filters);
  const hasFilters = Boolean(filters.q || filters.status || filters.transaction || filters.quality);

  return (
    <div className="space-y-4">
      <form className="rounded-[1.5rem] border border-stone-200 bg-white p-3 shadow-sm shadow-stone-200/60 sm:p-4">
        <div className="flex items-center gap-2 px-1 pb-3 text-sm font-semibold text-stone-950">
          <SlidersHorizontal className="size-4 text-emerald-700" />
          Filters
          {hasFilters ? (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
              {filteredListings.length} shown
            </span>
          ) : null}
        </div>
        <div className="grid gap-2 md:grid-cols-[minmax(14rem,1fr)_11rem_10rem_11rem_auto]">
          <input
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="Search title or location"
            className="min-h-11 min-w-0 rounded-2xl border border-stone-200 bg-stone-50 px-4 text-sm outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100"
          />
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="min-h-11 rounded-2xl border border-stone-200 bg-stone-50 px-4 text-sm outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100"
          >
            <option value="">All status</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            name="transaction"
            defaultValue={filters.transaction ?? ""}
            className="min-h-11 rounded-2xl border border-stone-200 bg-stone-50 px-4 text-sm outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100"
          >
            <option value="">Buy / rent</option>
            <option value="sale">Buy</option>
            <option value="rent">Rent</option>
          </select>
          <select
            name="quality"
            defaultValue={filters.quality ?? ""}
            className="min-h-11 rounded-2xl border border-stone-200 bg-stone-50 px-4 text-sm outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100"
          >
            <option value="">All quality</option>
            <option value="strong">75+ score</option>
            <option value="review">Below 75</option>
          </select>
          <div className="grid grid-cols-2 gap-2 md:flex">
            <Button type="submit" className="min-h-11 rounded-2xl bg-stone-950 px-5 text-white hover:bg-stone-800">
              Apply
            </Button>
            {hasFilters ? (
              <Button asChild variant="outline" className="min-h-11 rounded-2xl border-stone-200 bg-white px-5 text-stone-700 hover:bg-stone-100">
                <Link href={resetHref}>Reset</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </form>

      {!filteredListings.length ? (
        <div className="rounded-[1.5rem] border border-stone-200 bg-white p-8 text-center shadow-sm shadow-stone-200/60">
          <h2 className="text-xl font-semibold text-stone-950">No matching listings</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
            Try a different search or clear the filters.
          </p>
          <Button asChild variant="outline" className="mt-5 rounded-2xl border-stone-200 bg-white text-stone-950 hover:bg-stone-100">
            <Link href={resetHref}>Clear filters</Link>
          </Button>
        </div>
      ) : null}

      {filteredListings.map((listing) => {
        const hero = heroes.get(listing.id);
        const statusTone =
          listing.status === "published"
            ? "default"
            : listing.status === "sold" || listing.status === "rented"
              ? "outline"
              : "secondary";

        return (
          <article
            key={listing.id}
            className="overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white shadow-sm shadow-stone-200/60 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_23rem]">
              <div className="flex min-w-0 gap-4">
                {hero ? (
                  <Image
                    src={hero.thumbnailUrl}
                    alt=""
                    width={128}
                    height={96}
                    className="h-24 w-24 flex-none rounded-2xl object-cover sm:h-28 sm:w-36"
                  />
                ) : (
                  <div className="flex h-24 w-24 flex-none items-center justify-center rounded-2xl bg-stone-100 text-stone-300 sm:h-28 sm:w-36">
                    <Building2 className="size-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1 py-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusTone} className="capitalize">
                      {listing.status.replaceAll("_", " ")}
                    </Badge>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                      <IndianRupee className="size-3.5" />
                      {formatRupees(listing.price)}
                    </span>
                  </div>
                  <h3 className="mt-3 max-w-3xl text-base font-semibold leading-snug text-stone-950 sm:text-lg">
                    {listing.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 max-w-3xl text-sm leading-6 text-stone-500">
                    {listing.location}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-stone-600">
                    <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1">
                      <ShieldCheck className="size-3.5 text-emerald-700" />
                      Quality {listing.qualityScore}/100
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1">
                      <Inbox className="size-3.5 text-emerald-700" />
                      {listing.leads} leads
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-2 xl:items-end xl:justify-center">
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap xl:justify-end">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="min-h-10 border-stone-200 bg-white text-stone-950 hover:bg-stone-100"
                  >
                    <Link href={`/dashboard/listings/${listing.id}`}>
                      <FilePenLine className="size-4" />
                      Edit
                    </Link>
                  </Button>
                  {listing.status === "published" ? (
                    <Button
                      asChild
                      variant="secondary"
                      size="sm"
                      className="min-h-10 bg-stone-950 text-white hover:bg-stone-800"
                    >
                      <Link href={`/l/${listing.slug}`}>
                        <Eye className="size-4" />
                        View
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      asChild
                      variant="secondary"
                      size="sm"
                      className="min-h-10 bg-stone-950 text-white hover:bg-stone-800"
                    >
                      <Link href={`/dashboard/listings/${listing.id}`}>
                        <Eye className="size-4" />
                        Review
                      </Link>
                    </Button>
                  )}
                  {listing.status !== "published" ? (
                    <form action={updateListingStatusAction.bind(null, listing.id, "published")}>
                      <Button size="sm" type="submit" className="min-h-10 w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto">
                        <Send className="size-4" />
                        Publish
                      </Button>
                    </form>
                  ) : (
                    <form action={updateListingStatusAction.bind(null, listing.id, "unpublished")}>
                      <Button size="sm" type="submit" variant="outline" className="min-h-10 w-full border-stone-200 bg-white text-stone-700 hover:bg-stone-100 sm:w-auto">
                        <XCircle className="size-4" />
                        Unpublish
                      </Button>
                    </form>
                  )}
                  <form action={duplicateListingAction.bind(null, listing.id)}>
                    <Button size="sm" type="submit" variant="outline" className="min-h-10 w-full border-stone-200 bg-white text-stone-700 hover:bg-stone-100 sm:w-auto">
                      <Copy className="size-4" />
                      Duplicate
                    </Button>
                  </form>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap xl:justify-end">
                  {listing.status !== "sold" && listing.status !== "rented" ? (
                    listing.transactionType === "sale" ? (
                      <form action={updateListingStatusAction.bind(null, listing.id, "sold")}>
                        <Button size="sm" type="submit" variant="outline" className="min-h-10 w-full border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 sm:w-auto">
                          <BadgeCheck className="size-4" />
                          Mark sold
                        </Button>
                      </form>
                    ) : (
                      <form action={updateListingStatusAction.bind(null, listing.id, "rented")}>
                        <Button size="sm" type="submit" variant="outline" className="min-h-10 w-full border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 sm:w-auto">
                          <BadgeCheck className="size-4" />
                          Mark rented
                        </Button>
                      </form>
                    )
                  ) : null}
                  <form action={updateListingStatusAction.bind(null, listing.id, "archived")}>
                    <Button size="sm" type="submit" variant="ghost" className="min-h-10 w-full text-stone-500 hover:bg-stone-100 hover:text-stone-950 sm:w-auto">
                      Archive
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function filterListings(listings: Listing[], filters: ListingFilters) {
  const q = filters.q?.trim().toLowerCase();
  return listings.filter((listing) => {
    if (q) {
      const haystack = [
        listing.title,
        listing.location,
        listing.locality,
        listing.societyName,
        listing.city,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    if (filters.status && listing.status !== filters.status) return false;
    if (filters.transaction && listing.transactionType !== filters.transaction) return false;
    if (filters.quality === "strong" && listing.qualityScore < 75) return false;
    if (filters.quality === "review" && listing.qualityScore >= 75) return false;

    return true;
  });
}
