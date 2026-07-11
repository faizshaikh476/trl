import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Listing, Plan } from "@/types/domain";

const mocks = vi.hoisted(() => {
  const collectionGet = vi.fn();
  const planDocGet = vi.fn();
  const planDocSet = vi.fn();
  const planDocDelete = vi.fn();
  const creditGetBalance = vi.fn();
  const creditAssertCanReactivate = vi.fn();
  const planDocRef = {
    get: planDocGet,
    set: planDocSet,
    delete: planDocDelete,
  };
  const getAdminDb = vi.fn(() => ({
    collection: vi.fn(() => ({
      get: collectionGet,
    })),
    doc: vi.fn(() => planDocRef),
  }));

  return {
    collectionGet,
    planDocGet,
    planDocSet,
    planDocDelete,
    planDocRef,
    creditGetBalance,
    creditAssertCanReactivate,
    getAdminDb,
  };
});

vi.mock("@/lib/billing/credit-wallet-service", () => {
  class NoListingCreditsError extends Error {
    readonly code = "NO_LISTING_CREDITS";

    constructor() {
      super("This workspace has no active listing credits.");
      this.name = "NoListingCreditsError";
    }
  }

  return {
    NoListingCreditsError,
    creditWalletService: {
      getBalance: mocks.creditGetBalance,
      assertCanReactivate: mocks.creditAssertCanReactivate,
    },
  };
});

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: mocks.getAdminDb,
}));

vi.mock("@/lib/listings/listing-service", () => ({
  listingService: {
    listByWorkspace: vi.fn(),
  },
}));

vi.mock("@/lib/workspaces/workspace-service", () => ({
  workspaceService: {
    list: vi.fn(),
    findById: vi.fn(),
  },
}));

import {
  BillingService,
  buildWorkspaceBillingSummary,
  calculatePlanUsage,
  defaultPlans,
  formatPlanPrice,
  parsePlanInput,
  selectDefaultPlanId,
} from "./billing-service";
import { NoListingCreditsError } from "./credit-wallet-service";

beforeEach(() => {
  mocks.collectionGet.mockReset();
  mocks.planDocGet.mockReset();
  mocks.planDocSet.mockReset();
  mocks.planDocDelete.mockReset();
  mocks.creditGetBalance.mockReset();
  mocks.creditAssertCanReactivate.mockReset();
  mocks.getAdminDb.mockClear();
});

describe("calculatePlanUsage", () => {
  it("keeps published-listing counting behavior for legacy compatibility", () => {
    const plan = { ...defaultPlans[0], listingCredits: 2 };
    const usage = calculatePlanUsage(plan, [listing("published")]);

    expect(usage.activeListings).toBe(1);
    expect(usage.remaining).toBe(1);
    expect(usage.isAtLimit).toBe(false);
  });

  it("marks usage at limit when published listings meet the allowed count", () => {
    const plan = { ...defaultPlans[0], listingCredits: 2 };
    const usage = calculatePlanUsage(plan, [listing("published"), listing("published")]);

    expect(usage.activeListings).toBe(2);
    expect(usage.remaining).toBe(0);
    expect(usage.isAtLimit).toBe(true);
  });
});

describe("parsePlanInput", () => {
  it("parses listing-credit package fields", () => {
    const formData = new FormData();
    formData.set("name", "Growth");
    formData.set("amountPaise", "799900");
    formData.set("currency", "INR");
    formData.set("listingCredits", "50");
    formData.set("creditValidityDays", "30");
    formData.set("listingVisibilityDays", "60");
    formData.set("featured", "true");
    formData.set("status", "active");
    formData.set("sortOrder", "20");

    expect(parsePlanInput(formData)).toEqual({
      name: "Growth",
      amountPaise: 799900,
      currency: "INR",
      listingCredits: 50,
      creditValidityDays: 30,
      listingVisibilityDays: 60,
      featured: true,
      status: "active",
      sortOrder: 20,
    });
  });

  it("rejects custom credit validity because credit packages are fixed to 30 days", () => {
    const formData = new FormData();
    formData.set("name", "Growth");
    formData.set("amountPaise", "799900");
    formData.set("currency", "INR");
    formData.set("listingCredits", "50");
    formData.set("creditValidityDays", "45");
    formData.set("listingVisibilityDays", "60");
    formData.set("status", "active");
    formData.set("sortOrder", "20");

    expect(() => parsePlanInput(formData)).toThrow("Credit validity is fixed at 30 days.");
  });

  it("accepts the current legacy admin form fields", () => {
    const formData = new FormData();
    formData.set("name", "Growth");
    formData.set("priceLabel", "₹7,999/mo");
    formData.set("activeListingLimit", "50");
    formData.set("status", "active");
    formData.set("sortOrder", "20");

    expect(parsePlanInput(formData)).toEqual({
      name: "Growth",
      amountPaise: 799900,
      currency: "INR",
      listingCredits: 50,
      creditValidityDays: 30,
      listingVisibilityDays: 60,
      featured: false,
      priceLabel: "₹7,999/mo",
      activeListingLimit: 50,
      status: "active",
      sortOrder: 20,
    });
  });

  it("rejects legacy nonnumeric price labels for non-free plans", () => {
    const formData = new FormData();
    formData.set("name", "Agency");
    formData.set("priceLabel", "Custom");
    formData.set("activeListingLimit", "500");
    formData.set("status", "active");
    formData.set("sortOrder", "30");

    expect(() => parsePlanInput(formData)).toThrow("Amount must be a positive whole number.");
  });

  it("accepts a zero amount for an explicit Free plan", () => {
    const formData = new FormData();
    formData.set("name", "Free");
    formData.set("amountPaise", "0");
    formData.set("currency", "INR");
    formData.set("listingCredits", "5");
    formData.set("creditValidityDays", "30");
    formData.set("listingVisibilityDays", "60");
    formData.set("status", "active");
    formData.set("sortOrder", "5");

    expect(parsePlanInput(formData)).toEqual({
      name: "Free",
      amountPaise: 0,
      currency: "INR",
      listingCredits: 5,
      creditValidityDays: 30,
      listingVisibilityDays: 60,
      featured: false,
      status: "active",
      sortOrder: 5,
    });
  });

  it("prefers new numeric fields when both new and legacy inputs are supplied", () => {
    const formData = new FormData();
    formData.set("name", "Growth");
    formData.set("amountPaise", "799900");
    formData.set("currency", "INR");
    formData.set("listingCredits", "50");
    formData.set("creditValidityDays", "30");
    formData.set("listingVisibilityDays", "60");
    formData.set("featured", "true");
    formData.set("priceLabel", "₹1/mo");
    formData.set("activeListingLimit", "1");
    formData.set("status", "active");
    formData.set("sortOrder", "20");

    expect(parsePlanInput(formData)).toEqual({
      name: "Growth",
      amountPaise: 799900,
      currency: "INR",
      listingCredits: 50,
      creditValidityDays: 30,
      listingVisibilityDays: 60,
      featured: true,
      status: "active",
      sortOrder: 20,
    });
  });

  it("rejects non-integer paise amounts", () => {
    const formData = new FormData();
    formData.set("name", "Growth");
    formData.set("amountPaise", "7999.5");
    formData.set("currency", "INR");
    formData.set("listingCredits", "50");
    formData.set("creditValidityDays", "30");
    formData.set("listingVisibilityDays", "60");
    formData.set("status", "active");
    formData.set("sortOrder", "20");

    expect(() => parsePlanInput(formData)).toThrow("Amount must be a positive whole number.");
  });

  it("rejects zero listing credits", () => {
    const formData = new FormData();
    formData.set("name", "Growth");
    formData.set("amountPaise", "799900");
    formData.set("currency", "INR");
    formData.set("listingCredits", "0");
    formData.set("creditValidityDays", "30");
    formData.set("listingVisibilityDays", "60");
    formData.set("status", "active");
    formData.set("sortOrder", "20");

    expect(() => parsePlanInput(formData)).toThrow(
      "Listing credits must be a positive whole number.",
    );
  });

  it("rejects unsupported currencies", () => {
    const formData = new FormData();
    formData.set("name", "Growth");
    formData.set("amountPaise", "799900");
    formData.set("currency", "USD");
    formData.set("listingCredits", "50");
    formData.set("creditValidityDays", "30");
    formData.set("listingVisibilityDays", "60");
    formData.set("status", "active");
    formData.set("sortOrder", "20");

    expect(() => parsePlanInput(formData)).toThrow("Currency must be INR.");
  });
});

describe("formatPlanPrice", () => {
  it("formats paise values for display", () => {
    expect(
      formatPlanPrice({
        ...defaultPlans[0],
        amountPaise: 799900,
        currency: "INR",
      }),
    ).toBe("INR 7,999");
  });
});

describe("buildWorkspaceBillingSummary", () => {
  it("shows the latest paid credit package instead of the workspace default plan", () => {
    const workspace = {
      id: "workspace_1",
      name: "Broker 1",
      slug: "broker-1",
      city: "Pune",
      ownerId: "owner_1",
      logoURL: "",
      contactName: "Owner",
      contactPhone: "9999999999",
      contactEmail: "owner@example.com",
      websiteTheme: "premium",
      customDomain: null,
      planId: "free",
      status: "active",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    } as const;
    const plans = [
      plan("free", "Free", "active", 1),
      plan("pro", "Pro", "active", 20),
    ];
    const summary = buildWorkspaceBillingSummary({
      workspace,
      plans,
      wallet: {
        availableCredits: 34,
        validUntil: "2026-08-10T15:41:41.070Z",
        lastPurchaseId: "purchase_pro",
        createdAt: "2026-07-11T15:41:41.070Z",
        updatedAt: "2026-07-11T15:41:41.070Z",
      },
      purchases: [
        {
          id: "purchase_pro",
          workspaceId: workspace.id,
          planId: "pro",
          quantity: 30,
          validityDays: 30,
          amountPaise: 29900,
          currency: "INR",
          status: "paid",
          provider: "razorpay",
          providerOrderId: "order_1",
          providerPaymentId: "pay_1",
          providerRefundId: null,
          providerEventIds: [],
          creditGrantLedgerEntryId: "grant:purchase:purchase_pro",
          creditsGrantedAt: "2026-07-11T15:41:41.070Z",
          failureReason: null,
          paidAt: "2026-07-11T15:41:41.070Z",
          refundedAt: null,
          createdAt: "2026-07-11T15:40:00.000Z",
          updatedAt: "2026-07-11T15:41:41.070Z",
        },
      ],
      now: new Date("2026-07-11T16:00:00.000Z"),
    });

    expect(summary.currentPackageName).toBe("Pro");
    expect(summary.availableCredits).toBe(34);
    expect(summary.validUntilLabel).toBe("10 Aug 2026");
    expect(summary.purchaseCount).toBe(1);
  });
});

describe("defaultPlans", () => {
  it("uses 30-day credit validity and 60-day listing visibility for every default plan", () => {
    expect(defaultPlans).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          creditValidityDays: 30,
          listingVisibilityDays: 60,
        }),
      ]),
    );
    expect(defaultPlans.every((plan) => plan.creditValidityDays === 30)).toBe(true);
    expect(defaultPlans.every((plan) => plan.listingVisibilityDays === 60)).toBe(true);
  });

  it("keeps deprecated legacy display fields derived for compatibility", () => {
    expect(defaultPlans[0]).toMatchObject({
      activeListingLimit: defaultPlans[0].listingCredits,
      priceLabel: formatPlanPrice(defaultPlans[0]),
    });
  });
});

describe("BillingService.upsertPlan", () => {
  it("merges updates without dropping legacy or unknown fields", async () => {
    mocks.planDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        id: "growth",
        name: "Growth",
        description: "Legacy description",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
        customField: "preserve-me",
        priceLabel: "Custom",
        activeListingLimit: 999,
      }),
    });

    const service = new BillingService();
    const plan = await service.upsertPlan("growth", {
      name: "Growth",
      amountPaise: 799900,
      currency: "INR",
      listingCredits: 50,
      creditValidityDays: 30,
      listingVisibilityDays: 60,
      featured: true,
      status: "active",
      sortOrder: 20,
    });

    expect(plan).toMatchObject({
      id: "growth",
      name: "Growth",
      description: "Legacy description",
      amountPaise: 799900,
      currency: "INR",
      listingCredits: 50,
      creditValidityDays: 30,
      listingVisibilityDays: 60,
      featured: true,
      activeListingLimit: 50,
      priceLabel: "INR 7,999",
      customField: "preserve-me",
      status: "active",
      sortOrder: 20,
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    expect(mocks.planDocSet).toHaveBeenCalledWith(
      expect.objectContaining({
        customField: "preserve-me",
        activeListingLimit: 50,
        priceLabel: "INR 7,999",
      }),
      { merge: true },
    );
  });
});

describe("BillingService.assertCanPublish", () => {
  it("rejects a new publication when the workspace has no listing credits", async () => {
    const { workspaceService } = await import("@/lib/workspaces/workspace-service");
    const { listingService } = await import("@/lib/listings/listing-service");
    vi.mocked(workspaceService.findById).mockResolvedValue({
      id: "workspace_1",
      name: "Rare Address",
      slug: "rare-address",
      city: "Pune",
      ownerId: "owner_1",
      logoURL: "",
      contactName: "Owner",
      contactPhone: "9999999999",
      contactEmail: "owner@example.com",
      websiteTheme: "premium",
      customDomain: null,
      planId: "starter",
      status: "active",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    vi.mocked(listingService.listByWorkspace).mockResolvedValue([]);
    mocks.planDocGet.mockResolvedValue({ exists: false });
    mocks.creditAssertCanReactivate.mockResolvedValue({
      availableCredits: 0,
      validUntil: "2026-08-08T00:00:00.000Z",
      lastPurchaseId: "purchase_1",
      createdAt: "2026-07-09T00:00:00.000Z",
      updatedAt: "2026-07-09T00:00:00.000Z",
    });

    await expect(
      new BillingService().assertCanPublish("workspace_1", {
        id: "listing_new",
        workspaceId: "workspace_1",
        status: "draft",
      } as Listing),
    ).rejects.toBeInstanceOf(NoListingCreditsError);

    expect(mocks.creditAssertCanReactivate).toHaveBeenCalledWith("workspace_1");
  });
});

describe("BillingService legacy record normalization", () => {
  it("lists existing Custom plans without failing strict create parsing", async () => {
    mocks.collectionGet.mockResolvedValue({
      docs: [
        {
          id: "agency",
          data: () => ({
            name: "Agency",
            description: "Legacy custom plan",
            priceLabel: "Custom",
            activeListingLimit: 500,
            status: "inactive",
            sortOrder: 30,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-02T00:00:00.000Z",
          }),
        },
      ],
    });

    const plans = await new BillingService().listPlans();

    expect(plans).toEqual([
      expect.objectContaining({
        id: "agency",
        name: "Agency",
        amountPaise: 0,
        priceLabel: "Custom",
        status: "inactive",
        activeListingLimit: 500,
        listingCredits: 500,
      }),
    ]);
  });

  it("finds an existing Custom plan without failing strict create parsing", async () => {
    mocks.planDocGet.mockResolvedValue({
      exists: true,
      id: "agency",
      data: () => ({
        name: "Agency",
        description: "Legacy custom plan",
        priceLabel: "Custom",
        activeListingLimit: 500,
        status: "inactive",
        sortOrder: 30,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      }),
    });

    const plan = await new BillingService().findPlan("agency");

    expect(plan).toMatchObject({
      id: "agency",
      name: "Agency",
      amountPaise: 0,
      priceLabel: "Custom",
      status: "inactive",
      activeListingLimit: 500,
      listingCredits: 500,
    });
  });
});

describe("selectDefaultPlanId", () => {
  it("prefers the active Free plan", () => {
    expect(
      selectDefaultPlanId([
        plan("starter", "Starter", "active", 10),
        plan("free", "Free", "active", 30),
      ]),
    ).toBe("free");
  });

  it("falls back to the lowest-sort active plan", () => {
    expect(
      selectDefaultPlanId([
        plan("pro", "Pro", "active", 20),
        plan("starter", "Starter", "active", 10),
        plan("free", "Free", "inactive", 1),
      ]),
    ).toBe("starter");
  });
});

function listing(status: Listing["status"]) {
  return { status } as Listing;
}

function plan(id: string, name: string, status: Plan["status"], sortOrder: number): Plan {
  return {
    ...defaultPlans[0],
    id,
    name,
    status,
    sortOrder,
  };
}
