import { describe, expect, it } from "vitest";
import type { CustomerActivity } from "./customer-operations.types";
import { parseDirectoryQuery, toDirectoryRow } from "./customer-directory-model";

describe("customer directory model", () => {
  it("defaults to customers, newest activity, and 25 rows", () => {
    expect(parseDirectoryQuery({})).toMatchObject({
      tab: "customers",
      sort: "last_activity_desc",
      pageSize: 25,
      cursor: null,
      filters: {},
      searchToken: null,
    });
  });

  it("rejects malformed cursors and unknown filters", () => {
    expect(parseDirectoryQuery({ cursor: "not-a-cursor", stage: "bogus", wallet: "unknown" }))
      .toMatchObject({ cursor: null, filters: {} });
  });

  it("accepts declared tabs, facets, sorting, and normalized search", () => {
    expect(
      parseDirectoryQuery({
        tab: "prospects",
        stage: "payment_failed",
        payment: "failed",
        wallet: "expired",
        followUp: "due",
        plan: "Starter Plan",
        sort: "first_seen_desc",
        q: "  Monesh Kumar ",
        pageSize: "50",
      }),
    ).toEqual({
      tab: "prospects",
      sort: "first_seen_desc",
      pageSize: 50,
      cursor: null,
      filters: {
        stage: "payment_failed",
        paymentState: "failed",
        walletState: "expired",
        followUpState: "due",
        planId: "starter-plan",
      },
      searchToken: "monesh",
    });
  });

  it("explains wallet states without saying no wallet", () => {
    expect(toDirectoryRow(activity({ walletState: "never_funded" })).creditsLabel).toBe(
      "Never funded",
    );
    expect(toDirectoryRow(activity({ walletState: "expired", effectiveCredits: 0 })).creditsLabel)
      .toBe("Expired · 0 available");
  });
});

function activity(overrides: Partial<CustomerActivity> = {}): CustomerActivity {
  return {
    id: "contact_919876543210",
    phone: "919876543210",
    displayName: "Monesh Kumar",
    email: "monesh@example.com",
    city: "Pune",
    workspaceId: "workspace_1",
    authenticatedUserId: null,
    classification: "prospect",
    stage: "new_chat",
    walletState: "never_funded",
    effectiveCredits: 0,
    planId: "free",
    paymentState: "none",
    latestPurchaseAt: null,
    listingCounts: { total: 1, ready: 1, published: 0 },
    searchTokens: [],
    firstSeenAt: "2026-08-13T08:00:00.000Z",
    lastInboundAt: "2026-08-13T09:00:00.000Z",
    lastOutboundAt: null,
    lastActivityAt: "2026-08-13T10:00:00.000Z",
    latestActivityLabel: "Listing saved",
    tags: [],
    privateNote: "",
    followUpAt: null,
    resolution: "open",
    historyRetainedFrom: "2026-08-13T08:00:00.000Z",
    ...overrides,
  };
}
