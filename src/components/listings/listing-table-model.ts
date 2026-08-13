import type { Listing, ListingStatus } from "@/types/domain";

export type ListingFilters = {
  q?: string;
  status?: string;
  transaction?: string;
  quality?: string;
};

export function prepareListingsForTable(listings: Listing[], filters: ListingFilters) {
  return listings
    .map((listing, inputIndex) => ({ listing, inputIndex }))
    .filter(({ listing }) => matchesFilters(listing, filters))
    .sort(compareCreatedAt)
    .map(({ listing }) => listing);
}

export function listingStatusPresentation(status: ListingStatus): {
  tone: "published" | "ready" | "neutral";
  hint: string | null;
} {
  if (status === "published") {
    return { tone: "published", hint: "Live and visible to buyers" };
  }
  if (status === "ready_to_publish") {
    return { tone: "ready", hint: "Ready for review and publishing" };
  }
  return { tone: "neutral", hint: null };
}

function matchesFilters(listing: Listing, filters: ListingFilters) {
  if (!filters.status && listing.status === "archived") return false;

  const q = filters.q?.trim().toLowerCase();
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
}

function compareCreatedAt(
  left: { listing: Listing; inputIndex: number },
  right: { listing: Listing; inputIndex: number },
) {
  const leftCreatedAt = Date.parse(left.listing.createdAt);
  const rightCreatedAt = Date.parse(right.listing.createdAt);
  const leftIsValid = Number.isFinite(leftCreatedAt);
  const rightIsValid = Number.isFinite(rightCreatedAt);

  if (leftIsValid && rightIsValid && leftCreatedAt !== rightCreatedAt) {
    return rightCreatedAt - leftCreatedAt;
  }
  if (leftIsValid !== rightIsValid) return leftIsValid ? -1 : 1;
  return left.inputIndex - right.inputIndex;
}
