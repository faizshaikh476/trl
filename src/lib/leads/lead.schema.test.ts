import { describe, expect, it } from "vitest";
import { publicLeadSchema } from "./lead.schema";

describe("publicLeadSchema", () => {
  it("accepts valid Indian buyer enquiries", () => {
    const parsed = publicLeadSchema.parse({
      name: "Aarav Shah",
      phone: "9822052388",
      message: "I want to visit this weekend.",
      preferredVisitDate: "2026-07-03",
      budget: 9500000,
      contactConsent: true,
      listingId: "listing_demo",
      source: "public_listing",
    });

    expect(parsed.phone).toBe("9822052388");
  });

  it("rejects short phone numbers and empty names", () => {
    expect(() =>
      publicLeadSchema.parse({
        name: "",
        phone: "12345",
        message: "Call me",
        contactConsent: true,
        listingId: "listing_demo",
        source: "public_listing",
      }),
    ).toThrow();
  });

  it("requires buyer contact consent", () => {
    expect(() =>
      publicLeadSchema.parse({
        name: "Aarav Shah",
        phone: "9822052388",
        message: "I want to visit this weekend.",
        listingId: "listing_demo",
        source: "public_listing",
      }),
    ).toThrow();
  });
});
