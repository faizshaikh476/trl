import { describe, expect, it } from "vitest";
import { LeadService } from "./lead-service";
import { DemoLeadRepository } from "./repositories/demo-lead-repository";

describe("LeadService", () => {
  it("creates leads through the repository contract", async () => {
    const service = new LeadService(new DemoLeadRepository());
    const lead = await service.create({
      name: "Meera Kapoor",
      phone: "9876543210",
      message: "Please call me for a visit.",
      contactConsent: true,
      source: "public_listing",
      listingId: "listing_garden_flat",
      workspaceId: "workspace_rare_address",
    });

    expect(lead.status).toBe("new");
    expect(lead.name).toBe("Meera Kapoor");
  });

  it("updates lead status and appends notes", async () => {
    const service = new LeadService(new DemoLeadRepository());

    const updated = await service.updateStatus("lead_aarav", "contacted");
    expect(updated.status).toBe("contacted");

    const withNote = await service.addNote("lead_aarav", "Buyer asked for legal document clarity.");
    expect(withNote.notes).toContain("Buyer asked for legal document clarity.");
  });
});
