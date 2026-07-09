import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Plan } from "@/types/domain";
import { PricingSection } from "./pricing-section";

describe("PricingSection", () => {
  it("renders only active plans ordered by sort order with listing-credit package details", () => {
    render(<PricingSection plans={[plan("inactive", 5, "Inactive", "inactive"), plan("growth", 20, "Growth"), plan("starter", 10, "Starter")]} />);

    expect(screen.queryByRole("heading", { name: "Inactive" })).not.toBeInTheDocument();

    const cards = screen.getAllByTestId("pricing-plan-card");
    expect(within(cards[0]).getByRole("heading", { name: "Starter" })).toBeInTheDocument();
    expect(within(cards[1]).getByRole("heading", { name: "Growth" })).toBeInTheDocument();

    const starter = within(cards[0]);
    expect(starter.getByText("INR 1,999")).toBeInTheDocument();
    expect(starter.getByText("25 listing credits")).toBeInTheDocument();
    expect(starter.getByText("30-day credit validity")).toBeInTheDocument();
    expect(starter.getByText("60-day listing visibility")).toBeInTheDocument();
    expect(starter.getByRole("link", { name: "Choose Starter" })).toHaveAttribute("href", "/pricing?plan=starter");
  });

  it("marks the selected plan without changing the package URL", () => {
    render(<PricingSection plans={[plan("starter", 10, "Starter"), plan("growth", 20, "Growth")]} selectedPlanId="growth" />);

    const growth = screen.getAllByTestId("pricing-plan-card").find((card) => within(card).queryByRole("heading", { name: "Growth" }));

    expect(growth).toBeDefined();
    expect(within(growth!).getByText("Selected package")).toBeInTheDocument();
    expect(within(growth!).getByRole("link", { name: "Continue with Growth" })).toHaveAttribute("href", "/pricing?plan=growth");
  });
});

function plan(id: string, sortOrder: number, name: string, status: Plan["status"] = "active"): Plan {
  return {
    id,
    name,
    description: `${name} description`,
    amountPaise: id === "growth" ? 499900 : 199900,
    currency: "INR",
    listingCredits: id === "growth" ? 100 : 25,
    creditValidityDays: 30,
    listingVisibilityDays: 60,
    featured: id === "growth",
    status,
    sortOrder,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}
