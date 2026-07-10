import { describe, expect, it } from "vitest";
import { NoListingCreditsError } from "@/lib/billing/credit-wallet-service";
import type { Listing, ListingStatus, Plan } from "@/types/domain";
import {
  ListingExpiryService,
  type ListingExpiryStore,
} from "./listing-expiry-service";
import { ListingService } from "./listing-service";
import type { ListingRepository, PublicationOptions } from "./repositories/listing-repository";

describe("ListingExpiryService", () => {
  it("expires only due published listings and keeps expired listings saved", async () => {
    const now = new Date("2026-07-10T10:00:00.000Z");
    const store = new InMemoryListingExpiryStore([
      listingFixture({
        id: "due_published",
        status: "published",
        expiresAt: "2026-07-10T09:59:59.000Z",
      }),
      listingFixture({
        id: "future_published",
        status: "published",
        expiresAt: "2026-07-10T10:00:01.000Z",
      }),
      listingFixture({
        id: "due_unpublished",
        status: "unpublished",
        expiresAt: "2026-07-10T09:59:59.000Z",
      }),
      listingFixture({
        id: "already_expired",
        status: "expired",
        expiresAt: "2026-07-09T10:00:00.000Z",
      }),
    ]);
    const service = new ListingExpiryService(store);

    const result = await service.expireDueListings(now);

    expect(result.expiredCount).toBe(1);
    expect(result.expiredListings.map((listing) => listing.id)).toEqual(["due_published"]);
    expect(store.savedListing("due_published")).toMatchObject({
      id: "due_published",
      status: "expired",
      expiresAt: "2026-07-10T09:59:59.000Z",
      updatedAt: now.toISOString(),
    });
    expect(store.savedListing("future_published")?.status).toBe("published");
    expect(store.savedListing("due_unpublished")?.status).toBe("unpublished");
    expect(store.savedListing("already_expired")?.status).toBe("expired");
  });

  it("is idempotent across repeated expiry runs", async () => {
    const now = new Date("2026-07-10T10:00:00.000Z");
    const store = new InMemoryListingExpiryStore([
      listingFixture({
        id: "due_published",
        status: "published",
        expiresAt: "2026-07-10T10:00:00.000Z",
      }),
    ]);
    const service = new ListingExpiryService(store);

    await expect(service.expireDueListings(now)).resolves.toMatchObject({
      expiredCount: 1,
    });
    await expect(service.expireDueListings(now)).resolves.toMatchObject({
      expiredCount: 0,
    });
    expect(store.savedListing("due_published")?.status).toBe("expired");
  });
});

describe("listing reactivation", () => {
  it("reactivates an expired credit-backed listing with an active wallet and zero credit consumption", async () => {
    const repository = new ReactivationListingRepository([
      listingFixture({
        id: "listing_1",
        status: "expired",
        creditLedgerEntryId: "consume:listing:listing_1",
        creditConsumedAt: "2026-07-09T10:00:00.000Z",
        expiresAt: "2026-07-10T10:00:00.000Z",
      }),
    ]);
    const wallet = createWallet();
    const service = new ListingService(repository, {
      billingService: createBilling(),
      creditWalletService: wallet,
    });

    const updated = await service.updateStatusInWorkspace(
      "workspace_1",
      "listing_1",
      "published",
    );

    expect(wallet.reactivationCalls).toEqual(["workspace_1"]);
    expect(wallet.consumeCalls).toEqual([]);
    expect(updated.status).toBe("published");
    expect(updated.expiresAt).toBe("2026-09-07T10:00:00.000Z");
    expect(updated.creditLedgerEntryId).toBe("consume:listing:listing_1");
  });

  it("requires an active wallet before reactivating an expired listing", async () => {
    const repository = new ReactivationListingRepository([
      listingFixture({
        id: "listing_1",
        status: "expired",
        creditLedgerEntryId: "consume:listing:listing_1",
        creditConsumedAt: "2026-07-09T10:00:00.000Z",
        expiresAt: "2026-07-10T10:00:00.000Z",
      }),
    ]);
    const wallet = createWallet({ reactivationError: new NoListingCreditsError() });
    const service = new ListingService(repository, {
      billingService: createBilling(),
      creditWalletService: wallet,
    });

    await expect(
      service.updateStatusInWorkspace("workspace_1", "listing_1", "published"),
    ).rejects.toBeInstanceOf(NoListingCreditsError);
    expect(wallet.consumeCalls).toEqual([]);
    expect((await repository.findById("listing_1"))?.status).toBe("expired");
  });
});

class InMemoryListingExpiryStore implements ListingExpiryStore {
  private readonly listings = new Map<string, Listing>();

  constructor(listings: Listing[]) {
    for (const listing of listings) this.listings.set(listing.id, structuredClone(listing));
  }

  async listDuePublishedListings(now: string) {
    return [...this.listings.values()]
      .filter((listing) => isDuePublished(listing, now))
      .map((listing) => structuredClone(listing));
  }

  async expireListingIfDue(input: { workspaceId: string; listingId: string; now: string }) {
    const listing = this.listings.get(input.listingId);
    if (!listing || listing.workspaceId !== input.workspaceId || !isDuePublished(listing, input.now)) {
      return null;
    }
    listing.status = "expired";
    listing.updatedAt = input.now;
    return structuredClone(listing);
  }

  savedListing(id: string) {
    return this.listings.get(id);
  }
}

class ReactivationListingRepository implements ListingRepository {
  private readonly listings = new Map<string, Listing>();

  constructor(listings: Listing[]) {
    for (const listing of listings) this.listings.set(listing.id, structuredClone(listing));
  }

  async listAll() {
    return [...this.listings.values()].map((listing) => structuredClone(listing));
  }

  async listByWorkspace(workspaceId: string) {
    return [...this.listings.values()]
      .filter((listing) => listing.workspaceId === workspaceId)
      .map((listing) => structuredClone(listing));
  }

  async listPublished() {
    return [...this.listings.values()]
      .filter((listing) => listing.status === "published")
      .map((listing) => structuredClone(listing));
  }

  async findPublishedBySlug(slug: string) {
    return (
      [...this.listings.values()].find(
        (listing) => listing.slug === slug && listing.status === "published",
      ) ?? null
    );
  }

  async findShareableBySlug(slug: string) {
    return [...this.listings.values()].find((listing) => listing.slug === slug) ?? null;
  }

  async findById(id: string) {
    return structuredClone(this.listings.get(id) ?? null);
  }

  async findByWorkspaceId(workspaceId: string, id: string) {
    const listing = this.listings.get(id);
    return listing?.workspaceId === workspaceId ? structuredClone(listing) : null;
  }

  async createFromExtraction(): Promise<Listing> {
    throw new Error("Not needed for this test.");
  }

  async createManual(): Promise<Listing> {
    throw new Error("Not needed for this test.");
  }

  async updateManual(): Promise<Listing> {
    throw new Error("Not needed for this test.");
  }

  async updateManualInWorkspace(): Promise<Listing> {
    throw new Error("Not needed for this test.");
  }

  async updateStatus(id: string, status: ListingStatus, publication?: PublicationOptions) {
    const listing = this.listings.get(id);
    if (!listing) throw new Error("Listing not found");
    const now = "2026-07-09T10:00:00.000Z";
    const patch: Partial<Listing> = { status, updatedAt: now };
    if (status === "published") {
      const credit = await publication?.consumeCredit?.(listing.id);
      patch.publishedAt = listing.publishedAt ?? now;
      patch.expiresAt = publication?.visibilityDays
        ? new Date(Date.parse(now) + publication.visibilityDays * 24 * 60 * 60 * 1000).toISOString()
        : listing.expiresAt;
      patch.freshnessStatus = "Updated today";
      if (credit) {
        patch.creditLedgerEntryId = credit.ledgerEntryId;
        patch.creditConsumedAt = credit.createdAt;
      }
    }
    Object.assign(listing, patch);
    return structuredClone(listing);
  }

  async updateStatusInWorkspace(
    workspaceId: string,
    id: string,
    status: ListingStatus,
    publication?: PublicationOptions,
  ) {
    const listing = this.listings.get(id);
    if (listing?.workspaceId !== workspaceId) throw new Error("Listing not found");
    return this.updateStatus(id, status, publication);
  }

  async deleteInWorkspace(): Promise<void> {
    throw new Error("Not needed for this test.");
  }

  async duplicate(): Promise<Listing> {
    throw new Error("Not needed for this test.");
  }
}

function createWallet(options: { reactivationError?: Error } = {}) {
  const consumeCalls: Array<{ workspaceId: string; listingId: string }> = [];
  const reactivationCalls: string[] = [];

  return {
    consumeCalls,
    reactivationCalls,
    async consumeForListing(input: { workspaceId: string; listingId: string }) {
      consumeCalls.push(input);
      return {
        id: `consume:listing:${input.listingId}`,
        ledgerEntryId: `consume:listing:${input.listingId}`,
        workspaceId: input.workspaceId,
        type: "consume" as const,
        quantity: -1,
        sourceType: "listing" as const,
        sourceId: input.listingId,
        listingId: input.listingId,
        reason: "First listing publication",
        createdAt: "2026-07-09T10:00:00.000Z",
      };
    },
    async assertCanReactivate(workspaceId: string) {
      reactivationCalls.push(workspaceId);
      if (options.reactivationError) throw options.reactivationError;
      return {
        availableCredits: 0,
        validUntil: "2026-08-08T10:00:00.000Z",
        lastPurchaseId: "purchase_1",
        createdAt: "2026-07-09T10:00:00.000Z",
        updatedAt: "2026-07-09T10:00:00.000Z",
      };
    },
  };
}

function createBilling() {
  return {
    async findWorkspacePlan(): Promise<Plan> {
      return {
        id: "starter",
        name: "Starter",
        description: "Starter listing credit package",
        amountPaise: 199900,
        currency: "INR",
        listingCredits: 25,
        creditValidityDays: 30,
        listingVisibilityDays: 60,
        featured: false,
        status: "active",
        sortOrder: 10,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
    },
  };
}

function listingFixture(overrides: Partial<Listing>): Listing {
  return {
    id: "listing_1",
    workspaceId: "workspace_1",
    title: "Garden Flat",
    slug: "garden-flat",
    status: "draft",
    transactionType: "sale",
    propertyType: "apartment",
    location: "Pune",
    city: "Pune",
    locality: "Baner",
    societyName: "Garden",
    googleMapsUrl: "",
    price: 10000000,
    deposit: null,
    brokerage: "2%",
    taxes: "extra",
    bhk: 2,
    bedrooms: 2,
    bathrooms: 2,
    carpetArea: 900,
    builtUpArea: null,
    plotArea: null,
    openArea: null,
    furnishedStatus: "semi-furnished",
    parkingCount: 1,
    floor: "4",
    totalFloors: 10,
    availability: "Immediate",
    preferredTenant: null,
    descriptionShort: "Garden flat.",
    descriptionLong: "Garden flat with good light.",
    highlights: [],
    amenities: [],
    missingFields: [],
    riskFlags: [],
    confirmationQuestions: [],
    qualityScore: 80,
    confidenceScore: 1,
    views: 0,
    leads: 0,
    whatsappClicks: 0,
    callClicks: 0,
    assignedTo: null,
    createdBy: "user_owner_demo",
    publishedAt: null,
    expiresAt: null,
    creditConsumedAt: null,
    creditLedgerEntryId: null,
    lastConfirmedAt: null,
    freshnessStatus: "Draft",
    seoTitle: "Garden Flat",
    seoDescription: "Garden flat.",
    whatsappShareText: "Garden flat.",
    instagramCaption: "Garden flat.",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function isDuePublished(listing: Listing, now: string) {
  return (
    listing.status === "published" &&
    Boolean(listing.expiresAt) &&
    Date.parse(listing.expiresAt ?? "") <= Date.parse(now)
  );
}
