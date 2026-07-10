import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createPurchaseLinkToken,
  verifyPurchaseLinkToken,
} from "./purchase-link";

describe("purchase link tokens", () => {
  const originalSecret = process.env.PURCHASE_LINK_SECRET;

  beforeEach(() => {
    process.env.PURCHASE_LINK_SECRET = "purchase-link-secret-for-tests";
  });

  afterEach(() => {
    if (originalSecret == null) {
      delete process.env.PURCHASE_LINK_SECRET;
    } else {
      process.env.PURCHASE_LINK_SECRET = originalSecret;
    }
  });

  it("resolves a valid signed token to the intended workspace and plan", () => {
    const expiresAt = "2026-07-11T12:00:00.000Z";

    const token = createPurchaseLinkToken({
      workspaceId: "workspace_1",
      planId: "growth",
      expiresAt,
    });

    expect(verifyPurchaseLinkToken(token, { now: new Date("2026-07-10T12:00:00.000Z") })).toEqual({
      workspaceId: "workspace_1",
      planId: "growth",
      expiresAt,
    });
  });

  it("fails tampered, expired, malformed, missing-secret, and cross-workspace links", () => {
    const token = createPurchaseLinkToken({
      workspaceId: "workspace_1",
      planId: "growth",
      expiresAt: "2026-07-11T12:00:00.000Z",
    });

    const signature = token.split(".")[1];
    const tamperedPayload = Buffer.from(
      JSON.stringify({
        workspaceId: "workspace_1",
        planId: "agency",
        expiresAt: "2026-07-11T12:00:00.000Z",
      }),
    ).toString("base64url");

    expect(
      verifyPurchaseLinkToken(`${tamperedPayload}.${signature}`, {
        now: new Date("2026-07-10T12:00:00.000Z"),
      }),
    ).toBeNull();
    expect(
      verifyPurchaseLinkToken(
        createPurchaseLinkToken({
          workspaceId: "workspace_1",
          planId: "growth",
          expiresAt: "2026-07-09T12:00:00.000Z",
        }),
        { now: new Date("2026-07-10T12:00:00.000Z") },
      ),
    ).toBeNull();
    expect(verifyPurchaseLinkToken("not-a-token")).toBeNull();
    expect(
      verifyPurchaseLinkToken(token, {
        now: new Date("2026-07-10T12:00:00.000Z"),
        workspaceId: "workspace_2",
      }),
    ).toBeNull();

    delete process.env.PURCHASE_LINK_SECRET;
    expect(verifyPurchaseLinkToken(token)).toBeNull();
    expect(() =>
      createPurchaseLinkToken({
        workspaceId: "workspace_1",
        planId: "growth",
        expiresAt: "2026-07-11T12:00:00.000Z",
      }),
    ).toThrow("PURCHASE_LINK_SECRET");
  });
});
