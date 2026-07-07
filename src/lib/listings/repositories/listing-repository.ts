import type { Listing, ListingStatus } from "@/types/domain";
import type { ListingExtraction, ManualListingInput } from "../listing.schema";

export interface ListingRepository {
  listAll(): Promise<Listing[]>;
  listByWorkspace(workspaceId: string): Promise<Listing[]>;
  listPublished(): Promise<Listing[]>;
  findPublishedBySlug(slug: string): Promise<Listing | null>;
  findShareableBySlug(slug: string): Promise<Listing | null>;
  findById(id: string): Promise<Listing | null>;
  findByWorkspaceId(workspaceId: string, id: string): Promise<Listing | null>;
  createFromExtraction(workspaceId: string, extraction: ListingExtraction): Promise<Listing>;
  createManual(workspaceId: string, createdBy: string, input: ManualListingInput): Promise<Listing>;
  updateManual(id: string, input: Partial<ManualListingInput>): Promise<Listing>;
  updateManualInWorkspace(
    workspaceId: string,
    id: string,
    input: Partial<ManualListingInput>,
  ): Promise<Listing>;
  updateStatus(id: string, status: ListingStatus): Promise<Listing>;
  updateStatusInWorkspace(workspaceId: string, id: string, status: ListingStatus): Promise<Listing>;
  deleteInWorkspace(workspaceId: string, id: string): Promise<void>;
  duplicate(id: string, createdBy: string): Promise<Listing>;
}
