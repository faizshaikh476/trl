import { describe, expect, it } from "vitest";
import type { WhatsAppWebhookResult } from "@/lib/whatsapp/whatsapp-service";
import { fanOutDeliveryStatuses, hasWhatsAppOutput, sendWhatsAppResult } from "./route";

describe("WhatsApp webhook outbound retention boundary", () => {
  it("recognizes outbound messages even when the reply field is empty", () => {
    expect(
      hasWhatsAppOutput({
        status: "completed",
        to: "919876543210",
        reply: "",
        outboundMessages: [{ type: "text", text: "Listing ready" }],
      }),
    ).toBe(true);
  });

  it("routes text and media replies through the retained sender", async () => {
    const sent: unknown[] = [];
    const sender = {
      async sendText(input: unknown) {
        sent.push(input);
      },
      async sendMedia(input: unknown) {
        sent.push(input);
      },
    };
    const result: WhatsAppWebhookResult = {
      status: "completed",
      to: "919876543210",
      reply: "",
      outboundMessages: [
        { type: "text", text: "Your listing is ready" },
        {
          type: "media",
          mediaUrl: "https://example.com/listing.jpg",
          caption: "Front view",
        },
      ],
    };

    await sendWhatsAppResult(sender, "workspace_1", result);

    expect(sent).toEqual([
      {
        phone: "919876543210",
        workspaceId: "workspace_1",
        text: "Your listing is ready",
        senderType: "automation",
      },
      {
        phone: "919876543210",
        workspaceId: "workspace_1",
        mediaUrl: "https://example.com/listing.jpg",
        caption: "Front view",
        mediaType: "image",
        senderType: "automation",
      },
    ]);
  });

  it("updates both OTP audit and retained conversation delivery state", async () => {
    const updates: string[] = [];
    const statuses = [
      {
        messageId: "wamid.failed.1",
        status: "failed" as const,
        occurredAt: "2026-08-13T10:00:00.000Z",
        error: { code: 131026, title: "Message undeliverable" },
      },
    ];

    await fanOutDeliveryStatuses(
      statuses,
      { async recordDeliveryStatuses() { updates.push("otp"); } },
      {
        async updateDeliveryByProviderMessageId(_id, status, failure) {
          updates.push(`${status}:${failure}`);
          return 1;
        },
      },
    );

    expect(updates).toEqual(["otp", "failed:Message undeliverable"]);
  });
});
