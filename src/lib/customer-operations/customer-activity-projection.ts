import "server-only";

import { creditWalletService } from "@/lib/billing/credit-wallet-service";
import { paymentService } from "@/lib/billing/payment-service";
import { listingService } from "@/lib/listings/listing-service";
import { workspaceService } from "@/lib/workspaces/workspace-service";
import type { CreditPurchase } from "@/types/domain";
import { customerOperationsService } from "./customer-operations-service";
import type { CustomerEventType, CustomerPaymentState } from "./customer-operations.types";
import { contactIdForPhone } from "./customer-state";

interface ProjectorDependencies {
  workspaces: Pick<typeof workspaceService, "findById">;
  wallet: Pick<typeof creditWalletService, "getWallet">;
  listings: Pick<typeof listingService, "listByWorkspace">;
  purchases: Pick<typeof paymentService, "listPurchasesByWorkspace">;
  customerOperations: Pick<
    typeof customerOperationsService,
    "getCustomerDetail" | "recordDomainEvent" | "refreshActivity"
  >;
}

export interface ProjectWorkspaceCustomerInput {
  workspaceId: string;
  authenticatedUserId?: string | null;
  planId?: string;
  paymentState?: CustomerPaymentState;
  needsAttention?: boolean;
  latestActivityLabel?: string;
  event?: {
    type: CustomerEventType;
    label: string;
    idempotencyKey: string;
    sourceId?: string | null;
    listingId?: string | null;
    occurredAt?: string;
  };
}

export class CustomerActivityProjector {
  constructor(
    private readonly dependencies: ProjectorDependencies = {
      workspaces: workspaceService,
      wallet: creditWalletService,
      listings: listingService,
      purchases: paymentService,
      customerOperations: customerOperationsService,
    },
  ) {}

  async project(input: ProjectWorkspaceCustomerInput) {
    const workspace = await this.dependencies.workspaces.findById(input.workspaceId);
    const phone = workspace?.contactPhone?.trim();
    if (!workspace || !phone) return null;

    const contactId = contactIdForPhone(phone);
    const [wallet, listings, purchases, existingDetail] = await Promise.all([
      this.dependencies.wallet.getWallet(input.workspaceId),
      this.dependencies.listings.listByWorkspace(input.workspaceId),
      this.dependencies.purchases.listPurchasesByWorkspace(input.workspaceId, 25),
      this.dependencies.customerOperations.getCustomerDetail(contactId),
    ]);
    const latestPurchase = purchases[0] ?? null;
    const paymentState = input.paymentState ?? paymentStateFor(latestPurchase);
    const listingCounts = {
      total: listings.length,
      ready: listings.filter((listing) => listing.status === "ready_to_publish").length,
      published: listings.filter((listing) => listing.status === "published").length,
    };

    if (input.event) {
      await this.dependencies.customerOperations.recordDomainEvent({
        contactId,
        workspaceId: input.workspaceId,
        type: input.event.type,
        label: input.event.label,
        idempotencyKey: input.event.idempotencyKey,
        sourceId: input.event.sourceId ?? null,
        listingId: input.event.listingId ?? null,
        ...(input.event.occurredAt ? { occurredAt: input.event.occurredAt } : {}),
      });
    }

    const authenticatedUserId =
      input.authenticatedUserId ?? existingDetail?.activity.authenticatedUserId ?? null;
    return this.dependencies.customerOperations.refreshActivity({
      phone,
      workspaceId: input.workspaceId,
      displayName: workspace.contactName || workspace.name,
      email: workspace.contactEmail,
      city: workspace.city,
      hasPaidPurchase: purchases.some((purchase) => Boolean(purchase.paidAt)),
      hasAuthenticatedUser: Boolean(authenticatedUserId),
      hasIntake: listingCounts.total > 0,
      hasReadyListing: listingCounts.ready > 0,
      needsAttention: input.needsAttention ?? paymentState === "failed",
      paymentState,
      planId: input.planId ?? workspace.planId,
      latestPurchaseAt: latestPurchase?.paidAt ?? latestPurchase?.updatedAt ?? null,
      wallet,
      effectiveCredits: wallet?.availableCredits ?? 0,
      listingCounts,
      latestActivityLabel:
        input.latestActivityLabel ?? input.event?.label ?? "Customer activity refreshed",
      searchValues: [workspace.name, workspace.contactName, workspace.contactPhone],
      authenticatedUserId,
    });
  }
}

function paymentStateFor(purchase: CreditPurchase | null): CustomerPaymentState {
  if (!purchase) return "none";
  return purchase.status;
}

export const customerActivityProjector = new CustomerActivityProjector();
