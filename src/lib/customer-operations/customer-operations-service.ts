import "server-only";

import { randomUUID } from "node:crypto";
import { normalizePhoneNumber } from "@/lib/owners/owner-profile-service";
import type { CreditWallet } from "@/types/domain";
import type { CustomerOperationsRepository } from "./customer-operations-repository";
import type {
  CustomerActivity,
  CustomerDirectoryQuery,
  CustomerEvent,
  CustomerEventType,
  CustomerMessage,
  CustomerPaymentState,
} from "./customer-operations.types";
import { firestoreCustomerOperationsRepository } from "./firestore-customer-operations-repository";
import {
  buildSearchTokens,
  classifyContact,
  contactIdForPhone,
  deriveJourneyStage,
  deriveWalletState,
  messageExpiresAt,
} from "./customer-state";

export interface RecordInboundInput {
  phone: string;
  workspaceId: string;
  providerMessageId: string | null;
  text: string;
  receivedAt?: string;
}

export interface CreateOutboundIntentInput {
  phone: string;
  workspaceId: string;
  text: string;
  senderType: "automation" | "admin";
  createdAt?: string;
}

export interface RefreshActivityInput {
  phone: string;
  workspaceId: string;
  displayName: string;
  email: string;
  city: string;
  hasPaidPurchase: boolean;
  hasAuthenticatedUser: boolean;
  hasIntake: boolean;
  hasReadyListing: boolean;
  needsAttention: boolean;
  paymentState: CustomerPaymentState;
  planId: string;
  latestPurchaseAt: string | null;
  wallet: CreditWallet | null;
  effectiveCredits: number;
  listingCounts: CustomerActivity["listingCounts"];
  latestActivityLabel: string;
  occurredAt?: string;
  searchValues?: Array<string | null | undefined>;
  authenticatedUserId?: string | null;
}

export interface ManagementInput {
  privateNote: string;
  tags: string[];
  followUpAt: string | null;
  resolution: "open" | "resolved";
  actorId: string;
}

export interface CustomerDetail {
  activity: CustomerActivity;
  messages: CustomerMessage[];
  events: CustomerEvent[];
}

export class CustomerOperationsService {
  constructor(
    private readonly repository: CustomerOperationsRepository = firestoreCustomerOperationsRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async recordInbound(input: RecordInboundInput) {
    const text = input.text.trim();
    if (!text) throw new Error("Inbound message text is required.");
    const createdAt = validTimestampOrNow(input.receivedAt, this.now());
    const contactId = contactIdForPhone(input.phone);
    const existingActivity = await this.repository.getActivity(contactId);
    const id = input.providerMessageId || `inbound_${randomUUID()}`;
    const message = await this.repository.saveMessage({
      id,
      contactId,
      workspaceId: input.workspaceId,
      direction: "inbound",
      senderType: "customer",
      text,
      providerMessageId: input.providerMessageId,
      deliveryStatus: "delivered",
      failureSummary: null,
      createdAt,
      expiresAt: messageExpiresAt(new Date(createdAt)),
    });

    const activity = existingActivity ?? defaultActivity(contactId, input.phone, input.workspaceId, createdAt);
    await this.repository.upsertActivity(contactId, {
      ...activity,
      workspaceId: input.workspaceId,
      lastInboundAt: createdAt,
      lastActivityAt: createdAt,
      latestActivityLabel: "Customer message received",
      searchTokens: buildSearchTokens([
        activity.displayName,
        activity.email,
        input.phone,
        input.workspaceId,
      ]),
    });

    if (!existingActivity) {
      await this.recordDomainEvent({
        contactId,
        workspaceId: input.workspaceId,
        type: "first_contact",
        label: "First WhatsApp contact received",
        idempotencyKey: `first:${contactId}`,
        occurredAt: createdAt,
      });
    }
    await this.recordDomainEvent({
      contactId,
      workspaceId: input.workspaceId,
      type: "message_received",
      label: "Customer message received",
      idempotencyKey: id,
      occurredAt: createdAt,
    });
    return message;
  }

  async createOutboundIntent(input: CreateOutboundIntentInput) {
    const text = input.text.trim();
    if (!text) throw new Error("Outbound message text is required.");
    const createdAt = validTimestampOrNow(input.createdAt, this.now());
    const contactId = contactIdForPhone(input.phone);
    const id = `outbound_${randomUUID()}`;
    const existingActivity = await this.repository.getActivity(contactId);
    if (!existingActivity) {
      await this.repository.upsertActivity(
        contactId,
        defaultActivity(contactId, input.phone, input.workspaceId, createdAt),
      );
    }
    return this.repository.saveMessage({
      id,
      contactId,
      workspaceId: input.workspaceId,
      direction: "outbound",
      senderType: input.senderType,
      text,
      providerMessageId: null,
      deliveryStatus: "pending",
      failureSummary: null,
      createdAt,
      expiresAt: messageExpiresAt(new Date(createdAt)),
    });
  }

  async markOutboundSent(contactId: string, messageId: string, providerMessageId: string) {
    const message = await this.repository.updateMessage(contactId, messageId, {
      providerMessageId,
      deliveryStatus: "sent",
      failureSummary: null,
    });
    await this.repository.upsertActivity(contactId, {
      lastOutboundAt: message.createdAt,
      lastActivityAt: message.createdAt,
      latestActivityLabel: "WhatsApp message sent",
    });
    await this.recordDomainEvent({
      contactId,
      workspaceId: message.workspaceId,
      type: "message_sent",
      label: "WhatsApp message sent",
      idempotencyKey: message.id,
      occurredAt: message.createdAt,
    });
    return message;
  }

  markOutboundFailed(contactId: string, messageId: string, failureSummary: string) {
    return this.repository.updateMessage(contactId, messageId, {
      deliveryStatus: "failed",
      failureSummary: failureSummary.trim().slice(0, 300) || "WhatsApp send failed",
    });
  }

  async retryOutbound(contactId: string, messageId: string) {
    const message = await this.repository.getMessage(contactId, messageId);
    if (!message || message.direction !== "outbound" || message.deliveryStatus !== "failed") {
      throw new Error("Only a failed outbound message can be retried.");
    }
    return this.repository.updateMessage(contactId, messageId, {
      providerMessageId: null,
      deliveryStatus: "pending",
      failureSummary: null,
    });
  }

  updateDeliveryByProviderMessageId(
    providerMessageId: string,
    deliveryStatus: "sent" | "delivered" | "read" | "failed",
    failureSummary: string | null,
  ) {
    return this.repository.updateMessageDelivery(providerMessageId, {
      deliveryStatus,
      failureSummary,
    });
  }

  async recordMediaReceived(input: {
    phone: string;
    workspaceId: string;
    counts: { image: number; video: number; document: number };
    occurredAt?: string;
  }) {
    const occurredAt = validTimestampOrNow(input.occurredAt, this.now());
    const contactId = contactIdForPhone(input.phone);
    const existing = await this.repository.getActivity(contactId);
    if (!existing) {
      await this.repository.upsertActivity(
        contactId,
        defaultActivity(contactId, input.phone, input.workspaceId, occurredAt),
      );
    }
    const label = mediaReceivedLabel(input.counts);
    await this.repository.upsertActivity(contactId, {
      lastActivityAt: occurredAt,
      latestActivityLabel: label,
    });
    return this.recordDomainEvent({
      contactId,
      workspaceId: input.workspaceId,
      type: "media_received",
      label,
      idempotencyKey: `media:${occurredAt}:${label}`,
      occurredAt,
    });
  }

  recordDomainEvent(input: {
    contactId: string;
    workspaceId: string;
    type: CustomerEventType;
    label: string;
    idempotencyKey: string;
    sourceId?: string | null;
    listingId?: string | null;
    occurredAt?: string;
  }) {
    const label = input.label.trim();
    if (!label || label.length > 160) throw new Error("Event label must be between 1 and 160 characters.");
    const occurredAt = validTimestampOrNow(input.occurredAt, this.now());
    return this.repository.appendEvent({
      id: `${input.type}:${input.idempotencyKey}`,
      contactId: input.contactId,
      workspaceId: input.workspaceId,
      type: input.type,
      label,
      sourceId: input.sourceId ?? null,
      listingId: input.listingId ?? null,
      occurredAt,
    });
  }

  async refreshActivity(input: RefreshActivityInput) {
    const occurredAt = validTimestampOrNow(input.occurredAt, this.now());
    const contactId = contactIdForPhone(input.phone);
    const existing = await this.repository.getActivity(contactId);
    const classification = classifyContact({
      hasWorkspace: true,
      hasPaidPurchase: input.hasPaidPurchase,
      hasAuthenticatedUser: input.hasAuthenticatedUser,
    });
    const wallet = deriveWalletState(input.wallet, input.effectiveCredits, new Date(occurredAt));
    const stage = deriveJourneyStage({
      needsAttention: input.needsAttention,
      paymentFailed: input.paymentState === "failed",
      paymentPending: input.paymentState === "pending",
      hasReadyListing: input.hasReadyListing,
      hasIntake: input.hasIntake,
      isCustomer: classification === "customer",
    });
    const baseline = existing ?? defaultActivity(contactId, input.phone, input.workspaceId, occurredAt);
    return this.repository.upsertActivity(contactId, {
      ...baseline,
      phone: normalizePhoneNumber(input.phone),
      displayName: input.displayName.trim() || baseline.displayName,
      email: input.email.trim().toLowerCase(),
      city: input.city.trim(),
      workspaceId: input.workspaceId,
      authenticatedUserId: input.authenticatedUserId ?? baseline.authenticatedUserId,
      classification,
      stage,
      walletState: wallet.state,
      effectiveCredits: wallet.effectiveCredits,
      planId: input.planId,
      paymentState: input.paymentState,
      latestPurchaseAt: input.latestPurchaseAt,
      listingCounts: input.listingCounts,
      lastActivityAt: occurredAt,
      latestActivityLabel: input.latestActivityLabel,
      searchTokens: buildSearchTokens([
        input.displayName,
        input.email,
        input.phone,
        input.workspaceId,
        input.planId,
        ...(input.searchValues ?? []),
      ]),
    });
  }

  async updateManagement(contactId: string, input: ManagementInput) {
    const activity = await this.repository.getActivity(contactId);
    if (!activity) throw new Error("Customer activity not found.");
    const privateNote = input.privateNote.trim();
    if (privateNote.length > 2000) throw new Error("Private note must be 2,000 characters or fewer.");
    const tags = [...new Set(input.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 12);
    const followUpAt = input.followUpAt?.trim() || null;
    if (followUpAt && !Number.isFinite(Date.parse(followUpAt))) {
      throw new Error("Follow-up date is invalid.");
    }
    const occurredAt = this.now().toISOString();
    const updated = await this.repository.upsertActivity(contactId, {
      privateNote,
      tags,
      followUpAt,
      resolution: input.resolution,
      lastActivityAt: occurredAt,
      latestActivityLabel: "Customer management updated",
    });
    await this.recordDomainEvent({
      contactId,
      workspaceId: activity.workspaceId,
      type: "management_changed",
      label: "Customer management updated",
      idempotencyKey: `${input.actorId}:${occurredAt}`,
      sourceId: input.actorId,
      occurredAt,
    });
    return updated;
  }

  async deleteConversation(contactId: string, actorId: string) {
    const activity = await this.repository.getActivity(contactId);
    if (!activity) throw new Error("Customer activity not found.");
    const deleted = await this.repository.deleteMessages(contactId);
    const occurredAt = this.now().toISOString();
    await this.recordDomainEvent({
      contactId,
      workspaceId: activity.workspaceId,
      type: "conversation_deleted",
      label: "Conversation history deleted by admin",
      idempotencyKey: `${actorId}:${occurredAt}`,
      sourceId: actorId,
      occurredAt,
    });
    return deleted;
  }

  queryActivities(query: CustomerDirectoryQuery) {
    return this.repository.queryActivities(query);
  }

  countActivities() {
    return this.repository.countActivities();
  }

  async getCustomerDetail(contactId: string): Promise<CustomerDetail | null> {
    const activity = await this.repository.getActivity(contactId);
    if (!activity) return null;
    const [messages, events] = await Promise.all([
      this.repository.listMessages(contactId),
      this.repository.listEvents(contactId),
    ]);
    return { activity, messages, events };
  }
}

function defaultActivity(
  contactId: string,
  phone: string,
  workspaceId: string,
  occurredAt: string,
): CustomerActivity {
  const normalizedPhone = normalizePhoneNumber(phone);
  return {
    id: contactId,
    phone: normalizedPhone,
    displayName: `Broker ${normalizedPhone.slice(-4)}`,
    email: "",
    city: "",
    workspaceId,
    authenticatedUserId: null,
    classification: "prospect",
    stage: "new_chat",
    walletState: "never_funded",
    effectiveCredits: 0,
    planId: "free",
    paymentState: "none",
    latestPurchaseAt: null,
    listingCounts: { total: 0, ready: 0, published: 0 },
    searchTokens: buildSearchTokens([phone, workspaceId]),
    firstSeenAt: occurredAt,
    lastInboundAt: null,
    lastOutboundAt: null,
    lastActivityAt: occurredAt,
    latestActivityLabel: "First contact received",
    tags: [],
    privateNote: "",
    followUpAt: null,
    resolution: "open",
    historyRetainedFrom: occurredAt,
  };
}

function mediaReceivedLabel(counts: { image: number; video: number; document: number }) {
  const parts = [
    countLabel(counts.image, "image"),
    countLabel(counts.video, "video"),
    countLabel(counts.document, "document"),
  ].filter(Boolean);
  return `${parts.join(parts.length > 1 ? " and " : "")} received`;
}

function countLabel(count: number, noun: string) {
  return count > 0 ? `${count} ${noun}${count === 1 ? "" : "s"}` : "";
}

function validTimestampOrNow(value: string | undefined, now: Date) {
  if (!value) return now.toISOString();
  if (!Number.isFinite(Date.parse(value))) throw new Error("Timestamp is invalid.");
  return new Date(value).toISOString();
}

export const customerOperationsService = new CustomerOperationsService();
