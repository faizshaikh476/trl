export function activationPageState(input: {
  tokenValid: boolean;
  listing: { id: string; status: string; title: string; location: string } | null;
}) {
  if (!input.tokenValid) return { kind: "invalid" as const };
  if (!input.listing || input.listing.status !== "ready_to_publish") {
    return { kind: "unavailable" as const };
  }
  return {
    kind: "ready" as const,
    title: input.listing.title,
    location: input.listing.location,
  };
}

export function purchaseSuccessState(input: {
  activationListingId: string | null;
  activationCompletedAt: string | null;
  activationError: string | null;
  listingSlug: string | null;
}) {
  if (!input.activationListingId) return { kind: "credits" as const };
  if (input.activationCompletedAt && input.listingSlug) {
    return { kind: "activated" as const, listingHref: `/l/${input.listingSlug}` };
  }
  return { kind: "pending" as const };
}
