import { describe, expect, it } from "vitest";
import type { CustomerMessage } from "@/lib/customer-operations/customer-operations.types";
import type { WhatsAppProvider } from "./whatsapp-provider";
import { WhatsAppMessageSender } from "./whatsapp-message-sender";

describe("WhatsAppMessageSender", () => {
  it("persists an outbound intent before sending text", async () => {
    const fixture = senderFixture();
    await fixture.sender.sendText({
      phone: "919876543210",
      workspaceId: "workspace_1",
      text: "Welcome",
      senderType: "automation",
    });

    expect(fixture.calls).toEqual(["intent", "provider-text", "sent"]);
    expect(fixture.message).toMatchObject({
      text: "Welcome",
      deliveryStatus: "sent",
      providerMessageId: "wamid.outbound.1",
    });
  });

  it("marks the retained text failed when the provider rejects it", async () => {
    const fixture = senderFixture({ failText: true });

    await expect(
      fixture.sender.sendText({
        phone: "919876543210",
        workspaceId: "workspace_1",
        text: "Welcome",
        senderType: "automation",
      }),
    ).rejects.toThrow("Provider unavailable");

    expect(fixture.calls).toEqual(["intent", "provider-text", "failed"]);
    expect(fixture.message).toMatchObject({
      deliveryStatus: "failed",
      failureSummary: "Provider unavailable",
    });
  });

  it("sends media without passing media fields into chat persistence", async () => {
    const fixture = senderFixture();
    await fixture.sender.sendMedia({
      phone: "919876543210",
      workspaceId: "workspace_1",
      mediaUrl: "https://example.com/private.jpg",
      caption: "Front view",
      mediaType: "image",
      senderType: "automation",
    });

    expect(fixture.providerMediaUrl).toBe("https://example.com/private.jpg");
    expect(fixture.message?.text).toBe("Front view");
    expect(JSON.stringify(fixture.persistedInputs)).not.toMatch(/mediaUrl|providerMediaId|private\.jpg/);
    expect(fixture.events).toEqual([
      expect.objectContaining({ type: "media_sent", label: "Image sent on WhatsApp" }),
    ]);
  });
});

function senderFixture({ failText = false }: { failText?: boolean } = {}) {
  const calls: string[] = [];
  const persistedInputs: unknown[] = [];
  const events: unknown[] = [];
  let message: CustomerMessage | null = null;
  let providerMediaUrl = "";
  const customerOperations = {
    async createOutboundIntent(input: {
      phone: string;
      workspaceId: string;
      text: string;
      senderType: "automation" | "admin";
    }) {
      calls.push("intent");
      persistedInputs.push(input);
      message = {
        id: "outbound_1",
        contactId: "contact_919876543210",
        workspaceId: input.workspaceId,
        direction: "outbound",
        senderType: input.senderType,
        text: input.text,
        providerMessageId: null,
        deliveryStatus: "pending",
        failureSummary: null,
        createdAt: "2026-08-13T10:00:00.000Z",
        expiresAt: "2027-02-09T10:00:00.000Z",
      };
      return message;
    },
    async markOutboundSent(_contactId: string, _messageId: string, providerMessageId: string) {
      calls.push("sent");
      message = { ...message!, providerMessageId, deliveryStatus: "sent", failureSummary: null };
      return message;
    },
    async markOutboundFailed(_contactId: string, _messageId: string, failureSummary: string) {
      calls.push("failed");
      message = { ...message!, deliveryStatus: "failed", failureSummary };
      return message;
    },
    async recordDomainEvent(input: unknown) {
      events.push(input);
      return input;
    },
  };
  const provider = {
    name: "test",
    async sendTextMessage() {
      calls.push("provider-text");
      if (failText) throw new Error("Provider unavailable");
      return { id: "wamid.outbound.1", status: "sent" as const };
    },
    async sendMediaMessage(_to: string, mediaUrl: string) {
      providerMediaUrl = mediaUrl;
      return { id: "wamid.media.1", status: "sent" as const };
    },
  } as WhatsAppProvider;

  return {
    calls,
    persistedInputs,
    events,
    customerOperations,
    provider,
    sender: new WhatsAppMessageSender({ customerOperations, provider }),
    get message() {
      return message;
    },
    get providerMediaUrl() {
      return providerMediaUrl;
    },
  };
}
