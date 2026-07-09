import { getAdminDb } from "@/lib/firebase/admin";
import { firestorePaths } from "@/lib/firebase/paths";
import type { Listing, ListingStatus } from "@/types/domain";
import {
  normalizeListingExtractionTitle,
  slugify,
  type ListingExtraction,
  type ManualListingInput,
} from "../listing.schema";
import type { ListingRepository } from "./listing-repository";

export class FirestoreListingRepository implements ListingRepository {
  async listAll() {
    const snapshot = await getAdminDb().collectionGroup("listings").get();
    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as Listing)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async listByWorkspace(workspaceId: string) {
    const snapshot = await getAdminDb().collection(firestorePaths.workspaceListings(workspaceId)).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Listing);
  }

  async listPublished() {
    const snapshot = await getAdminDb().collection("publicListingIndex").get();
    const listings = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const index = doc.data() as { workspaceId: string; listingId: string };
        const listing = await getAdminDb()
          .doc(firestorePaths.workspaceListing(index.workspaceId, index.listingId))
          .get();
        return listing.exists ? ({ id: listing.id, ...listing.data() } as Listing) : null;
      }),
    );
    return listings.filter((listing): listing is Listing => listing?.status === "published");
  }

  async findPublishedBySlug(slug: string) {
    const index = await getAdminDb().doc(firestorePaths.publicListing(slug)).get();
    if (!index.exists) return null;
    const { workspaceId, listingId } = index.data() as { workspaceId: string; listingId: string };
    const listing = await getAdminDb().doc(firestorePaths.workspaceListing(workspaceId, listingId)).get();
    if (!listing.exists) return null;
    const data = { id: listing.id, ...listing.data() } as Listing;
    return data.status === "published" ? data : null;
  }

  async findShareableBySlug(slug: string) {
    const published = await this.findPublishedBySlug(slug);
    if (published) return published;

    let snapshot;
    try {
      snapshot = await getAdminDb()
        .collectionGroup("listings")
        .where("slug", "==", slug)
        .limit(1)
        .get();
    } catch (error) {
      if (!isMissingFirestoreIndexError(error)) throw error;
      return this.findShareableBySlugWithoutIndex(slug);
    }
    const doc = snapshot.docs[0];
    if (!doc) return null;

    const listing = { id: doc.id, ...doc.data() } as Listing;
    if (listing.status === "archived" || listing.status === "rejected") return null;
    return listing;
  }

  private async findShareableBySlugWithoutIndex(slug: string) {
    const snapshot = await getAdminDb().collectionGroup("listings").get();
    const doc = snapshot.docs.find((item) => item.data().slug === slug);
    if (!doc) return null;

    const listing = { id: doc.id, ...doc.data() } as Listing;
    if (listing.status === "archived" || listing.status === "rejected") return null;
    return listing;
  }

  async findById(id: string) {
    const snapshot = await getAdminDb().collectionGroup("listings").get();
    const doc = snapshot.docs.find((item) => item.id === id);
    return doc ? ({ id: doc.id, ...doc.data() } as Listing) : null;
  }

  async findByWorkspaceId(workspaceId: string, id: string) {
    const doc = await getAdminDb().doc(firestorePaths.workspaceListing(workspaceId, id)).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as Listing) : null;
  }

  async createFromExtraction(workspaceId: string, extraction: ListingExtraction) {
    const now = new Date().toISOString();
    const normalizedExtraction = normalizeListingExtractionTitle(extraction);
    const listingRef = getAdminDb().collection(firestorePaths.workspaceListings(workspaceId)).doc();
    const expiresAt = addDaysIso(normalizedExtraction.transactionType === "rent" ? 30 : 60);
    const listing: Listing = {
      id: listingRef.id,
      workspaceId,
      title: normalizedExtraction.title,
      slug: `${slugify(normalizedExtraction.title)}-${listingRef.id.slice(0, 8)}`,
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
      createdBy: "whatsapp",
      publishedAt: now,
      expiresAt,
      lastConfirmedAt: null,
      freshnessStatus: "Updated today",
      seoTitle: normalizedExtraction.seoTitle,
      seoDescription: normalizedExtraction.seoDescription,
      whatsappShareText: normalizedExtraction.whatsappShareText,
      instagramCaption: normalizedExtraction.instagramCaption,
      createdAt: now,
      updatedAt: now,
    };
    await listingRef.set(listing);
    await getAdminDb().doc(firestorePaths.publicListing(listing.slug)).set({
      workspaceId: listing.workspaceId,
      listingId: listing.id,
      slug: listing.slug,
      updatedAt: now,
    });
    return listing;
  }

  async createManual(workspaceId: string, createdBy: string, input: ManualListingInput) {
    const now = new Date().toISOString();
    const listingRef = getAdminDb().collection(firestorePaths.workspaceListings(workspaceId)).doc();
    const listing: Listing = {
      id: listingRef.id,
      workspaceId,
      title: input.title,
      slug: `${slugify(input.title)}-${listingRef.id.slice(0, 8)}`,
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
    await listingRef.set(listing);
    return listing;
  }

  async updateManual(id: string, input: Partial<ManualListingInput>) {
    const listing = await this.findById(id);
    if (!listing) throw new Error("Listing not found");
    return this.updateManualForListing(listing, input);
  }

  async updateManualInWorkspace(workspaceId: string, id: string, input: Partial<ManualListingInput>) {
    const listing = await this.findByWorkspaceId(workspaceId, id);
    if (!listing) throw new Error("Listing not found");
    return this.updateManualForListing(listing, input);
  }

  private async updateManualForListing(listing: Listing, input: Partial<ManualListingInput>) {
    const patch = manualInputToListingPatch(input);
    if (input.title && input.title !== listing.title) {
      patch.slug = `${slugify(input.title)}-${listing.id.slice(0, 8)}`;
    }
    const next = { ...listing, ...patch, updatedAt: new Date().toISOString() };
    next.qualityScore = calculateExistingQuality(next);
    await getAdminDb().doc(firestorePaths.workspaceListing(listing.workspaceId, listing.id)).update({
      ...patch,
      qualityScore: next.qualityScore,
      updatedAt: next.updatedAt,
    });
    if (listing.status === "published" && next.slug !== listing.slug) {
      await Promise.all([
        getAdminDb().doc(firestorePaths.publicListing(listing.slug)).delete(),
        getAdminDb().doc(firestorePaths.publicListing(next.slug)).set({
          workspaceId: next.workspaceId,
          listingId: next.id,
          slug: next.slug,
          updatedAt: next.updatedAt,
        }),
      ]);
    }
    return next;
  }

  async updateStatus(id: string, status: ListingStatus) {
    const listing = await this.findById(id);
    if (!listing) throw new Error("Listing not found");
    return this.updateStatusForListing(listing, status);
  }

  async updateStatusInWorkspace(workspaceId: string, id: string, status: ListingStatus) {
    const listing = await this.findByWorkspaceId(workspaceId, id);
    if (!listing) throw new Error("Listing not found");
    return this.updateStatusForListing(listing, status);
  }

  private async updateStatusForListing(listing: Listing, status: ListingStatus) {
    const now = new Date().toISOString();
    const patch: Partial<Listing> = {
      status,
      updatedAt: now,
    };
    if (status === "published") {
      patch.publishedAt = listing.publishedAt ?? now;
      patch.expiresAt = addDaysIso(listing.transactionType === "rent" ? 30 : 60);
      patch.freshnessStatus = "Updated today";
    }
    if (status === "sold" || status === "rented" || status === "archived") {
      patch.expiresAt = null;
    }
    await getAdminDb().doc(firestorePaths.workspaceListing(listing.workspaceId, listing.id)).update(patch);
    const updated = { ...listing, ...patch };
    if (status === "published") {
      await getAdminDb().doc(firestorePaths.publicListing(updated.slug)).set({
        workspaceId: updated.workspaceId,
        listingId: updated.id,
        slug: updated.slug,
        updatedAt: now,
      });
    } else {
      await getAdminDb().doc(firestorePaths.publicListing(updated.slug)).delete();
    }
    return updated;
  }

  async deleteInWorkspace(workspaceId: string, id: string) {
    const listing = await this.findByWorkspaceId(workspaceId, id);
    if (!listing) throw new Error("Listing not found");
    await Promise.all([
      getAdminDb().doc(firestorePaths.workspaceListing(workspaceId, id)).delete(),
      getAdminDb().doc(firestorePaths.publicListing(listing.slug)).delete(),
    ]);
  }

  async duplicate(id: string, createdBy: string) {
    const listing = await this.findById(id);
    if (!listing) throw new Error("Listing not found");
    const now = new Date().toISOString();
    const duplicateRef = getAdminDb().collection(firestorePaths.workspaceListings(listing.workspaceId)).doc();
    const duplicate: Listing = {
      ...listing,
      id: duplicateRef.id,
      title: `${listing.title} Copy`,
      slug: `${listing.slug}-copy-${duplicateRef.id.slice(0, 8)}`,
      status: "draft",
      views: 0,
      leads: 0,
      whatsappClicks: 0,
      callClicks: 0,
      createdBy,
      publishedAt: null,
      expiresAt: null,
      lastConfirmedAt: null,
      freshnessStatus: "Draft",
      createdAt: now,
      updatedAt: now,
    };
    await duplicateRef.set(duplicate);
    return duplicate;
  }
}

export const firestoreListingRepository = new FirestoreListingRepository();

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

function isMissingFirestoreIndexError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes("requires a COLLECTION_GROUP_ASC index") ||
    error.message.includes("requires an index")
  );
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
