import { describe, expect, it } from "vitest";
import {
  demoAnalyticsEvents,
  demoAuditLogs,
  demoLeads,
  demoListings,
  demoMedia,
  demoWorkspace,
} from "@/lib/mock-data/demo-data";
import { buildFirestoreSeedDocuments } from "./seed";

describe("buildFirestoreSeedDocuments", () => {
  it("maps demo data to Firestore document paths", () => {
    const documents = buildFirestoreSeedDocuments();
    const byPath = new Map(documents.map((document) => [document.path, document.data]));

    expect(byPath.get(`workspaces/${demoWorkspace.id}`)).toMatchObject({
      id: demoWorkspace.id,
      slug: demoWorkspace.slug,
    });
    expect(byPath.get("users/user_super_admin")).toMatchObject({
      role: "super_admin",
      status: "active",
    });
    expect(byPath.get(`workspaces/${demoWorkspace.id}/members/user_owner_demo`)).toMatchObject({
      role: "broker_owner",
      status: "active",
    });
    expect(byPath.get(`workspaces/${demoWorkspace.id}/listings/${demoListings[0]!.id}`)).toMatchObject({
      id: demoListings[0]!.id,
      workspaceId: demoWorkspace.id,
    });
    expect(byPath.get(`publicListingIndex/${demoListings[0]!.slug}`)).toEqual({
      workspaceId: demoWorkspace.id,
      listingId: demoListings[0]!.id,
      slug: demoListings[0]!.slug,
      updatedAt: demoListings[0]!.updatedAt,
    });
    expect(byPath.has(`publicListingIndex/${demoListings[1]!.slug}`)).toBe(false);

    expect(documents).toHaveLength(
      4 +
        demoListings.length +
        demoListings.filter((listing) => listing.status === "published").length +
        demoMedia.length +
        demoLeads.length +
        demoAnalyticsEvents.length +
        demoAuditLogs.length,
    );
  });
});
