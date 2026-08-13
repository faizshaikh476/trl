import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createListingActivationToken,
  verifyListingActivationToken,
} from "./listing-activation-link";

describe("listing activation tokens", () => {
  const originalSecret = process.env.PURCHASE_LINK_SECRET;

  beforeEach(() => {
    process.env.PURCHASE_LINK_SECRET = "listing-activation-secret-for-tests";
  });

  afterEach(() => {
    if (originalSecret == null) delete process.env.PURCHASE_LINK_SECRET;
    else process.env.PURCHASE_LINK_SECRET = originalSecret;
  });

  it("resolves a valid token to one workspace listing", () => {
    const expiresAt = "2026-08-14T12:00:00.000Z";
    const token = createListingActivationToken({
      workspaceId: "workspace_1",
      listingId: "listing_1",
      expiresAt,
    });

    expect(
      verifyListingActivationToken(token, {
        now: new Date("2026-08-13T12:00:00.000Z"),
      }),
    ).toEqual({ workspaceId: "workspace_1", listingId: "listing_1", expiresAt });
  });

  it("rejects tampered, expired, malformed, cross-workspace, and wrong-listing tokens", () => {
    const token = createListingActivationToken({
      workspaceId: "workspace_1",
      listingId: "listing_1",
      expiresAt: "2026-08-14T12:00:00.000Z",
    });
    const signature = token.split(".")[1];
    const tamperedPayload = Buffer.from(
      JSON.stringify({
        workspaceId: "workspace_1",
        listingId: "listing_2",
        expiresAt: "2026-08-14T12:00:00.000Z",
      }),
    ).toString("base64url");

    expect(
      verifyListingActivationToken(`${tamperedPayload}.${signature}`, {
        now: new Date("2026-08-13T12:00:00.000Z"),
      }),
    ).toBeNull();
    expect(
      verifyListingActivationToken(token, {
        now: new Date("2026-08-14T12:00:00.000Z"),
      }),
    ).toBeNull();
    expect(verifyListingActivationToken("not-a-token")).toBeNull();
    expect(
      verifyListingActivationToken(token, {
        now: new Date("2026-08-13T12:00:00.000Z"),
        workspaceId: "workspace_2",
      }),
    ).toBeNull();
    expect(
      verifyListingActivationToken(token, {
        now: new Date("2026-08-13T12:00:00.000Z"),
        listingId: "listing_2",
      }),
    ).toBeNull();
  });

  it("requires the configured secret", () => {
    const token = createListingActivationToken({
      workspaceId: "workspace_1",
      listingId: "listing_1",
      expiresAt: "2026-08-14T12:00:00.000Z",
    });
    delete process.env.PURCHASE_LINK_SECRET;

    expect(verifyListingActivationToken(token)).toBeNull();
    expect(() =>
      createListingActivationToken({
        workspaceId: "workspace_1",
        listingId: "listing_1",
        expiresAt: "2026-08-14T12:00:00.000Z",
      }),
    ).toThrow("PURCHASE_LINK_SECRET");
  });
});
