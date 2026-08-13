import { describe, expect, it } from "vitest";
import type { CustomerActivity, CustomerMessage } from "./customer-operations.types";
import {
  decodeDirectoryCursor,
  messageDocumentId,
  paginateCustomerActivityRecords,
  sanitizeMessageForPersistence,
} from "./firestore-customer-operations-repository";

describe("customer operations persistence boundaries", () => {
  it("returns stable newest-first pages when activity timestamps tie", () => {
    const records = [
      activity("contact_a", "2026-08-13T09:00:00.000Z"),
      activity("contact_b", "2026-08-13T10:00:00.000Z"),
      activity("contact_c", "2026-08-13T10:00:00.000Z"),
    ];

    const first = paginateCustomerActivityRecords(records, {
      tab: "all",
      sort: "last_activity_desc",
      pageSize: 2,
      cursor: null,
      filters: {},
      searchToken: null,
    });
    expect(first.items.map((item) => item.id)).toEqual(["contact_c", "contact_b"]);

    const second = paginateCustomerActivityRecords(records, {
      tab: "all",
      sort: "last_activity_desc",
      pageSize: 2,
      cursor: first.nextCursor,
      filters: {},
      searchToken: null,
    });
    expect(second.items.map((item) => item.id)).toEqual(["contact_a"]);
    expect(second.previousCursor).toBeNull();
  });

  it("filters customer records using exact facets and search prefixes", () => {
    const records = [
      activity("contact_a", "2026-08-13T09:00:00.000Z", {
        classification: "prospect",
        stage: "payment_failed",
        searchTokens: ["mo", "mon", "monesh"],
      }),
      activity("contact_b", "2026-08-13T10:00:00.000Z", {
        classification: "customer",
        stage: "customer",
        searchTokens: ["ra", "rahul"],
      }),
    ];

    const page = paginateCustomerActivityRecords(records, {
      tab: "prospects",
      sort: "last_activity_desc",
      pageSize: 25,
      cursor: null,
      filters: { stage: "payment_failed" },
      searchToken: "mon",
    });

    expect(page.items.map((item) => item.id)).toEqual(["contact_a"]);
  });

  it("rejects malformed cursors", () => {
    expect(decodeDirectoryCursor("not-base64-json")).toBeNull();
  });

  it("uses a stable path-safe document id for a provider message", () => {
    expect(messageDocumentId("wamid.provider/message:1")).toBe(
      messageDocumentId("wamid.provider/message:1"),
    );
    expect(messageDocumentId("wamid.provider/message:1")).toMatch(/^message_[a-f0-9]{32}$/);
  });

  it("persists only approved text-message fields", () => {
    const value = {
      ...message("message_1"),
      mediaUrl: "https://example.test/private.jpg",
      providerMediaId: "media_secret",
      media: [{ id: "media_secret" }],
    } as CustomerMessage & Record<string, unknown>;

    expect(sanitizeMessageForPersistence(value)).toEqual(message("message_1"));
    expect(JSON.stringify(sanitizeMessageForPersistence(value))).not.toMatch(
      /mediaUrl|providerMediaId|media_secret/,
    );
  });
});

function activity(
  id: string,
  lastActivityAt: string,
  overrides: Partial<CustomerActivity> = {},
): CustomerActivity {
  return {
    id,
    phone: "919876543210",
    displayName: id,
    email: "",
    city: "",
    workspaceId: `workspace_${id}`,
    authenticatedUserId: null,
    classification: "prospect",
    stage: "new_chat",
    walletState: "never_funded",
    effectiveCredits: 0,
    planId: "free",
    paymentState: "none",
    latestPurchaseAt: null,
    listingCounts: { total: 0, ready: 0, published: 0 },
    searchTokens: [],
    firstSeenAt: lastActivityAt,
    lastInboundAt: lastActivityAt,
    lastOutboundAt: null,
    lastActivityAt,
    latestActivityLabel: "Message received",
    tags: [],
    privateNote: "",
    followUpAt: null,
    resolution: "open",
    historyRetainedFrom: lastActivityAt,
    ...overrides,
  };
}

function message(id: string): CustomerMessage {
  return {
    id,
    contactId: "contact_919876543210",
    workspaceId: "workspace_1",
    direction: "inbound",
    senderType: "customer",
    text: "2 BHK in Pune",
    providerMessageId: "wamid.1",
    deliveryStatus: "delivered",
    failureSummary: null,
    createdAt: "2026-08-13T10:00:00.000Z",
    expiresAt: "2027-02-09T10:00:00.000Z",
  };
}
