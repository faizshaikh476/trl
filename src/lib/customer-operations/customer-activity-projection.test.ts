import { describe, expect, it, vi } from "vitest";
import { CustomerActivityProjector } from "./customer-activity-projection";

describe("CustomerActivityProjector", () => {
  it("refreshes an authoritative workspace snapshot and emits a body-free event", async () => {
    const recordDomainEvent = vi.fn().mockResolvedValue(undefined);
    const refreshActivity = vi.fn().mockResolvedValue(undefined);
    const projector = new CustomerActivityProjector({
      workspaces: {
        findById: vi.fn().mockResolvedValue({
          id: "workspace_1",
          name: "Monesh Realty",
          contactName: "Monesh Kumar",
          contactPhone: "919876543210",
          contactEmail: "monesh@example.com",
          city: "Pune",
          planId: "starter",
        }),
      },
      wallet: {
        getWallet: vi.fn().mockResolvedValue({
          availableCredits: 4,
          validUntil: "2026-09-01T00:00:00.000Z",
          lastPurchaseId: "purchase_1",
          createdAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-08-13T10:00:00.000Z",
        }),
      },
      listings: {
        listByWorkspace: vi.fn().mockResolvedValue([
          { id: "listing_ready", status: "ready_to_publish" },
          { id: "listing_live", status: "published" },
        ]),
      },
      purchases: {
        listPurchasesByWorkspace: vi.fn().mockResolvedValue([
          {
            id: "purchase_1",
            status: "paid",
            paidAt: "2026-08-13T09:00:00.000Z",
            updatedAt: "2026-08-13T09:00:00.000Z",
          },
        ]),
      },
      customerOperations: {
        recordDomainEvent,
        refreshActivity,
        getCustomerDetail: vi.fn().mockResolvedValue(null),
      },
    } as never);

    await projector.project({
      workspaceId: "workspace_1",
      event: {
        type: "listing_published",
        label: "Listing published",
        idempotencyKey: "listing_live:published",
        listingId: "listing_live",
      },
      authenticatedUserId: "user_1",
    });

    expect(recordDomainEvent).toHaveBeenCalledWith({
      contactId: "contact_919876543210",
      workspaceId: "workspace_1",
      type: "listing_published",
      label: "Listing published",
      idempotencyKey: "listing_live:published",
      sourceId: null,
      listingId: "listing_live",
    });
    expect(refreshActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: "919876543210",
        workspaceId: "workspace_1",
        displayName: "Monesh Kumar",
        hasPaidPurchase: true,
        hasAuthenticatedUser: true,
        paymentState: "paid",
        planId: "starter",
        effectiveCredits: 4,
        listingCounts: { total: 2, ready: 1, published: 1 },
        authenticatedUserId: "user_1",
      }),
    );
    expect(JSON.stringify(recordDomainEvent.mock.calls[0][0])).not.toMatch(/note|text|body/i);
  });

  it("does nothing when the workspace has no contact phone", async () => {
    const recordDomainEvent = vi.fn();
    const refreshActivity = vi.fn();
    const projector = new CustomerActivityProjector({
      workspaces: { findById: vi.fn().mockResolvedValue({ id: "workspace_1", contactPhone: "" }) },
      wallet: { getWallet: vi.fn() },
      listings: { listByWorkspace: vi.fn() },
      purchases: { listPurchasesByWorkspace: vi.fn() },
      customerOperations: {
        recordDomainEvent,
        refreshActivity,
        getCustomerDetail: vi.fn().mockResolvedValue(null),
      },
    } as never);

    await expect(projector.project({ workspaceId: "workspace_1" })).resolves.toBeNull();
    expect(recordDomainEvent).not.toHaveBeenCalled();
    expect(refreshActivity).not.toHaveBeenCalled();
  });

  it("preserves an existing authenticated customer when an admin mutation has no user id", async () => {
    const refreshActivity = vi.fn().mockResolvedValue(undefined);
    const projector = new CustomerActivityProjector({
      workspaces: {
        findById: vi.fn().mockResolvedValue({
          id: "workspace_1",
          name: "Monesh Realty",
          contactName: "Monesh Kumar",
          contactPhone: "919876543210",
          contactEmail: "monesh@example.com",
          city: "Pune",
          planId: "free",
        }),
      },
      wallet: { getWallet: vi.fn().mockResolvedValue(null) },
      listings: { listByWorkspace: vi.fn().mockResolvedValue([]) },
      purchases: { listPurchasesByWorkspace: vi.fn().mockResolvedValue([]) },
      customerOperations: {
        recordDomainEvent: vi.fn(),
        refreshActivity,
        getCustomerDetail: vi.fn().mockResolvedValue({
          activity: { authenticatedUserId: "user_existing" },
          messages: [],
          events: [],
        }),
      },
    } as never);

    await projector.project({ workspaceId: "workspace_1", planId: "starter" });

    expect(refreshActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        authenticatedUserId: "user_existing",
        hasAuthenticatedUser: true,
      }),
    );
  });
});
