import { describe, expect, it } from "vitest";
import type { ListingExtraction } from "./listing.schema";
import { normalizeListingExtractionTitle } from "./listing.schema";

const baseExtraction: ListingExtraction = {
  title: "Premium Property Listing Draft",
  transactionType: "sale",
  propertyType: "apartment",
  location: "Parmar Residency, Salunkhe Vihar Road, Pune",
  city: "Pune",
  locality: "Salunkhe Vihar Road",
  societyName: "Parmar Residency",
  googleMapsUrl: "",
  price: 110000000,
  deposit: null,
  brokerage: "",
  taxes: "",
  bhk: 3,
  bedrooms: null,
  bathrooms: null,
  carpetArea: 1200,
  builtUpArea: null,
  plotArea: null,
  openArea: null,
  furnishedStatus: null,
  parkingCount: 1,
  floor: "ground",
  totalFloors: null,
  availability: "immediate",
  preferredTenant: null,
  highlights: ["Private garden. Call 98220 52388 for details."],
  amenities: ["WhatsApp +91 98220 52388 before visit"],
  descriptionShort: "Corner flat for sale. Contact 9822052388.",
  descriptionLong: "Premium garden flat. Broker mobile: +91-98220-52388. Price 11 Cr.",
  seoTitle: "3 BHK Flat for Sale in Pune 9822052388",
  seoDescription: "Call 9822052388 for this garden flat.",
  whatsappShareText: "See this property. WA: 98220 52388",
  instagramCaption: "DM or call +91 98220 52388",
  missingFields: [],
  riskFlags: ["Verify phone 9822052388 should not leak"],
  confirmationQuestions: ["Can buyer call 9822052388?"],
  listingQualityScore: 82,
  confidenceScore: 0.9,
};

describe("listing extraction normalization", () => {
  it("removes mobile numbers from public listing copy", () => {
    const normalized = normalizeListingExtractionTitle(baseExtraction);
    const publicCopy = [
      normalized.title,
      normalized.descriptionShort,
      normalized.descriptionLong,
      normalized.seoTitle,
      normalized.seoDescription,
      normalized.whatsappShareText,
      normalized.instagramCaption,
      ...normalized.highlights,
      ...normalized.amenities,
      ...normalized.riskFlags,
      ...normalized.confirmationQuestions,
    ].join("\n");

    expect(publicCopy).not.toMatch(/98220\s?52388/);
    expect(publicCopy).not.toMatch(/\+91-?98220-?52388/);
    expect(publicCopy).not.toMatch(/\b[6-9]\d{9}\b/);
    expect(normalized.price).toBe(110000000);
  });
});
