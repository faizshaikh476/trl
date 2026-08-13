import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  lookup: vi.fn(),
  claim: vi.fn(),
  verifyFirebaseIdToken: vi.fn(),
  getAdminDb: vi.fn(),
  project: vi.fn(),
  revalidatePublicListing: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
  get: vi.fn(),
}));

vi.mock("@/lib/claims/owner-claim-service", () => ({
  ownerClaimService: { lookup: mocks.lookup, claim: mocks.claim },
}));
vi.mock("@/lib/auth/firebase-token", () => ({
  verifyFirebaseIdToken: mocks.verifyFirebaseIdToken,
}));
vi.mock("@/lib/firebase/admin", () => ({ getAdminDb: mocks.getAdminDb }));
vi.mock("@/lib/public/public-listing-cache", () => ({
  revalidatePublicListing: mocks.revalidatePublicListing,
}));
vi.mock("@/lib/customer-operations/customer-activity-projection", () => ({
  customerActivityProjector: { project: mocks.project },
}));

import { BrokerVerificationService } from "./broker-verification-service";

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  const tokenData = {
    otpHash: crypto.createHash("sha256").update("123456").digest("hex"),
    otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    pendingBroker: {
      name: "Monesh Kumar",
      occupation: "Broker",
      email: "monesh@example.com",
      consent: {
        brokerVerification: true,
        whatsappTransactional: true,
        termsAccepted: true,
        version: "broker-verification-v1",
        acceptedAt: "2026-08-13T10:00:00.000Z",
      },
    },
  };
  mocks.set.mockResolvedValue(undefined);
  mocks.update.mockResolvedValue(undefined);
  mocks.get.mockResolvedValue({ data: () => tokenData, ref: { update: mocks.update } });
  mocks.getAdminDb.mockReturnValue({
    doc: vi.fn(() => ({ set: mocks.set, update: mocks.update, get: mocks.get })),
  });
  mocks.lookup.mockResolvedValue({
    status: "ready",
    token: { workspaceId: "workspace_1", phone: "919876543210" },
    listing: { id: "listing_1", slug: "garden-flat" },
  });
  mocks.verifyFirebaseIdToken.mockResolvedValue({
    uid: "user_1",
    email: "monesh@example.com",
  });
  mocks.claim.mockResolvedValue(undefined);
  mocks.project.mockResolvedValue(undefined);
});

describe("BrokerVerificationService.complete", () => {
  it("projects the claimed account only after broker records and claim succeed", async () => {
    const service = new BrokerVerificationService();

    const result = await service.complete("claim_token", "123456", "firebase_token");

    expect(result).toEqual({ ok: true, redirectTo: "/l/garden-flat?verified=1" });
    expect(mocks.claim).toHaveBeenCalled();
    expect(mocks.project).toHaveBeenCalledWith({
      workspaceId: "workspace_1",
      authenticatedUserId: "user_1",
      latestActivityLabel: "Broker account claimed",
      event: {
        type: "account_claimed",
        label: "Broker account claimed",
        idempotencyKey: "claim_token:user_1",
        sourceId: "user_1",
        listingId: "listing_1",
      },
    });
    expect(mocks.claim.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.project.mock.invocationCallOrder[0],
    );
  });
});
