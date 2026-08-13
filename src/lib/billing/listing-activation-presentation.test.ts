import { describe, expect, it } from "vitest";
import {
  activationPageState,
  purchaseSuccessState,
} from "./listing-activation-presentation";

describe("listing activation presentation", () => {
  it("presents only a valid ready-to-publish listing for activation", () => {
    expect(
      activationPageState({
        tokenValid: true,
        listing: {
          id: "listing_1",
          status: "ready_to_publish",
          title: "Garden Flat",
          location: "Baner, Pune",
        },
      }),
    ).toEqual({ kind: "ready", title: "Garden Flat", location: "Baner, Pune" });
    expect(activationPageState({ tokenValid: false, listing: null })).toEqual({ kind: "invalid" });
    expect(
      activationPageState({
        tokenValid: true,
        listing: { id: "listing_1", status: "published", title: "Garden Flat", location: "Pune" },
      }),
    ).toEqual({ kind: "unavailable" });
  });

  it("distinguishes activated, pending, and ordinary credit purchases", () => {
    expect(
      purchaseSuccessState({
        activationListingId: "listing_1",
        activationCompletedAt: "2026-08-13T12:00:00.000Z",
        activationError: null,
        listingSlug: "garden-flat",
      }),
    ).toEqual({ kind: "activated", listingHref: "/l/garden-flat" });
    expect(
      purchaseSuccessState({
        activationListingId: "listing_1",
        activationCompletedAt: null,
        activationError: "retry",
        listingSlug: null,
      }),
    ).toEqual({ kind: "pending" });
    expect(
      purchaseSuccessState({
        activationListingId: null,
        activationCompletedAt: null,
        activationError: null,
        listingSlug: null,
      }),
    ).toEqual({ kind: "credits" });
  });
});
