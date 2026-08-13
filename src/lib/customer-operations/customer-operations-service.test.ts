import { describe, expect, it } from "vitest";
import type { CreditWallet } from "@/types/domain";
import type { CustomerOperationsRepository } from "./customer-operations-repository";
import type {
  CustomerActivity,
  CustomerActivityCounts,
  CustomerDirectoryPage,
  CustomerEvent,
  CustomerMessage,
} from "./customer-operations.types";
import { CustomerOperationsService } from "./customer-operations-service";

const NOW = "2026-08-13T10:00:00.000Z";

describe("CustomerOperationsService", () => {
  it("retains inbound text with expiry and body-free activity events", async () => {
    const repository = new MemoryCustomerOperationsRepository();
    const service = new CustomerOperationsService(repository, () => new Date(NOW));

    await service.recordInbound({
      phone: "+91 98765 43210",
      workspaceId: "workspace_1",
      providerMessageId: "wamid.inbound.1",
      text: "Payment is not going through",
      receivedAt: NOW,
    });

    const detail = await service.getCustomerDetail("contact_919876543210");
    expect(detail?.messages).toEqual([
      expect.objectContaining({
        text: "Payment is not going through",
        direction: "inbound",
        senderType: "customer",
        expiresAt: "2027-02-09T10:00:00.000Z",
      }),
    ]);
    expect(detail?.activity).toMatchObject({
      classification: "prospect",
      stage: "new_chat",
      lastInboundAt: NOW,
      lastActivityAt: NOW,
    });
    expect(detail?.events.map((event) => event.label)).toEqual([
      "First WhatsApp contact received",
      "Customer message received",
    ]);
    expect(JSON.stringify(detail?.events)).not.toContain("Payment is not going through");
  });

  it("records media counts without creating a message or retaining media data", async () => {
    const repository = new MemoryCustomerOperationsRepository();
    const service = new CustomerOperationsService(repository, () => new Date(NOW));

    await service.recordMediaReceived({
      phone: "919876543210",
      workspaceId: "workspace_1",
      counts: { image: 3, video: 1, document: 0 },
      occurredAt: NOW,
    });

    const detail = await service.getCustomerDetail("contact_919876543210");
    expect(detail?.messages).toEqual([]);
    expect(detail?.events).toEqual([
      expect.objectContaining({ type: "media_received", label: "3 images and 1 video received" }),
    ]);
    expect(JSON.stringify(detail)).not.toMatch(/mediaUrl|providerMediaId|media_secret/);
  });

  it("updates the same outbound record through sent, failed, and retry states", async () => {
    const repository = new MemoryCustomerOperationsRepository();
    const service = new CustomerOperationsService(repository, () => new Date(NOW));
    const intent = await service.createOutboundIntent({
      phone: "919876543210",
      workspaceId: "workspace_1",
      text: "Can I help?",
      senderType: "admin",
    });

    await service.markOutboundSent(intent.contactId, intent.id, "wamid.outbound.1");
    await service.markOutboundFailed(intent.contactId, intent.id, "Temporary provider failure");
    const retry = await service.retryOutbound(intent.contactId, intent.id);

    const detail = await service.getCustomerDetail(intent.contactId);
    expect(detail?.messages).toHaveLength(1);
    expect(retry).toMatchObject({
      id: intent.id,
      providerMessageId: null,
      deliveryStatus: "pending",
      failureSummary: null,
    });
  });

  it("derives customer stage and expired wallet state from authoritative facts", async () => {
    const repository = new MemoryCustomerOperationsRepository();
    const service = new CustomerOperationsService(repository, () => new Date(NOW));

    const activity = await service.refreshActivity({
      phone: "919876543210",
      workspaceId: "workspace_1",
      displayName: "Monesh Kumar",
      email: "monesh@example.com",
      city: "Pune",
      hasPaidPurchase: true,
      hasAuthenticatedUser: false,
      hasIntake: true,
      hasReadyListing: true,
      needsAttention: false,
      paymentState: "paid",
      planId: "growth",
      latestPurchaseAt: NOW,
      wallet: wallet({ availableCredits: 14, validUntil: "2026-08-12T23:59:59.999Z" }),
      effectiveCredits: 0,
      listingCounts: { total: 1, ready: 1, published: 0 },
      latestActivityLabel: "Starter package purchased",
      occurredAt: NOW,
      searchValues: ["purchase_1", "order_1", "payment_1"],
    });

    expect(activity).toMatchObject({
      classification: "customer",
      stage: "ready_to_publish",
      walletState: "expired",
      effectiveCredits: 0,
      paymentState: "paid",
      planId: "growth",
    });
    expect(activity.searchTokens).toContain("monesh");
    expect(activity.searchTokens).toContain("purchase_1");
  });

  it("validates management data and records no private note body in events", async () => {
    const repository = new MemoryCustomerOperationsRepository();
    const service = new CustomerOperationsService(repository, () => new Date(NOW));
    await service.recordInbound({
      phone: "919876543210",
      workspaceId: "workspace_1",
      providerMessageId: "wamid.1",
      text: "Hello",
      receivedAt: NOW,
    });

    await expect(
      service.updateManagement("contact_919876543210", {
        privateNote: "x".repeat(2001),
        tags: [],
        followUpAt: null,
        resolution: "open",
        actorId: "admin_1",
      }),
    ).rejects.toThrow("Private note must be 2,000 characters or fewer");

    await service.updateManagement("contact_919876543210", {
      privateNote: "Customer asked for a callback",
      tags: [" payment ", "payment", "priority"],
      followUpAt: "2026-08-14T10:00:00.000Z",
      resolution: "open",
      actorId: "admin_1",
    });

    const detail = await service.getCustomerDetail("contact_919876543210");
    expect(detail?.activity).toMatchObject({
      privateNote: "Customer asked for a callback",
      tags: ["payment", "priority"],
      followUpAt: "2026-08-14T10:00:00.000Z",
    });
    expect(JSON.stringify(detail?.events)).not.toContain("Customer asked for a callback");
  });

  it("deletes retained messages immediately but preserves an operational event", async () => {
    const repository = new MemoryCustomerOperationsRepository();
    const service = new CustomerOperationsService(repository, () => new Date(NOW));
    await service.recordInbound({
      phone: "919876543210",
      workspaceId: "workspace_1",
      providerMessageId: "wamid.1",
      text: "Please delete this chat",
      receivedAt: NOW,
    });

    expect(await service.deleteConversation("contact_919876543210", "admin_1")).toBe(1);
    const detail = await service.getCustomerDetail("contact_919876543210");
    expect(detail?.messages).toEqual([]);
    expect(detail?.events.at(-1)).toMatchObject({
      type: "conversation_deleted",
      label: "Conversation history deleted by admin",
    });
  });
});

class MemoryCustomerOperationsRepository implements CustomerOperationsRepository {
  private readonly activities = new Map<string, CustomerActivity>();
  private readonly messages = new Map<string, CustomerMessage>();
  private readonly events = new Map<string, CustomerEvent>();

  async getActivity(contactId: string) {
    return this.activities.get(contactId) ?? null;
  }

  async upsertActivity(contactId: string, patch: Partial<CustomerActivity>) {
    const existing = this.activities.get(contactId);
    const next = { ...existing, ...patch, id: contactId } as CustomerActivity;
    this.activities.set(contactId, next);
    return next;
  }

  async queryActivities(): Promise<CustomerDirectoryPage> {
    return { items: [...this.activities.values()], nextCursor: null, previousCursor: null };
  }

  async countActivities(): Promise<CustomerActivityCounts> {
    const values = [...this.activities.values()];
    return {
      all: values.length,
      customers: values.filter((item) => item.classification === "customer").length,
      prospects: values.filter((item) => item.classification === "prospect").length,
      needsAttention: values.filter((item) => item.stage === "needs_attention").length,
    };
  }

  async saveMessage(message: CustomerMessage) {
    const key = `${message.contactId}:${message.id}`;
    const existing = this.messages.get(key);
    if (existing) return existing;
    this.messages.set(key, message);
    return message;
  }

  async getMessage(contactId: string, messageId: string) {
    return this.messages.get(`${contactId}:${messageId}`) ?? null;
  }

  async updateMessage(contactId: string, messageId: string, patch: Partial<CustomerMessage>) {
    const key = `${contactId}:${messageId}`;
    const existing = this.messages.get(key);
    if (!existing) throw new Error("Message not found.");
    const next = { ...existing, ...patch };
    this.messages.set(key, next);
    return next;
  }

  async updateMessageDelivery(
    providerMessageId: string,
    patch: Pick<CustomerMessage, "deliveryStatus" | "failureSummary">,
  ) {
    let updated = 0;
    for (const [key, message] of this.messages) {
      if (message.providerMessageId !== providerMessageId) continue;
      this.messages.set(key, { ...message, ...patch });
      updated += 1;
    }
    return updated;
  }

  async listMessages(contactId: string) {
    return [...this.messages.values()]
      .filter((message) => message.contactId === contactId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  async deleteMessages(contactId: string) {
    let deleted = 0;
    for (const [key, message] of this.messages) {
      if (message.contactId !== contactId) continue;
      this.messages.delete(key);
      deleted += 1;
    }
    return deleted;
  }

  async appendEvent(event: CustomerEvent) {
    this.events.set(`${event.contactId}:${event.id}`, event);
    return event;
  }

  async listEvents(contactId: string) {
    return [...this.events.values()]
      .filter((event) => event.contactId === contactId)
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
  }
}

function wallet(overrides: Partial<CreditWallet>): CreditWallet {
  return {
    availableCredits: 0,
    validUntil: "2026-08-14T00:00:00.000Z",
    lastPurchaseId: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}
