export type CustomerClassification = "customer" | "prospect";

export type CustomerJourneyStage =
  | "new_chat"
  | "listing_started"
  | "ready_to_publish"
  | "payment_pending"
  | "payment_failed"
  | "customer"
  | "needs_attention";

export type WalletState = "never_funded" | "expired" | "empty" | "active";

export type CustomerPaymentState = "none" | "pending" | "paid" | "failed" | "refunded";

export type CustomerEventType =
  | "first_contact"
  | "message_received"
  | "message_sent"
  | "media_received"
  | "media_sent"
  | "intake_started"
  | "intake_completed"
  | "listing_saved"
  | "listing_published"
  | "listing_archived"
  | "purchase_created"
  | "purchase_paid"
  | "purchase_failed"
  | "purchase_refunded"
  | "wallet_funded"
  | "wallet_consumed"
  | "wallet_expired"
  | "account_claimed"
  | "plan_changed"
  | "credits_granted"
  | "follow_up_changed"
  | "management_changed"
  | "conversation_deleted";

export interface ClassificationInput {
  hasWorkspace: boolean;
  hasPaidPurchase: boolean;
  hasAuthenticatedUser: boolean;
}

export interface JourneyInput {
  needsAttention: boolean;
  paymentFailed: boolean;
  paymentPending: boolean;
  hasReadyListing: boolean;
  hasIntake: boolean;
  isCustomer: boolean;
}

export interface WalletSummary {
  state: WalletState;
  effectiveCredits: number;
  label: string;
}

export interface CustomerActivity {
  id: string;
  phone: string;
  displayName: string;
  email: string;
  city: string;
  workspaceId: string;
  authenticatedUserId: string | null;
  classification: CustomerClassification;
  stage: CustomerJourneyStage;
  walletState: WalletState;
  effectiveCredits: number;
  planId: string;
  paymentState: CustomerPaymentState;
  latestPurchaseAt: string | null;
  listingCounts: {
    total: number;
    ready: number;
    published: number;
  };
  searchTokens: string[];
  firstSeenAt: string;
  lastInboundAt: string | null;
  lastOutboundAt: string | null;
  lastActivityAt: string;
  latestActivityLabel: string;
  tags: string[];
  privateNote: string;
  followUpAt: string | null;
  resolution: "open" | "resolved";
  historyRetainedFrom: string;
}

export type CustomerDirectoryTab = "customers" | "prospects" | "all";
export type CustomerDirectorySort =
  | "last_activity_desc"
  | "first_seen_desc"
  | "latest_purchase_desc"
  | "follow_up_asc";

export interface CustomerDirectoryFilters {
  stage?: CustomerJourneyStage;
  planId?: string;
  paymentState?: CustomerPaymentState;
  walletState?: WalletState;
  followUpState?: "due" | "scheduled" | "none" | "resolved";
}

export interface CustomerDirectoryQuery {
  tab: CustomerDirectoryTab;
  sort: CustomerDirectorySort;
  pageSize: number;
  cursor: string | null;
  filters: CustomerDirectoryFilters;
  searchToken: string | null;
}

export interface CustomerDirectoryPage {
  items: CustomerActivity[];
  nextCursor: string | null;
  previousCursor: string | null;
}

export interface CustomerActivityCounts {
  all: number;
  customers: number;
  prospects: number;
  needsAttention: number;
}

export interface CustomerMessage {
  id: string;
  contactId: string;
  workspaceId: string;
  direction: "inbound" | "outbound";
  senderType: "customer" | "automation" | "admin";
  text: string;
  providerMessageId: string | null;
  deliveryStatus: "pending" | "sent" | "delivered" | "read" | "failed";
  failureSummary: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface CustomerEvent {
  id: string;
  contactId: string;
  workspaceId: string;
  type: CustomerEventType;
  label: string;
  sourceId: string | null;
  listingId: string | null;
  occurredAt: string;
}
