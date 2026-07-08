import { aiListingService } from "@/lib/ai/ai-service";
import { billingService, ListingPlanLimitError } from "@/lib/billing/billing-service";
import { getAdminDb } from "@/lib/firebase/admin";
import { firestorePaths } from "@/lib/firebase/paths";
import { ownerClaimService } from "@/lib/claims/owner-claim-service";
import { listingService } from "@/lib/listings/listing-service";
import { getPublicBaseUrl } from "@/lib/claims/owner-claim-service";
import { ownerProfileIdForPhone, ownerProfileService } from "@/lib/owners/owner-profile-service";
import type { MediaAsset } from "@/types/domain";
import {
  firestoreWhatsAppBrokerWorkspaceService,
  type WhatsAppBrokerWorkspaceService,
} from "./broker-workspace-service";
import { createWhatsAppProvider } from "./providers/provider-factory";
import {
  firestoreWhatsAppIntakeSessionStore,
  type WhatsAppIntakeSessionStore,
} from "./whatsapp-intake-session-store";
import type { ParsedWhatsAppMessage, WhatsAppProvider } from "./whatsapp-provider";

const START_REPLY =
  "👋 Hi! Send me the property details and clear photos. I’ll turn them into a polished, shareable page.\n\n🏡 Property: flat/shop/office, BHK, area, floor\n📍 Location: society, locality, city\n💰 Price/rent: deposit, brokerage if any\n✨ Highlights: amenities, furnishing, parking, view\n📸 Photos: rooms, kitchen, bathrooms, balcony/garden\n\nWhen everything is shared, type DONE.";
const COLLECTING_REPLY =
  "✅ Got it. Keep sending anything useful.\n\n📸 Photos, 🏡 property facts, 💰 pricing, ✨ amenities/highlights.\n\nType DONE when you’re finished.";
const MIXED_MEDIA_REPLY =
  "✅ Got it. I’ll use the property details and photos.\n\n📸 For the gallery, please send images only. Videos and documents won’t be processed right now.\n\nType DONE when you’re finished.";
const UNSUPPORTED_MEDIA_REPLY =
  "📸 Please send property photos as images only. Videos, PDFs, and documents are not processed right now.\n\nYou can also send the property details as text, then type DONE.";
const EMPTY_DONE_REPLY = "📌 Please share the property details, location, price, and photos first. Type DONE when you’re finished.";
const PROCESSING_REPLY = "⏳ Got it! Give me ~30 seconds to grab all your photos and build the page...";
const FAILED_REPLY =
  "⚠️ I couldn’t create the property page from this message. Please try again with the property details, price, location, and photos.";
const PLAN_LIMIT_FALLBACK_REPLY =
  "🚦 You’ve reached your live listing limit.\n\nPlease archive an older property or upgrade your plan before publishing another listing.";
const FINAL_SESSION_SETTLE_MS = 2500;

export type WhatsAppOutboundMessage =
  | { type: "text"; text: string }
  | { type: "media"; mediaUrl: string; caption?: string };

interface WhatsAppServiceDependencies {
  sessionStore: WhatsAppIntakeSessionStore;
  processedMessageStore: WhatsAppProcessedMessageStore;
  aiListingService: typeof aiListingService;
  listingService: typeof listingService;
  ownerProfileService: typeof ownerProfileService;
  ownerClaimService: typeof ownerClaimService;
  billingService: typeof billingService;
  saveMediaAssets: typeof saveIncomingMediaAssets;
  brokerWorkspaceService: WhatsAppBrokerWorkspaceService;
}

export interface WhatsAppProcessedMessageStore {
  markProcessing(workspaceId: string, messageId: string, from: string): Promise<boolean>;
}

export interface WhatsAppWebhookResult {
  status: string;
  to?: string;
  reply: string;
  outboundMessages?: WhatsAppOutboundMessage[];
  followUp?: () => Promise<WhatsAppWebhookResult>;
  [key: string]: unknown;
}

export class WhatsAppService {
  private readonly dependencies: WhatsAppServiceDependencies;

  constructor(dependencies: Partial<WhatsAppServiceDependencies> = {}) {
    this.dependencies = {
      sessionStore: dependencies.sessionStore ?? firestoreWhatsAppIntakeSessionStore,
      processedMessageStore: dependencies.processedMessageStore ?? firestoreWhatsAppProcessedMessageStore,
      aiListingService: dependencies.aiListingService ?? aiListingService,
      listingService: dependencies.listingService ?? listingService,
      ownerProfileService: dependencies.ownerProfileService ?? ownerProfileService,
      ownerClaimService: dependencies.ownerClaimService ?? ownerClaimService,
      billingService: dependencies.billingService ?? billingService,
      saveMediaAssets: dependencies.saveMediaAssets ?? saveIncomingMediaAssets,
      brokerWorkspaceService: dependencies.brokerWorkspaceService ?? firestoreWhatsAppBrokerWorkspaceService,
    };
  }

  async handleWebhook(payload: unknown, provider: WhatsAppProvider = createWhatsAppProvider()): Promise<WhatsAppWebhookResult> {
    const parsedMessage = provider.parseWebhookPayload(payload);
    return this.handleParsedMessage(parsedMessage, provider);
  }

  async handleWebhookBatch(
    payload: unknown,
    provider: WhatsAppProvider = createWhatsAppProvider(),
  ): Promise<WhatsAppWebhookResult[]> {
    const parsedMessages = provider.parseWebhookPayloads?.(payload) ?? [provider.parseWebhookPayload(payload)];
    const results: WhatsAppWebhookResult[] = [];
    for (const parsedMessage of parsedMessages) {
      results.push(await this.handleParsedMessage(parsedMessage, provider));
    }
    return results;
  }

  private async handleParsedMessage(
    parsedMessage: ParsedWhatsAppMessage,
    provider: WhatsAppProvider,
  ): Promise<WhatsAppWebhookResult> {
    if (!parsedMessage.from) return { status: "ignored", reply: "" };
    const workspaceId = await this.dependencies.brokerWorkspaceService.resolveWorkspaceForPhone(parsedMessage.from);
    const message = { ...parsedMessage, workspaceId };
    const text = message.text.trim();
    if (message.id) {
      const isFirstDelivery = await this.dependencies.processedMessageStore.markProcessing(
        message.workspaceId,
        message.id,
        message.from,
      );
      if (!isFirstDelivery) {
        return { status: "duplicate_ignored", to: message.from, reply: "" };
      }
    }

    if (isCancel(text)) {
      await this.dependencies.sessionStore.markCancelled(message.workspaceId, message.from);
      return { status: "cancelled", to: message.from, reply: "Intake cancelled. Send Hi to start over." };
    }

    if (isDone(text)) {
      const session = await this.dependencies.sessionStore.getActiveSession(message.workspaceId, message.from);
      if (!session || (!session.messages.length && !session.media.length)) {
        await this.dependencies.sessionStore.startSession(message.workspaceId, message.from);
        return { status: "collecting", to: message.from, reply: EMPTY_DONE_REPLY };
      }

      try {
        await this.dependencies.billingService.assertCanPublish(message.workspaceId);
      } catch (error) {
        if (error instanceof ListingPlanLimitError) {
          return {
            status: "plan_limit_reached",
            to: message.from,
            reply: planLimitReply(error.usage.plan.name, error.usage.activeListings, error.usage.limit),
          };
        }
        throw error;
      }
      await this.dependencies.sessionStore.markProcessing(message.workspaceId, message.from);
      return {
        status: "processing_started",
        to: message.from,
        reply: PROCESSING_REPLY,
        followUp: () => this.createDraftFromSession(provider, message),
      };
    }

    if (isGreeting(text) && !message.media.length) {
      const session = await this.dependencies.sessionStore.getActiveSession(message.workspaceId, message.from);
      if (session && (session.messages.length || session.media.length || session.status === "processing")) {
        return { status: "collecting_silent", to: message.from, reply: "" };
      }
      if (!session) await this.dependencies.sessionStore.startSession(message.workspaceId, message.from);
      const brokerName = await this.verifiedBrokerName(message.workspaceId, message.from);
      return { status: "collecting", to: message.from, reply: brokerName ? welcomeBackReply(brokerName) : START_REPLY };
    }

    const imageMedia = onlyImageMedia(message.media);
    const unsupportedMediaCount = message.media.length - imageMedia.length;

    if (!text && unsupportedMediaCount > 0 && !imageMedia.length) {
      return { status: "unsupported_media", to: message.from, reply: UNSUPPORTED_MEDIA_REPLY };
    }

    if (text || imageMedia.length) {
      const existingSession = await this.dependencies.sessionStore.getActiveSession(message.workspaceId, message.from);
      const shouldAcknowledgeCollection =
        (!existingSession || !existingSession.collectionAcknowledgedAt) && existingSession?.status !== "processing";
      await this.dependencies.sessionStore.appendMessage(message.workspaceId, message.from, {
        text,
        media: imageMedia,
      });
      const collectionReply = unsupportedMediaCount > 0 ? MIXED_MEDIA_REPLY : COLLECTING_REPLY;
      return {
        status: shouldAcknowledgeCollection ? "collecting" : "collecting_silent",
        to: message.from,
        reply: shouldAcknowledgeCollection ? collectionReply : "",
      };
    }

    return {
      status: "ignored_empty",
      to: message.from,
      reply: "",
    };
  }

  private async createDraftFromSession(
    provider: WhatsAppProvider,
    message: ParsedWhatsAppMessage,
  ): Promise<WhatsAppWebhookResult> {
    try {
      await sleep(FINAL_SESSION_SETTLE_MS);
      const session = await this.dependencies.sessionStore.getActiveSession(message.workspaceId, message.from);
      if (!session || (!session.messages.length && !session.media.length)) {
        return { status: "draft_failed", to: message.from, reply: EMPTY_DONE_REPLY };
      }
      await this.dependencies.billingService.assertCanPublish(message.workspaceId);
      const sessionText = session.messages.join("\n\n");
      const sessionMedia = onlyImageMedia(session.media);
      const resolvedMedia = await resolveIncomingMedia(provider, {
        ...message,
        text: sessionText,
        media: sessionMedia,
      });
      const extraction = await this.dependencies.aiListingService.extractListing({
        workspaceId: message.workspaceId,
        intakeSessionId: session.id,
        text: sessionText,
        media: resolvedMedia,
      });
      const listing = await this.dependencies.listingService.createFromExtraction(message.workspaceId, extraction.data);
      const media = await this.dependencies.saveMediaAssets({ ...message, text: sessionText, media: resolvedMedia }, listing.id);
      const ownerProfile = await this.dependencies.ownerProfileService.upsertFromWhatsApp({
        workspaceId: message.workspaceId,
        phone: message.from,
        listingId: listing.id,
      });
      const shouldVerifyBroker = ownerProfile.status !== "verified";
      const claim = shouldVerifyBroker
        ? await this.dependencies.ownerClaimService.createListingClaim({
            workspaceId: message.workspaceId,
            listingId: listing.id,
            ownerProfileId: ownerProfile.id,
            phone: ownerProfile.phone,
          })
        : null;
      if (!shouldVerifyBroker) {
        await this.dependencies.ownerClaimService.markListingClaimedForVerifiedProfile({
          workspaceId: message.workspaceId,
          listingId: listing.id,
          ownerProfileId: ownerProfile.id,
          phone: ownerProfile.phone,
        });
      }
      await this.dependencies.sessionStore.markCompleted(message.workspaceId, message.from, listing.id);
      const publicListingUrl = `${getPublicBaseUrl()}/l/${listing.slug}`;
      const dashboardUrl = `${getPublicBaseUrl()}/dashboard`;
      const heroMedia = media.find((asset) => asset.isHero) ?? media[0] ?? null;
      const outboundMessages = buildReadyOutboundMessages({
        listingTitle: listing.title,
        listingUrl: publicListingUrl,
        dashboardUrl,
        heroImageUrl: heroMedia?.type === "image" ? heroMedia.url : null,
        shouldVerifyBroker,
      });

      return {
        status: "draft_ready",
        listing,
        media,
        ownerProfile: {
          id: ownerProfile.id,
          phone: ownerProfile.phone,
          status: ownerProfile.status,
        },
        claim,
        ai: {
          provider: extraction.provider,
          model: extraction.model,
          confidenceScore: extraction.confidenceScore,
          costEstimate: extraction.costEstimate,
        },
        to: message.from,
        reply: outboundMessages.map((item) => (item.type === "text" ? item.text : item.caption ?? item.mediaUrl)).join("\n\n"),
        outboundMessages,
      };
    } catch (error) {
      console.error("WhatsApp intake follow-up failed", error);
      return { status: "draft_failed", to: message.from, reply: FAILED_REPLY };
    }
  }

  private async verifiedBrokerName(workspaceId: string, phone: string) {
    try {
      const profile = await this.dependencies.ownerProfileService.findById(workspaceId, ownerProfileIdForPhone(phone));
      const name = profile?.name?.trim();
      if (profile?.status === "verified" && name) return name;
    } catch (error) {
      console.error("Unable to load verified WhatsApp broker profile", {
        workspaceId,
        phone,
        message: error instanceof Error ? error.message : "unknown error",
      });
    }
    return "";
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const firestoreWhatsAppProcessedMessageStore: WhatsAppProcessedMessageStore = {
  async markProcessing(workspaceId: string, messageId: string, from: string) {
    const db = getAdminDb();
    const ref = db
      .collection(firestorePaths.workspaceWhatsAppMessages(workspaceId))
      .doc(safeMessageId(messageId));

    return db.runTransaction(async (transaction) => {
      const existing = await transaction.get(ref);
      if (existing.exists) return false;

      transaction.set(ref, {
        id: messageId,
        from,
        status: "processing",
        createdAt: new Date().toISOString(),
      });
      return true;
    });
  },
};

export const whatsappService = new WhatsAppService();

async function resolveIncomingMedia(provider: WhatsAppProvider, message: ParsedWhatsAppMessage) {
  const resolved = await Promise.all(
    message.media.map(async (item) => {
      if (item.url) return item;
      try {
        const downloaded = await provider.downloadMedia(item.id);
        return { ...item, url: downloaded.url };
      } catch (error) {
        console.error("WhatsApp media download failed", {
          provider: provider.name,
          mediaId: item.id,
          type: item.type,
          message: error instanceof Error ? error.message : "unknown error",
        });
        return null;
      }
    }),
  );
  return resolved.filter((item): item is ParsedWhatsAppMessage["media"][number] => Boolean(item?.url));
}

async function saveIncomingMediaAssets(message: ParsedWhatsAppMessage, listingId: string) {
  if (!message.media.length) return [];

  const db = getAdminDb();
  const now = new Date().toISOString();
  const collection = db.collection(firestorePaths.workspaceMedia(message.workspaceId));
  const batch = db.batch();
  const assets: MediaAsset[] = message.media.map((item, index) => {
    const ref = collection.doc();
    const asset: MediaAsset = {
      id: ref.id,
      workspaceId: message.workspaceId,
      listingId,
      intakeSessionId: null,
      url: item.url,
      thumbnailUrl: item.url,
      storagePath: item.url,
      type: item.type,
      order: index,
      roomType: index === 0 ? "hero" : "property",
      qualityScore: 70,
      isHero: index === 0,
      caption: "",
      uploadedBy: "whatsapp",
      source: "whatsapp",
      createdAt: now,
    };
    batch.set(ref, asset);
    return asset;
  });

  await batch.commit();
  return assets;
}

function isGreeting(text: string) {
  return /^(hi|hello|hey|start|namaste|hii+)$/i.test(text.trim());
}

function onlyImageMedia(media: ParsedWhatsAppMessage["media"]) {
  return media.filter((item) => item.type === "image");
}

function welcomeBackReply(name: string) {
  return `👋 Welcome back, ${name}!\n\nSend me your next property and I’ll take care of the page.\n\n🏡 Property: flat/shop/office, BHK, area, floor\n📍 Location: society, locality, city\n💰 Price/rent: deposit, brokerage if any\n✨ Highlights: amenities, furnishing, parking, view\n📸 Photos: rooms, kitchen, bathrooms, balcony/garden\n\nWhen everything is shared, type DONE.`;
}

function planLimitReply(planName: string, activeListings: number, limit: number) {
  if (!planName || !limit) return PLAN_LIMIT_FALLBACK_REPLY;
  return `🚦 You’ve reached your ${planName} plan limit.\n\nYou have ${activeListings}/${limit} live listings.\n\nPlease archive an older property from your dashboard or upgrade your plan to publish more.`;
}

function safeMessageId(messageId: string) {
  return messageId.replace(/\//g, "_");
}

function isDone(text: string) {
  return /^done[\s.!✅]*$/i.test(text.trim());
}

function isCancel(text: string) {
  return /^cancel[\s.!]*$/i.test(text.trim());
}

function buildReadyOutboundMessages({
  listingTitle,
  listingUrl,
  dashboardUrl,
  heroImageUrl,
  shouldVerifyBroker,
}: {
  listingTitle: string;
  listingUrl: string;
  dashboardUrl: string;
  heroImageUrl: string | null;
  shouldVerifyBroker: boolean;
}): WhatsAppOutboundMessage[] {
  const propertyCaption = `${listingTitle}\n\n👉 View all pics & details here:\n${listingUrl}`;
  const messages: WhatsAppOutboundMessage[] = [
    {
      type: "text",
      text: "✅ Your private listing link is ready. You’ll get instant alerts when buyers view or enquire.",
    },
    {
      type: "text",
      text: `📊 Manage your listings & leads\n\nView analytics, edit listings, and track leads:\n${dashboardUrl}`,
    },
    heroImageUrl
      ? {
          type: "media",
          mediaUrl: heroImageUrl,
          caption: propertyCaption,
        }
      : {
          type: "text",
          text: propertyCaption,
        },
  ];
  if (shouldVerifyBroker) {
    messages.push({
      type: "text",
      text:
        "👋 Quick one-time step — open the link after signing in and verify your broker details. Buyers trust verified listings more.",
    });
  }
  return messages;
}
