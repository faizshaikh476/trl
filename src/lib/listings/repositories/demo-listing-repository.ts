import type { Listing, ListingStatus } from "@/types/domain";
import { demoListings } from "@/lib/mock-data/demo-data";
import {
  normalizeListingExtractionTitle,
  slugify,
  type ListingExtraction,
  type ManualListingInput,
} from "../listing.schema";
import type { ListingRepository, PublicationOptions } from "./listing-repository";

const listings = [...demoListings];

export class DemoListingRepository implements ListingRepository {
  async listAll() {
    return [...listings];
  }

  async listByWorkspace(workspaceId: string) {
    return listings.filter((listing) => listing.workspaceId === workspaceId);
  }

  async listPublished() {
    return listings.filter((listing) => listing.status === "published");
  }

  async findPublishedBySlug(slug: string) {
    return listings.find((listing) => listing.slug === slug && listing.status === "published") ?? null;
  }

  async findShareableBySlug(slug: string) {
    return (
      listings.find(
        (listing) =>
          listing.slug === slug && listing.status !== "archived" && listing.status !== "rejected",
      ) ?? null
    );
  }

  async findById(id: string) {
    return listings.find((listing) => listing.id === id) ?? null;
  }

  async findByWorkspaceId(workspaceId: string, id: string) {
    return listings.find((listing) => listing.workspaceId === workspaceId && listing.id === id) ?? null;
  }

  async createFromExtraction(
    workspaceId: string,
    extraction: ListingExtraction,
    publication?: PublicationOptions,
  ) {
    const now = new Date().toISOString();
    const normalizedExtraction = normalizeListingExtractionTitle(extraction);
    const id = `listing_${Date.now()}`;
    const credit = await publication?.consumeCredit?.(id);
    const expiresAt = addDaysIso(publication?.visibilityDays ?? 60);
    const listing: Listing = {
      id,
      workspaceId,
      title: normalizedExtraction.title,
      slug: `${slugify(normalizedExtraction.title)}-${Date.now()}`,
      status: "published",
      transactionType: normalizedExtraction.transactionType,
      propertyType: normalizedExtraction.propertyType,
      location: normalizedExtraction.location,
      city: normalizedExtraction.city,
      locality: normalizedExtraction.locality,
      societyName: normalizedExtraction.societyName,
      googleMapsUrl: normalizedExtraction.googleMapsUrl,
      price: normalizedExtraction.price,
      deposit: normalizedExtraction.deposit,
      brokerage: normalizedExtraction.brokerage,
      taxes: normalizedExtraction.taxes,
      bhk: normalizedExtraction.bhk,
      bedrooms: normalizedExtraction.bedrooms,
      bathrooms: normalizedExtraction.bathrooms,
      carpetArea: normalizedExtraction.carpetArea,
      builtUpArea: normalizedExtraction.builtUpArea,
      plotArea: normalizedExtraction.plotArea,
      openArea: normalizedExtraction.openArea,
      furnishedStatus: normalizedExtraction.furnishedStatus,
      parkingCount: normalizedExtraction.parkingCount,
      floor: normalizedExtraction.floor,
      totalFloors: normalizedExtraction.totalFloors,
      availability: normalizedExtraction.availability,
      preferredTenant: normalizedExtraction.preferredTenant,
      descriptionShort: normalizedExtraction.descriptionShort,
      descriptionLong: normalizedExtraction.descriptionLong,
      highlights: normalizedExtraction.highlights,
      amenities: normalizedExtraction.amenities,
      missingFields: normalizedExtraction.missingFields,
      riskFlags: normalizedExtraction.riskFlags,
      confirmationQuestions: normalizedExtraction.confirmationQuestions,
      qualityScore: normalizedExtraction.listingQualityScore,
      confidenceScore: normalizedExtraction.confidenceScore,
      views: 0,
      leads: 0,
      whatsappClicks: 0,
      callClicks: 0,
      assignedTo: null,
      createdBy: "mock_whatsapp",
      publishedAt: now,
      expiresAt,
      creditConsumedAt: credit?.createdAt ?? null,
      creditLedgerEntryId: credit?.ledgerEntryId ?? null,
      lastConfirmedAt: null,
      freshnessStatus: "Updated today",
      seoTitle: normalizedExtraction.seoTitle,
      seoDescription: normalizedExtraction.seoDescription,
      whatsappShareText: normalizedExtraction.whatsappShareText,
      instagramCaption: normalizedExtraction.instagramCaption,
      createdAt: now,
      updatedAt: now,
    };
    listings.unshift(listing);
    return listing;
  }

  async createManual(workspaceId: string, createdBy: string, input: ManualListingInput) {
    const now = new Date().toISOString();
    const listing: Listing = {
      id: `listing_manual_${Date.now()}`,
      workspaceId,
      title: input.title,
      slug: `${slugify(input.title)}-${Date.now()}`,
      status: "draft",
      transactionType: input.transactionType,
      propertyType: input.propertyType,
      location: input.location,
      city: input.city,
      locality: input.locality,
      societyName: input.societyName,
      googleMapsUrl: input.googleMapsUrl,
      price: input.price,
      deposit: input.deposit,
      brokerage: input.brokerage,
      taxes: input.taxes,
      bhk: input.bhk,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      carpetArea: input.carpetArea,
      builtUpArea: input.builtUpArea,
      plotArea: input.plotArea,
      openArea: input.openArea,
      furnishedStatus: input.furnishedStatus,
      parkingCount: input.parkingCount,
      floor: input.floor,
      totalFloors: input.totalFloors,
      availability: input.availability,
      preferredTenant: input.preferredTenant,
      descriptionShort: input.descriptionShort,
      descriptionLong: input.descriptionLong,
      highlights: input.highlightsText,
      amenities: input.amenitiesText,
      missingFields: [],
      riskFlags: [],
      confirmationQuestions: [],
      qualityScore: calculateManualQuality(input),
      confidenceScore: 1,
      views: 0,
      leads: 0,
      whatsappClicks: 0,
      callClicks: 0,
      assignedTo: null,
      createdBy,
      publishedAt: null,
      expiresAt: null,
      lastConfirmedAt: null,
      freshnessStatus: "Draft",
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      whatsappShareText: input.whatsappShareText,
      instagramCaption: input.instagramCaption,
      createdAt: now,
      updatedAt: now,
    };
    listings.unshift(listing);
    return listing;
  }

  async updateManual(id: string, input: Partial<ManualListingInput>) {
    const listing = listings.find((item) => item.id === id);
    if (!listing) throw new Error("Listing not found");
    const titleChanged = Boolean(input.title && input.title !== listing.title);
    const patch = manualInputToListingPatch(input);
    Object.assign(listing, patch, { updatedAt: new Date().toISOString() });
    if (titleChanged && input.title) {
      listing.slug = `${slugify(input.title)}-${Date.now()}`;
    }
    listing.qualityScore = calculateExistingQuality(listing);
    return listing;
  }

  async updateManualInWorkspace(workspaceId: string, id: string, input: Partial<ManualListingInput>) {
    const listing = await this.findByWorkspaceId(workspaceId, id);
    if (!listing) throw new Error("Listing not found");
    return this.updateManual(listing.id, input);
  }

  async updateStatus(id: string, status: ListingStatus, publication?: PublicationOptions) {
    const listing = listings.find((item) => item.id === id);
    if (!listing) throw new Error("Listing not found");
    const now = new Date().toISOString();
    listing.status = status;
    listing.updatedAt = now;
    if (status === "published") {
      const credit = await publication?.consumeCredit?.(listing.id);
      listing.publishedAt = listing.publishedAt ?? now;
      listing.expiresAt = addDaysIso(publication?.visibilityDays ?? 60);
      listing.freshnessStatus = "Updated today";
      if (credit) {
        listing.creditConsumedAt = credit.createdAt;
        listing.creditLedgerEntryId = credit.ledgerEntryId;
      }
    }
    if (status === "sold" || status === "rented" || status === "archived" || status === "unpublished") {
      listing.expiresAt = null;
    }
    return listing;
  }

  async updateStatusInWorkspace(
    workspaceId: string,
    id: string,
    status: ListingStatus,
    publication?: PublicationOptions,
  ) {
    const listing = await this.findByWorkspaceId(workspaceId, id);
    if (!listing) throw new Error("Listing not found");
    return this.updateStatus(listing.id, status, publication);
  }

  async deleteInWorkspace(workspaceId: string, id: string) {
    const index = listings.findIndex((listing) => listing.workspaceId === workspaceId && listing.id === id);
    if (index === -1) throw new Error("Listing not found");
    listings.splice(index, 1);
  }

  async duplicate(id: string, createdBy: string) {
    const listing = listings.find((item) => item.id === id);
    if (!listing) throw new Error("Listing not found");
    const now = new Date().toISOString();
    const duplicate: Listing = {
      ...listing,
      id: `listing_copy_${Date.now()}`,
      title: `${listing.title} Copy`,
      slug: `${listing.slug}-copy-${Date.now()}`,
      status: "draft",
      views: 0,
      leads: 0,
      whatsappClicks: 0,
      callClicks: 0,
      createdBy,
      publishedAt: null,
      expiresAt: null,
      creditConsumedAt: null,
      creditLedgerEntryId: null,
      lastConfirmedAt: null,
      freshnessStatus: "Draft",
      createdAt: now,
      updatedAt: now,
    };
    listings.unshift(duplicate);
    return duplicate;
  }
}

export const demoListingRepository = new DemoListingRepository();

function addDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function manualInputToListingPatch(input: Partial<ManualListingInput>): Partial<Listing> {
  const patch: Partial<Listing> = { ...input } as Partial<Listing>;
  if (input.highlightsText) patch.highlights = input.highlightsText;
  if (input.amenitiesText) patch.amenities = input.amenitiesText;
  delete (patch as { highlightsText?: unknown }).highlightsText;
  delete (patch as { amenitiesText?: unknown }).amenitiesText;
  return patch;
}

function calculateManualQuality(input: ManualListingInput) {
  let score = 45;
  if (input.price > 0) score += 10;
  if (input.descriptionLong.length > 40) score += 15;
  if (input.highlightsText.length >= 2) score += 10;
  if (input.amenitiesText.length >= 2) score += 5;
  if (input.carpetArea || input.openArea || input.plotArea) score += 10;
  if (input.location && input.city) score += 5;
  return Math.min(score, 100);
}

function calculateExistingQuality(listing: Listing) {
  let score = 45;
  if (listing.price > 0) score += 10;
  if (listing.descriptionLong.length > 40) score += 15;
  if (listing.highlights.length >= 2) score += 10;
  if (listing.amenities.length >= 2) score += 5;
  if (listing.carpetArea || listing.openArea || listing.plotArea) score += 10;
  if (listing.location && listing.city) score += 5;
  return Math.min(score, 100);
}
