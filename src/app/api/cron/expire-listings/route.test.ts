import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/listings/listing-expiry-service", () => ({
  listingExpiryService: {
    expireDueListings: vi.fn(),
  },
}));

const { listingExpiryService } = await import("@/lib/listings/listing-expiry-service");

describe("expire listings cron route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "cron-secret";
    vi.mocked(listingExpiryService.expireDueListings).mockResolvedValue({
      expiredCount: 1,
      expiredListings: [
        {
          id: "listing_1",
        },
      ],
    } as Awaited<ReturnType<typeof listingExpiryService.expireDueListings>>);
  });

  it("returns unauthorized when the cron secret is missing", async () => {
    const response = await GET(new Request("https://example.com/api/cron/expire-listings"));

    expect(response.status).toBe(401);
    expect(listingExpiryService.expireDueListings).not.toHaveBeenCalled();
  });

  it("returns unauthorized when the cron secret is wrong", async () => {
    const response = await GET(
      new Request("https://example.com/api/cron/expire-listings", {
        headers: { authorization: "Bearer wrong" },
      }),
    );

    expect(response.status).toBe(401);
    expect(listingExpiryService.expireDueListings).not.toHaveBeenCalled();
  });

  it("expires listings when the cron secret is valid", async () => {
    const response = await GET(
      new Request("https://example.com/api/cron/expire-listings", {
        headers: { authorization: "Bearer cron-secret" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      expiredCount: 1,
      expiredListingIds: ["listing_1"],
    });
    expect(listingExpiryService.expireDueListings).toHaveBeenCalledOnce();
  });
});
