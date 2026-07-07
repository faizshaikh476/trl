import { describe, expect, it } from "vitest";
import type { ListingExtraction } from "@/lib/listings/listing.schema";
import { normalizeExtractionPriceFromSource } from "./price-normalization";

const baseExtraction: ListingExtraction = {
  title: "Luxury Bungalow for Sale in Pune at 11 Cr",
  transactionType: "sale",
  propertyType: "bungalow",
  location: "Pune",
  city: "Pune",
  locality: "",
  societyName: "",
  googleMapsUrl: "",
  price: 110_000_000,
  deposit: null,
  brokerage: "",
  taxes: "",
  bhk: null,
  bedrooms: null,
  bathrooms: null,
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
  highlights: [],
  amenities: [],
  descriptionShort: "Luxury bungalow with 110 Cr asking price.",
  descriptionLong: "Luxury bungalow with 110 Cr asking price and premium amenities.",
  seoTitle: "Luxury Bungalow at 11 crore",
  seoDescription: "Luxury bungalow in Pune.",
  whatsappShareText: "Luxury bungalow at Rs 11 cr",
  instagramCaption: "Premium Pune bungalow for ₹11 Cr",
  missingFields: [],
  riskFlags: [],
  confirmationQuestions: [],
  listingQualityScore: 80,
  confidenceScore: 0.8,
};

describe("normalizeExtractionPriceFromSource", () => {
  it("keeps crore pricing consistent when AI drops a digit in headline copy", () => {
    const normalized = normalizeExtractionPriceFromSource(
      baseExtraction,
      "Bungalow for sale in Pune. Price 110 cr. Premium amenities.",
    );

    expect(normalized.price).toBe(1_100_000_000);
    expect(normalized.title).toContain("₹110 Cr");
    expect(normalized.seoTitle).toContain("₹110 Cr");
    expect(normalized.whatsappShareText).toContain("₹110 Cr");
    expect(normalized.instagramCaption).toContain("₹110 Cr");
    expect(normalized.descriptionLong).toContain("110 Cr");
  });

  it("does not replace unrelated lakh deposits when the source price is crore", () => {
    const normalized = normalizeExtractionPriceFromSource(
      {
        ...baseExtraction,
        title: "Villa for Sale at 11 Cr with 50 L Deposit",
        whatsappShareText: "Villa at 11 cr, deposit 50 L",
      },
      "Villa for sale. Price 110 cr. Deposit 50 L.",
    );

    expect(normalized.title).toBe("Villa for Sale at ₹110 Cr with 50 L Deposit");
    expect(normalized.whatsappShareText).toBe("Villa at ₹110 Cr, deposit 50 L");
  });
});
