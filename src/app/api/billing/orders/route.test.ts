import { beforeEach, describe, expect, it, vi } from "vitest";
import { createListingActivationToken } from "@/lib/billing/listing-activation-link";

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  findByWorkspaceId: vi.fn(),
  createOrder: vi.fn(),
}));

vi.mock("@/lib/auth/current-user", () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}));
vi.mock("@/lib/listings/listing-service", () => ({
  listingService: { findByWorkspaceId: mocks.findByWorkspaceId },
}));
vi.mock("@/lib/billing/payment-service", () => ({
  paymentService: { createOrder: mocks.createOrder },
}));

import { POST } from "./route";

describe("POST /api/billing/orders", () => {
  beforeEach(() => {
    process.env.PURCHASE_LINK_SECRET = "activation-order-secret";
    mocks.getAuthenticatedUser.mockReset().mockResolvedValue(null);
    mocks.findByWorkspaceId.mockReset();
    mocks.createOrder.mockReset().mockResolvedValue({
      providerOrderId: "order_1",
      amountPaise: 199900,
      currency: "INR",
      planLabel: "Starter",
      purchaseId: "purchase_1",
      publicKey: "rzp_test",
    });
  });

  it("allows a valid activation token to create an order without login", async () => {
    const token = createListingActivationToken({
      workspaceId: "workspace_1",
      listingId: "listing_1",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    mocks.findByWorkspaceId.mockResolvedValue({
      id: "listing_1",
      workspaceId: "workspace_1",
      status: "ready_to_publish",
      ownerPhone: "919822052388",
    });

    const response = await POST(jsonRequest({
      planId: "starter",
      idempotencyKey: "click-1",
      activationToken: token,
    }));

    expect(response.status).toBe(200);
    expect(mocks.createOrder).toHaveBeenCalledWith({
      workspaceId: "workspace_1",
      planId: "starter",
      idempotencyKey: "click-1",
      activationListingId: "listing_1",
      activationPhone: "919822052388",
    });
  });

  it("rejects unauthenticated ordinary checkout and invalid activation targets", async () => {
    const ordinary = await POST(jsonRequest({ planId: "starter", idempotencyKey: "click-1" }));
    expect(ordinary.status).toBe(401);

    const invalid = await POST(jsonRequest({
      planId: "starter",
      idempotencyKey: "click-2",
      activationToken: "invalid",
    }));
    expect(invalid.status).toBe(401);

    const token = createListingActivationToken({
      workspaceId: "workspace_1",
      listingId: "listing_1",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    mocks.findByWorkspaceId.mockResolvedValue({
      id: "listing_1",
      workspaceId: "workspace_1",
      status: "published",
    });
    const published = await POST(jsonRequest({
      planId: "starter",
      idempotencyKey: "click-3",
      activationToken: token,
    }));
    expect(published.status).toBe(403);
  });
});

function jsonRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/billing/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
