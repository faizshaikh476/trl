import { NextResponse } from "next/server";
import { createWhatsAppProvider } from "@/lib/whatsapp/providers/provider-factory";
import { whatsappService, type WhatsAppWebhookResult } from "@/lib/whatsapp/whatsapp-service";
import type { WhatsAppProvider } from "@/lib/whatsapp/whatsapp-provider";
import { brokerVerificationService } from "@/lib/claims/broker-verification-service";
import { parseMetaDeliveryStatuses } from "@/lib/whatsapp/providers/meta-provider";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    challenge &&
    token &&
    token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  ) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Webhook verification failed.", { status: 403 });
}

export async function POST(request: Request) {
  try {
    const provider = createWhatsAppProvider();
    const payload = await request.json();
    console.info("WhatsApp webhook received", summarizeWebhookPayload(payload));
    const deliveryStatuses = parseMetaDeliveryStatuses(payload);
    if (deliveryStatuses.length) {
      await brokerVerificationService.recordDeliveryStatuses(deliveryStatuses);
    }
    const results = await whatsappService.handleWebhookBatch(payload, provider);
    const result = results.find((item) => item.status !== "ignored") ?? results[0] ?? { status: "ignored", reply: "" };
    console.info("WhatsApp webhook processed", {
      status: result.status,
      messageCount: results.length,
      replyCount: results.filter((item) => Boolean(item.reply)).length,
    });

    if (process.env.WHATSAPP_AUTO_REPLY !== "false") {
      for (const item of results) {
        if (item.reply && item.to) await sendWhatsAppResult(provider, item);
        if (item.followUp) {
          const followUp = await item.followUp();
          await sendWhatsAppResult(provider, followUp);
        }
      }
    }

    return NextResponse.json({ received: true, status: result.status });
  } catch (error) {
    console.error("WhatsApp webhook failed", error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}

async function sendWhatsAppResult(provider: WhatsAppProvider, result: WhatsAppWebhookResult) {
  if (!result.to) return;

  if (!result.outboundMessages?.length) {
    if (result.reply) await provider.sendTextMessage(result.to, result.reply);
    return;
  }

  for (const message of result.outboundMessages) {
    if (message.type === "text") {
      await provider.sendTextMessage(result.to, message.text);
    } else {
      await provider.sendMediaMessage(result.to, message.mediaUrl, message.caption);
    }
  }
}

function summarizeWebhookPayload(payload: unknown) {
  const value = payload as {
    entry?: Array<{
      changes?: Array<{
        field?: string;
        value?: {
          messages?: Array<{
            from?: string;
            type?: string;
            text?: { body?: string };
            image?: { id?: string };
            video?: { id?: string };
            document?: { id?: string };
          }>;
          statuses?: unknown[];
        };
      }>;
    }>;
  };
  const change = value.entry?.[0]?.changes?.[0];
  const messages = change?.value?.messages ?? [];
  const message = messages[0];
  return {
    field: change?.field ?? null,
    messageCount: messages.length,
    messageType: message?.type ?? null,
    fromLast4: message?.from ? message.from.slice(-4) : null,
    textLength: message?.text?.body?.length ?? 0,
    mediaCount: [message?.image, message?.video, message?.document].filter(Boolean).length,
    statusCount: change?.value?.statuses?.length ?? 0,
  };
}
