import "server-only";

import { customerOperationsService } from "@/lib/customer-operations/customer-operations-service";
import { contactIdForPhone } from "@/lib/customer-operations/customer-state";
import type { CustomerMessage } from "@/lib/customer-operations/customer-operations.types";
import { createWhatsAppProvider } from "./providers/provider-factory";
import type { WhatsAppProvider } from "./whatsapp-provider";

interface RetainedCustomerOperations {
  createOutboundIntent(input: {
    phone: string;
    workspaceId: string;
    text: string;
    senderType: "automation" | "admin";
  }): Promise<CustomerMessage>;
  markOutboundSent(
    contactId: string,
    messageId: string,
    providerMessageId: string,
  ): Promise<CustomerMessage>;
  markOutboundFailed(
    contactId: string,
    messageId: string,
    failureSummary: string,
  ): Promise<CustomerMessage>;
  recordDomainEvent(input: {
    contactId: string;
    workspaceId: string;
    type: "media_sent";
    label: string;
    idempotencyKey: string;
    sourceId?: string | null;
    occurredAt?: string;
  }): Promise<unknown>;
}

export class WhatsAppMessageSender {
  private readonly customerOperations: RetainedCustomerOperations;
  private readonly configuredProvider: WhatsAppProvider | null;

  constructor({
    customerOperations = customerOperationsService,
    provider = null,
  }: {
    customerOperations?: RetainedCustomerOperations;
    provider?: WhatsAppProvider | null;
  } = {}) {
    this.customerOperations = customerOperations;
    this.configuredProvider = provider;
  }

  async sendText(input: {
    phone: string;
    workspaceId: string;
    text: string;
    senderType: "automation" | "admin";
  }) {
    const intent = await this.customerOperations.createOutboundIntent(input);
    try {
      const result = await this.provider.sendTextMessage(input.phone, input.text);
      await this.customerOperations.markOutboundSent(intent.contactId, intent.id, result.id);
      return result;
    } catch (error) {
      await this.customerOperations.markOutboundFailed(
        intent.contactId,
        intent.id,
        error instanceof Error ? error.message : "WhatsApp send failed",
      );
      throw error;
    }
  }

  async sendMedia(input: {
    phone: string;
    workspaceId: string;
    mediaUrl: string;
    caption?: string;
    mediaType: "image" | "video" | "document";
    senderType: "automation" | "admin";
  }) {
    const caption = input.caption?.trim() ?? "";
    const intent = caption
      ? await this.customerOperations.createOutboundIntent({
          phone: input.phone,
          workspaceId: input.workspaceId,
          text: caption,
          senderType: input.senderType,
        })
      : null;
    try {
      const result = await this.provider.sendMediaMessage(input.phone, input.mediaUrl, caption || undefined);
      if (intent) {
        await this.customerOperations.markOutboundSent(intent.contactId, intent.id, result.id);
      }
      await this.customerOperations.recordDomainEvent({
        contactId: contactIdForPhone(input.phone),
        workspaceId: input.workspaceId,
        type: "media_sent",
        label: `${capitalize(input.mediaType)} sent on WhatsApp`,
        idempotencyKey: result.id,
        sourceId: result.id,
      });
      return result;
    } catch (error) {
      if (intent) {
        await this.customerOperations.markOutboundFailed(
          intent.contactId,
          intent.id,
          error instanceof Error ? error.message : "WhatsApp media send failed",
        );
      }
      throw error;
    }
  }

  private get provider() {
    return this.configuredProvider ?? createWhatsAppProvider();
  }
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

export const whatsAppMessageSender = new WhatsAppMessageSender();
