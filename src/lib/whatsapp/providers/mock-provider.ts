import type { ParsedWhatsAppMessage, WhatsAppProvider } from "../whatsapp-provider";

export class MockWhatsAppProvider implements WhatsAppProvider {
  name = "mock";

  parseWebhookPayload(payload: unknown): ParsedWhatsAppMessage {
    const value = payload as Partial<ParsedWhatsAppMessage>;
    return {
      id: value.id,
      workspaceId: value.workspaceId ?? "workspace_rare_address",
      from: value.from ?? "9822052388",
      text: value.text ?? "",
      media: value.media ?? [],
    };
  }

  parseWebhookPayloads(payload: unknown): ParsedWhatsAppMessage[] {
    const value = payload as { messages?: unknown[] };
    if (Array.isArray(value.messages)) return value.messages.map((message) => this.parseWebhookPayload(message));
    return [this.parseWebhookPayload(payload)];
  }

  async sendTextMessage() {
    return { id: `wamock_${Date.now()}`, status: "mocked" as const };
  }

  async sendMediaMessage() {
    return { id: `wamock_media_${Date.now()}`, status: "mocked" as const };
  }

  async downloadMedia(mediaId: string) {
    return { url: `/demo-media/${mediaId}`, contentType: "image/jpeg" };
  }

  async sendInteractiveButtons() {
    return { id: `wamock_buttons_${Date.now()}`, status: "mocked" as const };
  }
}
