import { describe, expect, it, vi } from "vitest";
import { defaultPlans, ListingPlanLimitError } from "@/lib/billing/billing-service";
import type { ListingExtraction } from "@/lib/listings/listing.schema";
import type { Listing } from "@/types/domain";
import { MockWhatsAppProvider } from "./providers/mock-provider";
import { WhatsAppService } from "./whatsapp-service";

const extraction: ListingExtraction = {
  title: "Commercial Office for Sale in One Place, Pune",
  transactionType: "sale",
  propertyType: "commercial office",
  location: "One Place, Salunkhe Vihar Road, Pune",
  city: "Pune",
  locality: "Salunkhe Vihar Road",
  societyName: "One Place",
  googleMapsUrl: "",
  price: 7500000,
  deposit: null,
  brokerage: "",
  taxes: "",
  bhk: null,
  bedrooms: null,
  bathrooms: null,
  carpetArea: 450,
  builtUpArea: null,
  plotArea: null,
  openArea: null,
  furnishedStatus: null,
  parkingCount: 1,
  floor: null,
  totalFloors: null,
  availability: "immediate",
  preferredTenant: null,
  highlights: ["Pre-leased to a doctor"],
  amenities: [],
  descriptionShort: "Pre-leased commercial office with immediate rental income.",
  descriptionLong: "Pre-leased commercial office with immediate rental income.",
  seoTitle: "Commercial Office for Sale in Pune",
  seoDescription: "Commercial office for sale in Pune.",
  whatsappShareText: "Commercial office for sale in Pune.",
  instagramCaption: "",
  missingFields: [],
  riskFlags: [],
  confirmationQuestions: [],
  listingQualityScore: 82,
  confidenceScore: 0.84,
};

const listing = {
  id: "listing_123",
  workspaceId: "workspace_broker_917276709161",
  title: extraction.title,
  slug: "commercial-office-for-sale-listing-123",
  qualityScore: 82,
} as Listing;

describe("WhatsAppService intake cues", () => {
  it("collects messages until DONE, sends a wait cue, then creates a listing from accumulated content", async () => {
    const store = createMemorySessionStore();
    const ai = {
      extractListing: vi.fn().mockResolvedValue({
        data: extraction,
        provider: "deepseek",
        model: "deepseek-chat",
        confidenceScore: 0.84,
        costEstimate: 0.01,
      }),
    };
    const listings = { createFromExtraction: vi.fn().mockResolvedValue(listing) };
    const owners = {
      findById: vi.fn().mockResolvedValue(null),
      upsertFromWhatsApp: vi.fn().mockResolvedValue({
        id: "owner_1",
        phone: "917276709161",
        status: "unverified",
      }),
    };
    const claims = {
      createListingClaim: vi.fn().mockResolvedValue({
        token: "token_123",
        claimUrl: "https://therealestatelink.vercel.app/claim/token_123",
      }),
      markListingClaimedForVerifiedProfile: vi.fn(),
    };
    const saveMediaAssets = vi.fn().mockResolvedValue([
      {
        id: "media_asset_1",
        url: "https://cdn.example.com/office.jpg",
        type: "image",
        isHero: true,
      },
    ]);
    const service = new WhatsAppService({
      sessionStore: store,
      processedMessageStore: createMemoryProcessedMessageStore(),
      brokerWorkspaceService: createBrokerWorkspaceService(),
      aiListingService: ai,
      listingService: listings,
      ownerProfileService: owners,
      ownerClaimService: claims,
      billingService: createUnlimitedBillingService(),
      saveMediaAssets,
    });
    const provider = new MockWhatsAppProvider();

    const greeting = await service.handleWebhook({ text: "hi", from: "917276709161" }, provider);

    expect(greeting.status).toBe("collecting");
    expect(greeting.reply).toContain("property details and clear photos");
    expect(greeting.reply).toContain("🏡 Property");
    expect(greeting.reply).toContain("✨ Highlights");
    expect(greeting.reply).toContain("📸 Photos");

    const propertyDetails = await service.handleWebhook(
      {
        text: "Pre-leased commercial office for sale in One Place, Pune. 450 sqft carpet, Rs 75 lakh.",
        from: "917276709161",
        media: [{ id: "media_1", url: "https://example.com/office.jpg", type: "image" }],
      },
      provider,
    );

    expect(propertyDetails.status).toBe("collecting");
    expect(propertyDetails.reply).toContain("Type DONE");
    expect(listings.createFromExtraction).not.toHaveBeenCalled();

    const extraForward = await service.handleWebhook(
      {
        text: "",
        from: "917276709161",
        media: [{ id: "media_2", url: "https://example.com/lobby.jpg", type: "image" }],
      },
      provider,
    );

    expect(extraForward.status).toBe("collecting_silent");
    expect(extraForward.reply).toBe("");

    const done = await service.handleWebhook({ text: "DONE", from: "917276709161" }, provider);

    expect(done.status).toBe("processing_started");
    expect(done.reply).toContain("~30 seconds");
    expect(listings.createFromExtraction).not.toHaveBeenCalled();

    const followUp = await done.followUp?.();

    expect(followUp?.status).toBe("draft_ready");
    expect(followUp?.outboundMessages).toEqual([
      expect.objectContaining({
        type: "text",
        text: expect.stringContaining("Your private listing link is ready"),
      }),
      expect.objectContaining({
        type: "text",
        text: expect.stringContaining("/dashboard"),
      }),
      expect.objectContaining({
        type: "media",
        mediaUrl: "https://cdn.example.com/office.jpg",
        caption: expect.stringContaining("/l/commercial-office-for-sale-listing-123"),
      }),
      expect.objectContaining({
        type: "text",
        text: expect.stringContaining("Quick one-time step"),
      }),
    ]);
    expect(followUp?.reply).not.toContain("?claim=");
    expect(ai.extractListing).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("Pre-leased commercial office"),
        workspaceId: "workspace_broker_917276709161",
        media: [expect.objectContaining({ id: "media_1" }), expect.objectContaining({ id: "media_2" })],
      }),
    );
    expect(listings.createFromExtraction).toHaveBeenCalledWith("workspace_broker_917276709161", extraction);
    expect(owners.upsertFromWhatsApp).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "workspace_broker_917276709161",
        phone: "917276709161",
      }),
    );
    expect(claims.createListingClaim).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "workspace_broker_917276709161",
      }),
    );
    expect(claims.markListingClaimedForVerifiedProfile).not.toHaveBeenCalled();
  });

  it("auto-attaches new listings for an already verified WhatsApp broker", async () => {
    const store = createMemorySessionStore();
    const ai = {
      extractListing: vi.fn().mockResolvedValue({
        data: extraction,
        provider: "deepseek",
        model: "deepseek-chat",
        confidenceScore: 0.84,
        costEstimate: 0.01,
      }),
    };
    const listings = { createFromExtraction: vi.fn().mockResolvedValue(listing) };
    const owners = {
      findById: vi.fn().mockResolvedValue(null),
      upsertFromWhatsApp: vi.fn().mockResolvedValue({
        id: "owner_917276709161",
        phone: "917276709161",
        status: "verified",
      }),
    };
    const claims = {
      createListingClaim: vi.fn(),
      markListingClaimedForVerifiedProfile: vi.fn().mockResolvedValue(undefined),
    };
    const service = new WhatsAppService({
      sessionStore: store,
      brokerWorkspaceService: createBrokerWorkspaceService(),
      aiListingService: ai,
      listingService: listings,
      ownerProfileService: owners,
      ownerClaimService: claims,
      billingService: createUnlimitedBillingService(),
      saveMediaAssets: vi.fn().mockResolvedValue([]),
    });
    const provider = new MockWhatsAppProvider();

    await service.handleWebhook(
      {
        text: "2 BHK for rent in Wakad, 29000 rent",
        from: "917276709161",
      },
      provider,
    );
    const done = await service.handleWebhook({ text: "done", from: "917276709161" }, provider);
    const followUp = await done.followUp?.();

    expect(followUp?.status).toBe("draft_ready");
    expect(claims.createListingClaim).not.toHaveBeenCalled();
    expect(claims.markListingClaimedForVerifiedProfile).toHaveBeenCalledWith({
      workspaceId: "workspace_broker_917276709161",
      listingId: "listing_123",
      ownerProfileId: "owner_917276709161",
      phone: "917276709161",
    });
    expect(followUp?.reply).not.toContain("Quick one-time step");
  });

  it("collects a photo batch with caption even when the broker did not say hi first", async () => {
    const store = createMemorySessionStore();
    const ai = {
      extractListing: vi.fn().mockResolvedValue({
        data: extraction,
        provider: "deepseek",
        model: "deepseek-chat",
        confidenceScore: 0.84,
        costEstimate: 0.01,
      }),
    };
    const listings = { createFromExtraction: vi.fn().mockResolvedValue(listing) };
    const owners = {
      findById: vi.fn().mockResolvedValue(null),
      upsertFromWhatsApp: vi.fn().mockResolvedValue({
        id: "owner_917276709161",
        phone: "917276709161",
        status: "verified",
      }),
    };
    const claims = {
      createListingClaim: vi.fn(),
      markListingClaimedForVerifiedProfile: vi.fn().mockResolvedValue(undefined),
    };
    const saveMediaAssets = vi.fn().mockResolvedValue([
      {
        id: "media_asset_1",
        url: "/demo-media/media_1",
        type: "image",
        isHero: true,
      },
      {
        id: "media_asset_2",
        url: "/demo-media/media_2",
        type: "image",
        isHero: false,
      },
    ]);
    const provider = new MockWhatsAppProvider();
    const service = new WhatsAppService({
      sessionStore: store,
      processedMessageStore: createMemoryProcessedMessageStore(),
      brokerWorkspaceService: createBrokerWorkspaceService(),
      aiListingService: ai,
      listingService: listings,
      ownerProfileService: owners,
      ownerClaimService: claims,
      billingService: createUnlimitedBillingService(),
      saveMediaAssets,
    });

    const results = await service.handleWebhookBatch(
      {
        messages: [
          {
            id: "wamid.photo.1",
            text: "2 BHK semi furnished flat for rent in Wakad. Rent 29000.",
            from: "917276709161",
            media: [{ id: "media_1", url: "", type: "image" }],
          },
          {
            id: "wamid.photo.2",
            text: "",
            from: "917276709161",
            media: [{ id: "media_2", url: "", type: "image" }],
          },
        ],
      },
      provider,
    );

    expect(results.map((result) => result.status)).toEqual(["collecting", "collecting_silent"]);
    expect(results[0].reply).toContain("Type DONE");
    expect(results[1].reply).toBe("");

    const done = await service.handleWebhook({ text: "done", from: "917276709161" }, provider);
    const followUp = await done.followUp?.();

    expect(followUp?.status).toBe("draft_ready");
    expect(ai.extractListing).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("2 BHK semi furnished"),
        media: [
          expect.objectContaining({ id: "media_1", url: "/demo-media/media_1" }),
          expect.objectContaining({ id: "media_2", url: "/demo-media/media_2" }),
        ],
      }),
    );
    expect(saveMediaAssets).toHaveBeenCalledWith(
      expect.objectContaining({
        media: [
          expect.objectContaining({ id: "media_1", url: "/demo-media/media_1" }),
          expect.objectContaining({ id: "media_2", url: "/demo-media/media_2" }),
        ],
      }),
      "listing_123",
    );
  });

  it("asks for property details when DONE arrives before any content", async () => {
    const service = new WhatsAppService({
      sessionStore: createMemorySessionStore(),
      brokerWorkspaceService: createBrokerWorkspaceService(),
    });

    const result = await service.handleWebhook({ text: "done", from: "917276709161" }, new MockWhatsAppProvider());

    expect(result.status).toBe("collecting");
    expect(result.reply).toContain("share the property details");
  });

  it("asks the broker to upgrade when the workspace has reached its live listing limit", async () => {
    const store = createMemorySessionStore();
    const ai = { extractListing: vi.fn() };
    const listings = { createFromExtraction: vi.fn() };
    const service = new WhatsAppService({
      sessionStore: store,
      processedMessageStore: createMemoryProcessedMessageStore(),
      brokerWorkspaceService: createBrokerWorkspaceService(),
      aiListingService: ai,
      listingService: listings,
      billingService: {
        assertCanPublish: vi.fn().mockRejectedValue(
          new ListingPlanLimitError({
            plan: { ...defaultPlans[0], activeListingLimit: 1 },
            activeListings: 1,
            limit: 1,
            remaining: 0,
            isAtLimit: true,
          }),
        ),
      },
    });
    const provider = new MockWhatsAppProvider();

    await service.handleWebhook(
      {
        text: "2 BHK for rent in Wakad, 29000 rent",
        from: "917276709161",
      },
      provider,
    );
    const done = await service.handleWebhook({ text: "done", from: "917276709161" }, provider);
    const session = await store.getActiveSession("workspace_broker_917276709161", "917276709161");

    expect(done.status).toBe("plan_limit_reached");
    expect(done.reply).toContain("Starter plan limit");
    expect(done.reply).toContain("archive an older property");
    expect(done.followUp).toBeUndefined();
    expect(ai.extractListing).not.toHaveBeenCalled();
    expect(listings.createFromExtraction).not.toHaveBeenCalled();
    expect(session?.status).toBe("collecting");
  });

  it("ignores duplicate Meta deliveries for the same inbound message id", async () => {
    const processedMessageStore = createMemoryProcessedMessageStore();
    const service = new WhatsAppService({
      sessionStore: createMemorySessionStore(),
      processedMessageStore,
      brokerWorkspaceService: createBrokerWorkspaceService(),
    });
    const provider = new MockWhatsAppProvider();
    const payload = {
      id: "wamid.same-message",
      text: "hi",
      from: "917276709161",
    };

    const first = await service.handleWebhook(payload, provider);
    const duplicate = await service.handleWebhook(payload, provider);

    expect(first.status).toBe("collecting");
    expect(duplicate.status).toBe("duplicate_ignored");
    expect(duplicate.reply).toBe("");
  });

  it("does not restart the intro prompt from an empty webhook after DONE starts processing", async () => {
    const service = new WhatsAppService({
      sessionStore: createMemorySessionStore(),
      processedMessageStore: createMemoryProcessedMessageStore(),
      brokerWorkspaceService: createBrokerWorkspaceService(),
      billingService: createUnlimitedBillingService(),
    });
    const provider = new MockWhatsAppProvider();

    await service.handleWebhook(
      {
        text: "3 BHK for sale in Parmar Residency. Price 90 lakh.",
        from: "918265048678",
        media: [{ id: "media_1", url: "https://example.com/property.jpg", type: "image" }],
      },
      provider,
    );
    const done = await service.handleWebhook({ text: "Done", from: "918265048678" }, provider);
    const emptyWebhook = await service.handleWebhook({ text: "", from: "918265048678", media: [] }, provider);

    expect(done.status).toBe("processing_started");
    expect(emptyWebhook.status).toBe("ignored_empty");
    expect(emptyWebhook.reply).toBe("");
  });

  it("sends only one collection acknowledgement during a photo burst", async () => {
    const service = new WhatsAppService({
      sessionStore: createMemorySessionStore(),
      processedMessageStore: createMemoryProcessedMessageStore(),
      brokerWorkspaceService: createBrokerWorkspaceService(),
    });
    const provider = new MockWhatsAppProvider();

    const first = await service.handleWebhook(
      {
        text: "",
        from: "918265048678",
        media: [{ id: "media_1", url: "https://example.com/one.jpg", type: "image" }],
      },
      provider,
    );
    const second = await service.handleWebhook(
      {
        text: "",
        from: "918265048678",
        media: [{ id: "media_2", url: "https://example.com/two.jpg", type: "image" }],
      },
      provider,
    );
    const third = await service.handleWebhook(
      {
        text: "3 BHK corner flat with private garden, 90 lakh",
        from: "918265048678",
        media: [],
      },
      provider,
    );

    expect(first.status).toBe("collecting");
    expect(first.reply).toContain("Type DONE");
    expect(second.status).toBe("collecting_silent");
    expect(second.reply).toBe("");
    expect(third.status).toBe("collecting_silent");
    expect(third.reply).toBe("");
  });

  it("rejects videos and documents without storing them in the intake session", async () => {
    const store = createMemorySessionStore();
    const service = new WhatsAppService({
      sessionStore: store,
      processedMessageStore: createMemoryProcessedMessageStore(),
      brokerWorkspaceService: createBrokerWorkspaceService(),
    });
    const provider = new MockWhatsAppProvider();

    const video = await service.handleWebhook(
      {
        text: "",
        from: "918265048678",
        media: [{ id: "video_1", url: "https://example.com/tour.mp4", type: "video" }],
      },
      provider,
    );
    const document = await service.handleWebhook(
      {
        text: "",
        from: "918265048678",
        media: [{ id: "doc_1", url: "https://example.com/brochure.pdf", type: "document" }],
      },
      provider,
    );

    expect(video.status).toBe("unsupported_media");
    expect(video.reply).toContain("photos");
    expect(document.status).toBe("unsupported_media");
    expect(document.reply).toContain("photos");
    expect(await store.getActiveSession("workspace_broker_918265048678", "918265048678")).toBeNull();
  });

  it("uses only images when mixed media arrives with property text", async () => {
    const store = createMemorySessionStore();
    const service = new WhatsAppService({
      sessionStore: store,
      processedMessageStore: createMemoryProcessedMessageStore(),
      brokerWorkspaceService: createBrokerWorkspaceService(),
    });
    const provider = new MockWhatsAppProvider();

    const result = await service.handleWebhook(
      {
        text: "3 BHK for sale in Parmar Residency, price 90 lakh",
        from: "918265048678",
        media: [
          { id: "image_1", url: "https://example.com/property.jpg", type: "image" },
          { id: "video_1", url: "https://example.com/tour.mp4", type: "video" },
          { id: "doc_1", url: "https://example.com/brochure.pdf", type: "document" },
        ],
      },
      provider,
    );
    const session = await store.getActiveSession("workspace_broker_918265048678", "918265048678");

    expect(result.status).toBe("collecting");
    expect(result.reply).toContain("I’ll use the property details and photos");
    expect(session?.media).toEqual([{ id: "image_1", url: "https://example.com/property.jpg", type: "image" }]);
    expect(session?.messages).toEqual(["3 BHK for sale in Parmar Residency, price 90 lakh"]);
  });

  it("welcomes back a verified broker by name when a fresh intake starts", async () => {
    const owners = {
      findById: vi.fn().mockResolvedValue({
        id: "owner_918265048678",
        workspaceId: "workspace_broker_918265048678",
        phone: "918265048678",
        name: "Faiz Shaikh",
        status: "verified",
      }),
      upsertFromWhatsApp: vi.fn(),
    };
    const service = new WhatsAppService({
      sessionStore: createMemorySessionStore(),
      processedMessageStore: createMemoryProcessedMessageStore(),
      brokerWorkspaceService: createBrokerWorkspaceService(),
      ownerProfileService: owners,
    });

    const result = await service.handleWebhook({ text: "hi", from: "918265048678" }, new MockWhatsAppProvider());

    expect(result.status).toBe("collecting");
    expect(result.reply).toContain("Welcome back, Faiz Shaikh");
    expect(result.reply).toContain("🏡 Property");
    expect(result.reply).toContain("📸 Photos");
    expect(result.reply).toContain("DONE");
  });

  it("does not personalize the welcome with an unverified profile name", async () => {
    const owners = {
      findById: vi.fn().mockResolvedValue({
        id: "owner_918265048678",
        workspaceId: "workspace_broker_918265048678",
        phone: "918265048678",
        name: "Unverified Name",
        status: "unverified",
      }),
      upsertFromWhatsApp: vi.fn(),
    };
    const service = new WhatsAppService({
      sessionStore: createMemorySessionStore(),
      processedMessageStore: createMemoryProcessedMessageStore(),
      brokerWorkspaceService: createBrokerWorkspaceService(),
      ownerProfileService: owners,
    });

    const result = await service.handleWebhook({ text: "hello", from: "918265048678" }, new MockWhatsAppProvider());

    expect(result.reply).not.toContain("Unverified Name");
    expect(result.reply).toContain("Send me the property details");
  });
});

function createMemorySessionStore() {
  type MemorySession = {
    id: string;
    workspaceId: string;
    phone: string;
    status: "collecting" | "processing" | "completed" | "cancelled";
    messages: string[];
    media: Array<{ id: string; url: string; type: "image" | "video" | "document" }>;
    listingId: string | null;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
    collectionAcknowledgedAt: string | null;
  };
  const sessions = new Map<string, MemorySession>();
  const key = (workspaceId: string, phone: string) => `${workspaceId}:${phone}`;
  const createSession = (workspaceId: string, phone: string): MemorySession => {
    const now = new Date().toISOString();
    return {
      id: phone,
      workspaceId,
      phone,
      status: "collecting",
      messages: [],
      media: [],
      listingId: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      collectionAcknowledgedAt: null,
    };
  };

  return {
    async getActiveSession(workspaceId: string, phone: string) {
      const session = sessions.get(key(workspaceId, phone)) ?? null;
      if (session?.status === "completed" || session?.status === "cancelled") return null;
      return session;
    },
    async startSession(workspaceId: string, phone: string) {
      const session = createSession(workspaceId, phone);
      sessions.set(key(workspaceId, phone), session);
      return session;
    },
    async appendMessage(workspaceId: string, phone: string, message: { text: string; media: Array<{ id: string; url: string; type: "image" | "video" | "document" }> }) {
      const session = sessions.get(key(workspaceId, phone)) ?? createSession(workspaceId, phone);
      const now = new Date().toISOString();
      const hasContent = Boolean(message.text.trim() || message.media.length);
      const shouldAcknowledge = session.status !== "processing" && !session.collectionAcknowledgedAt && hasContent;
      const next: MemorySession = {
        ...session,
        status: session.status === "processing" ? "processing" : "collecting",
        messages: message.text.trim() ? [...session.messages, message.text.trim()] : session.messages,
        media: [...session.media, ...message.media],
        updatedAt: now,
        collectionAcknowledgedAt: shouldAcknowledge ? now : session.collectionAcknowledgedAt,
      };
      sessions.set(key(workspaceId, phone), next);
      return next;
    },
    async markProcessing(workspaceId: string, phone: string) {
      const session = sessions.get(key(workspaceId, phone));
      if (session) sessions.set(key(workspaceId, phone), { ...session, status: "processing", updatedAt: new Date().toISOString() });
    },
    async markCompleted(workspaceId: string, phone: string, listingId: string) {
      const session = sessions.get(key(workspaceId, phone));
      if (session) {
        const now = new Date().toISOString();
        sessions.set(key(workspaceId, phone), { ...session, status: "completed", listingId, updatedAt: now, completedAt: now });
      }
    },
    async markCancelled(workspaceId: string, phone: string) {
      const session = sessions.get(key(workspaceId, phone));
      if (session) sessions.set(key(workspaceId, phone), { ...session, status: "cancelled", updatedAt: new Date().toISOString() });
    },
  };
}

function createBrokerWorkspaceService() {
  return {
    async resolveWorkspaceForPhone(phone: string) {
      return `workspace_broker_${phone}`;
    },
  };
}

function createMemoryProcessedMessageStore() {
  const seen = new Set<string>();

  return {
    async markProcessing(workspaceId: string, messageId: string) {
      const key = `${workspaceId}:${messageId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    },
  };
}

function createUnlimitedBillingService() {
  return {
    assertCanPublish: vi.fn().mockResolvedValue({
      plan: defaultPlans[0],
      activeListings: 0,
      limit: defaultPlans[0].activeListingLimit,
      remaining: defaultPlans[0].activeListingLimit,
      isAtLimit: false,
    }),
  };
}
