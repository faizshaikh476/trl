import { describe, expect, it } from "vitest";
import { ListingService } from "./listing-service";
import { DemoListingRepository } from "./repositories/demo-listing-repository";

describe("ListingService", () => {
  it("lists workspace listings through the repository contract", async () => {
    const service = new ListingService(new DemoListingRepository());
    const listings = await service.listByWorkspace("workspace_rare_address");

    expect(listings.length).toBeGreaterThan(0);
    expect(listings.every((listing) => listing.workspaceId === "workspace_rare_address")).toBe(
      true,
    );
  });

  it("lists every listing for platform administration", async () => {
    const service = new ListingService(new DemoListingRepository());

    const allListings = await service.listAll();
    const workspaceListings = await service.listByWorkspace("workspace_rare_address");

    expect(allListings.length).toBeGreaterThanOrEqual(workspaceListings.length);
    expect(allListings.some((listing) => listing.id === "listing_garden_flat")).toBe(true);
  });

  it("publishes and archives listings through lifecycle actions", async () => {
    const service = new ListingService(new DemoListingRepository());

    const published = await service.updateStatus("listing_baner_rental", "published");
    expect(published.status).toBe("published");
    expect(published.publishedAt).toBeTruthy();
    expect(published.expiresAt).toBeTruthy();

    const archived = await service.updateStatus("listing_baner_rental", "archived");
    expect(archived.status).toBe("archived");
  });

  it("duplicates a listing as a draft in the same workspace", async () => {
    const service = new ListingService(new DemoListingRepository());

    const duplicate = await service.duplicate("listing_garden_flat", "user_owner_demo");

    expect(duplicate.id).not.toBe("listing_garden_flat");
    expect(duplicate.status).toBe("draft");
    expect(duplicate.title).toContain("Copy");
    expect(duplicate.createdBy).toBe("user_owner_demo");
  });

  it("hard deletes a listing inside its workspace", async () => {
    const service = new ListingService(new DemoListingRepository());
    const duplicate = await service.createManual("workspace_rare_address", "user_owner_demo", {
      title: "Temporary Admin Delete Test Listing",
      transactionType: "sale",
      propertyType: "apartment",
      location: "Koregaon Park, Pune",
      city: "Pune",
      locality: "Koregaon Park",
      societyName: "Delete Test",
      googleMapsUrl: "",
      price: 10000000,
      deposit: null,
      brokerage: "2%",
      taxes: "extra",
      bhk: 2,
      bedrooms: 2,
      bathrooms: 2,
      carpetArea: 900,
      builtUpArea: null,
      plotArea: null,
      openArea: null,
      furnishedStatus: "semi-furnished",
      parkingCount: 1,
      floor: "4",
      totalFloors: 10,
      availability: "Immediate",
      preferredTenant: null,
      descriptionShort: "Temporary listing for delete coverage.",
      descriptionLong: "Temporary listing created only to verify hard delete behavior.",
      highlightsText: ["Delete coverage", "Admin flow"],
      amenitiesText: ["Lift"],
      seoTitle: "Temporary Delete Listing",
      seoDescription: "Temporary delete listing.",
      whatsappShareText: "Temporary delete listing.",
      instagramCaption: "Temporary delete listing.",
    });

    await service.deleteInWorkspace(duplicate.workspaceId, duplicate.id);

    await expect(service.findByWorkspaceId(duplicate.workspaceId, duplicate.id)).resolves.toBeNull();
  });

  it("creates and updates a manual dashboard listing", async () => {
    const service = new ListingService(new DemoListingRepository());

    const created = await service.createManual("workspace_rare_address", "user_owner_demo", {
      title: "Premium 4 BHK Penthouse in Koregaon Park",
      transactionType: "sale",
      propertyType: "apartment",
      location: "Koregaon Park, Pune",
      city: "Pune",
      locality: "Koregaon Park",
      societyName: "The Canopy",
      googleMapsUrl: "",
      price: 45000000,
      deposit: null,
      brokerage: "2%",
      taxes: "extra",
      bhk: 4,
      bedrooms: 4,
      bathrooms: 4,
      carpetArea: 3100,
      builtUpArea: null,
      plotArea: null,
      openArea: 600,
      furnishedStatus: "semi-furnished",
      parkingCount: 3,
      floor: "top",
      totalFloors: 16,
      availability: "Immediate",
      preferredTenant: null,
      descriptionShort: "Large penthouse with terrace and skyline views.",
      descriptionLong: "A premium penthouse listing created from the broker dashboard.",
      highlightsText: ["Private terrace", "Three parking spaces"],
      amenitiesText: ["Lift", "Security"],
      seoTitle: "Premium Penthouse in Koregaon Park",
      seoDescription: "Premium 4 BHK penthouse in Pune.",
      whatsappShareText: "Premium 4 BHK penthouse in Koregaon Park.",
      instagramCaption: "Penthouse living in Koregaon Park.",
    });

    expect(created.status).toBe("draft");
    expect(created.createdBy).toBe("user_owner_demo");

    const updated = await service.updateManual(created.id, {
      title: "Updated Premium 4 BHK Penthouse in Koregaon Park",
      price: 44000000,
    });

    expect(updated.title).toBe("Updated Premium 4 BHK Penthouse in Koregaon Park");
    expect(updated.price).toBe(44000000);
  });
});
