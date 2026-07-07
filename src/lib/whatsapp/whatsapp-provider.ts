export interface ParsedWhatsAppMessage {
  id?: string;
  workspaceId: string;
  from: string;
  text: string;
  media: Array<{ id: string; url: string; type: "image" | "video" | "document" }>;
}

export interface WhatsAppProvider {
  name: string;
  parseWebhookPayload(payload: unknown): ParsedWhatsAppMessage;
  parseWebhookPayloads?(payload: unknown): ParsedWhatsAppMessage[];
  sendTextMessage(to: string, text: string): Promise<{ id: string; status: "sent" | "mocked" }>;
  sendMediaMessage(to: string, mediaUrl: string, caption?: string): Promise<{ id: string; status: "sent" | "mocked" }>;
  downloadMedia(mediaId: string): Promise<{ url: string; contentType: string }>;
  sendInteractiveButtons(to: string, body: string, buttons: string[]): Promise<{ id: string; status: "sent" | "mocked" }>;
}
