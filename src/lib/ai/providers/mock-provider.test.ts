import { describe, expect, it } from "vitest";
import { MockAIProvider } from "./mock-provider";

describe("MockAIProvider", () => {
  it("extracts Indian real estate shorthand and rewrites risky expansion claims safely", async () => {
    const provider = new MockAIProvider();
    const result = await provider.extractListing({
      workspaceId: "workspace_demo",
      intakeSessionId: "intake_demo",
      text: "Rare corner ground floor flat. 515 sqft constructed + 1200 sqft open plot/garden. Buyer can construct additional 2-3 rooms. Price 90 lacs + Brokerage 2%. Parmar Residency Pune.",
      media: [],
    });

    expect(result.data.title).toBe(
      "Rare Corner Ground Floor Flat with 1200 Sqft Attached Garden",
    );
    expect(result.data.price).toBe(9000000);
    expect(result.data.riskFlags).toContain("future_expansion");
    expect(result.data.descriptionLong).toContain("subject to society rules");
    expect(result.data.confirmationQuestions.length).toBeGreaterThan(0);
    expect(result.confidenceScore).toBeGreaterThan(0.75);
  });

  it("creates a property-specific title for ordinary rental messages", async () => {
    const provider = new MockAIProvider();
    const result = await provider.extractListing({
      workspaceId: "workspace_demo",
      intakeSessionId: "intake_demo",
      text: "Parmar Residency near Salunke Vihar Road Pune. Rent 45k per month. 1 car parking available.",
      media: [],
    });

    expect(result.data.title).toBe(
      "Apartment for Rent in Parmar Residency, Salunke Vihar Road, Pune",
    );
    expect(result.data.title).not.toBe("Premium Property Listing Draft");
    expect(result.data.price).toBe(45000);
    expect(result.data.parkingCount).toBe(1);
  });
});
