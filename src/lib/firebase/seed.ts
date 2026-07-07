import {
  demoAnalyticsEvents,
  demoAuditLogs,
  demoLeads,
  demoListings,
  demoMedia,
  demoWorkspace,
} from "../mock-data/demo-data";
import { firestorePaths } from "./paths";

export interface FirestoreSeedDocument {
  path: string;
  data: Record<string, unknown>;
}

export function buildFirestoreSeedDocuments(): FirestoreSeedDocument[] {
  const documents: FirestoreSeedDocument[] = [
    {
      path: firestorePaths.user("user_super_admin"),
      data: {
        id: "user_super_admin",
        name: "Super Admin",
        email: "admin@therealestatelink.local",
        role: "super_admin",
        workspaceId: null,
        status: "active",
        createdAt: demoWorkspace.createdAt,
        updatedAt: demoWorkspace.updatedAt,
      },
    },
    {
      path: firestorePaths.user("user_owner_demo"),
      data: {
        id: "user_owner_demo",
        name: "Deepak S.",
        email: "owner@therealestatelink.local",
        role: "broker_owner",
        workspaceId: demoWorkspace.id,
        status: "active",
        createdAt: demoWorkspace.createdAt,
        updatedAt: demoWorkspace.updatedAt,
      },
    },
    {
      path: firestorePaths.workspace(demoWorkspace.id),
      data: demoWorkspace as unknown as Record<string, unknown>,
    },
    {
      path: firestorePaths.workspaceMember(demoWorkspace.id, "user_owner_demo"),
      data: {
        userId: "user_owner_demo",
        role: "broker_owner",
        status: "active",
        createdAt: demoWorkspace.createdAt,
        updatedAt: demoWorkspace.updatedAt,
      },
    },
  ];

  for (const listing of demoListings) {
    documents.push({
      path: firestorePaths.workspaceListing(listing.workspaceId, listing.id),
      data: listing as unknown as Record<string, unknown>,
    });

    if (listing.status === "published") {
      documents.push({
        path: firestorePaths.publicListing(listing.slug),
        data: {
          workspaceId: listing.workspaceId,
          listingId: listing.id,
          slug: listing.slug,
          updatedAt: listing.updatedAt,
        },
      });
    }
  }

  for (const media of demoMedia) {
    documents.push({
      path: firestorePaths.workspaceMediaAsset(media.workspaceId, media.id),
      data: media as unknown as Record<string, unknown>,
    });
  }

  for (const lead of demoLeads) {
    documents.push({
      path: firestorePaths.workspaceLead(lead.workspaceId, lead.id),
      data: lead as unknown as Record<string, unknown>,
    });
  }

  for (const event of demoAnalyticsEvents) {
    documents.push({
      path: `${firestorePaths.workspaceAnalyticsEvents(event.workspaceId)}/${event.id}`,
      data: event as unknown as Record<string, unknown>,
    });
  }

  for (const log of demoAuditLogs) {
    documents.push({
      path: `${firestorePaths.workspaceAuditLogs(log.workspaceId)}/${log.id}`,
      data: log as unknown as Record<string, unknown>,
    });
  }

  return documents;
}
