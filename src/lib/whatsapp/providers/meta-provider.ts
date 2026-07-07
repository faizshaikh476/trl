import { getAdminStorage } from "@/lib/firebase/admin";
import type { ParsedWhatsAppMessage, WhatsAppProvider } from "../whatsapp-provider";

type MetaWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          id: string;
          from: string;
          type: string;
          text?: { body?: string };
          image?: { id: string; caption?: string; mime_type?: string };
          video?: { id: string; caption?: string; mime_type?: string };
          document?: { id: string; caption?: string; filename?: string; mime_type?: string };
        }>;
      };
    }>;
  }>;
};

type MetaSendResponse = {
  messages?: Array<{ id: string }>;
  error?: { message?: string };
};

type MetaMediaMetadata = {
  url?: string;
  mime_type?: string;
  error?: { message?: string };
};

const graphVersion = process.env.WHATSAPP_GRAPH_API_VERSION ?? "v23.0";
const graphBaseUrl = `https://graph.facebook.com/${graphVersion}`;

export class MetaWhatsAppProvider implements WhatsAppProvider {
  name = "meta";

  parseWebhookPayload(payload: unknown): ParsedWhatsAppMessage {
    return this.parseWebhookPayloads(payload)[0] ?? emptyMessage();
  }

  parseWebhookPayloads(payload: unknown): ParsedWhatsAppMessage[] {
    const value = payload as MetaWebhookPayload;
    const messages = value.entry?.flatMap((entry) => entry.changes ?? [])
      .flatMap((change) => change.value?.messages ?? [])
      .filter(Boolean) ?? [];

    if (!messages.length) return [];

    return messages.map((message) => {
      const media = [
        message.image ? { id: message.image.id, url: "", type: "image" as const } : null,
        message.video ? { id: message.video.id, url: "", type: "video" as const } : null,
        message.document ? { id: message.document.id, url: "", type: "document" as const } : null,
      ].filter((item): item is { id: string; url: string; type: "image" | "video" | "document" } =>
        Boolean(item),
      );

      return {
      id: message.id,
      workspaceId: getDefaultWorkspaceId(),
      from: message.from,
      text:
        message.text?.body ??
        message.image?.caption ??
        message.video?.caption ??
        message.document?.caption ??
        "",
      media,
      };
    });
  }

  async sendTextMessage(to: string, text: string) {
    const response = await callMetaMessagesApi({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: {
        preview_url: true,
        body: text,
      },
    });

    return { id: response.messages?.[0]?.id ?? `wameta_${Date.now()}`, status: "sent" as const };
  }

  async sendMediaMessage(to: string, mediaUrl: string, caption?: string) {
    const response = await callMetaMessagesApi({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "image",
      image: {
        link: mediaUrl,
        caption,
      },
    });

    return { id: response.messages?.[0]?.id ?? `wameta_media_${Date.now()}`, status: "sent" as const };
  }

  async downloadMedia(mediaId: string) {
    const accessToken = getAccessToken();
    const metadataResponse = await fetch(`${graphBaseUrl}/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const metadata = (await metadataResponse.json()) as MetaMediaMetadata;
    if (!metadataResponse.ok || !metadata.url) {
      throw new Error(metadata.error?.message ?? "Unable to read WhatsApp media metadata.");
    }

    const mediaResponse = await fetch(metadata.url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!mediaResponse.ok) throw new Error("Unable to download WhatsApp media.");

    const contentType = metadata.mime_type ?? mediaResponse.headers.get("content-type") ?? "image/jpeg";
    const extension = extensionForContentType(contentType);
    const buffer = Buffer.from(await mediaResponse.arrayBuffer());
    const storagePath = `whatsapp-media/${mediaId}.${extension}`;
    const file = getAdminStorage().bucket().file(storagePath);
    await file.save(buffer, {
      metadata: {
        contentType,
        cacheControl: "public, max-age=31536000",
      },
    });
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: "2500-01-01",
    });

    return { url, contentType };
  }

  async sendInteractiveButtons(to: string, body: string, buttons: string[]) {
    const response = await callMetaMessagesApi({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: body },
        action: {
          buttons: buttons.slice(0, 3).map((button, index) => ({
            type: "reply",
            reply: {
              id: `button_${index + 1}`,
              title: button.slice(0, 20),
            },
          })),
        },
      },
    });

    return { id: response.messages?.[0]?.id ?? `wameta_buttons_${Date.now()}`, status: "sent" as const };
  }
}

function emptyMessage(): ParsedWhatsAppMessage {
  return {
    workspaceId: getDefaultWorkspaceId(),
    from: "",
    text: "",
    media: [],
  };
}

async function callMetaMessagesApi(payload: Record<string, unknown>) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!phoneNumberId) throw new Error("WHATSAPP_PHONE_NUMBER_ID is not configured.");

  const response = await fetch(`${graphBaseUrl}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as MetaSendResponse;
  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to send WhatsApp message.");
  }
  return data;
}

function getAccessToken() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!accessToken) throw new Error("WHATSAPP_ACCESS_TOKEN is not configured.");
  return accessToken;
}

function getDefaultWorkspaceId() {
  return process.env.WHATSAPP_DEFAULT_WORKSPACE_ID ?? "workspace_rare_address";
}

function extensionForContentType(contentType: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("video")) return "mp4";
  if (contentType.includes("pdf")) return "pdf";
  return "jpg";
}
