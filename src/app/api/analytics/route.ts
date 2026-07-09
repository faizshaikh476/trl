import { NextResponse } from "next/server";
import { analyticsService } from "@/lib/analytics/analytics-service";
import { listingService } from "@/lib/listings/listing-service";

const allowedTypes = new Set([
  "listing_view",
  "whatsapp_click",
  "call_click",
  "share_click",
]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const listingId = typeof body?.listingId === "string" ? body.listingId : "";
    const type = typeof body?.type === "string" ? body.type : "";

    if (!listingId || !allowedTypes.has(type)) {
      return NextResponse.json({ error: "Invalid analytics event" }, { status: 400 });
    }

    const listing = await listingService.findAnyById(listingId);
    if (!listing || listing.status !== "published") {
      return NextResponse.json({ error: "Published listing not found" }, { status: 404 });
    }

    await analyticsService.recordListingEvent({
      workspaceId: listing.workspaceId,
      listingId: listing.id,
      type: type as "listing_view" | "whatsapp_click" | "call_click" | "share_click",
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to record analytics event" }, { status: 500 });
  }
}
