import { beforeEach, describe, expect, it, vi } from "vitest";
import { createListingActivationToken } from "@/lib/billing/listing-activation-link";

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  verifyCheckout: vi.fn(),
}));

vi.mock("@/lib/auth/current-user", () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}));
vi.mock("@/lib/billing/payment-service", () => ({
  paymentService: { verifyCheckout: mocks.verifyCheckout },
}));

import { POST } from "./route";

describe("POST /api/billing/verify", () => {
  beforeEach(() => {
    process.env.PURCHASE_LINK_SECRET = "activation-verify-secret";
    mocks.getAuthenticatedUser.mockReset().mockResolvedValue(null);
    mocks.verifyCheckout.mockReset().mockResolvedValue({
      id: "purchase_1",
      status: "paid",
      activationListingId: "listing_1",
      activationCompletedAt: "2026-08-13T12:00:00.000Z",
    });
  });

  it("verifies activation checkout without login only for the signed listing", async () => {
    const token = createListingActivationToken({
      workspaceId: "workspace_1",
      listingId: "listing_1",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });

    const response = await POST(jsonRequest({
      razorpay_order_id: "order_1",
      razorpay_payment_id: "pay_1",
      razorpay_signature: "signature_1",
      activationToken: token,
    }));

    expect(response.status).toBe(200);
    expect(mocks.verifyCheckout).toHaveBeenCalledWith({
      razorpay_order_id: "order_1",
      razorpay_payment_id: "pay_1",
      razorpay_signature: "signature_1",
      workspaceId: "workspace_1",
      activationListingId: "listing_1",
    });
    await expect(response.json()).resolves.toMatchObject({ activationStatus: "completed" });
  });

  it("rejects unauthenticated verification without a valid activation token", async () => {
    const response = await POST(jsonRequest({
      razorpay_order_id: "order_1",
      razorpay_payment_id: "pay_1",
      razorpay_signature: "signature_1",
    }));
    expect(response.status).toBe(401);
    expect(mocks.verifyCheckout).not.toHaveBeenCalled();
  });
});

function jsonRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/billing/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
