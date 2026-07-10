import { listingExpiryService } from "@/lib/listings/listing-expiry-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await listingExpiryService.expireDueListings(new Date());
  return Response.json({
    expiredCount: result.expiredCount,
    expiredListingIds: result.expiredListings.map((listing) => listing.id),
  });
}

function isAuthorizedCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}
