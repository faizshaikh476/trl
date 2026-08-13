import { describe, expect, it } from "vitest";
import type { CreditWallet } from "@/types/domain";
import {
  buildSearchTokens,
  classifyContact,
  contactIdForPhone,
  deriveJourneyStage,
  deriveWalletState,
  isInsideCustomerServiceWindow,
  messageExpiresAt,
} from "./customer-state";

describe("customer state", () => {
  it("does not classify an auto-created workspace as a customer", () => {
    expect(
      classifyContact({
        hasWorkspace: true,
        hasPaidPurchase: false,
        hasAuthenticatedUser: false,
      }),
    ).toBe("prospect");
  });

  it("classifies a paid or authenticated broker as a customer", () => {
    expect(
      classifyContact({
        hasWorkspace: true,
        hasPaidPurchase: true,
        hasAuthenticatedUser: false,
      }),
    ).toBe("customer");
    expect(
      classifyContact({
        hasWorkspace: true,
        hasPaidPurchase: false,
        hasAuthenticatedUser: true,
      }),
    ).toBe("customer");
  });

  it("uses operational stage precedence", () => {
    const base = {
      needsAttention: false,
      paymentFailed: false,
      paymentPending: false,
      hasReadyListing: false,
      hasIntake: false,
      isCustomer: false,
    };

    expect(deriveJourneyStage({ ...base, needsAttention: true, paymentFailed: true })).toBe(
      "needs_attention",
    );
    expect(deriveJourneyStage({ ...base, paymentFailed: true, paymentPending: true })).toBe(
      "payment_failed",
    );
    expect(deriveJourneyStage({ ...base, paymentPending: true, hasReadyListing: true })).toBe(
      "payment_pending",
    );
    expect(deriveJourneyStage({ ...base, hasReadyListing: true, hasIntake: true })).toBe(
      "ready_to_publish",
    );
    expect(deriveJourneyStage({ ...base, hasIntake: true, isCustomer: true })).toBe(
      "listing_started",
    );
    expect(deriveJourneyStage({ ...base, isCustomer: true })).toBe("customer");
    expect(deriveJourneyStage(base)).toBe("new_chat");
  });

  it("labels a missing wallet as never funded", () => {
    expect(deriveWalletState(null, 0, new Date("2026-08-13T00:00:00.000Z"))).toEqual({
      state: "never_funded",
      effectiveCredits: 0,
      label: "Never funded",
    });
  });

  it("labels an expired wallet with zero usable credits", () => {
    expect(
      deriveWalletState(
        wallet({ availableCredits: 9, validUntil: "2026-08-12T23:59:59.999Z" }),
        0,
        new Date("2026-08-13T00:00:00.000Z"),
      ),
    ).toEqual({ state: "expired", effectiveCredits: 0, label: "Expired" });
  });

  it("distinguishes an empty valid wallet from an active wallet", () => {
    const now = new Date("2026-08-13T00:00:00.000Z");
    expect(
      deriveWalletState(wallet({ availableCredits: 0, validUntil: "2026-08-14T00:00:00.000Z" }), 0, now),
    ).toEqual({ state: "empty", effectiveCredits: 0, label: "0 remaining" });
    expect(
      deriveWalletState(wallet({ availableCredits: 14, validUntil: "2026-08-14T00:00:00.000Z" }), 14, now),
    ).toEqual({ state: "active", effectiveCredits: 14, label: "Active · 14 credits" });
  });

  it("expires retained text exactly 180 days after creation", () => {
    expect(messageExpiresAt(new Date("2026-08-13T00:00:00.000Z"))).toBe(
      "2027-02-09T00:00:00.000Z",
    );
  });

  it("allows free-form replies through the exact 24-hour boundary only", () => {
    const now = new Date("2026-08-13T10:00:00.000Z");
    expect(isInsideCustomerServiceWindow("2026-08-12T10:00:00.000Z", now)).toBe(true);
    expect(isInsideCustomerServiceWindow("2026-08-12T09:59:59.999Z", now)).toBe(false);
    expect(isInsideCustomerServiceWindow(null, now)).toBe(false);
    expect(isInsideCustomerServiceWindow("invalid", now)).toBe(false);
  });

  it("builds bounded normalized prefixes and exact identifiers", () => {
    const tokens = buildSearchTokens([
      "Monesh Kumar",
      "+91 91974 48877",
      "purchase_6834784a82eeaf705cee7b4f",
      "Monesh Kumar",
    ]);

    expect(tokens).toContain("mo");
    expect(tokens).toContain("monesh");
    expect(tokens).toContain("ku");
    expect(tokens).toContain("kumar");
    expect(tokens).toContain("9197448877");
    expect(tokens).toContain("purchase_6834784a82eeaf705cee7b4f");
    expect(new Set(tokens).size).toBe(tokens.length);
    expect(tokens.length).toBeLessThanOrEqual(200);
  });

  it("creates a stable contact id from a normalized phone", () => {
    expect(contactIdForPhone("+91 91974 48877")).toBe("contact_919197448877");
    expect(() => contactIdForPhone("not-a-phone")).toThrow("Phone number is required");
  });
});

function wallet(overrides: Partial<CreditWallet>): CreditWallet {
  return {
    availableCredits: 0,
    validUntil: "2026-08-14T00:00:00.000Z",
    lastPurchaseId: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}
