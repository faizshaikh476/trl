import "server-only";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { listingService } from "@/lib/listings/listing-service";
import { mediaService } from "@/lib/media/media-service";
import { getPlatformBranding } from "@/lib/platform/branding";
import type { Listing } from "@/types/domain";

const PUBLIC_LISTING_REVALIDATE_SECONDS = 300;

export const publicListingCacheTags = {
  branding: "platform-branding",
  listingSlug: (slug: string) => `public-listing:slug:${slug}`,
  listingMedia: (listingId: string) => `public-listing:media:${listingId}`,
};

export function getCachedPublicBranding() {
  return unstable_cache(getPlatformBranding, ["platform-branding"], {
    tags: [publicListingCacheTags.branding],
    revalidate: PUBLIC_LISTING_REVALIDATE_SECONDS,
  })();
}

export function getCachedPublicListing(slug: string) {
  return unstable_cache(() => listingService.findShareableBySlug(slug), ["public-listing", slug], {
    tags: [publicListingCacheTags.listingSlug(slug)],
    revalidate: PUBLIC_LISTING_REVALIDATE_SECONDS,
  })();
}

export function getCachedPublicListingMedia(workspaceId: string, listingId: string) {
  return unstable_cache(
    () => mediaService.listByListing(workspaceId, listingId),
    ["public-listing-media", workspaceId, listingId],
    {
      tags: [publicListingCacheTags.listingMedia(listingId)],
      revalidate: PUBLIC_LISTING_REVALIDATE_SECONDS,
    },
  )();
}

export function getCachedPublicListingHeroMedia(workspaceId: string, listingId: string) {
  return unstable_cache(
    () => mediaService.heroForListing(workspaceId, listingId),
    ["public-listing-hero-media", workspaceId, listingId],
    {
      tags: [publicListingCacheTags.listingMedia(listingId)],
      revalidate: PUBLIC_LISTING_REVALIDATE_SECONDS,
    },
  )();
}

export function revalidatePublicListing(listing: Pick<Listing, "id" | "slug">) {
  revalidatePublicListingBySlug(listing.slug);
  revalidateTag(publicListingCacheTags.listingMedia(listing.id), { expire: 0 });
}

export function revalidatePublicListingBySlug(slug: string) {
  revalidateTag(publicListingCacheTags.listingSlug(slug), { expire: 0 });
  revalidatePath(`/l/${slug}`);
}

export function revalidatePublicBranding() {
  revalidateTag(publicListingCacheTags.branding, { expire: 0 });
  revalidatePath("/", "layout");
}
