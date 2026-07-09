import { billingService } from "@/lib/billing/billing-service";
import { creditWalletService } from "@/lib/billing/credit-wallet-service";
import type { ListingStatus } from "@/types/domain";
import type { ListingExtraction, ManualListingInput } from "./listing.schema";
import { firestoreListingRepository } from "./repositories/firestore-listing-repository";
import type { ListingRepository, PublicationOptions } from "./repositories/listing-repository";

type BillingPublicationService = Pick<typeof billingService, "findWorkspacePlan">;
type CreditWalletPublicationService = Pick<
  typeof creditWalletService,
  "consumeForListing" | "assertCanReactivate"
>;

interface ListingServiceDependencies {
  billingService: BillingPublicationService;
  creditWalletService: CreditWalletPublicationService;
}

export class ListingService {
  private readonly dependencies: ListingServiceDependencies;

  constructor(
    private readonly repository: ListingRepository = firestoreListingRepository,
    dependencies: Partial<ListingServiceDependencies> = {},
  ) {
    this.dependencies = {
      billingService: dependencies.billingService ?? billingService,
      creditWalletService: dependencies.creditWalletService ?? creditWalletService,
    };
  }

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

  async createFromExtraction(workspaceId: string, extraction: ListingExtraction) {
    return this.repository.createFromExtraction(
      workspaceId,
      extraction,
      await this.publicationOptionsForNewListing(workspaceId),
    );
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

  async updateStatus(id: string, status: ListingStatus) {
    const listing = status === "published" ? await this.repository.findById(id) : null;
    if (status === "published" && !listing) throw new Error("Listing not found");
    return this.repository.updateStatus(
      id,
      status,
      listing ? await this.publicationOptionsForExistingListing(listing) : undefined,
    );
  }

  async updateStatusInWorkspace(workspaceId: string, id: string, status: ListingStatus) {
    const listing =
      status === "published" ? await this.repository.findByWorkspaceId(workspaceId, id) : null;
    if (status === "published" && !listing) throw new Error("Listing not found");
    return this.repository.updateStatusInWorkspace(
      workspaceId,
      id,
      status,
      listing ? await this.publicationOptionsForExistingListing(listing) : undefined,
    );
  }

  deleteInWorkspace(workspaceId: string, id: string) {
    return this.repository.deleteInWorkspace(workspaceId, id);
  }

  duplicate(id: string, createdBy: string) {
    return this.repository.duplicate(id, createdBy);
  }

  private async publicationOptionsForNewListing(workspaceId: string): Promise<PublicationOptions> {
    const plan = await this.dependencies.billingService.findWorkspacePlan(workspaceId);
    return {
      visibilityDays: plan.listingVisibilityDays,
      consumeCredit: (listingId) =>
        this.dependencies.creditWalletService.consumeForListing({ workspaceId, listingId }),
    };
  }

  private async publicationOptionsForExistingListing(
    listing: Awaited<ReturnType<ListingRepository["findById"]>>,
  ): Promise<PublicationOptions | undefined> {
    if (!listing || listing.status === "published") return undefined;
    const plan = await this.dependencies.billingService.findWorkspacePlan(listing.workspaceId);
    if (listing.creditLedgerEntryId || listing.creditConsumedAt) {
      await this.dependencies.creditWalletService.assertCanReactivate(listing.workspaceId);
      return { visibilityDays: plan.listingVisibilityDays };
    }
    return {
      visibilityDays: plan.listingVisibilityDays,
      consumeCredit: (listingId) =>
        this.dependencies.creditWalletService.consumeForListing({
          workspaceId: listing.workspaceId,
          listingId,
        }),
    };
  }
}

export const listingService = new ListingService();
