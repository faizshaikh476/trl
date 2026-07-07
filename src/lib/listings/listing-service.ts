import type { ListingStatus } from "@/types/domain";
import type { ListingExtraction, ManualListingInput } from "./listing.schema";
import { firestoreListingRepository } from "./repositories/firestore-listing-repository";
import type { ListingRepository } from "./repositories/listing-repository";

export class ListingService {
  constructor(private readonly repository: ListingRepository = firestoreListingRepository) {}

  listAll() {
    return this.repository.listAll();
  }

  listByWorkspace(workspaceId: string) {
    return this.repository.listByWorkspace(workspaceId);
  }

  listPublished() {
    return this.repository.listPublished();
  }

  findBySlug(slug: string) {
    return this.repository.findPublishedBySlug(slug);
  }

  findShareableBySlug(slug: string) {
    return this.repository.findShareableBySlug(slug);
  }

  findAnyById(id: string) {
    return this.repository.findById(id);
  }

  findByWorkspaceId(workspaceId: string, id: string) {
    return this.repository.findByWorkspaceId(workspaceId, id);
  }

  createFromExtraction(workspaceId: string, extraction: ListingExtraction) {
    return this.repository.createFromExtraction(workspaceId, extraction);
  }

  createManual(workspaceId: string, createdBy: string, input: ManualListingInput) {
    return this.repository.createManual(workspaceId, createdBy, input);
  }

  updateManual(id: string, input: Partial<ManualListingInput>) {
    return this.repository.updateManual(id, input);
  }

  updateManualInWorkspace(workspaceId: string, id: string, input: Partial<ManualListingInput>) {
    return this.repository.updateManualInWorkspace(workspaceId, id, input);
  }

  updateStatus(id: string, status: ListingStatus) {
    return this.repository.updateStatus(id, status);
  }

  updateStatusInWorkspace(workspaceId: string, id: string, status: ListingStatus) {
    return this.repository.updateStatusInWorkspace(workspaceId, id, status);
  }

  deleteInWorkspace(workspaceId: string, id: string) {
    return this.repository.deleteInWorkspace(workspaceId, id);
  }

  duplicate(id: string, createdBy: string) {
    return this.repository.duplicate(id, createdBy);
  }
}

export const listingService = new ListingService();
