import { describe, expect, it } from "vitest";
import { NoListingCreditsError } from "@/lib/billing/credit-wallet-service";
import type { Listing, ListingStatus, Plan } from "@/types/domain";
import { ListingService } from "./listing-service";
import { DemoListingRepository } from "./repositories/demo-listing-repository";
import type { ListingRepository, PublicationOptions } from "./repositories/listing-repository";

describe("ListingService", () => {
  it("lists workspace listings through the repository contract", async () => {
    const service = new ListingService(new DemoListingRepository());
    const listings = await service.listByWorkspace("workspace_rare_address");

    expect(listings.length).toBeGreaterThan(0);
    expect(listings.every((listing) => listing.workspaceId === "workspace_rare_address")).toBe(
      true,
    );
  });

  it("lists every listing for platform administration", async () => {
    const service = new ListingService(new DemoListingRepository());

    const allListings = await service.listAll();
    const workspaceListings = await service.listByWorkspace("workspace_rare_address");

    expect(allListings.length).toBeGreaterThanOrEqual(workspaceListings.length);
    expect(allListings.some((listing) => listing.id === "listing_garden_flat")).toBe(true);
  });

  it("publishes and archives listings through lifecycle actions", async () => {
    const service = new ListingService(new DemoListingRepository(), {
      billingService: createBilling(),
      creditWalletService: createWallet(),
    });

    const published = await service.updateStatus("listing_baner_rental", "published");
    expect(published.status).toBe("published");
    expect(published.publishedAt).toBeTruthy();
    expect(published.expiresAt).toBeTruthy();

    const archived = await service.updateStatus("listing_baner_rental", "archived");
    expect(archived.status).toBe("archived");
  });

  it("duplicates a listing as a draft in the same workspace", async () => {
    const service = new ListingService(new DemoListingRepository());

    const duplicate = await service.duplicate("listing_garden_flat", "user_owner_demo");

    expect(duplicate.id).not.toBe("listing_garden_flat");
    expect(duplicate.status).toBe("draft");
    expect(duplicate.title).toContain("Copy");
    expect(duplicate.createdBy).toBe("user_owner_demo");
  });

  it("does not return expired listings for public slug lookup", async () => {
    const service = new ListingService(new DemoListingRepository());
    const listing = await service.createManual("workspace_rare_address", "user_owner_demo", {
      title: "Expired Public Lookup Test Listing",
      transactionType: "sale",
      propertyType: "apartment",
      location: "Koregaon Park, Pune",
      city: "Pune",
      locality: "Koregaon Park",
      societyName: "Public Lookup Test",
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
      descriptionShort: "Expired public lookup listing.",
      descriptionLong: "Temporary listing created only to verify expired public lookup behavior.",
      highlightsText: ["Public lookup", "Expired listing"],
      amenitiesText: ["Lift"],
      seoTitle: "Expired Public Lookup Listing",
      seoDescription: "Expired public lookup listing.",
      whatsappShareText: "Expired public lookup listing.",
      instagramCaption: "Expired public lookup listing.",
    });

    await service.updateStatus(listing.id, "expired");

    await expect(service.findShareableBySlug(listing.slug)).resolves.toBeNull();
    await service.deleteInWorkspace(listing.workspaceId, listing.id);
  });

  it("hard deletes a listing inside its workspace", async () => {
    const service = new ListingService(new DemoListingRepository());
    const duplicate = await service.createManual("workspace_rare_address", "user_owner_demo", {
      title: "Temporary Admin Delete Test Listing",
      transactionType: "sale",
      propertyType: "apartment",
      location: "Koregaon Park, Pune",
      city: "Pune",
      locality: "Koregaon Park",
      societyName: "Delete Test",
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
      descriptionShort: "Temporary listing for delete coverage.",
      descriptionLong: "Temporary listing created only to verify hard delete behavior.",
      highlightsText: ["Delete coverage", "Admin flow"],
      amenitiesText: ["Lift"],
      seoTitle: "Temporary Delete Listing",
      seoDescription: "Temporary delete listing.",
      whatsappShareText: "Temporary delete listing.",
      instagramCaption: "Temporary delete listing.",
    });

    await service.deleteInWorkspace(duplicate.workspaceId, duplicate.id);

    await expect(service.findByWorkspaceId(duplicate.workspaceId, duplicate.id)).resolves.toBeNull();
  });

  it("creates and updates a manual dashboard listing", async () => {
    const service = new ListingService(new DemoListingRepository());

    const created = await service.createManual("workspace_rare_address", "user_owner_demo", {
      title: "Premium 4 BHK Penthouse in Koregaon Park",
      transactionType: "sale",
      propertyType: "apartment",
      location: "Koregaon Park, Pune",
      city: "Pune",
      locality: "Koregaon Park",
      societyName: "The Canopy",
      googleMapsUrl: "",
      price: 45000000,
      deposit: null,
      brokerage: "2%",
      taxes: "extra",
      bhk: 4,
      bedrooms: 4,
      bathrooms: 4,
      carpetArea: 3100,
      builtUpArea: null,
      plotArea: null,
      openArea: 600,
      furnishedStatus: "semi-furnished",
      parkingCount: 3,
      floor: "top",
      totalFloors: 16,
      availability: "Immediate",
      preferredTenant: null,
      descriptionShort: "Large penthouse with terrace and skyline views.",
      descriptionLong: "A premium penthouse listing created from the broker dashboard.",
      highlightsText: ["Private terrace", "Three parking spaces"],
      amenitiesText: ["Lift", "Security"],
      seoTitle: "Premium Penthouse in Koregaon Park",
      seoDescription: "Premium 4 BHK penthouse in Pune.",
      whatsappShareText: "Premium 4 BHK penthouse in Koregaon Park.",
      instagramCaption: "Penthouse living in Koregaon Park.",
    });

    expect(created.status).toBe("draft");
    expect(created.createdBy).toBe("user_owner_demo");

    const updated = await service.updateManual(created.id, {
      title: "Updated Premium 4 BHK Penthouse in Koregaon Park",
      price: 44000000,
    });

    expect(updated.title).toBe("Updated Premium 4 BHK Penthouse in Koregaon Park");
    expect(updated.price).toBe(44000000);
  });
});

describe("ListingService publication credits", () => {
  it("consumes one credit and records publication metadata on first publication", async () => {
    const repository = new CreditAwareListingRepository([
      listingFixture({ id: "listing_1", status: "draft" }),
    ]);
    const wallet = createWallet();
    const service = new ListingService(repository, {
      billingService: createBilling(),
      creditWalletService: wallet,
    });

    const published = await service.updateStatus("listing_1", "published");

    expect(wallet.consumeCalls).toEqual([
      { workspaceId: "workspace_1", listingId: "listing_1" },
    ]);
    expect(published).toMatchObject({
      status: "published",
      creditLedgerEntryId: "consume:listing:listing_1",
      creditConsumedAt: "2026-07-09T10:00:00.000Z",
      freshnessStatus: "Updated today",
    });
    expect(new Date(published.expiresAt ?? "").toISOString()).toBe(
      "2026-09-07T10:00:00.000Z",
    );
  });

  it("does not consume again when republishing a listing that already has a consumed credit", async () => {
    const repository = new CreditAwareListingRepository([
      listingFixture({
        id: "listing_1",
        status: "archived",
        creditLedgerEntryId: "consume:listing:listing_1",
        creditConsumedAt: "2026-07-09T10:00:00.000Z",
      }),
    ]);
    const wallet = createWallet();
    const service = new ListingService(repository, {
      billingService: createBilling(),
      creditWalletService: wallet,
    });

    await service.updateStatus("listing_1", "published");

    expect(wallet.consumeCalls).toEqual([]);
    expect(wallet.reactivationCalls).toEqual(["workspace_1"]);
  });

  it("does not consume when publishing an already published listing", async () => {
    const repository = new CreditAwareListingRepository([
      listingFixture({
        id: "listing_1",
        status: "published",
        creditLedgerEntryId: "consume:listing:listing_1",
        creditConsumedAt: "2026-07-09T10:00:00.000Z",
        expiresAt: "2026-09-07T10:00:00.000Z",
      }),
    ]);
    const wallet = createWallet();
    const service = new ListingService(repository, {
      billingService: createBilling(),
      creditWalletService: wallet,
    });

    await service.updateStatus("listing_1", "published");

    expect(wallet.consumeCalls).toEqual([]);
    expect(wallet.reactivationCalls).toEqual([]);
  });

  it("does not touch credits for archive, sold, rented, unpublish, or delete lifecycle actions", async () => {
    const repository = new CreditAwareListingRepository([
      listingFixture({ id: "listing_archive", status: "published" }),
      listingFixture({ id: "listing_sold", status: "published" }),
      listingFixture({ id: "listing_rented", status: "published" }),
      listingFixture({ id: "listing_unpublished", status: "published" }),
      listingFixture({ id: "listing_delete", status: "published" }),
    ]);
    const wallet = createWallet();
    const service = new ListingService(repository, {
      billingService: createBilling(),
      creditWalletService: wallet,
    });

    await service.updateStatus("listing_archive", "archived");
    await service.updateStatus("listing_sold", "sold");
    await service.updateStatus("listing_rented", "rented");
    await service.updateStatus("listing_unpublished", "unpublished");
    await service.deleteInWorkspace("workspace_1", "listing_delete");

    expect(wallet.consumeCalls).toEqual([]);
    expect(wallet.reactivationCalls).toEqual([]);
  });

  it("fails a new publication when credit consumption is rejected", async () => {
    const repository = new CreditAwareListingRepository([
      listingFixture({ id: "listing_1", status: "draft" }),
    ]);
    const wallet = createWallet({ consumeError: new NoListingCreditsError() });
    const service = new ListingService(repository, {
      billingService: createBilling(),
      creditWalletService: wallet,
    });

    await expect(service.updateStatus("listing_1", "published")).rejects.toBeInstanceOf(
      NoListingCreditsError,
    );
    expect((await repository.findById("listing_1"))?.status).toBe("draft");
  });
});

class CreditAwareListingRepository implements ListingRepository {
  private readonly listings = new Map<string, Listing>();

  constructor(listings: Listing[]) {
    for (const listing of listings) this.listings.set(listing.id, structuredClone(listing));
  }

  async listAll() {
    return [...this.listings.values()];
  }

  async listByWorkspace(workspaceId: string) {
    return [...this.listings.values()].filter((listing) => listing.workspaceId === workspaceId);
  }

  async listPublished() {
    return [...this.listings.values()].filter((listing) => listing.status === "published");
  }

  async findPublishedBySlug(slug: string) {
    return [...this.listings.values()].find(
      (listing) => listing.slug === slug && listing.status === "published",
    ) ?? null;
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
    if (status === "sold" || status === "rented" || status === "archived" || status === "unpublished") {
      patch.expiresAt = null;
    }
    Object.assign(listing, patch);
    return structuredClone(listing);
  }

  async updateStatusInWorkspace(workspaceId: string, id: string, status: ListingStatus, publication?: PublicationOptions) {
    const listing = this.listings.get(id);
    if (listing?.workspaceId !== workspaceId) throw new Error("Listing not found");
    return this.updateStatus(id, status, publication);
  }

  async deleteInWorkspace(workspaceId: string, id: string) {
    const listing = this.listings.get(id);
    if (listing?.workspaceId !== workspaceId) throw new Error("Listing not found");
    this.listings.delete(id);
  }

  async duplicate(): Promise<Listing> {
    throw new Error("Not needed for this test.");
  }
}

function createWallet(options: { consumeError?: Error } = {}) {
  const consumeCalls: Array<{ workspaceId: string; listingId: string }> = [];
  const reactivationCalls: string[] = [];

  return {
    consumeCalls,
    reactivationCalls,
    async consumeForListing(input: { workspaceId: string; listingId: string }) {
      consumeCalls.push(input);
      if (options.consumeError) throw options.consumeError;
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
