import { beforeEach, describe, expect, it, vi } from "vitest";
import { NoListingCreditsError } from "@/lib/billing/credit-wallet-service";
import { reactivateListingAction } from "./listing-actions";

class RedirectError extends Error {
  constructor(readonly url: string) {
    super(`Redirected to ${url}`);
    this.name = "RedirectError";
  }
}

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new RedirectError(url);
  }),
}));

vi.mock("@/lib/auth/current-user", () => ({
  getAuthenticatedUser: vi.fn(async () => ({
    id: "user_1",
    workspaceId: "workspace_1",
    role: "broker_owner",
    permissions: [],
  })),
  getCurrentAdmin: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/billing/billing-service", () => ({
  billingService: {},
  ListingPlanLimitError: class ListingPlanLimitError extends Error {},
}));

vi.mock("@/lib/billing/credit-wallet-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/billing/credit-wallet-service")>();
  return {
    NoListingCreditsError: actual.NoListingCreditsError,
    creditWalletService: {
      assertCanReactivate: vi.fn(),
    },
  };
});

vi.mock("@/lib/listings/listing-service", () => ({
  listingService: {
    findByWorkspaceId: vi.fn(),
    findAnyById: vi.fn(),
    updateStatusInWorkspace: vi.fn(),
  },
}));

vi.mock("@/lib/public/public-listing-cache", () => ({
  revalidatePublicListing: vi.fn(),
  revalidatePublicListingBySlug: vi.fn(),
}));

vi.mock("@/lib/rbac/require-permission", () => ({
  requireWorkspacePermission: vi.fn(),
}));

const { creditWalletService } = await import("@/lib/billing/credit-wallet-service");
const { listingService } = await import("@/lib/listings/listing-service");

describe("reactivateListingAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listingService.findByWorkspaceId).mockResolvedValue({
      id: "listing_1",
      workspaceId: "workspace_1",
      slug: "garden-flat",
      status: "expired",
      creditLedgerEntryId: "consume:listing:listing_1",
      creditConsumedAt: "2026-07-09T10:00:00.000Z",
    } as Awaited<ReturnType<typeof listingService.findByWorkspaceId>>);
    vi.mocked(creditWalletService.assertCanReactivate).mockResolvedValue({
      availableCredits: 0,
      validUntil: "2026-08-08T10:00:00.000Z",
      lastPurchaseId: "purchase_1",
      createdAt: "2026-07-09T10:00:00.000Z",
      updatedAt: "2026-07-09T10:00:00.000Z",
    });
  });

  it("redirects gracefully if the wallet becomes inactive during reactivation", async () => {
    vi.mocked(listingService.updateStatusInWorkspace).mockRejectedValue(new NoListingCreditsError());

    await expect(reactivateListingAction("listing_1")).rejects.toMatchObject({
      url: "/dashboard/listings/listing_1?error=reactivation-wallet",
    });
  });
});
