import { NextResponse } from "next/server";
import { leadService } from "@/lib/leads/lead-service";
import { publicLeadSchema } from "@/lib/leads/lead.schema";
import { listingService } from "@/lib/listings/listing-service";

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = publicLeadSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid enquiry", issues: parsed.error.flatten() }, { status: 400 });
  }

  const listing = await listingService.findAnyById(parsed.data.listingId);
  if (!listing || listing.status !== "published") {
    return NextResponse.json({ error: "Published listing not found" }, { status: 404 });
  }

  const lead = await leadService.create({
    ...parsed.data,
    workspaceId: listing.workspaceId,
  });
  return NextResponse.json({ lead }, { status: 201 });
}
