import { describe, expect, it } from "vitest";
import { calculatePlanUsage, defaultPlans } from "./billing-service";
import type { Listing } from "@/types/domain";

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

function listing(status: Listing["status"]) {
  return { status } as Listing;
}
