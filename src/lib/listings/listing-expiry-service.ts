import "server-only";

import type { Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { firestorePaths } from "@/lib/firebase/paths";
import type { Listing } from "@/types/domain";

export interface ExpireListingInput {
  workspaceId: string;
  listingId: string;
  now: string;
}

export interface ListingExpiryStore {
  listDuePublishedListings(now: string): Promise<Listing[]>;
  expireListingIfDue(input: ExpireListingInput): Promise<Listing | null>;
}

export interface ListingExpiryResult {
  expiredCount: number;
  expiredListings: Listing[];
}

export class ListingExpiryService {
  constructor(private readonly store: ListingExpiryStore = new FirestoreListingExpiryStore()) {}

  async expireDueListings(now: Date): Promise<ListingExpiryResult> {
    const timestamp = now.toISOString();
    const dueListings = await this.store.listDuePublishedListings(timestamp);
    const expiredListings: Listing[] = [];

    for (const listing of dueListings) {
      const expired = await this.store.expireListingIfDue({
        workspaceId: listing.workspaceId,
        listingId: listing.id,
        now: timestamp,
      });
      if (expired) expiredListings.push(expired);
    }

    return {
      expiredCount: expiredListings.length,
      expiredListings,
    };
  }
}

export class FirestoreListingExpiryStore implements ListingExpiryStore {
  constructor(private readonly providedDb?: Firestore) {}

  async listDuePublishedListings(now: string) {
    const snapshot = await this.db
      .collectionGroup("listings")
      .where("status", "==", "published")
      .where("expiresAt", "<=", now)
      .get();
    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as Listing)
      .filter((listing) => isDuePublished(listing, now));
  }

  async expireListingIfDue(input: ExpireListingInput) {
    const db = this.db;
    const listingRef = db.doc(firestorePaths.workspaceListing(input.workspaceId, input.listingId));

    return db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(listingRef);
      if (!snapshot.exists) return null;

      const listing = { id: snapshot.id, ...snapshot.data() } as Listing;
      if (!isDuePublished(listing, input.now)) return null;

      const patch: Pick<Listing, "status" | "updatedAt" | "freshnessStatus"> = {
        status: "expired",
        updatedAt: input.now,
        freshnessStatus: "Expired",
      };
      transaction.update(listingRef, patch);
      transaction.delete(db.doc(firestorePaths.publicListing(listing.slug)));
      return { ...listing, ...patch };
    });
  }

  private get db() {
    return this.providedDb ?? getAdminDb();
  }
}

function isDuePublished(listing: Listing, now: string) {
  return (
    listing.status === "published" &&
    Boolean(listing.expiresAt) &&
    Date.parse(listing.expiresAt ?? "") <= Date.parse(now)
  );
}

export const listingExpiryService = new ListingExpiryService();
