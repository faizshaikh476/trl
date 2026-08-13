import { describe, expect, it } from "vitest";
import type { Listing } from "@/types/domain";
import {
  listingStatusPresentation,
  prepareListingsForTable,
} from "./listing-table-model";

describe("prepareListingsForTable", () => {
  it("hides archived listings by default and sorts by creation time instead of update time", () => {
    const result = prepareListingsForTable(
      [
        listing({
          id: "old-edited",
          createdAt: "2026-08-10T10:00:00.000Z",
          updatedAt: "2026-08-13T10:00:00.000Z",
        }),
        listing({
          id: "new-ready",
          status: "ready_to_publish",
          createdAt: "2026-08-13T09:00:00.000Z",
          updatedAt: "2026-08-13T09:00:00.000Z",
        }),
        listing({
          id: "archived",
          status: "archived",
          createdAt: "2026-08-13T11:00:00.000Z",
          updatedAt: "2026-08-13T11:00:00.000Z",
        }),
      ],
      {},
    );

    expect(result.map((item) => item.id)).toEqual(["new-ready", "old-edited"]);
  });

  it("shows archived listings when explicitly filtered", () => {
    const result = prepareListingsForTable(
      [listing({ id: "published" }), listing({ id: "archived", status: "archived" })],
      { status: "archived" },
    );

    expect(result.map((item) => item.id)).toEqual(["archived"]);
  });

  it("places invalid creation timestamps last without reordering them", () => {
    const result = prepareListingsForTable(
      [
        listing({ id: "invalid-one", createdAt: "invalid" }),
        listing({ id: "valid", createdAt: "2026-08-13T09:00:00.000Z" }),
        listing({ id: "invalid-two", createdAt: "" }),
      ],
      {},
    );

    expect(result.map((item) => item.id)).toEqual([
      "valid",
      "invalid-one",
      "invalid-two",
    ]);
  });

  it("preserves search, transaction, and quality filters", () => {
    const result = prepareListingsForTable(
      [
        listing({ id: "match", title: "Garden flat", transactionType: "rent", qualityScore: 90 }),
        listing({ id: "wrong-transaction", title: "Garden flat", transactionType: "sale", qualityScore: 90 }),
        listing({ id: "low-quality", title: "Garden flat", transactionType: "rent", qualityScore: 50 }),
      ],
      { q: "garden", transaction: "rent", quality: "strong" },
    );

    expect(result.map((item) => item.id)).toEqual(["match"]);
  });
});

describe("listingStatusPresentation", () => {
  it("distinguishes published, ready, and neutral workflow states", () => {
    expect(listingStatusPresentation("published")).toEqual({
      tone: "published",
      hint: "Live and visible to buyers",
    });
    expect(listingStatusPresentation("ready_to_publish")).toEqual({
      tone: "ready",
      hint: "Ready for review and publishing",
    });
    expect(listingStatusPresentation("draft")).toEqual({ tone: "neutral", hint: null });
  });
});

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "listing-1",
    workspaceId: "workspace-1",
    title: "2 BHK Apartment",
    slug: "2-bhk-apartment",
    status: "published",
    transactionType: "rent",
    propertyType: "Apartment",
    location: "Kondhwa, Pune",
    city: "Pune",
    locality: "Kondhwa",
    societyName: "Garden Residency",
    googleMapsUrl: "",
    price: 23_000,
    deposit: null,
    brokerage: "",
    taxes: "",
    bhk: 2,
    bedrooms: 2,
    bathrooms: 2,
    carpetArea: null,
    builtUpArea: null,
    plotArea: null,
    openArea: null,
    furnishedStatus: null,
    parkingCount: null,
    floor: null,
    totalFloors: null,
    availability: null,
    preferredTenant: null,
    descriptionShort: "",
    descriptionLong: "",
    highlights: [],
    amenities: [],
    missingFields: [],
    riskFlags: [],
    confirmationQuestions: [],
    qualityScore: 80,
    confidenceScore: 80,
    views: 0,
    leads: 0,
    whatsappClicks: 0,
    callClicks: 0,
    assignedTo: null,
    createdBy: "dashboard",
    publishedAt: null,
    expiresAt: null,
    lastConfirmedAt: null,
    freshnessStatus: "Updated today",
    seoTitle: "",
    seoDescription: "",
    whatsappShareText: "",
    instagramCaption: "",
    createdAt: "2026-08-12T09:00:00.000Z",
    updatedAt: "2026-08-12T09:00:00.000Z",
    ...overrides,
  };
}
