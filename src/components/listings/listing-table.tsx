import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Building2, Copy, Eye, FilePenLine, Plus, Send, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    <div className="overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white shadow-sm shadow-stone-200/60">
      <Table>
        <TableHeader className="bg-stone-50">
          <TableRow className="border-stone-200 hover:bg-transparent">
            <TableHead className="text-stone-500">Listing</TableHead>
            <TableHead className="text-stone-500">Price</TableHead>
            <TableHead className="text-stone-500">Status</TableHead>
            <TableHead className="text-stone-500">Quality</TableHead>
            <TableHead className="text-stone-500">Leads</TableHead>
            <TableHead className="text-right text-stone-500">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {listings.map((listing) => {
            const hero = heroes.get(listing.id);
            return (
              <TableRow key={listing.id} className="border-stone-100 hover:bg-stone-50/70">
                <TableCell>
                  <div className="flex items-center gap-3">
                    {hero ? (
                      <Image
                        src={hero.thumbnailUrl}
                        alt=""
                        width={64}
                        height={48}
                        className="h-16 w-20 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="h-16 w-20 rounded-xl bg-stone-100" />
                    )}
                    <div>
                      <p className="font-medium leading-snug text-stone-950">{listing.title}</p>
                      <p className="mt-1 line-clamp-1 text-sm text-stone-500">{listing.location}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-semibold text-stone-950">{formatRupees(listing.price)}</TableCell>
                <TableCell>
                  <Badge variant={listing.status === "published" ? "default" : "secondary"}>
                    {listing.status.replaceAll("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-stone-700">{listing.qualityScore}/100</TableCell>
                <TableCell className="text-stone-700">{listing.leads}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button asChild variant="outline" size="sm" className="border-stone-200 bg-white text-stone-950 hover:bg-stone-100">
                      <Link href={`/dashboard/listings/${listing.id}`}>
                        <FilePenLine className="size-4" />
                        Edit
                      </Link>
                    </Button>
                    {listing.status === "published" ? (
                      <Button asChild variant="secondary" size="sm" className="bg-stone-950 text-white hover:bg-stone-800">
                        <Link href={`/l/${listing.slug}`}>
                          <Eye className="size-4" />
                          View
                        </Link>
                      </Button>
                    ) : (
                      <Button asChild variant="secondary" size="sm" className="bg-stone-950 text-white hover:bg-stone-800">
                        <Link href={`/dashboard/listings/${listing.id}`}>
                          <Eye className="size-4" />
                          Review
                        </Link>
                      </Button>
                    )}
                    {listing.status !== "published" ? (
                      <form action={updateListingStatusAction.bind(null, listing.id, "published")}>
                        <Button size="sm" type="submit" className="bg-emerald-600 text-white hover:bg-emerald-700">
                          <Send className="size-4" />
                          Publish
                        </Button>
                      </form>
                    ) : (
                      <form action={updateListingStatusAction.bind(null, listing.id, "unpublished")}>
                        <Button size="sm" type="submit" variant="outline" className="border-stone-200 bg-white text-stone-700 hover:bg-stone-100">
                          <XCircle className="size-4" />
                          Unpublish
                        </Button>
                      </form>
                    )}
                    <form action={duplicateListingAction.bind(null, listing.id)}>
                      <Button size="sm" type="submit" variant="outline" className="border-stone-200 bg-white text-stone-700 hover:bg-stone-100">
                        <Copy className="size-4" />
                        Duplicate
                      </Button>
                    </form>
                    {listing.status !== "sold" && listing.status !== "rented" ? (
                      <>
                        {listing.transactionType === "sale" ? (
                          <form action={updateListingStatusAction.bind(null, listing.id, "sold")}>
                            <Button size="sm" type="submit" variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100">
                              <BadgeCheck className="size-4" />
                              Mark sold
                            </Button>
                          </form>
                        ) : (
                          <form action={updateListingStatusAction.bind(null, listing.id, "rented")}>
                            <Button size="sm" type="submit" variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100">
                              <BadgeCheck className="size-4" />
                              Mark rented
                            </Button>
                          </form>
                        )}
                      </>
                    ) : null}
                    <form action={updateListingStatusAction.bind(null, listing.id, "archived")}>
                      <Button size="sm" type="submit" variant="ghost" className="text-stone-500 hover:bg-stone-100 hover:text-stone-950">Archive</Button>
                    </form>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
