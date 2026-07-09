import { describe, expect, it } from "vitest";
import { calculatePlanUsage, defaultPlans, selectDefaultPlanId } from "./billing-service";
import type { Listing, Plan } from "@/types/domain";

describe("calculatePlanUsage", () => {
  it("counts only published listings against the plan limit", () => {
    const plan = { ...defaultPlans[0], activeListingLimit: 2 };
    const usage = calculatePlanUsage(plan, [
      listing("published"),
      listing("draft"),
      listing("archived"),
      listing("sold"),
    ]);

    expect(usage.activeListings).toBe(1);
    expect(usage.remaining).toBe(1);
    expect(usage.isAtLimit).toBe(false);
  });

  it("marks usage at limit when published listings meet the allowed count", () => {
    const plan = { ...defaultPlans[0], activeListingLimit: 2 };
    const usage = calculatePlanUsage(plan, [listing("published"), listing("published")]);

    expect(usage.activeListings).toBe(2);
    expect(usage.remaining).toBe(0);
    expect(usage.isAtLimit).toBe(true);
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
