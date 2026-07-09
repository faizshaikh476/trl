import { describe, expect, it } from "vitest";
import {
  calculatePlanUsage,
  defaultPlans,
  formatPlanPrice,
  parsePlanInput,
  selectDefaultPlanId,
} from "./billing-service";
import type { Listing, Plan } from "@/types/domain";

describe("calculatePlanUsage", () => {
  it("counts only published listings against the plan limit", () => {
    const plan = { ...defaultPlans[0], listingCredits: 2 };
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
