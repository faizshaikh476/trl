import { describe, expect, it } from "vitest";
import type { CreditLedgerEntry, CreditWallet, Listing, Plan, Workspace } from "@/types/domain";
import {
  buildListingCreditMigration,
  type MigrationDocument,
} from "../../../scripts/migrate-listing-credits";

describe("listing credit migration", () => {
  it("normalizes legacy plan pricing and listing allowance", () => {
    const result = buildListingCreditMigration({
      now: "2026-07-10T10:00:00.000Z",
      plans: [
        legacyPlan({
          id: "starter",
          name: "Starter",
          priceLabel: "₹1,999/mo",
          activeListingLimit: 10,
        }),
      ],
      workspaces: [],
      wallets: new Map(),
      listings: [],
      ledgerEntries: new Map(),
    });

    expect(result.planWrites).toEqual([
      {
        path: "plans/starter",
        data: expect.objectContaining({
          amountPaise: 199900,
          currency: "INR",
          listingCredits: 10,
          creditValidityDays: 30,
          listingVisibilityDays: 60,
          featured: false,
        }),
        merge: true,
      },
    ]);
  });

  it("grants initial wallet credits from the assigned plan without reducing an existing wallet", () => {
    const existingWallet: CreditWallet = {
      availableCredits: 20,
      validUntil: "2026-08-20T10:00:00.000Z",
      lastPurchaseId: "purchase_existing",
      createdAt: "2026-07-01T10:00:00.000Z",
      updatedAt: "2026-07-01T10:00:00.000Z",
    };
    const result = buildListingCreditMigration({
      now: "2026-07-10T10:00:00.000Z",
      plans: [
        planFixture({
          id: "starter",
          listingCredits: 10,
          creditValidityDays: 30,
        }),
      ],
      workspaces: [workspaceFixture({ id: "workspace_1", planId: "starter" })],
      wallets: new Map([["workspace_1", existingWallet]]),
      listings: [],
      ledgerEntries: new Map(),
    });

    expect(result.walletWrites).toEqual([
      {
        path: "workspaces/workspace_1/billing/wallet",
        data: expect.objectContaining({
          availableCredits: 20,
          validUntil: "2026-08-20T10:00:00.000Z",
          lastPurchaseId: "purchase_existing",
        }),
        merge: true,
      },
    ]);
    expect(result.ledgerWrites).toContainEqual({
      path: "workspaces/workspace_1/creditLedger/migration:initial-wallet:workspace_1",
      data: expect.objectContaining({
        id: "migration:initial-wallet:workspace_1",
        quantity: 10,
        sourceType: "migration",
        sourceId: "initial-wallet:workspace_1",
      }),
      merge: false,
    });
  });

  it("creates deterministic listing consumption ledger entries and expiry from publishedAt", () => {
    const result = buildListingCreditMigration({
      now: "2026-07-10T10:00:00.000Z",
      plans: [planFixture({ id: "starter", listingVisibilityDays: 60 })],
      workspaces: [workspaceFixture({ id: "workspace_1", planId: "starter" })],
      wallets: new Map(),
      listings: [
        listingFixture({
          id: "listing_1",
          workspaceId: "workspace_1",
          status: "published",
          publishedAt: "2026-07-01T00:00:00.000Z",
          updatedAt: "2026-07-02T00:00:00.000Z",
        }),
      ],
      ledgerEntries: new Map(),
    });

    expect(result.listingWrites).toContainEqual({
      path: "workspaces/workspace_1/listings/listing_1",
      data: expect.objectContaining({
        creditLedgerEntryId: "migration:existing-listing:listing_1",
        creditConsumedAt: "2026-07-10T10:00:00.000Z",
        expiresAt: "2026-08-30T00:00:00.000Z",
      }),
      merge: true,
    });
    expect(result.ledgerWrites).toContainEqual({
      path: "workspaces/workspace_1/creditLedger/migration:existing-listing:listing_1",
      data: expect.objectContaining({
        id: "migration:existing-listing:listing_1",
        quantity: -1,
        sourceType: "listing",
        sourceId: "listing_1",
        listingId: "listing_1",
      }),
      merge: false,
    });
    expect(writeData(result.walletWrites, "workspaces/workspace_1/billing/wallet")).toMatchObject({
      availableCredits: 9,
    });
  });

  it("uses updatedAt fallback for expiry and never overwrites a newer listing expiry", () => {
    const result = buildListingCreditMigration({
      now: "2026-07-10T10:00:00.000Z",
      plans: [planFixture({ id: "starter", listingVisibilityDays: 60 })],
      workspaces: [workspaceFixture({ id: "workspace_1", planId: "starter" })],
      wallets: new Map(),
      listings: [
        listingFixture({
          id: "listing_1",
          workspaceId: "workspace_1",
          publishedAt: null,
          updatedAt: "2026-07-03T00:00:00.000Z",
        }),
        listingFixture({
          id: "listing_2",
          workspaceId: "workspace_1",
          publishedAt: "2026-07-01T00:00:00.000Z",
          expiresAt: "2026-10-01T00:00:00.000Z",
        }),
      ],
      ledgerEntries: new Map(),
    });

    expect(writeData(result.listingWrites, "workspaces/workspace_1/listings/listing_1")).toMatchObject({
      expiresAt: "2026-09-01T00:00:00.000Z",
    });
    expect(writeData(result.listingWrites, "workspaces/workspace_1/listings/listing_2")).not.toHaveProperty(
      "expiresAt",
    );
  });

  it("is idempotent when migration ledger entries already exist", () => {
    const initialLedger: CreditLedgerEntry = {
      id: "migration:initial-wallet:workspace_1",
      workspaceId: "workspace_1",
      type: "grant",
      quantity: 10,
      sourceType: "migration",
      sourceId: "initial-wallet:workspace_1",
      listingId: null,
      reason: "Initial listing credit migration",
      createdAt: "2026-07-10T10:00:00.000Z",
    };
    const listingLedger: CreditLedgerEntry = {
      id: "migration:existing-listing:listing_1",
      workspaceId: "workspace_1",
      type: "consume",
      quantity: -1,
      sourceType: "listing",
      sourceId: "listing_1",
      listingId: "listing_1",
      reason: "Existing published listing migration",
      createdAt: "2026-07-10T10:00:00.000Z",
    };

    const result = buildListingCreditMigration({
      now: "2026-07-10T10:00:00.000Z",
      plans: [planFixture({ id: "starter", listingCredits: 10 })],
      workspaces: [workspaceFixture({ id: "workspace_1", planId: "starter" })],
      wallets: new Map(),
      listings: [listingFixture({ id: "listing_1", workspaceId: "workspace_1" })],
      ledgerEntries: new Map([
        ["workspace_1/migration:initial-wallet:workspace_1", initialLedger],
        ["workspace_1/migration:existing-listing:listing_1", listingLedger],
      ]),
    });

    expect(result.ledgerWrites).toEqual([]);
    expect(result.walletWrites).toEqual([]);
  });
});

function writeData(writes: MigrationDocument[], path: string) {
  return writes.find((write) => write.path === path)?.data;
}

function legacyPlan(overrides: Record<string, unknown>): Plan {
  return {
    id: "legacy",
    name: "Legacy",
    description: "",
    amountPaise: 0,
    currency: "INR",
    listingCredits: 0,
    creditValidityDays: 30,
    listingVisibilityDays: 60,
    featured: false,
    status: "active",
    sortOrder: 10,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as Plan;
}

function planFixture(overrides: Partial<Plan>): Plan {
  return {
    id: "starter",
    name: "Starter",
    description: "Starter credits",
    amountPaise: 199900,
    currency: "INR",
    listingCredits: 10,
    creditValidityDays: 30,
    listingVisibilityDays: 60,
    featured: false,
    status: "active",
    sortOrder: 10,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function workspaceFixture(overrides: Partial<Workspace>): Workspace {
  return {
    id: "workspace_1",
    name: "Broker",
    slug: "broker",
    city: "Pune",
    ownerId: "user_1",
    logoURL: "",
    contactName: "Broker",
    contactPhone: "9999999999",
    contactEmail: "broker@example.com",
    websiteTheme: "premium",
    customDomain: null,
    planId: "starter",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function listingFixture(overrides: Partial<Listing>): Listing {
  return {
    id: "listing_1",
    workspaceId: "workspace_1",
    title: "Garden Flat",
    slug: "garden-flat",
    status: "published",
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
    publishedAt: "2026-07-01T00:00:00.000Z",
    expiresAt: null,
    creditConsumedAt: null,
    creditLedgerEntryId: null,
    lastConfirmedAt: null,
    freshnessStatus: "Updated today",
    seoTitle: "Garden Flat",
    seoDescription: "Garden flat.",
    whatsappShareText: "Garden flat.",
    instagramCaption: "Garden flat.",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}
