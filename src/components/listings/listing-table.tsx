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
import type { Listing, MediaAsset } from "@/types/domain";

export async function ListingTable({ listings }: { listings: Listing[] }) {
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

  return (
    <div className="space-y-3">
      {listings.map((listing) => {
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
